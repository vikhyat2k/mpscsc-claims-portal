const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, 'server', 'claims.db'));

const claimId = 36;
const claim = db.prepare('SELECT hotel_stay_type, hotel_amount FROM claims WHERE id = ?').get(claimId);
console.log('Claim 36 Stay Type:', claim.hotel_stay_type);
console.log('Claim 36 Hotel Amount:', claim.hotel_amount);
db.close();
