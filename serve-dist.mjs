import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const ROOT = new URL(".", import.meta.url).pathname.replace(/\/$/, "");
const DIST = join(ROOT, "dist");
const PORT = Number(process.env.PORT ?? 3000);

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
  ".map": "application/json; charset=utf-8",
};

async function tryFile(p: string): Promise<string | null> {
  try {
    const s = await stat(p);
    if (s.isFile()) return p;
  } catch {}
  return null;
}

const server = createServer(async (req, res) => {
  try {
    const url = decodeURIComponent((req.url ?? "/").split("?")[0]);
    let rel = normalize(url).replace(/^(\.\.[/\\])+/, "");
    if (rel === "/" || rel === "") rel = "/index.html";
    let file = join(DIST, rel);
    let found = await tryFile(file);
    if (!found && !extname(rel)) {
      // SPA-ish fallback: try .html for the route, then index.html
      found = (await tryFile(join(DIST, rel + ".html"))) ?? (await tryFile(join(DIST, rel, "index.html")));
    }
    if (!found) found = await tryFile(join(DIST, "index.html"));
    if (!found) {
      res.writeHead(404).end("Not found");
      return;
    }
    const body = await readFile(found);
    res.writeHead(200, { "Content-Type": MIME[extname(found)] ?? "application/octet-stream" });
    res.end(body);
  } catch (e) {
    res.writeHead(500).end(String(e));
  }
});

server.listen(PORT, () => {
  console.log(`Draftoryn web app served at http://localhost:${PORT}`);
});
