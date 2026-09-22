require('dotenv').config();
const bcrypt = require('bcryptjs');
const { db, initDb } = require('./db');

async function seedAdmin() {
    initDb();
    
    const email = process.env.ADMIN_EMAIL || 'admin@mpscsc.gov.in';
    const password = process.env.ADMIN_PASSWORD || 'Admin@12345';
    const fullName = process.env.ADMIN_NAME || 'System Administrator';
    const mobile = process.env.ADMIN_MOBILE || '9000000000';

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
    if (existing) {
        console.log('Admin user already exists with email:', email);
        // Update role to admin just in case
        db.prepare("UPDATE users SET role = 'admin' WHERE email = ?").run(email.toLowerCase());
        console.log('Ensured admin role.');
        process.exit(0);
    }

    const hash = await bcrypt.hash(password, 12);
    const info = db.prepare(
        "INSERT INTO users (full_name, email, mobile_number, password_hash, role, account_status) VALUES (?, ?, ?, ?, 'admin', 'active')"
    ).run(fullName, email.toLowerCase(), mobile, hash);

    console.log('Admin user created successfully!');
    console.log('  ID:', info.lastInsertRowid);
    console.log('  Name:', fullName);
    console.log('  Email:', email);
    console.log('  Password: (set via ADMIN_PASSWORD env variable)');
    console.log('\nDo NOT share this password. Change it after first login via admin panel.');
    process.exit(0);
}

seedAdmin().catch(err => {
    console.error('Failed to seed admin:', err.message);
    process.exit(1);
});
