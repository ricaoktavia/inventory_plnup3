module.exports = {
	apps: [
		{
			name: 'inventory_plnup3',
			script: './build/index.js',
			env: {
				DATABASE_URL: 'mysql://vpskami:vpskami@localhost:3306/inventory',
				PORT: 3000
			}
		}
	]
};
