import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync, readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join, dirname} from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
test('All three entry pages, CSS and module imports resolve within a Pages subdirectory', () => {
  for (const name of readdirSync(root).filter(file => /\.(html|css|js)$/.test(file))) {
    const source = readFileSync(join(root, name), 'utf8');
    const references = name.endsWith('.html') ? [...source.matchAll(/(?:src|href)="([^"#]+)"/g)]
      : name.endsWith('.css') ? [...source.matchAll(/url\(['"]?([^'"\)]+)['"]?\)/g)]
      : [...source.matchAll(/from\s*['"]([^'"]+)['"]/g)];
    for (const [, reference] of references) {
      if (/^(https?:|data:)/.test(reference)) continue;
      assert(!reference.startsWith('/'), `${name} must use relative assets`);
      assert(existsSync(join(root, dirname(name), reference.split(/[?#]/)[0])), `${name}: missing ${reference}`);
    }
    if (name.endsWith('.html')) {
      const ids = [...source.matchAll(/id="([^"]+)"/g)].map(match => match[1]);
      assert.equal(ids.length, new Set(ids).size, `${name}: duplicate IDs`);
    }
  }
  for (const file of ['index.html', 'classic.html', 'modern.html', '.nojekyll', 'horizon.webp']) assert(existsSync(join(root, file)));
});
test('Every fixed modern controller ID exists in modern.html', () => {
  const html = readFileSync(join(root, 'modern.html'), 'utf8'), js = readFileSync(join(root, 'modern.js'), 'utf8');
  const ids = new Set([...html.matchAll(/id="([^"]+)"/g)].map(match => match[1]));
  for (const [, id] of js.matchAll(/\$\('([^']+)'\)/g)) assert(ids.has(id), `Missing UI element ${id}`);
});
test('Both editions keep mouse control after the cursor leaves the canvas', () => {
  const classic = readFileSync(join(root, 'game.js'), 'utf8');
  const modern = readFileSync(join(root, 'modern.js'), 'utf8');
  for (const [name, source] of [['Classic', classic], ['Neon Horizon', modern]]) {
    assert.match(source, /pointerenter/);
    assert.match(source, /(?:window\.)?addEventListener\('pointermove'/, `${name} must listen outside the canvas`);
    assert.match(source, /mouseControl/);
  }
});
test('Modern module legend mirrors the letter printed on each falling capsule', () => {
  const html = readFileSync(join(root, 'modern.html'), 'utf8');
  const renderer = readFileSync(join(root, 'neon-renderer.js'), 'utf8');
  const controller = readFileSync(join(root, 'modern.js'), 'utf8');
  for (const code of ['E', 'L', 'D', 'C', 'S', 'P', 'B']) {
    const match = html.match(new RegExp(`data-power="${code}"[^>]*>\\s*<span[^>]*>([^<]+)</span>`));
    assert(match, `Missing ${code} in module legend`);
    assert.equal(match[1], code, `${code} legend badge must match its capsule`);
  }
  assert.match(renderer, /fillText\(d\.type,/);
  assert.match(controller, /textContent\s*=\s*module\.dataset\.power/);
});
