import mysql from 'mysql2/promise';

async function run() {
    try {
        const conn = await mysql.createConnection('mysql://root@localhost:3306/inventory');
        console.log('Connected to database.');

        // 1. Update ULP Name
        const [ulpRes] = await conn.query("UPDATE ulps SET name = 'Kepulauan Kangean' WHERE name = 'Arjasa'");
        console.log('ULP update result:', ulpRes);

        // 2. Update User username
        const [userRes] = await conn.query("UPDATE users SET username = 'ulp_kangean' WHERE username = 'ulp_arjasa'");
        console.log('User update result:', userRes);

        await conn.end();
        console.log('Database connection closed.');
    } catch (err) {
        console.error('Error running updates:', err);
    }
    process.exit(0);
}
run();
