import { Router } from "express";
import { getBadge, getBadgeByPath, listIconsJSON, postIcon } from "../controllers/badgeController";

const router = Router();

// Icon catalog — JSON listing of all available icons, styles, themes, presets
router.get("/list.json", listIconsJSON);

// Both URLs use the same renderer so links exported by the frontend work in server mode.
router.get(["/badge", "/api/badge"], getBadge);

// Badge generation via path (shields.io-compatible)
// e.g., /badge/build-passing?style=flat&theme=terminal
router.get("/badge/*", getBadgeByPath);

// Custom icon upload
router.post("/icon", postIcon);

export default router;
