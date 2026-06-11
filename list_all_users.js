import mysql from 'mysql2/promise';

async function run() {
	const conn = await mysql.createConnection('mysql://root@localhost:3306/inventory');
	const [users] = await conn.query(
		'SELECT u.username, u.password_hash as password, u.role, COALESCE(ulp.name, "Pusat UP3") as unit FROM users u LEFT JOIN ulps ulp ON u.ulp_id = ulp.id'
	);
	console.log(users);
	process.exit(0);
}
run();
