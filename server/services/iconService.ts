import { getAvailableIcons, getBuiltinIcon, MAX_ICON_DATA_LEN, validateIconData } from "./badgeRenderer";

export { getBuiltinIcon };

export interface IconEntry {
  slug: string;
  type: string;
  data: string;
}

type AddIconResult =
  | { success: true }
  | { success: false; error: string; status: 400 | 409 | 413 | 507 };

const MAX_CUSTOM_ICONS = 100;
const MAX_STORED_ICON_BYTES = 2_000_000;
const customIcons = new Map<string, IconEntry>();
let storedIconBytes = 0;

export function getCustomIcon(slug: string): IconEntry | null {
  return customIcons.get(slug) ?? null;
}

export function resolveIcon(slug: string): { type: "builtin"; char: string } | { type: "custom"; data: string } | null {
  const builtin = getBuiltinIcon(slug);
  if (builtin !== null) return { type: "builtin", char: builtin };

  const custom = getCustomIcon(slug);
  return custom ? { type: "custom", data: custom.data } : null;
}

export function addCustomIcon(slug: string, type: string, data: string): AddIconResult {
  if (typeof slug !== "string" || !slug || typeof type !== "string" || !type.trim() ||
      typeof data !== "string" || !data) {
    return { success: false, status: 400, error: "Missing required fields: slug, type, data" };
  }
  if (slug.length > 64 || !/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(slug)) {
    return { success: false, status: 400, error: "Slug must contain 1–64 letters, digits, hyphens or underscores" };
  }
  if (type.length > 64) {
    return { success: false, status: 400, error: "Icon type too long (max 64 characters)" };
  }
  if (data.length > MAX_ICON_DATA_LEN) {
    return { success: false, status: 413, error: "Icon data too large (max 200KB)" };
  }
  if (!validateIconData(data)) {
    return { success: false, status: 400, error: "Invalid image data URI" };
  }
  if (getBuiltinIcon(slug) !== null) {
    return { success: false, status: 409, error: `Slug "${slug}" is reserved by a built-in icon` };
  }
  if (customIcons.has(slug)) {
    return { success: false, status: 409, error: `Slug "${slug}" already exists` };
  }
  if (customIcons.size >= MAX_CUSTOM_ICONS || storedIconBytes + data.length > MAX_STORED_ICON_BYTES) {
    return { success: false, status: 507, error: "Icon storage limit reached" };
  }

  customIcons.set(slug, { slug, type, data });
  storedIconBytes += data.length;
  return { success: true };
}

export function listIcons(): { builtin: string[]; custom: IconEntry[] } {
  return { builtin: getAvailableIcons(), custom: Array.from(customIcons.values()) };
}
