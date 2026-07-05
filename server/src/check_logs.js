import { createClient } from '@libsql/client';

const DB_PATH = 'C:/Users/supar/.ccp-proxy/server/data/ccp.db';
const db = createClient({ url: `file:${DB_PATH}` });

async function run() {
  const result = await db.execute('SELECT * FROM usage_logs ORDER BY timestamp DESC LIMIT 5');
  console.log('Recent logs in global DB:');
  for (const r of result.rows) {
    console.log(`- Time: ${r.timestamp}, Provider: ${r.provider_id}, Model: ${r.model_id}, Claude Variant: ${r.claude_variant}, Status: ${r.status}, Error: ${r.error_message}`);
  }
}

run().catch(console.error);
