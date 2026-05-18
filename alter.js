import mysql from 'mysql2/promise';

async function run() {
    const conn = await mysql.createConnection('mysql://root@localhost:3306/inventory');
    await conn.query(`ALTER TABLE transactions MODIFY COLUMN status ENUM('REQUESTED', 'DRAFT', 'APPROVED_ULP', 'COMPLETED', 'REJECTED') NOT NULL DEFAULT 'DRAFT'`);
    console.log('Enum updated successfully');
    process.exit(0);
}
run();
