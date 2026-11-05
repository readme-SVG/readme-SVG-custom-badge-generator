import { Request, Response } from "express";
import {
  generateBadge,
  BadgeParams,
  PRESETS,
  getAvailableStyles,
  getAvailableThemes,
  getAvailableSizes,
} from "../services/badgeRenderer";
import { listIcons, addCustomIcon, resolveIcon } from "../services/iconService";

const SVG_CSP = "default-src 'none'; img-src data:; style-src 'unsafe-inline'; sandbox";

function renderBadge(query: Request["query"], res: Response, pathLabels?: { label: string; value: string }): void {
  try {
    const preset = typeof query.preset === "string" && Object.prototype.hasOwnProperty.call(PRESETS, query.preset)
      ? PRESETS[query.preset] : undefined;

    const icon = typeof query.icon === "string" ? query.icon : preset?.icon;
    let iconData = typeof query.iconData === "string" ? query.iconData : undefined;
    if (icon && !iconData) {
      const resolved = resolveIcon(icon);
      if (resolved?.type === "custom") iconData = resolved.data;
    }

    const params: BadgeParams = {
      label: pathLabels?.label ?? (typeof query.label === "string" ? query.label : preset?.label),
      value: pathLabels?.value ?? (typeof query.value === "string" ? query.value : preset?.value),
      icon,
      iconData,
      style: typeof query.style === "string" ? query.style : preset?.style,
      theme: typeof query.theme === "string" ? query.theme : preset?.theme,
      size: typeof query.size === "string" ? query.size : preset?.size,
      scale: typeof query.scale === "string" ? Number.parseFloat(query.scale) : undefined,
      labelBg: typeof query.labelBg === "string" ? query.labelBg : undefined,
      valueBg: typeof query.valueBg === "string" ? query.valueBg : undefined,
      labelColor: typeof query.labelColor === "string" ? query.labelColor : undefined,
      valueColor: typeof query.valueColor === "string" ? query.valueColor : undefined,
      borderColor: typeof query.borderColor === "string" ? query.borderColor : undefined,
      borderRadius: typeof query.borderRadius === "string" ? Number.parseInt(query.borderRadius, 10) : null,
      gradient: query.gradient === "true" || query.gradient === "1",
      uppercase: query.uppercase === "true" || query.uppercase === "1",
      compact: query.compact === "true" || query.compact === "1",
    };

    res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
    res.setHeader("Content-Security-Policy", SVG_CSP);
    res.send(generateBadge(params));
  } catch {
    const errorSvg = generateBadge({ label: "error", value: "badge generation failed" });
    res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
    res.setHeader("Content-Security-Policy", SVG_CSP);
    res.setHeader("Cache-Control", "no-store");
    res.status(500).send(errorSvg);
  }
}

export function getBadge(req: Request, res: Response): void {
  renderBadge(req.query, res);
}

export function getBadgeByPath(req: Request, res: Response): void {
  const pathSegment = req.params[0] || "";
  const lastDash = pathSegment.lastIndexOf("-");
  const label = lastDash > 0 ? pathSegment.slice(0, lastDash) : pathSegment || "label";
  const value = lastDash > 0 ? pathSegment.slice(lastDash + 1) : "value";

  renderBadge(req.query, res, {
    label: label.replace(/__/g, " "),
    value: value.replace(/__/g, " "),
  });
}

export function listIconsJSON(_req: Request, res: Response): void {
  res.json({
    icons: listIcons(),
    styles: getAvailableStyles(),
    themes: getAvailableThemes(),
    sizes: getAvailableSizes(),
    presets: PRESETS,
  });
}

export function postIcon(req: Request, res: Response): void {
  const { slug, type, data } = req.body || {};
  const result = addCustomIcon(slug, type, data);
  if (!result.success) {
    res.status(result.status).json({ error: result.error });
    return;
  }

  res.status(201).json({ message: `Icon "${slug}" added successfully` });
}
