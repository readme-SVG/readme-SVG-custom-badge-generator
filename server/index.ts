import express, { NextFunction, Request, Response } from "express";
import fs from "fs";
import path from "path";
import rateLimit from "express-rate-limit";
import router from "./routes/routes";

const app = express();
app.disable("x-powered-by");

const postLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
  message: { error: "Too many requests, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader("Cache-Control", req.method === "GET" ? "public, max-age=300" : "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  next();
});

// Rate-limit uploads before parsing their JSON bodies.
app.post("*", postLimiter);
app.use(express.json({ limit: "256kb" }));

app.use((error: Error & { type?: string }, _req: Request, res: Response, next: NextFunction) => {
  if (error.type === "entity.parse.failed") {
    res.status(400).json({ error: "Invalid JSON body" });
  } else if (error.type === "entity.too.large") {
    res.status(413).json({ error: "Request body too large" });
  } else {
    next(error);
  }
});

app.use(router);

// ts-node runs from server/, while compiled code runs from server/dist/.
const staticRoot = [path.resolve(__dirname, ".."), path.resolve(__dirname, "../..")]
  .find(root => fs.existsSync(path.join(root, "index.html")));
if (!staticRoot) throw new Error("Unable to find frontend assets");

for (const asset of ["app.js", "badge-core.js", "styles.css"]) {
  app.get(`/${asset}`, (_req: Request, res: Response) => {
    res.sendFile(path.join(staticRoot, asset));
  });
}
app.use("/sample_svgs", express.static(path.join(staticRoot, "sample_svgs"), { index: false }));
app.get("*", (_req: Request, res: Response) => {
  res.sendFile(path.join(staticRoot, "index.html"));
});

if (require.main === module) {
  const port = Number.parseInt(process.env.PORT || "5000", 10);
  app.listen(port, "0.0.0.0", () => {
    console.log(`Badge Forge server listening on port ${port}`);
  });
}

export default app;
