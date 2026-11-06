// Turns the Vite build (dist/) into ONE self-contained HTML file: all JS, CSS and images inlined.
// Usage: node scripts/make-single.mjs <output.html>
import { readFileSync, writeFileSync } from 'node:fs';

const dist = new URL('../dist/', import.meta.url);
const out = process.argv[2];
if (!out) throw new Error('Usage: node scripts/make-single.mjs <output.html>');

let html = readFileSync(new URL('index.html', dist), 'utf8');
const read = (p) => readFileSync(new URL(p.replace(/^\//, ''), dist), 'utf8');

// Stylesheets -> <style>
html = html.replace(/<link rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g, (_, href) => `<style>${read(href)}</style>`);

// Module scripts -> inline module script (must not contain a literal closing script tag)
let js = '';
html = html.replace(/<script type="module"[^>]*src="([^"]+)"[^>]*><\/script>/g, (_, src) => {
  js += read(src).replace(/<\/script/gi, '<\\/script');
  return '';
});
html = html.replace('</body>', () => `<script type="module">${js}</script>\n</body>`);

// Links that only make sense on a web server
html = html.replace(/<link rel="(manifest|apple-touch-icon|icon)"[^>]*>\s*/g, '');

writeFileSync(out, html);
console.log(`Wrote ${out} (${Math.round(html.length / 1024)} KB)`);
