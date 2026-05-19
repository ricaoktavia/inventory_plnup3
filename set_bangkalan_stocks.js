import mysql from 'mysql2/promise';

async function run() {
    const conn = await mysql.createConnection('mysql://root@localhost:3306/inventory');
    
    // Get ULP ID
    const [ulps] = await conn.query('SELECT id FROM ulps WHERE name LIKE "%bangkalan%"');
    if (ulps.length === 0) {
        console.error('ULP Bangkalan not found');
        process.exit(1);
    }
    const ulpId = ulps[0].id;
    console.log(`Found ULP Bangkalan with ID: ${ulpId}`);

    // Get all materials
    const [materials] = await conn.query('SELECT id FROM materials');
    console.log(`Found ${materials.length} materials`);

    // Insert or update stocks
    for (const mat of materials) {
        const [existing] = await conn.query('SELECT id FROM stocks WHERE material_id = ? AND ulp_id = ?', [mat.id, ulpId]);
        if (existing.length > 0) {
            await conn.query('UPDATE stocks SET quantity = 10 WHERE id = ?', [existing[0].id]);
        } else {
            await conn.query('INSERT INTO stocks (material_id, ulp_id, quantity) VALUES (?, ?, 10)', [mat.id, ulpId]);
        }
    }

    console.log('Successfully set all material stocks to 10 for ULP Bangkalan');
    process.exit(0);
}
run();
