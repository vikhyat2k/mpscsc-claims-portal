/**
 * scripts/purge_dummy_data.js
 * ==============================================================================
 * Safe Administrative Purge Tool for MPSCSC Claims Portal
 *
 * Purges only dummy test records (users with @mpscsc.test and their associated
 * employees, claims, journeys, daily allowances, medical bills, and family members).
 *
 * GUARANTEE:
 * Genuine users (e.g. admin@mpscsc.gov.in, Vikhyat Hindoliya, and non-test records)
 * are strictly preserved.
 *
 * Usage:
 *   node scripts/purge_dummy_data.js
 *   node scripts/purge_dummy_data.js --target=https://mpscsc-claims-portal.onrender.com
 * ==============================================================================
 */

require('dotenv').config();

const targetArg = process.argv.find(a => a.startsWith('--target='));
const targetUrl = targetArg ? targetArg.split('=')[1] : null;

async function purgeRemote(baseUrl) {
    console.log(`\n[Purge Tool] Connecting to Remote Server: ${baseUrl}`);
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@mpscsc.gov.in';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';

    // 1. Authenticate as Admin
    console.log(`[Purge Tool] Authenticating as Admin (${adminEmail})...`);
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminEmail, password: adminPassword })
    });
    const loginData = await loginRes.json();
    if (!loginRes.ok || !loginData.token) {
        throw new Error(`Admin authentication failed: ${JSON.stringify(loginData)}`);
    }

    // 2. Call Purge Endpoint
    console.log(`[Purge Tool] Executing purge endpoint...`);
    const purgeRes = await fetch(`${baseUrl}/api/admin/purge-dummy-data`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${loginData.token}`
        }
    });
    const purgeData = await purgeRes.json();
    if (!purgeRes.ok) {
        throw new Error(`Purge failed: ${JSON.stringify(purgeData)}`);
    }

    console.log(`\n========================================================`);
    console.log(`  PURGE COMPLETE ON ${baseUrl}`);
    console.log(`========================================================`);
    console.log(`Message: ${purgeData.message}`);
    console.log(`Deleted Counts:`, purgeData.deletedCounts);
    console.log(`========================================================\n`);
}

function purgeLocal() {
    console.log(`\n[Purge Tool] Executing Local Database Purge (claims.db)...`);
    const { db } = require('../server/db');

    const dummyUsers = db.prepare("SELECT id, email, full_name FROM users WHERE email LIKE '%@mpscsc.test'").all();
    console.log(`Found ${dummyUsers.length} dummy user accounts to purge.`);

    if (dummyUsers.length === 0) {
        console.log('No dummy test records found in local database.');
        return;
    }

    const dummyUserIds = dummyUsers.map(u => u.id);
    const userPlaceholders = dummyUserIds.map(() => '?').join(',');

    const dummyEmployees = db.prepare(`SELECT id FROM employees WHERE user_id IN (${userPlaceholders})`).all(...dummyUserIds);
    const dummyEmpIds = dummyEmployees.map(e => e.id);

    let journeysDeleted = 0;
    let billsDeleted = 0;
    let daDeleted = 0;
    let claimsDeleted = 0;
    let familyDeleted = 0;

    if (dummyEmpIds.length > 0) {
        const empPlaceholders = dummyEmpIds.map(() => '?').join(',');
        const dummyClaims = db.prepare(`SELECT id FROM claims WHERE employee_id IN (${empPlaceholders})`).all(...dummyEmpIds);
        const dummyClaimIds = dummyClaims.map(c => c.id);

        if (dummyClaimIds.length > 0) {
            const claimPlaceholders = dummyClaimIds.map(() => '?').join(',');
            journeysDeleted = db.prepare(`DELETE FROM journey_details WHERE claim_id IN (${claimPlaceholders})`).run(...dummyClaimIds).changes;
            billsDeleted = db.prepare(`DELETE FROM medical_bills WHERE claim_id IN (${claimPlaceholders})`).run(...dummyClaimIds).changes;
            daDeleted = db.prepare(`DELETE FROM daily_allowances WHERE claim_id IN (${claimPlaceholders})`).run(...dummyClaimIds).changes;
            claimsDeleted = db.prepare(`DELETE FROM claims WHERE id IN (${claimPlaceholders})`).run(...dummyClaimIds).changes;
        }

        familyDeleted = db.prepare(`DELETE FROM family_members WHERE employee_id IN (${empPlaceholders})`).run(...dummyEmpIds).changes;
        db.prepare(`DELETE FROM employees WHERE id IN (${empPlaceholders})`).run(...dummyEmpIds);
    }

    const usersDeleted = db.prepare(`DELETE FROM users WHERE id IN (${userPlaceholders})`).run(...dummyUserIds).changes;

    console.log(`\n========================================================`);
    console.log(`  LOCAL DATABASE PURGE COMPLETE`);
    console.log(`========================================================`);
    console.log(`  Users Deleted          : ${usersDeleted}`);
    console.log(`  Employees Deleted      : ${dummyEmpIds.length}`);
    console.log(`  Claims Deleted         : ${claimsDeleted}`);
    console.log(`  Journeys Deleted       : ${journeysDeleted}`);
    console.log(`  Medical Bills Deleted  : ${billsDeleted}`);
    console.log(`  Daily Allowance Deleted: ${daDeleted}`);
    console.log(`  Family Members Deleted : ${familyDeleted}`);
    console.log(`========================================================`);
    console.log(`All genuine accounts (admin@mpscsc.gov.in) preserved.\n`);
}

if (targetUrl) {
    purgeRemote(targetUrl).catch(err => {
        console.error('Error during remote purge:', err.message);
        process.exit(1);
    });
} else {
    purgeLocal();
}
