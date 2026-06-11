import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './src/lib/server/db/schema.ts';
import { eq } from 'drizzle-orm';
import * as dotenv from 'dotenv';
dotenv.config();

async function run() {
	if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

	const client = mysql.createPool(process.env.DATABASE_URL);
	const db = drizzle(client, { schema, mode: 'default' });

	const allUsers = await db.select().from(schema.users);
	for (const user of allUsers) {
        if (user.role === 'ADMIN_UP3') {
		    await db.update(schema.users)
                .set({ passwordHash: 'up3_madura_2026' })
                .where(eq(schema.users.id, user.id));
        } else {
            await db.update(schema.users)
                .set({ passwordHash: 'ulp_madura_2026' })
                .where(eq(schema.users.id, user.id));
        }
	}
	console.log('Password UP3 diperbarui ke up3_madura_2026 dan ULP ke ulp_madura_2026!');
	process.exit(0);
}
run();
