const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'claims.db');
console.log(`Checking database at: ${dbPath}`);

const db = new Database(dbPath, { verbose: console.log });

try {
    const empCount = db.prepare('SELECT COUNT(*) as count FROM employees').get().count;
    console.log(`Total Employees: ${empCount}`);

    const claims = db.prepare('SELECT claim_type, COUNT(*) as count FROM claims GROUP BY claim_type').all();
    console.log('Claims breakdown:', claims);

    const allClaims = db.prepare('SELECT id, claim_type, total_amount FROM claims LIMIT 5').all();
    console.log('Sample claims:', allClaims);

} catch (err) {
    console.error('Error querying database:', err);
}
