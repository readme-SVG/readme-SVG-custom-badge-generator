"""Regression checks for the Python renderer, CLI and committed SVG samples."""

import math
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from xml.etree import ElementTree

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "api"))

from data_fetchers import get_catalog, resolve_preset
from github_stats import COLOR_THEMES, SIZE_MAP, STYLE_MAP, generate_custom_badge
from scripts.refresh_sample_svgs import SAMPLES


class BadgeRenderingTests(unittest.TestCase):
    def test_all_styles_themes_and_sizes_produce_valid_svg(self):
        for style in STYLE_MAP:
            for theme in COLOR_THEMES:
                for size in SIZE_MAP:
                    with self.subTest(style=style, theme=theme, size=size):
                        svg = generate_custom_badge(style=style, theme=theme, size=size)
                        root = ElementTree.fromstring(svg)
                        self.assertEqual(root.tag, "{http://www.w3.org/2000/svg}svg")
                        self.assertGreater(int(root.attrib["width"]), 0)
                        self.assertGreater(int(root.attrib["height"]), 0)

    def test_xml_special_characters_and_control_codes_cannot_break_markup(self):
        svg = generate_custom_badge(label='<script>&"\x00', value='</text>\ud800')
        root = ElementTree.fromstring(svg)
        self.assertIn('<script>&"\ufffd', root.attrib['aria-label'])
        self.assertIn('</text>\ufffd', root.attrib['aria-label'])
        self.assertNotIn('<script>', svg)

    def test_nonfinite_scales_fall_back_and_finite_values_are_clamped(self):
        default = generate_custom_badge()
        for scale in (math.nan, math.inf, -math.inf):
            with self.subTest(scale=scale):
                self.assertEqual(generate_custom_badge(scale=scale), default)
        scaled = ElementTree.fromstring(generate_custom_badge(scale=0))
        self.assertEqual(scaled.attrib['height'], '17')
        self.assertEqual(generate_custom_badge(border_radius=math.inf), default)
        self.assertEqual(generate_custom_badge(label_bg=12), default)

    def test_radius_uses_style_default_until_explicitly_overridden(self):
        pill = ElementTree.fromstring(generate_custom_badge(style='pill'))
        self.assertEqual(pill[0].attrib['rx'], '12')
        square = ElementTree.fromstring(generate_custom_badge(style='pill', border_radius=0))
        self.assertEqual(square[0].attrib['rx'], '0')

    def test_custom_icon_data_requires_canonical_bounded_image_uri(self):
        icon = 'data:image/png;base64,AA=='
        svg = generate_custom_badge(icon_data=icon)
        root = ElementTree.fromstring(svg)
        image = root.find('{http://www.w3.org/2000/svg}image')
        self.assertIsNotNone(image)
        self.assertEqual(image.attrib['href'], icon)

        for invalid in ('data:text/html;base64,AA==', 'data:image/png;base64,A===',
                        'data:image/png;base64,AA==\n', 'data:image/png;base64,',
                        'data:image/png;base64,' + 'A' * 200_000):
            with self.subTest(invalid=invalid[:60]):
                self.assertNotIn('<image ', generate_custom_badge(icon_data=invalid))

    def test_sample_files_match_renderer(self):
        for name, options in SAMPLES.items():
            with self.subTest(name=name):
                expected = generate_custom_badge(**options)
                self.assertEqual((ROOT / 'sample_svgs' / name).read_text(encoding='utf-8'), expected)

    def test_catalog_and_preset_fallback(self):
        catalog = get_catalog()
        self.assertEqual(catalog['styles'], sorted(STYLE_MAP))
        self.assertEqual(resolve_preset(' QUALITY ')['value'], 'A+')
        self.assertEqual(resolve_preset('missing')['label'], 'build')

    def test_cli_generates_a_badge_without_writing_to_the_repository(self):
        with tempfile.TemporaryDirectory() as tmp:
            output = Path(tmp) / 'badge.svg'
            subprocess.run([sys.executable, str(ROOT / 'process_event.py'), '--label', 'ready',
                            '--value', 'yes', '--output', str(output)], check=True,
                           capture_output=True, text=True)
            svg = ElementTree.fromstring(output.read_text(encoding='utf-8'))
            self.assertIn('ready: yes', svg.attrib['aria-label'])


if __name__ == '__main__':
    unittest.main()
