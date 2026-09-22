const fs = require('fs');
const Database = require('better-sqlite3');
const { db } = require('./server/db');

console.log('Opened DB name:', db.name);
try {
    const c = db.prepare('SELECT count(*) as c FROM claims').get();
    console.log('Main DB Claim count:', c.c);
    const ids = db.prepare('SELECT id FROM claims').all();
    console.log('Main DB IDs:', ids.map(i => i.id));
} catch (e) { console.error('Main DB Error', e); }

if (fs.existsSync('./server/claims.db')) {
    console.log('\nFound ./server/claims.db');
    try {
        const db2 = new Database('./server/claims.db');
        const c2 = db2.prepare('SELECT count(*) as c FROM claims').get();
        console.log('Server DB Claim count:', c2.c);
        const ids2 = db2.prepare('SELECT id FROM claims').all();
        console.log('Server DB IDs:', ids2.map(i => i.id));

        // Check 25 specifically
        const claim25 = db2.prepare('SELECT * FROM claims WHERE id = 25').get();
        if (claim25) console.log('Claim 25 Found in server/claims.db. Employee:', claim25.employee_id);
    } catch (e) { console.error('Server DB Error', e); }
} else {
    console.log('\nserver/claims.db NOT found');
}
