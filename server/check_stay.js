const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, 'claims.db'));

const claimId = 36;
const claim = db.prepare('SELECT hotel_stay_type, hotel_amount FROM claims WHERE id = ?').get(claimId);
console.log('--- DB Values for Claim 36 ---');
console.log('hotel_stay_type:', claim.hotel_stay_type);
console.log('hotel_amount:', claim.hotel_amount);
db.close();
