/**
 * CI: Fail build if forbidden words "public" or "private" appear in repo
 * (except TypeScript modifiers, package.json "private": true, angular.json "input": "public").
 * Run from repo root: node scripts/check-forbidden-words.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BACKEND_SRC = path.join(ROOT, 'backend', 'src');
const FRONTEND_SRC = path.join(ROOT, 'frontend', 'src');
const DOCS = path.join(ROOT, 'docs');
const README = path.join(ROOT, 'README.md');

const EXTENSIONS = new Set(['.ts', '.html', '.scss', '.json', '.md']);
const SKIP_DIRS = new Set(['node_modules', 'dist', '.angular', 'vendor']);
const FORBIDDEN = [
  { word: 'public', re: /\bpublic\b/gi },
  { word: 'private', re: /\bprivate\b/gi },
];

// Allowed: TS member modifier anywhere in line (private x, public x, private readonly x)
const TS_MODIFIER_LINE = /\b(private|public)(\s+readonly)?\s+[\w\(]/;
// Allowed: package.json "private": true
const PKG_PRIVATE_LINE = /^\s*"private"\s*:\s*true\s*$/;
// Allowed: angular.json "input": "public"
const ANGULAR_INPUT_PUBLIC = /"input"\s*:\s*"public"/;

function* walk(dir, base = dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    const rel = path.relative(base, full);
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      yield* walk(full, base);
    } else if (EXTENSIONS.has(path.extname(e.name))) {
      yield { full, rel, ext: path.extname(e.name) };
    }
  }
}

function isAllowedLine(line, filePath, ext) {
  if (ext === '.ts' && TS_MODIFIER_LINE.test(line)) return true;
  if (path.basename(filePath) === 'package.json' && PKG_PRIVATE_LINE.test(line)) return true;
  if (path.basename(filePath) === 'angular.json' && ANGULAR_INPUT_PUBLIC.test(line)) return true;
  // Exclude docs that describe the rule or migration
  const base = path.basename(filePath);
  if (base === 'BLUEPRINT.md' || base === 'README.md') return true;
  return false;
}

const violations = [];

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  const ext = path.extname(filePath);
  lines.forEach((line, i) => {
    if (isAllowedLine(line, filePath, ext)) return;
    for (const { word, re } of FORBIDDEN) {
      if (re.test(line)) {
        violations.push({
          file: path.relative(ROOT, filePath),
          line: i + 1,
          word,
          snippet: line.trim().slice(0, 80),
        });
      }
    }
  });
}

for (const { full, rel } of walk(BACKEND_SRC, ROOT)) scanFile(full);
for (const { full } of walk(FRONTEND_SRC, ROOT)) scanFile(full);
if (fs.existsSync(README)) scanFile(README);
for (const { full } of walk(DOCS, ROOT)) scanFile(full);

if (violations.length > 0) {
  console.error('Forbidden words (public/private) found. Use VIS_A and VIS_B only.\n');
  violations.forEach((v) => {
    console.error(`  ${v.file}:${v.line}  "${v.word}"  | ${v.snippet}`);
  });
  console.error('\nBuild failed: remove or replace with VIS_A/VIS_B.');
  process.exit(1);
}

console.log('check-forbidden-words: OK (no public/private in labels, APIs, DB, vars, comments).');
process.exit(0);
