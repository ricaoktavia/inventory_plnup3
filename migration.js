import mysql from 'mysql2/promise';

async function runMigration() {
	const connection = await mysql.createConnection({
		uri: 'mysql://root@localhost:3306/inventory'
	});

	try {
		console.log('Adding taker_name to transactions...');
		await connection.execute(`ALTER TABLE transactions ADD COLUMN taker_name VARCHAR(255);`);
	} catch (e) {
		console.log('taker_name may already exist:', e.message);
	}

	try {
        console.log('Adding usage_purpose to transactions...');
		await connection.execute(`ALTER TABLE transactions ADD COLUMN usage_purpose VARCHAR(255);`);
	} catch (e) {
		console.log('usage_purpose may already exist:', e.message);
	}

	await connection.end();
	console.log('Migration completed.');
}

runMigration();
