import mysql from 'mysql2/promise';
import fs from 'fs';

async function run() {
	const conn = await mysql.createConnection('mysql://root@localhost:3306/inventory');

	const sql = fs.readFileSync('seed_inventory.sql', 'utf8');
	const queries = sql.split(';').filter((q) => q.trim().length > 0);

	for (const query of queries) {
		await conn.query(query);
	}

	console.log('Database reset to initial stock successfully!');
	process.exit(0);
}

run().catch((err) => {
	console.error(err);
	process.exit(1);
});
