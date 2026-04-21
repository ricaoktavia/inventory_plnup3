import { db } from './src/lib/server/db/index.js';
import { ulps } from './src/lib/server/db/schema.js';

async function check() {
    const all = await db.select().from(ulps);
    console.log('App sees ULPs:', all);
    process.exit(0);
}

check();
