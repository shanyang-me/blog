#!/usr/bin/env node
// Browser checks for the post. Usage: node tools/probe-blog.mjs <base-url> <outdir>
// Waits for 'load', not network idle: the local Python server has no HTTP range support, so the
// video keeps one connection open and the page never goes idle (GitHub Pages serves ranges).
// Prints {widths, consoleErrors, glbBeforeClick, scrollAfterSpace} and saves a full-page screenshot per width.
import { createRequire } from 'node:module';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
// The local pnpm store that holds playwright-core is configured in the untracked tools/private.local.json.
const pnpm = JSON.parse(readFileSync(new URL('./private.local.json', import.meta.url), 'utf8')).playwright_core;
const pkg = readdirSync(pnpm).find((d) => d.startsWith('playwright-core@'));
const { chromium } = require(join(pnpm, pkg, 'node_modules/playwright-core'));

const [base, outdir] = process.argv.slice(2);
mkdirSync(outdir, { recursive: true });
const url = new URL('/blog/agent-built-game-assets/', base).href;
const ctx = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), 'probe-blog-')), {
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const result = { widths: {}, consoleErrors: [], glbBeforeClick: 0, scrollAfterSpace: null };

for (const width of [375, 768, 1440]) {
  const page = await ctx.newPage();
  await page.setViewportSize({ width, height: 900 });
  page.on('console', (m) => { if (m.type() === 'error') result.consoleErrors.push(`${width}: ${m.text()}`); });
  page.on('pageerror', (e) => result.consoleErrors.push(`${width}: ${e.message}`));
  await page.goto(url, { waitUntil: 'load' });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  result.widths[width] = { overflow };
  await page.screenshot({ path: join(outdir, `post-${width}.png`) });
  await page.close();
}

const page = await ctx.newPage();
await page.setViewportSize({ width: 1280, height: 800 });
let glb = 0;
page.on('request', (r) => { if (r.url().endsWith('.glb')) glb += 1; });
page.on('pageerror', (e) => result.consoleErrors.push(`game: ${e.message}`));
await page.goto(url, { waitUntil: 'load' });
result.glbBeforeClick = glb;
const embed = page.locator('.embed[data-src*="/game/"]');
await embed.scrollIntoViewIfNeeded();
await embed.locator('button').click();
await page.waitForTimeout(6000);
const frame = page.frameLocator('.embed iframe').first();
await frame.locator('body').click({ position: { x: 20, y: 300 } });
// Measure after the focusing click: Playwright scrolls the iframe into view as part of clicking it.
const before = await page.evaluate(() => scrollY);
for (let i = 0; i < 5; i += 1) await page.keyboard.press('Space');
await page.keyboard.press('ArrowDown');
await page.waitForTimeout(500);
result.scrollAfterSpace = (await page.evaluate(() => scrollY)) - before;
await page.screenshot({ path: join(outdir, 'game-embed.png') });

console.log(JSON.stringify(result, null, 2));
await ctx.close();
