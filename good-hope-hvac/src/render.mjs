// Renders src/kit.html frame-by-frame and pipes JPEG frames into ffmpeg.
// Usage: SCENE=intro FORMAT=h|v node src/render.mjs <out.mp4> [fps]
//        SCENE=intro FORMAT=h|v node src/render.mjs --stills <dir> t1 t2 ...
import { createRequire } from 'module';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); } catch { playwright = require('/opt/node22/lib/node_modules/playwright'); }

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const SCENE = process.env.SCENE || 'intro', FORMAT = process.env.FORMAT || 'h';
const [W, H] = FORMAT === 'v' ? [1080, 1920] : [1920, 1080];

const browser = await playwright.chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
page.on('pageerror', e => console.error('page error:', e.message));
await page.goto('file://' + path.join(here, 'kit.html') + `?scene=${SCENE}&format=${FORMAT}`);
await page.evaluate(() => window.ready);
const canvas = await page.$('canvas');

if (args[0] === '--stills') {
  const dir = args[1];
  for (const t of args.slice(2)) {
    await page.evaluate(t => render(t), Number(t));
    await canvas.screenshot({ path: path.join(dir, `${SCENE}_${FORMAT}_${t}.png`) });
  }
} else {
  const out = args[0], fps = Number(args[1] || 30);
  const duration = await page.evaluate(() => window.DURATION);
  const n = Math.round(duration * fps);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  for (let i = 0; i < n; i++) {
    await page.evaluate(t => render(t), i / fps);
    const buf = await canvas.screenshot({ type: 'jpeg', quality: 95 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
}
await browser.close();
