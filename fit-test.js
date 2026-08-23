// Replicates the uScale branch from LiquidImage.resize() and the shader's
// UV mapping, to confirm cover actually fills and crops the right axis.
function uScale(fit, imageAspect, canvasAspect) {
  let scaleX = 1, scaleY = 1;
  if (fit === "cover") {
    if (canvasAspect > imageAspect) { scaleX = 1; scaleY = imageAspect / canvasAspect; }
    else { scaleX = canvasAspect / imageAspect; scaleY = 1; }
  } else if (canvasAspect > imageAspect) { scaleX = canvasAspect / imageAspect; scaleY = 1; }
  else { scaleX = 1; scaleY = imageAspect / canvasAspect; }
  return { scaleX, scaleY };
}
// shader: myUV = (vUv - (0.5,0.0)) * uScale + (0.5,0.0)
// Sampled source range per axis; inside [0,1] => cropped, outside => letterboxed.
function sampled({scaleX, scaleY}) {
  const xs = [0,1].map(v => (v - 0.5) * scaleX + 0.5);
  const ys = [0,1].map(v => (v - 0.0) * scaleY + 0.0);
  return { x: xs, y: ys };
}
const IMG = 0.75; // 1086x1448 portrait
const cases = [
  ["iPhone-ish 390x844", 390/844],
  ["small 360x800",      360/800],
  ["414x896",            414/896],
  ["landscape 740x360",  740/360],
  ["desktop box 750x1000", 750/1000],
];
for (const [name, ca] of cases) {
  for (const fit of ["cover","contain"]) {
    const s = uScale(fit, IMG, ca);
    const r = sampled(s);
    const cropX = r.x[0] >= -1e-9 && r.x[1] <= 1+1e-9;
    const cropY = r.y[0] >= -1e-9 && r.y[1] <= 1+1e-9;
    console.log(
      `${name.padEnd(22)} ${fit.padEnd(8)} uScale=(${s.scaleX.toFixed(3)},${s.scaleY.toFixed(3)})`,
      `x=[${r.x[0].toFixed(3)},${r.x[1].toFixed(3)}]${cropX?" CROP":" LETTERBOX"}`,
      `y=[${r.y[0].toFixed(3)},${r.y[1].toFixed(3)}]${cropY?" CROP":" LETTERBOX"}`
    );
  }
}
