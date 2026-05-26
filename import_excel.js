import mysql from 'mysql2/promise';
import xlsx from 'xlsx';

async function run() {
    const conn = await mysql.createConnection('mysql://root@localhost:3306/inventory');
    
    console.log('Truncating tables...');
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    await conn.query('TRUNCATE TABLE transaction_details');
    await conn.query('TRUNCATE TABLE transactions');
    await conn.query('TRUNCATE TABLE stocks');
    await conn.query('TRUNCATE TABLE materials');
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');
    
    console.log('Reading Excel file...');
    const workbook = xlsx.readFile('stok material fast moving.xlsx');
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);
    
    console.log(`Found ${data.length} rows in Excel. Importing...`);
    
    let imported = 0;
    for (const row of data) {
        const name = row[' material description'];
        const code = row['material'];
        const stockQty = parseInt(row['stok']) || 0;
        
        if (!name) continue;
        
        // Try to guess unit from name
        let unit = 'PCS';
        const upperName = name.toUpperCase();
        if (upperName.includes('MTR') || upperName.includes('KABEL')) unit = 'MTR';
        else if (upperName.includes('SET') || upperName.includes('ASSEMBLY')) unit = 'SET';
        else if (upperName.includes('BGH') || upperName.includes('TIANG')) unit = 'BGH';
        else if (upperName.includes('UNIT') || upperName.includes('TRAFO')) unit = 'UNIT';
        
        const [result] = await conn.query(
            'INSERT INTO materials (name, unit, description) VALUES (?, ?, ?)',
            [name, unit, code?.toString() || '']
        );
        const materialId = result.insertId;
        
        // Insert stock for UP3
        await conn.query(
            'INSERT INTO stocks (material_id, ulp_id, quantity) VALUES (?, NULL, ?)',
            [materialId, stockQty]
        );
        
        imported++;
    }
    
    console.log(`Successfully imported ${imported} materials and their UP3 stocks!`);
    process.exit(0);
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
