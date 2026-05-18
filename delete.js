import mysql from 'mysql2/promise';

async function run() {
    const conn = await mysql.createConnection('mysql://root@localhost:3306/inventory');
    await conn.query(`DELETE FROM transaction_details WHERE transaction_id IN (SELECT id FROM transactions WHERE type = 'INITIAL_STOCK')`);
    await conn.query(`DELETE FROM transactions WHERE type = 'INITIAL_STOCK'`);
    await conn.query(`TRUNCATE TABLE stocks`);
    console.log('Stocks deleted successfully');
    process.exit(0);
}
run();
