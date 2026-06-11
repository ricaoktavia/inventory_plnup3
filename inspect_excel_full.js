import xlsx from 'xlsx';

const workbook = xlsx.readFile('stok material fast moving.xlsx');
for (const sheetName of workbook.SheetNames) {
	console.log(`Sheet: ${sheetName}`);
	const sheet = workbook.Sheets[sheetName];
	const data = xlsx.utils.sheet_to_json(sheet);
	if (data.length > 0) {
		console.log('Columns:', Object.keys(data[0]));
		console.log('Sample data:', data.slice(0, 3));
	}
}
