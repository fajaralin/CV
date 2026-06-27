/**
 * sync.js - Sinkronisasi data lokal (data.json) ke Upstash Redis (Vercel)
 *
 * Cara pakai:
 *   node sync.js          → upload data.json ke Redis
 *   node sync.js --pull   → download data dari Redis ke data.json
 *   node sync.js --check  → bandingkan data lokal vs Redis (tanpa mengubah apapun)
 */

require('dotenv').config({ path: '.env.local' });

const fs = require('fs').promises;
const path = require('path');

// ─── Validasi ENV ──────────────────────────────────────────────
const REDIS_URL   = process.env.UPSTASH_REDIS_REST_URL  || process.env.KV_REST_API_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

if (!REDIS_URL || !REDIS_TOKEN) {
  console.error('\n❌  ENV tidak ditemukan!');
  console.error('    Buat file .env.local dan isi:');
  console.error('    UPSTASH_REDIS_REST_URL=https://...');
  console.error('    UPSTASH_REDIS_REST_TOKEN=...\n');
  process.exit(1);
}

const { Redis } = require('@upstash/redis');
const redis = new Redis({ url: REDIS_URL, token: REDIS_TOKEN });

const DB_PATH = path.join(__dirname, 'data.json');
const REDIS_KEY = 'cvdb';

// ─── Helper ────────────────────────────────────────────────────
function log(msg)    { console.log(`  ${msg}`); }
function ok(msg)     { console.log(`  ✅  ${msg}`); }
function warn(msg)   { console.log(`  ⚠️   ${msg}`); }
function error(msg)  { console.error(`  ❌  ${msg}`); }
function divider()   { console.log('\n' + '─'.repeat(50)); }

function diffSummary(local, remote) {
  const sections = ['personalInfo','projects','gallery','certificates','education','experience'];
  let hasChange = false;
  for (const key of sections) {
    const l = JSON.stringify(local[key]  ?? null);
    const r = JSON.stringify(remote[key] ?? null);
    if (l !== r) {
      const lCount = Array.isArray(local[key])  ? local[key].length  : '-';
      const rCount = Array.isArray(remote[key]) ? remote[key].length : '-';
      warn(`${key.padEnd(15)} lokal: ${String(lCount).padEnd(3)} item  |  redis: ${rCount} item`);
      hasChange = true;
    } else {
      log(`${key.padEnd(15)} ✓ sama`);
    }
  }
  return hasChange;
}

// ─── Mode: CHECK ──────────────────────────────────────────────
async function checkMode() {
  divider();
  console.log('\n🔍  Membandingkan data lokal vs Upstash Redis...\n');

  const raw = await fs.readFile(DB_PATH, 'utf8');
  const local = JSON.parse(raw);

  let remote = await redis.get(REDIS_KEY);
  if (!remote) { warn('Redis kosong / belum ada data.'); return; }
  if (typeof remote === 'string') remote = JSON.parse(remote);

  const hasChange = diffSummary(local, remote);
  divider();
  if (!hasChange) {
    ok('Data lokal dan Redis sudah sama!\n');
  } else {
    warn('Ada perbedaan. Jalankan  node sync.js        untuk upload lokal → Redis');
    warn('                         node sync.js --pull  untuk download Redis → lokal\n');
  }
}

// ─── Mode: PUSH (lokal → Redis) ────────────────────────────────
async function pushMode() {
  divider();
  console.log('\n🚀  Upload data.json → Upstash Redis...\n');

  const raw = await fs.readFile(DB_PATH, 'utf8');
  const local = JSON.parse(raw);

  // Periksa apakah password sudah di-hash
  if (!local.admin?.password?.startsWith('$2')) {
    error('Password admin di data.json belum di-hash!');
    error('Pastikan kamu sudah login minimal sekali via lokal sebelum sync.\n');
    process.exit(1);
  }

  await redis.set(REDIS_KEY, JSON.stringify(local));

  ok('Data berhasil diupload ke Upstash Redis!');
  log('Website Vercel kamu sekarang sudah pakai data terbaru.\n');
  divider();
  console.log();
}

// ─── Mode: PULL (Redis → lokal) ────────────────────────────────
async function pullMode() {
  divider();
  console.log('\n⬇️   Download Upstash Redis → data.json...\n');

  let remote = await redis.get(REDIS_KEY);
  if (!remote) {
    error('Redis kosong! Tidak ada data untuk di-download.\n');
    process.exit(1);
  }
  if (typeof remote === 'string') remote = JSON.parse(remote);

  // Backup data lokal dulu
  const backup = DB_PATH.replace('data.json', `data.backup.${Date.now()}.json`);
  try {
    const existing = await fs.readFile(DB_PATH, 'utf8');
    await fs.writeFile(backup, existing, 'utf8');
    log(`Backup lokal disimpan: ${path.basename(backup)}`);
  } catch (_) { /* file belum ada, skip backup */ }

  await fs.writeFile(DB_PATH, JSON.stringify(remote, null, 2), 'utf8');

  ok('data.json berhasil diperbarui dari Redis!');
  log('Data lokal kamu sekarang sama dengan data di Vercel.\n');
  divider();
  console.log();
}

// ─── Main ─────────────────────────────────────────────────────
(async () => {
  const arg = process.argv[2];
  try {
    if (arg === '--pull')  await pullMode();
    else if (arg === '--check') await checkMode();
    else                   await pushMode();
  } catch (err) {
    error(`Terjadi error: ${err.message}\n`);
    process.exit(1);
  }
})();
