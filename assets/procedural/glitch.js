// flash-montage glitch layer: the three effects measured in the Kimi K3.1 teaser.
//   macroblock  - rectangles of the frame displaced sideways and tinted (the "datamosh" tear)
//   chroma      - R/G/B copies drifting apart, pixelated (the closing moon)
//   codeChips   - small translucent labels of source code scattered over the frame
// All functions are pure: (ctx, source, k, seed) -> pixels. k is intensity 0..1, seed picks the pattern.

import { mulberry32 } from "./specimens.js";

const TINTS = ["rgba(255,80,160,0.35)", "rgba(80,255,170,0.30)", "rgba(110,90,255,0.35)", "rgba(255,255,255,0.25)", "rgba(40,40,60,0.45)"];

export function macroblock(ctx, source, k, seed, { w = ctx.canvas.width, h = ctx.canvas.height, block = 48 } = {}) {
  if (k <= 0) return;
  const r = mulberry32(seed);
  const n = Math.floor(6 + k * 140);
  const sw = source.videoWidth || source.naturalWidth || source.width, sh = source.videoHeight || source.naturalHeight || source.height;
  const sx = sw / w, sy = sh / h;
  for (let i = 0; i < n; i++) {
    const bw = block * (1 + Math.floor(r() * (2 + k * 10))), bh = block * (0.25 + r() * (0.6 + k * 2));
    const x = Math.floor(r() * (w / block)) * block, y = Math.floor(r() * (h / block)) * block;
    const dx = (r() - 0.5) * w * 0.35 * k;
    ctx.drawImage(source, x * sx, y * sy, bw * sx, bh * sy, x + dx, y, bw, bh);
    if (r() < 0.55) { ctx.fillStyle = TINTS[Math.floor(r() * TINTS.length)]; ctx.fillRect(x + dx, y, bw, bh); }
  }
  // horizontal tear lines
  for (let i = 0; i < k * 30; i++) {
    const y = Math.floor(r() * h), hh = 1 + Math.floor(r() * 4);
    ctx.drawImage(source, 0, y * sy, sw, hh * sy, (r() - 0.5) * 200 * k, y, w, hh);
  }
}

const _scratch = typeof document !== "undefined" ? document.createElement("canvas") : null;

export function chroma(ctx, source, k, seed, { w = ctx.canvas.width, h = ctx.canvas.height, pixel = 4 } = {}) {
  if (k <= 0) return;
  const r = mulberry32(seed);
  const lw = Math.max(8, Math.floor(w / pixel)), lh = Math.max(8, Math.floor(h / pixel));
  _scratch.width = lw; _scratch.height = lh;
  const s = _scratch.getContext("2d", { willReadFrequently: true });
  s.drawImage(source, 0, 0, lw, lh);
  const src = s.getImageData(0, 0, lw, lh), out = s.createImageData(lw, lh);
  const off = [[Math.round(-k * lw * 0.09 * (0.6 + r())), 0], [0, 0], [Math.round(k * lw * 0.09 * (0.6 + r())), Math.round((r() - 0.5) * k * 6)]];
  for (let y = 0; y < lh; y++) for (let x = 0; x < lw; x++) {
    const o = (y * lw + x) * 4;
    for (let c = 0; c < 3; c++) {
      const xx = Math.min(lw - 1, Math.max(0, x - off[c][0])), yy = Math.min(lh - 1, Math.max(0, y - off[c][1]));
      out.data[o + c] = src.data[(yy * lw + xx) * 4 + c];
    }
    out.data[o + 3] = 255;
  }
  s.putImageData(out, 0, 0);
  ctx.save();
  ctx.imageSmoothingEnabled = k < 0.5;
  ctx.drawImage(_scratch, 0, 0, w, h);
  ctx.restore();
}

export function codeChips(ctx, k, seed, lines, { w = ctx.canvas.width, h = ctx.canvas.height, scale = 1, dark = false } = {}) {
  if (k <= 0 || !lines?.length) return;
  const r = mulberry32(seed);
  const total = 70;
  const shown = Math.floor(total * Math.min(1, k));
  ctx.save();
  ctx.textBaseline = "middle";
  for (let i = 0; i < total; i++) {
    const big = r() < 0.18;
    const fs = (big ? 22 : 13) * scale * (h / 1080);
    const text = lines[Math.floor(r() * lines.length)];
    const x = r() * w * 0.9, y = r() * h * 0.95;
    const cut = 0.35 + r() * 0.65;
    if (i >= shown) continue;
    ctx.font = `${fs}px "JetBrains Mono", "IBM Plex Mono", Menlo, monospace`;
    const t = text.slice(0, Math.ceil(text.length * cut));
    const tw = ctx.measureText(t).width;
    ctx.fillStyle = dark ? "rgba(10,14,20,0.55)" : "rgba(160,170,180,0.42)";
    ctx.fillRect(x - 6, y - fs * 0.75, tw + 12, fs * 1.5);
    if (big) { ctx.fillStyle = "rgba(255,255,255,0.15)"; ctx.fillRect(x - 6, y - fs * 0.75, 3, fs * 1.5); }
    ctx.fillStyle = ["#e9fff1", "#cfe8ff", "#ffd9f0", "#ffffff"][i % 4];
    ctx.fillText(t, x, y);
  }
  ctx.restore();
}

// One call for a hold's glitch-out. k: 0..1 over the last frames of the hold.
export function glitchOut(ctx, source, k, frame, { lines, mode = "block", chips = true } = {}) {
  const { width: w, height: h } = ctx.canvas;
  ctx.clearRect(0, 0, w, h);
  if (mode === "chroma") chroma(ctx, source, k, frame * 31 + 7);
  if (mode === "block" || k > 0.6) macroblock(ctx, source, mode === "block" ? k : (k - 0.6) * 2, frame * 131 + 3);
  if (chips) codeChips(ctx, Math.min(1, k * 1.6), 4242, lines, { scale: 1 + k * 0.6 });
}
