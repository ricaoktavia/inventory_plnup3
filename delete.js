import mysql from 'mysql2/promise';

async function run() {
    const conn = await mysql.createConnection('mysql://root@localhost:3306/inventory');
    await conn.query(`DELETE FROM transaction_details`);
    await conn.query(`DELETE FROM transactions`);
    // Uncomment the next line if you also want to reset all stocks to 0
    // await conn.query(`TRUNCATE TABLE stocks`);
    console.log('All transactions deleted successfully');
    process.exit(0);
}
run();
