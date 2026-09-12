import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { serve } from "@hono/node-server";
import app from "./index";

// Load .env automatically if running via node/tsx
const envPath = join(process.cwd(), ".env");
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, "utf8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx > 0) {
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

const PORT = Number(process.env.PORT) || 8787;
serve({ fetch: app.fetch, port: PORT }, () => {
  // eslint-disable-next-line no-console
  console.log(`Draftoryn server listening on http://localhost:${PORT}`);
});
