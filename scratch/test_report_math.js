import mysql from 'mysql2/promise';
import fs from 'fs';

async function run() {
	const conn = await mysql.createConnection('mysql://root@localhost:3306/inventory');

	const [allMaterials] = await conn.query('SELECT id, name, unit FROM materials ORDER BY name');
	const [currentStocks] = await conn.query('SELECT * FROM stocks WHERE ulp_id IS NULL');

	const currentStockMap = new Map();
	currentStocks.forEach((row) => {
		currentStockMap.set(row.material_id, Number(row.quantity || 0));
	});

	const startDateStr = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
		.toISOString()
		.split('T')[0];
	const endDateStr = new Date().toISOString().split('T')[0];
	const start = new Date(startDateStr);
	const end = new Date(endDateStr);
	end.setHours(23, 59, 59, 999);

	const [periodRows] = await conn.query(
		`
        SELECT td.material_id as materialId,
               SUM(CASE WHEN t.type = 'INCOMING' THEN td.quantity ELSE 0 END) as incoming,
               SUM(CASE WHEN t.type = 'DISTRIBUTION' THEN td.quantity ELSE 0 END) as outgoing
        FROM transactions t
        INNER JOIN transaction_details td ON t.id = td.transaction_id
        WHERE t.created_at >= ? AND t.created_at <= ? AND t.status = 'COMPLETED'
        GROUP BY td.material_id
    `,
		[start, end]
	);

	const [afterRows] = await conn.query(
		`
        SELECT td.material_id as materialId,
               SUM(CASE WHEN t.type = 'INCOMING' THEN td.quantity ELSE 0 END) as incoming,
               SUM(CASE WHEN t.type = 'DISTRIBUTION' THEN td.quantity ELSE 0 END) as outgoing
        FROM transactions t
        INNER JOIN transaction_details td ON t.id = td.transaction_id
        WHERE t.created_at > ? AND t.status = 'COMPLETED'
        GROUP BY td.material_id
    `,
		[end]
	);

	const periodMap = new Map();
	periodRows.forEach((row) => {
		periodMap.set(row.materialId, {
			incoming: Number(row.incoming || 0),
			outgoing: Number(row.outgoing || 0)
		});
	});

	const afterMap = new Map();
	afterRows.forEach((row) => {
		afterMap.set(row.materialId, {
			incoming: Number(row.incoming || 0),
			outgoing: Number(row.outgoing || 0)
		});
	});

	const reportData = [];
	for (const mat of allMaterials) {
		const currentStock = currentStockMap.get(mat.id) || 0;
		const period = periodMap.get(mat.id) || { incoming: 0, outgoing: 0 };
		const after = afterMap.get(mat.id) || { incoming: 0, outgoing: 0 };

		const akhir = currentStock - after.incoming + after.outgoing;
		const masuk = period.incoming;
		const keluar = period.outgoing;
		const awal = akhir - masuk + keluar;

		if (awal !== 0 || masuk !== 0 || keluar !== 0 || akhir !== 0) {
			reportData.push({
				id: mat.id,
				name: mat.name,
				unit: mat.unit,
				awal,
				masuk,
				keluar,
				akhir
			});
		}
	}

	const output = {
		period: { start: startDateStr, end: endDateStr },
		totalRows: reportData.length,
		zeroAwalCount: reportData.filter((r) => r.awal === 0).length,
		sample: reportData.slice(0, 20)
	};

	fs.writeFileSync(
		'd:/inventory_plnup3/scratch/report_math_out.json',
		JSON.stringify(output, null, 2),
		'utf-8'
	);
	console.log('Done');
	process.exit(0);
}
run().catch(console.error);
