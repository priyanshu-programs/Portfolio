import sharp from "sharp";
import { readFile, writeFile, unlink, stat } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const imagesDir = path.join(__dirname, "..", "public", "images");

const sources = [
  { src: "menu-home.jpg", out: "menu-home.webp" },
  { src: "menu-about.png", out: "menu-about.webp" },
  { src: "menu-work.png", out: "menu-work.webp" },
  { src: "menu-contact.png", out: "menu-contact.webp" },
];

for (const { src, out } of sources) {
  const srcPath = path.join(imagesDir, src);
  const outPath = path.join(imagesDir, out);

  const input = await readFile(srcPath);
  const before = input.length;

  const output = await sharp(input)
    .resize({ width: 1600, withoutEnlargement: true })
    .webp({ quality: 75 })
    .toBuffer();

  await writeFile(outPath, output);
  await unlink(srcPath);

  const after = (await stat(outPath)).size;
  console.log(
    `${src} -> ${out}: ${(before / 1024).toFixed(0)}KB -> ${(after / 1024).toFixed(0)}KB`
  );
}
