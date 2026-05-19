import mysql from 'mysql2/promise';

async function run() {
    const conn = await mysql.createConnection('mysql://root@localhost:3306/inventory');
    const [rows] = await conn.query('SELECT * FROM stocks ORDER BY id DESC LIMIT 20');
    console.log(rows);
    process.exit(0);
}
run();
