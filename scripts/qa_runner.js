/**
 * scripts/qa_runner.js
 * ==============================================================================
 * Comprehensive Automated QA & Security Test Suite for MPSCSC Claims Portal
 *
 * Covers:
 *   1. User Registration (10+ realistic dummy users across MP districts)
 *   2. Validation & Security edge cases (duplicate email, missing fields, bad passwords)
 *   3. Authentication & Session Handling (login, JWT verification, token rejection)
 *   4. Employee Master association & Family member CRUD
 *   5. Multi-type Claim Filing (TA/DA, Transfer, Medical)
 *   6. RBAC & Security Boundary Testing (Regular user accessing Admin routes)
 *   7. Full Administrative Suite Operations:
 *      - KPI statistics verification
 *      - User search and directory listing
 *      - User inspection (/api/admin/users/:id)
 *      - Account suspension & reactivation validation (enforced login block)
 *      - Admin password override & subsequent login test
 *      - Statewide claims ledger filtering & status approval workflows
 * ==============================================================================
 */

const BASE_URL = process.env.TEST_URL || 'http://localhost:5000';

const testResults = {
    total: 0,
    passed: 0,
    failed: 0,
    blocked: 0,
    tests: [],
    bugs: []
};

function recordTest(module, name, passed, details = '', error = null) {
    testResults.total++;
    if (passed) {
        testResults.passed++;
        testResults.tests.push({ module, name, status: 'PASS', details });
        console.log(`  ✅ [PASS] ${module} -> ${name}`);
    } else {
        testResults.failed++;
        testResults.tests.push({ module, name, status: 'FAIL', details, error: error ? error.message || String(error) : details });
        testResults.bugs.push({ module, name, details, error: error ? error.message || String(error) : details });
        console.error(`  ❌ [FAIL] ${module} -> ${name}: ${details}`);
        if (error) console.error(error);
    }
}

async function request(path, options = {}) {
    const url = `${BASE_URL}${path}`;
    const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {})
    };
    const response = await fetch(url, { ...options, headers });
    let data = null;
    const text = await response.text();
    try {
        data = JSON.parse(text);
    } catch (e) {
        data = text;
    }
    return { status: response.status, ok: response.ok, data };
}

// ─────────────────────────────────────────────
// 10 DUMMY USERS DATA (MP REGIONAL FIELD TEAMS)
// ─────────────────────────────────────────────
const dummyUsers = [
    { fullName: "Rajesh Sharma", email: "rajesh.bhopal@mpscsc.test", mobile: "9826011001", password: "Password@123", designation: "District Manager", hq: "Bhopal", category: "A" },
    { fullName: "Pooja Verma", email: "pooja.indore@mpscsc.test", mobile: "9826011002", password: "Password@123", designation: "Assistant Accounts Officer", hq: "Indore", category: "B" },
    { fullName: "Amitabh Patel", email: "amitabh.jabalpur@mpscsc.test", mobile: "9826011003", password: "Password@123", designation: "Quality Inspector", hq: "Jabalpur", category: "C" },
    { fullName: "Sunita Yadav", email: "sunita.gwalior@mpscsc.test", mobile: "9826011004", password: "Password@123", designation: "Store In-charge", hq: "Gwalior", category: "D" },
    { fullName: "Dinesh Malviya", email: "dinesh.ujjain@mpscsc.test", mobile: "9826011005", password: "Password@123", designation: "Field Supervisor", hq: "Ujjain", category: "C" },
    { fullName: "Kavita Soni", email: "kavita.sagar@mpscsc.test", mobile: "9826011006", password: "Password@123", designation: "Accounts Assistant", hq: "Sagar", category: "C" },
    { fullName: "Manoj Tiwari", email: "manoj.rewa@mpscsc.test", mobile: "9826011007", password: "Password@123", designation: "Assistant Quality Controller", hq: "Rewa", category: "C" },
    { fullName: "Deepak Chouhan", email: "deepak.satna@mpscsc.test", mobile: "9826011008", password: "Password@123", designation: "Junior Clerk", hq: "Satna", category: "D" },
    { fullName: "Ritu Raghuwanshi", email: "ritu.betul@mpscsc.test", mobile: "9826011009", password: "Password@123", designation: "Office Assistant", hq: "Betul", category: "D" },
    { fullName: "Sandeep Mishra", email: "sandeep.chhindwara@mpscsc.test", mobile: "9826011010", password: "Password@123", designation: "Peon / Multi-Tasking Staff", hq: "Chhindwara", category: "E" }
];

async function runTestSuite() {
    console.log(`\n==================================================================`);
    console.log(`  STARTING COMPREHENSIVE QA & SECURITY TEST SUITE`);
    console.log(`  Target: ${BASE_URL}`);
    console.log(`  Timestamp: ${new Date().toISOString()}`);
    console.log(`==================================================================\n`);

    // Clean up any prior test users locally to ensure a pure, reproducible clean slate
    const isLocal = BASE_URL.includes('localhost') || BASE_URL.includes('127.0.0.1');
    if (isLocal) {
        try {
            const { db } = require('../server/db');
            const testUserIds = db.prepare("SELECT id FROM users WHERE email LIKE '%@mpscsc.test'").all().map(u => u.id);
            if (testUserIds.length > 0) {
                const placeholders = testUserIds.map(() => '?').join(',');
                const testEmpIds = db.prepare(`SELECT id FROM employees WHERE user_id IN (${placeholders})`).all(...testUserIds).map(e => e.id);
                if (testEmpIds.length > 0) {
                    const empPlaceholders = testEmpIds.map(() => '?').join(',');
                    db.prepare(`DELETE FROM journey_details WHERE claim_id IN (SELECT id FROM claims WHERE employee_id IN (${empPlaceholders}))`).run(...testEmpIds);
                    db.prepare(`DELETE FROM medical_bills WHERE claim_id IN (SELECT id FROM claims WHERE employee_id IN (${empPlaceholders}))`).run(...testEmpIds);
                    db.prepare(`DELETE FROM daily_allowances WHERE claim_id IN (SELECT id FROM claims WHERE employee_id IN (${empPlaceholders}))`).run(...testEmpIds);
                    db.prepare(`DELETE FROM claims WHERE employee_id IN (${empPlaceholders})`).run(...testEmpIds);
                    db.prepare(`DELETE FROM family_members WHERE employee_id IN (${empPlaceholders})`).run(...testEmpIds);
                    db.prepare(`DELETE FROM employees WHERE id IN (${empPlaceholders})`).run(...testEmpIds);
                }
                db.prepare(`DELETE FROM users WHERE id IN (${placeholders})`).run(...testUserIds);
                console.log(`[Setup] Cleaned up ${testUserIds.length} prior test records for clean slate execution.`);
            }
        } catch (e) {
            console.warn('Pre-test cleanup note:', e.message);
        }
    }

    // ─────────────────────────────────────────────
    // TEST SUITE 1: USER REGISTRATION (10 USERS)
    // ─────────────────────────────────────────────
    console.log(`\n--- 1. Testing User Registration (10+ Dummy Users) ---`);
    const registeredUsers = [];

    for (let i = 0; i < dummyUsers.length; i++) {
        const u = dummyUsers[i];
        const res = await request('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({
                full_name: u.fullName,
                email: u.email,
                mobile_number: u.mobile,
                password: u.password,
                confirm_password: u.password
            })
        });

        // 201 = created, or 409 = already exists from previous run (both valid in idempotent testing)
        const isSuccess = res.status === 201 || (res.status === 409 && res.data.error?.includes('already'));
        recordTest('Registration', `Register User #${i + 1} (${u.fullName})`, isSuccess, `Status: ${res.status}, Message: ${JSON.stringify(res.data)}`);
    }

    // ─────────────────────────────────────────────
    // TEST SUITE 2: REGISTRATION EDGE CASES & VALIDATION
    // ─────────────────────────────────────────────
    console.log(`\n--- 2. Testing Registration Input Validation & Edge Cases ---`);
    
    // Duplicate Email
    const dupRes = await request('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
            full_name: "Duplicate Tester",
            email: dummyUsers[0].email,
            mobile_number: "9826099999",
            password: "Password@123",
            confirm_password: "Password@123"
        })
    });
    recordTest('Validation', 'Reject Duplicate Email (409 Conflict)', dupRes.status === 409, `Received: ${dupRes.status} ${dupRes.data.error}`);

    // Missing Email
    const missEmailRes = await request('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
            full_name: "No Email Tester",
            email: "",
            mobile_number: "9826099999",
            password: "Password@123",
            confirm_password: "Password@123"
        })
    });
    recordTest('Validation', 'Reject Missing Email (400 Bad Request)', missEmailRes.status === 400, `Received: ${missEmailRes.status}`);

    // Password Mismatch
    const mismatchRes = await request('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
            full_name: "Mismatch Tester",
            email: "mismatch@mpscsc.test",
            mobile_number: "9826099999",
            password: "Password@123",
            confirm_password: "Password@999"
        })
    });
    recordTest('Validation', 'Reject Password Confirmation Mismatch (400)', mismatchRes.status === 400, `Received: ${mismatchRes.status}`);

    // Short Password (< 6 chars)
    const shortPwRes = await request('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
            full_name: "Short Pw Tester",
            email: "shortpw@mpscsc.test",
            mobile_number: "9826099999",
            password: "123",
            confirm_password: "123"
        })
    });
    recordTest('Validation', 'Reject Short Password (400)', shortPwRes.status === 400, `Received: ${shortPwRes.status}`);

    // ─────────────────────────────────────────────
    // TEST SUITE 3: AUTHENTICATION & LOGIN/LOGOUT
    // ─────────────────────────────────────────────
    console.log(`\n--- 3. Testing User Authentication & Session Verification ---`);
    
    // Test Login for multiple dummy users
    const userTokens = {};
    for (let i = 0; i < 3; i++) {
        const u = dummyUsers[i];
        const loginRes = await request('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email: u.email, password: u.password })
        });
        const hasToken = loginRes.ok && loginRes.data.token;
        if (hasToken) {
            userTokens[u.email] = loginRes.data.token;
            u.id = loginRes.data.user.id;
        }
        recordTest('Auth', `Login User #${i + 1} (${u.email})`, hasToken, `Status: ${loginRes.status}`);
    }

    // Test Invalid Credentials
    const badLoginRes = await request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: dummyUsers[0].email, password: "WrongPassword999" })
    });
    recordTest('Auth', 'Reject Wrong Password (401 Unauthorized)', badLoginRes.status === 401, `Received: ${badLoginRes.status}`);

    const nonExistentRes = await request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: "ghost.user@mpscsc.test", password: "Password@123" })
    });
    recordTest('Auth', 'Reject Non-Existent User (401 Unauthorized)', nonExistentRes.status === 401, `Received: ${nonExistentRes.status}`);

    // Test Session Verification /api/auth/me
    const sampleToken = userTokens[dummyUsers[0].email];
    const meRes = await request('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${sampleToken}` }
    });
    const userEmail = meRes.data.email || meRes.data.user?.email;
    recordTest('Auth', 'Verify Session with Valid JWT (/api/auth/me)', meRes.status === 200 && userEmail === dummyUsers[0].email, `User: ${userEmail}`);

    // Test Unauthorized /api/auth/me with invalid token
    const badTokenRes = await request('/api/auth/me', {
        headers: { 'Authorization': `Bearer fake_invalid_jwt_token_xyz` }
    });
    recordTest('Auth', 'Reject Invalid JWT Token (401/403)', badTokenRes.status === 401 || badTokenRes.status === 403, `Received: ${badTokenRes.status}`);

    // ─────────────────────────────────────────────
    // TEST SUITE 4: ADMIN LOGIN & CREDENTIALS
    // ─────────────────────────────────────────────
    console.log(`\n--- 4. Testing Admin Authentication & RBAC Verification ---`);
    let adminToken = null;

    const adminLoginRes = await request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'admin@mpscsc.gov.in', password: 'Admin@123' })
    });
    
    if (adminLoginRes.ok && adminLoginRes.data.token) {
        adminToken = adminLoginRes.data.token;
        recordTest('Admin Auth', 'Admin Login with Valid Credentials (admin@mpscsc.gov.in)', true, `Role: ${adminLoginRes.data.user?.role}`);
    } else {
        recordTest('Admin Auth', 'Admin Login with Valid Credentials (admin@mpscsc.gov.in)', false, `Error: ${JSON.stringify(adminLoginRes.data)}`);
    }

    // Test Admin rejecting bad password
    const adminBadRes = await request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'admin@mpscsc.gov.in', password: 'IncorrectAdminPassword!' })
    });
    recordTest('Admin Auth', 'Admin Login Rejects Bad Password (401)', adminBadRes.status === 401, `Status: ${adminBadRes.status}`);

    // ─────────────────────────────────────────────
    // TEST SUITE 5: RBAC & SECURITY BOUNDARY TESTS
    // ─────────────────────────────────────────────
    console.log(`\n--- 5. Testing RBAC Security Boundaries (User vs Admin Endpoints) ---`);
    
    // Regular user attempting Admin endpoints
    const rbacEndpoints = [
        { path: '/api/admin/stats', method: 'GET' },
        { path: '/api/admin/users', method: 'GET' },
        { path: '/api/admin/claims', method: 'GET' }
    ];

    for (const ep of rbacEndpoints) {
        const unauthRes = await request(ep.path, {
            method: ep.method,
            headers: { 'Authorization': `Bearer ${sampleToken}` }
        });
        recordTest('Security RBAC', `Regular User Blocked from ${ep.path} (403 Forbidden)`, unauthRes.status === 403, `Status: ${unauthRes.status} ${JSON.stringify(unauthRes.data)}`);
    }

    // Unauthenticated request to Admin endpoints (No token)
    const noTokenRes = await request('/api/admin/stats');
    recordTest('Security RBAC', 'Unauthenticated Access to /api/admin/stats Blocked (401)', noTokenRes.status === 401, `Status: ${noTokenRes.status}`);

    // ─────────────────────────────────────────────
    // TEST SUITE 6: EMPLOYEE MASTER & WORKSPACE SETUP
    // ─────────────────────────────────────────────
    console.log(`\n--- 6. Testing Employee Master CRUD & Association ---`);
    
    // Create employee for User #1
    const emp1Data = {
        name: dummyUsers[0].fullName,
        designation: dummyUsers[0].designation,
        category: dummyUsers[0].category,
        pay_level: "Level 14",
        basic_pay: 85000,
        headquarters: dummyUsers[0].hq
    };
    const createEmpRes = await request('/api/employees', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${sampleToken}` },
        body: JSON.stringify(emp1Data)
    });
    const emp1Id = createEmpRes.ok ? createEmpRes.data.id : null;
    recordTest('Employee Master', `Create Employee Record for ${dummyUsers[0].fullName}`, createEmpRes.ok, `Emp ID: ${emp1Id}`);

    // Add family member
    if (emp1Id) {
        const addFamRes = await request('/api/family', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${sampleToken}` },
            body: JSON.stringify({
                employee_id: emp1Id,
                name: "Anjali Sharma",
                relationship: "Spouse",
                dob: "1985-06-15"
            })
        });
        recordTest('Family Members', 'Add Family Member for Transfer Entitlement', addFamRes.ok, `Status: ${addFamRes.status}`);
    }

    // ─────────────────────────────────────────────
    // TEST SUITE 7: MULTI-TYPE CLAIMS WORKFLOW
    // ─────────────────────────────────────────────
    console.log(`\n--- 7. Testing End-to-End Claims Submission Workflow ---`);
    let submittedClaimId = null;

    if (emp1Id) {
        // A. Create TA/DA Claim
        const createClaimRes = await request('/api/claims', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${sampleToken}` },
            body: JSON.stringify({
                employee_id: emp1Id,
                claim_type: 'TA_DA',
                month: 'September',
                year: '2026',
                hotel_stay_type: 'hotel',
                hotel_amount: 3200
            })
        });
        const claimId = createClaimRes.ok ? createClaimRes.data.id : null;
        recordTest('Claims Workflow', 'Initialize TA/DA Claim Header', createClaimRes.ok, `Claim ID: ${claimId}`);

        // B. Add Journey Legs
        if (claimId) {
            const addLegsRes = await request('/api/journey-details-bulk', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${sampleToken}` },
                body: JSON.stringify({
                    claim_id: claimId,
                    journeys: [
                        {
                            departure_date: '2026-09-10',
                            departure_time: '08:00',
                            departure_station: 'Bhopal',
                            arrival_date: '2026-09-10',
                            arrival_time: '12:00',
                            arrival_station: 'Indore',
                            mode: 'Bus',
                            class_of_travel: 'AC',
                            ticket_no: 'BUS-MP-101',
                            fare_amount: 450,
                            distance_km: 195,
                            purpose: 'District PDS Inspection'
                        },
                        {
                            departure_date: '2026-09-11',
                            departure_time: '14:00',
                            departure_station: 'Indore',
                            arrival_date: '2026-09-11',
                            arrival_time: '18:30',
                            arrival_station: 'Bhopal',
                            mode: 'Bus',
                            class_of_travel: 'AC',
                            ticket_no: 'BUS-MP-202',
                            fare_amount: 450,
                            distance_km: 195,
                            purpose: 'District PDS Inspection'
                        }
                    ],
                    month: 'September',
                    year: '2026',
                    hotel_stay_type: 'hotel',
                    hotel_amount: 3200
                })
            });
            recordTest('Claims Workflow', 'Add Multi-Leg Journey Details & Calculate Totals', addLegsRes.ok, `Status: ${addLegsRes.status}`);

            // C. Submit Claim
            const submitClaimRes = await request(`/api/claims/${claimId}/submit`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${sampleToken}` }
            });
            recordTest('Claims Workflow', 'Submit Claim for Approval (Status: SUBMITTED)', submitClaimRes.ok, `Status: ${submitClaimRes.status}`);
            submittedClaimId = claimId;

            // D. Calculate Official Form 21 Bill
            const calcBillRes = await request(`/api/calculate-bill/${claimId}`, {
                headers: { 'Authorization': `Bearer ${sampleToken}` }
            });
            const hasBillRows = calcBillRes.ok && calcBillRes.data.billRows && calcBillRes.data.totals;
            recordTest('Bill Engine', 'Calculate Form 21 TA/DA Bill & Entitlements', hasBillRows, `Grand Total: ₹${calcBillRes.data?.totals?.grandTotal}`);
        }

        // E. Create Medical Claim
        const medClaimRes = await request('/api/medical-claims', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${sampleToken}` },
            body: JSON.stringify({
                employee_id: emp1Id,
                patient_name: "Rajesh Sharma",
                relationship: "Self",
                is_regular: "Regular",
                illness_name: "Viral Fever & Dehydration",
                illness_duration: "3 days",
                total_enclosures: "4",
                declaration_date: "2026-09-15",
                bills: [
                    {
                        bill_category: "CONSULTATION",
                        description: "Dr. Verma Clinic Consultation",
                        receipt_no: "DOC-8891",
                        receipt_date: "2026-09-12",
                        amount: 500
                    },
                    {
                        bill_category: "MEDICINE",
                        description: "Apollo Pharmacy Medicine",
                        receipt_no: "MED-4412",
                        receipt_date: "2026-09-12",
                        amount: 1450
                    }
                ]
            })
        });
        recordTest('Medical Claims', 'Submit Medical Reimbursement Claim with Bills', medClaimRes.ok, `Status: ${medClaimRes.status}`);
    }

    // ─────────────────────────────────────────────
    // TEST SUITE 8: ADMINISTRATIVE MANAGEMENT SUITE
    // ─────────────────────────────────────────────
    console.log(`\n--- 8. Testing Comprehensive Admin Functions & Controls ---`);
    
    if (adminToken) {
        const authHeader = { 'Authorization': `Bearer ${adminToken}` };

        // A. Admin Stats
        const statsRes = await request('/api/admin/stats', { headers: authHeader });
        const hasStats = statsRes.ok && typeof statsRes.data.totalUsers === 'number';
        recordTest('Admin Dashboard', 'Fetch Global Platform KPIs (/api/admin/stats)', hasStats, `Users: ${statsRes.data?.totalUsers}, Claims: ${statsRes.data?.totalClaims}, Amount: ₹${statsRes.data?.totalAmount}`);

        // B. Admin User Directory & Search
        const usersListRes = await request('/api/admin/users', { headers: authHeader });
        recordTest('Admin Users', 'Fetch Complete User Directory (/api/admin/users)', usersListRes.ok && Array.isArray(usersListRes.data), `Total Users Listed: ${usersListRes.data?.length}`);

        const userSearchRes = await request('/api/admin/users?search=Sharma', { headers: authHeader });
        recordTest('Admin Users', 'Search Users by Query (?search=Sharma)', userSearchRes.ok && userSearchRes.data.length > 0, `Matching Records: ${userSearchRes.data?.length}`);

        // C. Admin User Deep-Dive Inspection (/api/admin/users/:id)
        const targetUserId = dummyUsers[0].id || (usersListRes.data && usersListRes.data[0]?.id);
        if (targetUserId) {
            const detailRes = await request(`/api/admin/users/${targetUserId}`, { headers: authHeader });
            const hasDetail = detailRes.ok && detailRes.data.user && detailRes.data.claimStats;
            recordTest('Admin Users', `Inspect User Profile & Linked Claims (/api/admin/users/${targetUserId})`, hasDetail, `Claims Count: ${detailRes.data?.claims?.length}`);

            // D. Account Status Toggle (Suspend User)
            const suspendRes = await request(`/api/admin/users/${targetUserId}/status`, {
                method: 'PATCH',
                headers: authHeader,
                body: JSON.stringify({ status: 'suspended' })
            });
            recordTest('Admin Security', `Suspend User Account (ID: ${targetUserId})`, suspendRes.ok, `Status: ${suspendRes.status}`);

            // Verify Suspended User Cannot Log In
            const suspendedLoginRes = await request('/api/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email: dummyUsers[0].email, password: dummyUsers[0].password })
            });
            recordTest('Admin Security', 'Enforce Login Block on Suspended Account (403 Forbidden)', suspendedLoginRes.status === 403, `Received: ${suspendedLoginRes.status} ${suspendedLoginRes.data.error}`);

            // Reactivate User Account
            const activateRes = await request(`/api/admin/users/${targetUserId}/status`, {
                method: 'PATCH',
                headers: authHeader,
                body: JSON.stringify({ status: 'active' })
            });
            recordTest('Admin Security', `Reactivate User Account (ID: ${targetUserId})`, activateRes.ok, `Status: ${activateRes.status}`);

            // E. Administrative Password Override
            const newAdminPw = "NewSecurePassword@2026";
            const resetPwRes = await request(`/api/admin/users/${targetUserId}/reset-password`, {
                method: 'PATCH',
                headers: authHeader,
                body: JSON.stringify({ new_password: newAdminPw })
            });
            recordTest('Admin Security', 'Administrative Direct Password Override', resetPwRes.ok, `Response: ${JSON.stringify(resetPwRes.data)}`);

            // Verify Login with the Overridden Password
            const newPwLoginRes = await request('/api/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email: dummyUsers[0].email, password: newAdminPw })
            });
            recordTest('Admin Security', 'Verify Login with Admin-Overridden Password', newPwLoginRes.ok && !!newPwLoginRes.data.token, `Status: ${newPwLoginRes.status}`);

            // Restore password back to original for idempotency
            await request(`/api/admin/users/${targetUserId}/reset-password`, {
                method: 'PATCH',
                headers: authHeader,
                body: JSON.stringify({ new_password: dummyUsers[0].password })
            });
        }

        // F. Admin Statewide Claims Ledger
        const adminClaimsRes = await request('/api/admin/claims', { headers: authHeader });
        const hasAdminClaims = adminClaimsRes.ok && Array.isArray(adminClaimsRes.data);
        recordTest('Admin Claims', 'Fetch Statewide Cross-User Claims Ledger (/api/admin/claims)', hasAdminClaims, `Total Claims in Ledger: ${adminClaimsRes.data?.length}`);

        // G. Filter Admin Claims by Type and Status
        const tadaFilterRes = await request('/api/admin/claims?type=TA_DA', { headers: authHeader });
        recordTest('Admin Claims', 'Filter Claims Ledger by Type (TA/DA)', tadaFilterRes.ok, `TA/DA Count: ${tadaFilterRes.data?.length}`);

        // H. Update Claim Status Workflow (Approve / Reject)
        if (submittedClaimId) {
            const approveRes = await request(`/api/claims/${submittedClaimId}/status`, {
                method: 'PUT',
                headers: authHeader,
                body: JSON.stringify({ status: 'APPROVED' })
            });
            recordTest('Admin Approval', `Approve Claim #${submittedClaimId} (Status: APPROVED)`, approveRes.ok, `Status: ${approveRes.status}`);

            // Verify Status Reflection in Single Claim Details
            const claimDetailCheck = await request(`/api/claim-details/${submittedClaimId}`, { headers: authHeader });
            const isApproved = claimDetailCheck.ok && claimDetailCheck.data.claim?.status === 'APPROVED';
            recordTest('Admin Approval', `Verify Status Update Persisted in DB as APPROVED`, isApproved, `Verified Status: ${claimDetailCheck.data?.claim?.status}`);
        }
    }

    // ─────────────────────────────────────────────
    // TEST SUMMARY & METRICS
    // ─────────────────────────────────────────────
    console.log(`\n==================================================================`);
    console.log(`  QA TEST EXECUTION SUMMARY`);
    console.log(`==================================================================`);
    console.log(`  Total Tests Executed : ${testResults.total}`);
    console.log(`  Passed               : ${testResults.passed}`);
    console.log(`  Failed               : ${testResults.failed}`);
    console.log(`  Blocked              : ${testResults.blocked}`);
    console.log(`  Success Rate         : ${Math.round((testResults.passed / testResults.total) * 100)}%`);
    console.log(`==================================================================\n`);

    return testResults;
}

if (require.main === module) {
    runTestSuite().catch(err => {
        console.error("FATAL: Test runner crashed:", err);
        process.exit(1);
    });
}

module.exports = { runTestSuite };
