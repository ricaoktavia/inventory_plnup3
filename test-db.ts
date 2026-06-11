import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './src/lib/server/db/schema.ts';
import * as dotenv from 'dotenv';
dotenv.config();

async function run() {
	if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

	const client = mysql.createPool(process.env.DATABASE_URL);
	const db = drizzle(client, { schema, mode: 'default' });

	const allUsers = await db.select().from(schema.users);
	console.log(JSON.stringify(allUsers, null, 2));
	process.exit(0);
}
run();
