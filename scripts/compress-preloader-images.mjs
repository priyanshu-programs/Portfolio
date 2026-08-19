import sharp from "sharp";
import { readFile, writeFile, unlink, stat } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const imagesDir = path.join(__dirname, "..", "public", "images");

const report = (src, out, before, after) => {
  const pct = (100 * (1 - after / before)).toFixed(1);
  console.log(
    `${src} -> ${out}: ${(before / 1024).toFixed(0)}KB -> ${(after / 1024).toFixed(0)}KB (-${pct}%)`
  );
};

// hero-portrait.png is also the source image for the auto-generated
// src/components/hero/silhouette-points.ts (generator script not present in
// this repo) — dimensions and pixel content must stay effectively unchanged,
// so this re-encodes only, no resize.
{
  const src = "hero-portrait.png";
  const out = "hero-portrait.webp";
  const srcPath = path.join(imagesDir, src);
  const outPath = path.join(imagesDir, out);

  const input = await readFile(srcPath);
  const before = input.length;

  let quality = 90;
  let output = await sharp(input).webp({ quality, effort: 6 }).toBuffer();
  while (output.length > before * 0.8 && quality > 75) {
    quality -= 5;
    output = await sharp(input).webp({ quality, effort: 6 }).toBuffer();
  }

  await writeFile(outPath, output);
  await unlink(srcPath);

  const after = (await stat(outPath)).size;
  report(src, out, before, after);
  if (after > before * 0.8) {
    console.warn(
      `  warning: only reached quality ${quality}, still short of a 20% reduction`
    );
  }
}

// about 1.jpg is only used as the preloader's outer-panel fallback, rendered
// at ~20-34vw, so downsizing the source is safe.
{
  const src = "about 1.jpg";
  const out = "about-1.webp";
  const srcPath = path.join(imagesDir, src);
  const outPath = path.join(imagesDir, out);

  const input = await readFile(srcPath);
  const before = input.length;

  const output = await sharp(input)
    .resize({ width: 1200, withoutEnlargement: true })
    .webp({ quality: 78 })
    .toBuffer();

  await writeFile(outPath, output);
  await unlink(srcPath);

  const after = (await stat(outPath)).size;
  report(src, out, before, after);
}
