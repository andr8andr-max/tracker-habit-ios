import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const dataDir = path.join(root, '.pgdata');
const port = Number(process.env.PGPORT || 5433);
const recreate = process.argv.includes('--recreate');

const { default: EmbeddedPostgres } = await import('embedded-postgres');

if (recreate && fs.existsSync(dataDir)) {
  fs.rmSync(dataDir, { recursive: true, force: true });
  console.log(`Removed ${dataDir}`);
}

const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: 'postgres',
  password: 'postgres',
  port,
  persistent: true,
});

const needsInit = !fs.existsSync(path.join(dataDir, 'PG_VERSION'));
if (needsInit) {
  console.log(`Initialising cluster in ${dataDir} ...`);
  await pg.initialise();
}

console.log(`Starting PostgreSQL on port ${port} ...`);
await pg.start();

try {
  await pg.createDatabase('club');
  console.log('Database "club" created');
} catch (error) {
  const message = String(error?.message || error);
  if (/already exists/i.test(message)) {
    console.log('Database "club" already exists');
  } else {
    console.log(`createDatabase: ${message}`);
  }
}

console.log('DB READY');

let stopping = false;
async function shutdown(signal) {
  if (stopping) return;
  stopping = true;
  console.log(`Stopping (${signal}) ...`);
  try {
    await pg.stop();
  } catch {
    /* ignore */
  }
  process.exit(0);
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

setInterval(() => {}, 1 << 30);
