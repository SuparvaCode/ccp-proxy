import { createClient } from '@libsql/client';

const DB_PATH = 'D:/FCC/server/data/ccp.db';
const db = createClient({ url: `file:${DB_PATH}` });

async function run() {
  const result = await db.execute('SELECT * FROM settings');
  console.log('Settings in DB:');
  for (const r of result.rows) {
    let parsed;
    try { parsed = JSON.parse(r.value); } catch { parsed = r.value; }
    console.log(`- ${r.key}: ${parsed} (${typeof parsed})`);
  }
}

run().catch(console.error);
