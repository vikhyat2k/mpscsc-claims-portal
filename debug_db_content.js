const Database = require('./server/node_modules/better-sqlite3');
const fs = require('fs');

function checkDB(path, label) {
    if (!fs.existsSync(path)) {
        console.log(`[${label}] File NOT found: ${path}`);
        return;
    }
    console.log(`[${label}] Checking ${path}...`);
    try {
        const db = new Database(path);
        const empCount = db.prepare('SELECT count(*) as c FROM employees').get().c;
        const claimCount = db.prepare('SELECT count(*) as c FROM claims').get().c;
        const journeyCount = db.prepare('SELECT count(*) as c FROM journey_details').get().c;
        console.log(`[${label}] Employees: ${empCount}, Claims: ${claimCount}, Journeys: ${journeyCount}`);

        // List Claims
        const claims = db.prepare('SELECT id, employee_id, status FROM claims LIMIT 5').all();
        console.log(`[${label}] Sample Claims:`, claims);
    } catch (e) {
        console.error(`[${label}] Error:`, e.message);
    }
}

checkDB('claims.db', 'ROOT DB');
checkDB('server/claims.db', 'SERVER DB');
