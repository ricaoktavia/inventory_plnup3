import mysql from 'mysql2/promise';
import fs from 'fs';

async function run() {
	const conn = await mysql.createConnection('mysql://root@localhost:3306/inventory');

	// Simulate the FIXED UP3 periodRows query for current month
	const now = new Date();
	const start = new Date(now.getFullYear(), now.getMonth(), 1);
	const end = new Date();
	end.setHours(23, 59, 59, 999);

	// Current stocks (UP3)
	const [currentStocks] = await conn.query(
		'SELECT material_id, quantity FROM stocks WHERE ulp_id IS NULL'
	);
	const stockMap = new Map();
	currentStocks.forEach((r) => stockMap.set(r.material_id, Number(r.quantity || 0)));

	// FIXED: period rows with INITIAL_STOCK + INCOMING as incoming, DISTRIBUTION + USAGE as outgoing
	const [periodRows] = await conn.query(
		`
        SELECT td.material_id as materialId,
               SUM(CASE WHEN t.type IN ('INCOMING','INITIAL_STOCK') THEN td.quantity ELSE 0 END) as incoming,
               SUM(CASE WHEN t.type IN ('DISTRIBUTION','USAGE') THEN td.quantity ELSE 0 END) as outgoing
        FROM transactions t
        INNER JOIN transaction_details td ON t.id = td.transaction_id
        WHERE t.created_at >= ? AND t.created_at <= ? AND t.status = 'COMPLETED' AND t.target_ulp_id IS NULL
        GROUP BY td.material_id
    `,
		[start, end]
	);

	// FIXED: after rows
	const [afterRows] = await conn.query(
		`
        SELECT td.material_id as materialId,
               SUM(CASE WHEN t.type IN ('INCOMING','INITIAL_STOCK') THEN td.quantity ELSE 0 END) as incoming,
               SUM(CASE WHEN t.type IN ('DISTRIBUTION','USAGE') THEN td.quantity ELSE 0 END) as outgoing
        FROM transactions t
        INNER JOIN transaction_details td ON t.id = td.transaction_id
        WHERE t.created_at > ? AND t.status = 'COMPLETED' AND t.target_ulp_id IS NULL
        GROUP BY td.material_id
    `,
		[end]
	);

	const periodMap = new Map();
	periodRows.forEach((r) =>
		periodMap.set(r.materialId, {
			incoming: Number(r.incoming || 0),
			outgoing: Number(r.outgoing || 0)
		})
	);
	const afterMap = new Map();
	afterRows.forEach((r) =>
		afterMap.set(r.materialId, {
			incoming: Number(r.incoming || 0),
			outgoing: Number(r.outgoing || 0)
		})
	);

	const [allMaterials] = await conn.query('SELECT id, name, unit FROM materials ORDER BY name');

	const results = [];
	for (const mat of allMaterials) {
		const currentStock = stockMap.get(mat.id) || 0;
		const period = periodMap.get(mat.id) || { incoming: 0, outgoing: 0 };
		const after = afterMap.get(mat.id) || { incoming: 0, outgoing: 0 };

		const akhir = currentStock - after.incoming + after.outgoing;
		const masuk = period.incoming;
		const keluar = period.outgoing;
		const awal = akhir - masuk + keluar;

		if (awal !== 0 || masuk !== 0 || keluar !== 0) {
			results.push({ id: mat.id, name: mat.name, awal, masuk, keluar, akhir });
		}
	}

	// Count rows with non-zero awal
	const nonZeroAwal = results.filter((r) => r.awal !== 0).length;
	const totalRows = results.length;

	fs.writeFileSync(
		'd:/inventory_plnup3/scratch/verify_fix.json',
		JSON.stringify(
			{
				totalRows,
				nonZeroAwal,
				zeroAwal: totalRows - nonZeroAwal,
				sampleRows: results.slice(0, 10)
			},
			null,
			2
		),
		'utf-8'
	);

	console.log(`DONE: ${nonZeroAwal}/${totalRows} rows have non-zero Stok Awal`);
	process.exit(0);
}
run().catch(console.error);
