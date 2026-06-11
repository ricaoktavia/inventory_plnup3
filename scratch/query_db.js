import mysql from 'mysql2/promise';

async function run() {
	const conn = await mysql.createConnection('mysql://root@localhost:3306/inventory');

	// Count transactions by type
	const [txCount] = await conn.query(
		'SELECT type, status, COUNT(*) as count FROM transactions GROUP BY type, status'
	);
	console.log('Transaction Counts:');
	console.log(txCount);

	// Get a sample of INITIAL_STOCK transactions
	const [initStockTx] = await conn.query(`
        SELECT t.id, t.reference_number, t.type, t.status, t.target_ulp_id, t.created_at, td.material_id, td.quantity, td.description
        FROM transactions t
        LEFT JOIN transaction_details td ON t.id = td.transaction_id
        WHERE t.type = 'INITIAL_STOCK'
        LIMIT 10
    `);
	console.log('\nSample INITIAL_STOCK Transactions:');
	console.log(initStockTx);

	// Get a sample of INCOMING transactions
	const [incomingTx] = await conn.query(`
        SELECT t.id, t.reference_number, t.type, t.status, t.target_ulp_id, t.created_at, td.material_id, td.quantity, td.description
        FROM transactions t
        LEFT JOIN transaction_details td ON t.id = td.transaction_id
        WHERE t.type = 'INCOMING'
        LIMIT 10
    `);
	console.log('\nSample INCOMING Transactions:');
	console.log(incomingTx);

	process.exit(0);
}
run().catch(console.error);
