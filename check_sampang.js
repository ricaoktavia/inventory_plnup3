import mysql from 'mysql2/promise';

async function run() {
    const conn = await mysql.createConnection('mysql://root@localhost:3306/inventory');
    const [sampang] = await conn.query('SELECT id FROM ulps WHERE name LIKE "%sampang%"');
    if (sampang.length > 0) {
        const [rows] = await conn.query('SELECT * FROM stocks WHERE ulp_id = ? AND quantity >= 10', [sampang[0].id]);
        console.log(`Stocks for ULP Sampang (ID: ${sampang[0].id}):`, rows);
    }
    
    // Check if there are multiple entries for same material_id and ulp_id
    const [dupes] = await conn.query('SELECT material_id, ulp_id, COUNT(*) as cnt FROM stocks GROUP BY material_id, ulp_id HAVING cnt > 1');
    console.log('Duplicates:', dupes);
    
    process.exit(0);
}
run();
