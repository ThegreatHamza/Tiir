#!/usr/bin/env node
// Translation check:
//  1. fr, en, ar and so have exactly the same keys, and no empty values.
//  2. Every key used in src (t("a.b"), t(`a.${x}`)) exists in every locale.
//  3. No hard-coded user-facing text in JSX (text nodes with letters).
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const LANGS = ["fr", "en", "ar", "so"];
const errors = [];

const flatten = (obj, prefix = "", out = {}) => {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object") flatten(v, key, out);
    else out[key] = v;
  }
  return out;
};

const locales = Object.fromEntries(
  LANGS.map((l) => [l, flatten(JSON.parse(readFileSync(join(root, "src/i18n/locales", `${l}.json`), "utf8")))]),
);

// 1. parity
const reference = new Set(Object.keys(locales.en));
for (const l of LANGS) {
  const keys = new Set(Object.keys(locales[l]));
  for (const k of reference) if (!keys.has(k)) errors.push(`[${l}] missing key: ${k}`);
  for (const k of keys) if (!reference.has(k)) errors.push(`[${l}] extra key (not in en): ${k}`);
  for (const [k, v] of Object.entries(locales[l])) if (typeof v !== "string" || v.trim() === "") errors.push(`[${l}] empty value: ${k}`);
  // interpolation variables must match en
  for (const k of reference) {
    const vars = (s) =>
      [...String(s ?? "").matchAll(/\{\{\s*(\w+)\s*\}\}/g)]
        .map((m) => m[1])
        .sort()
        .join(",");
    if (locales[l][k] !== undefined && vars(locales[l][k]) !== vars(locales.en[k])) {
      errors.push(`[${l}] interpolation mismatch in ${k}: "${locales[l][k]}"`);
    }
  }
}

// Plural keys (i18next): "x_one"/"x_other" satisfy a use of "x".
const has = (l, key) => key in locales[l] || `${key}_other` in locales[l] || Object.keys(locales[l]).some((k) => k.startsWith(`${key}.`));

// 2. keys used in code
const files = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name)) files.push(p);
  }
};
walk(join(root, "src"));

const STATIC = /\bt\(\s*"([a-zA-Z0-9_.]+)"/g;
const DYNAMIC = /\bt\(\s*`([a-zA-Z0-9_.]+)\.\$\{/g;
let used = 0;
for (const f of files) {
  const src = readFileSync(f, "utf8");
  for (const m of src.matchAll(STATIC)) {
    used++;
    for (const l of LANGS) if (!has(l, m[1])) errors.push(`[${l}] key used in ${relative(root, f)} is missing: ${m[1]}`);
  }
  for (const m of src.matchAll(DYNAMIC)) {
    used++;
    for (const l of LANGS) if (!has(l, m[1])) errors.push(`[${l}] key prefix used in ${relative(root, f)} is missing: ${m[1]}.*`);
  }
  // labelKey: "nav.x" style references
  for (const m of src.matchAll(/(?:label|title|description)Key:\s*"([a-zA-Z0-9_.]+)"/g)) {
    for (const l of LANGS) if (!has(l, m[1])) errors.push(`[${l}] key referenced in ${relative(root, f)} is missing: ${m[1]}`);
  }

  // 3. hard-coded JSX text
  if (f.endsWith(".tsx")) {
    const lines = src.split("\n");
    lines.forEach((line, i) => {
      const m = /(?<!=)>\s*([^<>{}]*[A-Za-zÀ-ÿ؀-ۿ]{2,}[^<>{}]*)\s*</.exec(line);
      if (m && !/=>|&&|\|\||\?\s|^\s*\/\/|^\s*[,|&]/.test(m[1]) && !/^[\s—…·×%-]*$/.test(m[1])) {
        errors.push(`hard-coded text in ${relative(root, f)}:${i + 1}: "${m[1].trim()}"`);
      }
    });
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  console.error(`\n✗ i18n check failed with ${errors.length} problem(s).`);
  process.exitCode = 1;
} else {
  console.log(`✓ i18n: ${reference.size} keys × ${LANGS.length} languages, ${used} usages checked, no hard-coded JSX text.`);
}
