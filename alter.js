import mysql from 'mysql2/promise';

async function run() {
	const conn = await mysql.createConnection('mysql://root@localhost:3306/inventory');
	try {
		await conn.query(`ALTER TABLE transactions ADD COLUMN first_party VARCHAR(50) DEFAULT NULL`);
		console.log('Column first_party added successfully');
	} catch (err) {
		console.log('Column first_party might already exist:', err.message);
	}
	process.exit(0);
}
run();
