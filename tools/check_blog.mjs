#!/usr/bin/env node
// Assertions over the built _site/. Usage: node tools/check_blog.mjs [--only group]
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SITE = path.join(ROOT, '_site');
// The site is a project page served under /blog/; _site/ maps to that prefix.
const BASE = '/blog/';
const POST_URL = '/blog/agent-built-game-assets/';
const POST_PATH = 'agent-built-game-assets/index.html';
const ASSETS = 'assets/agent-built-game-assets';
const failures = [];
// Private terms live in an untracked local file so the public repo never names them.
const PRIVATE = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools', 'private.local.json'), 'utf8'));
const allowed = (t) => PRIVATE.allow.reduce((acc, phrase) => acc.replaceAll(phrase, ''), t.toLowerCase());
const fail = (group, msg) => failures.push(`FAIL ${group}: ${msg}`);
const exists = (p) => fs.existsSync(path.join(SITE, p));
const read = (p) => fs.readFileSync(path.join(SITE, p), 'utf8');

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
}

const groups = {
  config() {
    if (!exists('feed.xml')) return fail('config', '_site/feed.xml missing');
    for (const p of ['tools', 'drafts', 'README.md']) {
      if (exists(p)) fail('config', `_site/${p} should be excluded`);
    }
  },
  pages() {
    if (!exists('index.html')) return fail('pages', 'index.html missing');
    if (!read('index.html').includes(`href="${POST_URL}"`)) fail('pages', 'blog index does not link the post');
  },
  links() {
    for (const file of walk(SITE).filter((f) => f.endsWith('.html'))) {
      const html = fs.readFileSync(file, 'utf8');
      const rel = path.relative(SITE, file);
      for (const m of html.matchAll(/\b(?:src|href|poster|data-src)="([^"#?]+)/g)) {
        const url = m[1];
        if (/^(https?:|mailto:|data:|\/\/)/.test(url)) continue;
        if (url.startsWith('/') && !url.startsWith(BASE)) { fail('links', `${rel} -> ${url} points outside ${BASE}`); continue; }
        let target = url.startsWith(BASE) ? url.slice(BASE.length) : path.join(path.dirname(rel), url);
        if (target === '' || target.endsWith('/')) target += 'index.html';
        if (!exists(target) && !exists(path.join(target, 'index.html'))) fail('links', `${rel} -> ${url} not found`);
      }
    }
  },
  assets() {
    const dir = path.join(ROOT, ASSETS);
    const files = walk(dir);
    if (!files.length) return fail('assets', `${ASSETS} is empty`);
    const total = files.reduce((n, f) => n + fs.statSync(f).size, 0);
    if (total > 40 * 1024 * 1024) fail('assets', `total ${(total / 1048576).toFixed(1)} MB > 40 MB`);
    const dims = (f) => {
      const out = execSync(`sips -g pixelWidth -g pixelHeight "${f}"`, { encoding: 'utf8' });
      return [+out.match(/pixelWidth: (\d+)/)[1], +out.match(/pixelHeight: (\d+)/)[1]];
    };
    for (const f of files.filter((x) => /\.(jpe?g|png|webp)$/i.test(x))) {
      const rel = path.relative(dir, f);
      const kb = fs.statSync(f).size / 1024;
      if (kb > 250) fail('assets', `${rel} is ${kb.toFixed(0)} KB > 250 KB`);
      const [w, h] = dims(f);
      if (w > 1600) fail('assets', `${rel} is ${w}px wide > 1600`);
      if (rel === 'og.jpg' && (w !== 1200 || h !== 630)) fail('assets', `og.jpg is ${w}x${h}, want 1200x630`);
    }
    const limits = { 'video/ue-gameplay.mp4': 10, 'video/turntable.mp4': 3 };
    for (const [rel, mb] of Object.entries(limits)) {
      const f = path.join(dir, rel);
      if (!fs.existsSync(f)) { fail('assets', `${rel} missing`); continue; }
      if (fs.statSync(f).size > mb * 1048576) fail('assets', `${rel} > ${mb} MB`);
    }
    if (!fs.existsSync(path.join(dir, 'og.jpg'))) fail('assets', 'og.jpg missing');
  },
  banned() {
    const words = PRIVATE.banned;
    const textFiles = walk(SITE).filter((f) => /\.(html|js|md|json|xml|txt)$/.test(f));
    for (const f of textFiles) {
      // Verbatim prompt text and the source article URL are the two allowed exceptions.
      const text = allowed(fs.readFileSync(f, 'utf8'));
      for (const w of words) if (text.includes(w)) fail('banned', `${path.relative(SITE, f)} contains "${w}"`);
    }
    for (const sub of ['game', 'viewer']) {
      const dir = path.join(SITE, ASSETS, sub);
      if (!fs.existsSync(path.join(dir, 'index.html'))) { fail('banned', `${ASSETS}/${sub}/index.html missing`); continue; }
      for (const f of walk(dir)) {
        if (f.endsWith('.gltf.json')) fail('banned', `${path.relative(SITE, f)} should be a .glb`);
        if (/\.(js|html)$/.test(f) && fs.readFileSync(f, 'utf8').includes('.gltf.json')) {
          fail('banned', `${path.relative(SITE, f)} still loads .gltf.json`);
        }
      }
    }
  },
  committed() {
    const files = execSync('git ls-files', { cwd: ROOT, encoding: 'utf8' })
      .split('\n').filter((f) => /\.(mjs|js|py|sh|html|md|yml|json|css)$|^\.gitignore$/.test(f));
    for (const f of files) {
      const text = allowed(fs.readFileSync(path.join(ROOT, f), 'utf8'));
      for (const w of PRIVATE.banned) if (text.includes(w)) fail('committed', `${f} contains "${w}"`);
    }
  },
  post() {
    const page = POST_PATH;
    if (!exists(page)) return fail('post', `${page} missing`);
    const html = read(page);
    const head = html.split('</head>')[0];
    for (const needle of ['GTM-KVD4ZFQ3', 'property="og:title"', 'property="og:description"',
      'property="og:image"', 'name="twitter:card" content="summary_large_image"']) {
      if (!head.includes(needle)) fail('post', `head missing ${needle}`);
    }
    if (!/@misc\{/.test(html)) fail('post', 'no Cite-as BibTeX block');
    if (!read('feed.xml').includes(`https://shanyang.me${POST_URL}`)) fail('post', 'feed.xml lacks absolute post URL');

    const body = html.split('<div class="post-body">')[1]?.split('<section class="cite">')[0] ?? '';
    const main = body.split('id="appendix-prompts"')[0];
    const words = main.replace(/<[^>]+>/g, ' ').split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w)).length;
    if (words < 800 || words > 4500) fail('post', `body is ${words} words, want 800-4500`);
    const tldr = body.split('class="tldr"')[1]?.split('</div>')[0] ?? '';
    for (const n of ['$68', '4.7 hours']) if (!tldr.includes(n)) fail('post', `TL;DR missing ${n}`);
    if (!body.includes('This post was drafted by Claude and reviewed and edited by me')) fail('post', 'missing drafting disclosure');
    if (!/href="https:\/\/higgsfield\.ai\/[^"]+"/.test(body)) fail('post', 'missing link to the Higgsfield article');
    const quotes = (body.match(/<blockquote/g) || []).length;
    if (quotes > 1) fail('post', `${quotes} blockquotes, want at most 1`);
    if (!/<h2[^>]*>Coding Agent for Game Pipeline<\/h2>[\s\S]*?<svg class="graph"/.test(body)) fail('post', 'pipeline graph missing from its section');
    for (const n of ['$3.47', '$5.15', '$4.63', '$8.42', '$4.76', '$9.07', '$6.48', '$7.30', '$14.12', '$63.40',
      '$4.55', '$2.35', '0.009', '57.9']) {
      if (!body.includes(n)) fail('post', `number ${n} missing`);
    }
    for (const n of ['$65', '$64.97', '$1.57', '待填']) if (body.includes(n)) fail('post', `stale value ${n} present`);
    const embeds = body.match(/class="embed"[^>]*data-src="([^"]+)"/g) || [];
    if (!embeds.some((e) => e.includes('/game/')) || !embeds.some((e) => e.includes('/viewer/'))) {
      fail('post', 'needs both a game and a viewer embed');
    }
    for (const v of body.match(/<video[^>]*>/g) || []) if (!/poster="/.test(v)) fail('post', 'video without poster');
    if (!(body.match(/<video/g) || []).length) fail('post', 'no video');
    // Claims the final review found unsupported by the experiment records.
    for (const bad of ['faithfully reproduced','inherited from the video frame', 'cheaper than modeling from scratch',
      'are mine', 'only tiled normal maps', 'when played in three.js', 'my judgment', 'what we could not see',
      'about $6 and 12 minutes', 'prototype quality', '30–50%', 'shippable']) {
      if (body.toLowerCase().includes(bad.toLowerCase())) fail('post', `unsupported or misattributed claim: "${bad}"`);
    }
    for (const need of ['measured by the supervising session', 'supervising session installed',
      'game/index.html?enemy=tripo']) {
      if (!body.includes(need)) fail('post', `missing "${need}"`);
    }
    // Manual-production comparison is the headline; it must carry its method and the quality caveat.
    const title = (html.match(/<h1>([^<]+)<\/h1>/) || [])[1] || '';
    if (!title.includes('Person-Days')) fail('post', `title lacks the manual comparison: "${title}"`);
    for (const need of ['person-days', 'not quotes']) {
      if (!body.includes(need)) fail('post', `manual comparison missing "${need}"`);
    }
    if (!/<td>Boss<\/td>(\s*<td[^>]*>[^<]*<\/td>){2}\s*<td[^>]*>13–20<\/td>/.test(body)) fail('post', 'manual estimate table missing the boss row');
    const minutes = +(html.match(/(\d+) min read/) || [0, 999])[1];
    if (minutes > 25) fail('post', `read time ${minutes} min counts the appendix`);
  },
  prompts() {
    const html = read(POST_PATH);
    const appendix = html.split('id="appendix-prompts"')[1] ?? '';
    const n = (appendix.match(/<details/g) || []).length;
    if (n !== 9) fail('prompts', `${n} prompt <details>, want 9`);
    if (!appendix.includes('class names lightly renamed')) fail('prompts', 'missing rename note');
    if (/\{\{|\{%/.test(appendix)) fail('prompts', 'unrendered Liquid in appendix');
  },
};

const i = process.argv.indexOf('--only');
const only = i >= 0 ? process.argv[i + 1] : null;
if (!fs.existsSync(SITE)) {
  console.log('FAIL setup: _site missing, run tools/build.sh');
  process.exit(1);
}
for (const [name, fn] of Object.entries(groups)) if (!only || only === name) fn();
if (failures.length) { console.log(failures.join('\n')); process.exit(1); }
console.log(`OK ${only || Object.keys(groups).join(',')}`);
