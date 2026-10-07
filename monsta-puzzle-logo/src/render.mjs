// Renders src/puzzle.html frame-by-frame and pipes PNGs into ffmpeg.
// Usage: node src/render.mjs [--vertical] <out.mp4> [fps]         full video (no audio)
//        node src/render.mjs --stills <dir> t1 t2 ...  preview frames
import { createRequire } from 'module';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); } catch { playwright = require('/opt/node22/lib/node_modules/playwright'); }

const here = path.dirname(fileURLToPath(import.meta.url));
let args = process.argv.slice(2);
const vertical = args.includes('--vertical'); args = args.filter(a => a !== '--vertical');
const browser = await playwright.chromium.launch();
const page = await browser.newPage({ viewport: vertical ? { width: 1080, height: 1920 } : { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
await page.goto('file://' + path.join(here, 'puzzle.html') + (vertical ? '?vertical' : ''));
await page.evaluate(() => window.ready);
const canvas = await page.$('canvas');

if (args[0] === '--stills') {
  const dir = args[1];
  for (const t of args.slice(2)) {
    await page.evaluate(t => render(t), Number(t));
    await canvas.screenshot({ path: path.join(dir, `still_${t}.png`) });
  }
} else {
  const out = args[0], fps = Number(args[1] || 30);
  const duration = await page.evaluate(() => window.DURATION);
  const n = Math.round(duration * fps);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  for (let i = 0; i < n; i++) {
    await page.evaluate(t => render(t), i / fps);
    const buf = await canvas.screenshot({ type: 'jpeg', quality: 95 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 90 === 0) console.log(`frame ${i}/${n}`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
}
await browser.close();
