import mysql from 'mysql2/promise';

async function run() {
	const conn = await mysql.createConnection('mysql://root@localhost:3306/inventory');

	const [trxs] = await conn.query(
		'SELECT id, reference_number, type, status, target_ulp_id, created_at FROM transactions'
	);
	console.log('--- ALL TRANSACTIONS ---');
	console.dir(trxs, { depth: null });

	const [stocks] = await conn.query('SELECT * FROM stocks');
	console.log('--- STOCKS ---');
	console.dir(stocks, { depth: null });

	const [details] = await conn.query('SELECT * FROM transaction_details');
	console.log('--- ALL TRANSACTION DETAILS ---');
	console.dir(details, { depth: null });

	process.exit(0);
}
run();
