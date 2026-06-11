import mysql from 'mysql2/promise';

async function run() {
	const conn = await mysql.createConnection('mysql://root@localhost:3306/inventory');

	// Get all materials
	const [materials] = await conn.query('SELECT id FROM materials');
	console.log(`Found ${materials.length} materials`);

	// Insert or update stocks for UP3 (ulp_id IS NULL)
	for (const mat of materials) {
		const [existing] = await conn.query(
			'SELECT id FROM stocks WHERE material_id = ? AND ulp_id IS NULL',
			[mat.id]
		);
		if (existing.length > 0) {
			await conn.query('UPDATE stocks SET quantity = 500 WHERE id = ?', [existing[0].id]);
		} else {
			await conn.query('INSERT INTO stocks (material_id, ulp_id, quantity) VALUES (?, NULL, 500)', [
				mat.id
			]);
		}
	}

	console.log('Successfully set all material stocks to 500 for UP3 (Gudang Pusat)');
	process.exit(0);
}
run();
