#!/usr/bin/env node
/**
 * ============================================================
 * 16 KB PAGE-SIZE VERIFICATION
 * ============================================================
 * Android 15+ can run with 16 KB memory pages, and Google Play
 * requires every native library in an app to support it (ELF
 * PT_LOAD segments aligned to 16 KB — p_align >= 0x4000).
 *
 * A recent NDK/AGP version alone does NOT prove this: only the
 * built artifacts do. This script inspects the actual ELF headers
 * of every native library it can find, so the result is evidence
 * rather than an assumption.
 *
 * Usage:
 *   node scripts/verify-16kb.js                 # node_modules .so + .aar
 *   node scripts/verify-16kb.js app-release.aab # also inspect an AAB/APK
 *   node scripts/verify-16kb.js app-release.apk
 *
 * Exit code 0 = all libraries 16 KB aligned, 1 = at least one
 * 4 KB-only library (not Play-ready), 2 = nothing found to check.
 * ============================================================
 */
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const ROOT = path.join(__dirname, "..");
const MIN_ALIGN = 0x4000; // 16384

// 16 KB page sizes only affect 64-bit ABIs (arm64-v8a, x86_64); Android 15/16
// 16 KB devices do not run 32-bit code, so armeabi-v7a/x86 libraries are
// reported for completeness but are not part of the Play requirement.
const ABI_64 = new Set(["arm64-v8a", "x86_64"]);
const ABI_32 = new Set(["armeabi-v7a", "x86"]);
function abiFromName(name) {
  const m = /(arm64-v8a|armeabi-v7a|x86_64|x86)/.exec(name);
  return m ? m[1] : "unknown";
}
function isRelevant(abi) {
  return abi === "unknown" || ABI_64.has(abi);
}

function loadAlignments(buf) {
  if (buf.length < 64 || buf.toString("latin1", 0, 4) !== "\x7fELF") return null;
  const is64 = buf[4] === 2;
  let phoff, phentsize, phnum;
  try {
    if (is64) {
      phoff = Number(buf.readBigUInt64LE(32));
      phentsize = buf.readUInt16LE(54);
      phnum = buf.readUInt16LE(56);
    } else {
      phoff = buf.readUInt32LE(28);
      phentsize = buf.readUInt16LE(42);
      phnum = buf.readUInt16LE(44);
    }
  } catch {
    return null;
  }
  const loads = [];
  for (let i = 0; i < phnum; i++) {
    const off = phoff + i * phentsize;
    if (off + phentsize > buf.length) break;
    const type = buf.readUInt32LE(off);
    if (type !== 1) continue; // PT_LOAD
    loads.push(is64 ? Number(buf.readBigUInt64LE(off + 48)) : buf.readUInt32LE(off + 28));
  }
  return loads.length ? loads : null;
}

/** Minimal ZIP reader (central directory) so .aar/.apk/.aab can be scanned without deps. */
function readZipEntries(buf) {
  const EOCD = 0x06054b50;
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 66000); i--) {
    if (buf.readUInt32LE(i) === EOCD) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) return null;
  const count = buf.readUInt16LE(eocd + 10);
  let off = buf.readUInt32LE(eocd + 16);
  const entries = [];
  for (let i = 0; i < count && off + 46 <= buf.length; i++) {
    if (buf.readUInt32LE(off) !== 0x02014b50) break;
    const method = buf.readUInt16LE(off + 10);
    const compSize = buf.readUInt32LE(off + 20);
    const nameLen = buf.readUInt16LE(off + 28);
    const extraLen = buf.readUInt16LE(off + 30);
    const commentLen = buf.readUInt16LE(off + 32);
    const localOff = buf.readUInt32LE(off + 42);
    const name = buf.toString("utf8", off + 46, off + 46 + nameLen);
    entries.push({ name, method, compSize, localOff });
    off += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

function extractEntry(buf, entry) {
  const lh = entry.localOff;
  if (buf.readUInt32LE(lh) !== 0x04034b50) return null;
  const nameLen = buf.readUInt16LE(lh + 26);
  const extraLen = buf.readUInt16LE(lh + 28);
  const start = lh + 30 + nameLen + extraLen;
  const raw = buf.subarray(start, start + entry.compSize);
  if (entry.method === 0) return raw;
  if (entry.method === 8) {
    try {
      return zlib.inflateRawSync(raw);
    } catch {
      return null;
    }
  }
  return null;
}

function walk(dir, out, exts) {
  let names;
  try {
    names = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const d of names) {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) {
      if (d.name === ".git" || d.name === "build" || d.name === ".gradle") continue;
      walk(p, out, exts);
    } else if (exts.some((e) => d.name.endsWith(e))) out.push(p);
  }
  return out;
}

const results = []; // { source, lib, minAlign }

function scanArchive(file) {
  const buf = fs.readFileSync(file);
  const entries = readZipEntries(buf);
  if (!entries) {
    console.error(`! could not read archive: ${file}`);
    return;
  }
  for (const e of entries) {
    if (!e.name.endsWith(".so")) continue;
    const data = extractEntry(buf, e);
    if (!data) continue;
    const loads = loadAlignments(data);
    if (loads)
      results.push({
        source: `${path.basename(file)}:${e.name}`,
        lib: path.basename(e.name),
        abi: abiFromName(e.name),
        minAlign: Math.min(...loads),
      });
  }
}

// 1. node_modules: loose .so under android ABI folders + Android .aar archives
const nm = path.join(ROOT, "node_modules");
if (fs.existsSync(nm)) {
  for (const p of walk(nm, [], [".so"])) {
    const isAndroid = /[\\/](jniLibs|jni)[\\/]|arm64-v8a|armeabi-v7a|x86_64|[\\/]x86[\\/]|prefab[\\/]modules/.test(p);
    if (!isAndroid) continue;
    const loads = loadAlignments(fs.readFileSync(p));
    if (loads)
      results.push({
        source: path.relative(ROOT, p),
        lib: path.basename(p),
        abi: abiFromName(p),
        minAlign: Math.min(...loads),
      });
  }
  for (const p of walk(nm, [], [".aar"])) scanArchive(p);
}

// 2. Only artifacts explicitly passed on the command line. Stale build outputs
// committed to the repo (e.g. android/app/release/*.aab) describe an OLD build
// and must not be mixed into the dependency result.
const explicit = process.argv.slice(2).filter((a) => /\.(apk|aab|aar)$/i.test(a));
if (explicit.length) explicit.forEach(scanArchive);
else {
  console.log("Scanning installed dependencies only (pass an .apk/.aab to check a built artifact).\n");
}

if (results.length === 0) {
  console.error("No native libraries found. Run npm install, or pass an APK/AAB path.");
  process.exit(2);
}

const relevant = results.filter((r) => isRelevant(r.abi));
const bad = relevant.filter((r) => r.minAlign < MIN_ALIGN);
const byAbi = new Map();
for (const r of results) {
  if (!byAbi.has(r.abi)) byAbi.set(r.abi, { total: 0, ok: 0, bad: 0 });
  const e = byAbi.get(r.abi);
  e.total++;
  if (r.minAlign >= MIN_ALIGN) e.ok++;
  else e.bad++;
}

console.log(`Scanned ${results.length} native libraries.`);
for (const [abi, e] of [...byAbi.entries()].sort()) {
  const flag = ABI_32.has(abi) ? " (32-bit: 16 KB not applicable)" : "";
  console.log(`  ${abi}: ${e.total} libs — 16 KB aligned ${e.ok}, 4 KB-only ${e.bad}${flag}`);
}

if (bad.length === 0) {
  console.log(
    `\n✅ PASS — every 64-bit native library has PT_LOAD p_align >= 0x${MIN_ALIGN.toString(16)} (16 KB).`
  );
  process.exit(0);
}
console.log(
  `\n❌ FAIL — ${bad.length} of ${relevant.length} 64-bit libraries are 4 KB-only aligned and will fail to load on 16 KB page devices:`
);
const grouped = new Map();
for (const r of bad) grouped.set(`${r.lib} [${r.abi}]`, (grouped.get(`${r.lib} [${r.abi}]`) || 0) + 1);
for (const [key, n] of [...grouped.entries()].sort()) {
  console.log(`  ${key}  (${n} copies)`);
  const sample = bad.find((r) => `${r.lib} [${r.abi}]` === key);
  console.log(`    e.g. ${sample.source}`);
}
process.exit(1);
