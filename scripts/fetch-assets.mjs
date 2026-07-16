import { mkdir, writeFile } from "node:fs/promises";
import { Buffer } from "node:buffer";
import path from "node:path";

const ASSETS = {
  "hero-portrait.png":   "https://www.figma.com/api/mcp/asset/ab08d8cd-a271-43eb-9ea4-3431a068e6fa",
  "pill-bg.png":         "https://www.figma.com/api/mcp/asset/1bf35f23-13ae-4b8a-82d9-e132a046460c",
  "pill-icon.png":       "https://www.figma.com/api/mcp/asset/02107d5f-d326-49a1-9ae0-847dbc29533c",
  "about-me-ellipse.png":"https://www.figma.com/api/mcp/asset/5937cc0e-8a9a-42ff-9f7d-ccec31432f6e",
  "service-1.png":       "https://www.figma.com/api/mcp/asset/347276e9-a162-4fcb-b9ea-f702415eb852",
  "service-2.png":       "https://www.figma.com/api/mcp/asset/2b085cfe-a205-404c-aa6f-f35e47fae696",
  "service-3.png":       "https://www.figma.com/api/mcp/asset/90b0268a-f55b-4e94-be3a-4e17c0931dae",
  "ornament-1.png":      "https://www.figma.com/api/mcp/asset/81198a86-3407-4243-8da7-bc8455afcd34",
  "ornament-2.png":      "https://www.figma.com/api/mcp/asset/18d4be8e-27c5-4334-86bf-d23ceeccb747",
  "cta1-img-1.png":      "https://www.figma.com/api/mcp/asset/16b006d2-ccc4-442e-a8b4-2f88a2d27b07",
  "cta1-img-2.png":      "https://www.figma.com/api/mcp/asset/b0c2ea95-1516-477a-a1f7-7803a3be73b4",
  "cta1-img-3.png":      "https://www.figma.com/api/mcp/asset/521e5c8f-dc02-405e-aae0-216d3ee69b00",
  "cta1-img-4.png":      "https://www.figma.com/api/mcp/asset/33418d0f-fd54-4257-8efc-e3510ee89a20",
  "cta1-img-5.png":      "https://www.figma.com/api/mcp/asset/643abbad-8ce2-407c-b3fb-38e9dc87934d",
  "cta1-img-6.png":      "https://www.figma.com/api/mcp/asset/a7b3c240-7ec7-43d9-bdb2-b959d9573653",
  "cta2-hands.png":      "https://www.figma.com/api/mcp/asset/9793acdf-c567-4786-bf69-b154e21f588d",
};

const outDir = path.resolve("public", "images");
await mkdir(outDir, { recursive: true });

let ok = 0, fail = 0;
for (const [name, url] of Object.entries(ASSETS)) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    await writeFile(path.join(outDir, name), buf);
    console.log(`ok  ${name}  (${buf.length} bytes)`);
    ok++;
  } catch (err) {
    console.error(`fail ${name}: ${err.message}`);
    fail++;
  }
}
console.log(`\nDone. ${ok} ok, ${fail} failed.`);
process.exit(fail ? 1 : 0);
