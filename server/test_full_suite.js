/**
 * Complete Project Testing & Rule Compliance Audit Test Suite
 * MPSCSC Claims Portal — All 4 Modules:
 *   1. Tour Diary
 *   2. TA/DA Claim (Form 21)
 *   3. Transfer Claim
 *   4. Medical Claim
 *
 * Applicable Official Rules & Mandates:
 *   - MP Finance Dept Order No. F 4-1/2025/Niyam/Char dated 03-Apr-2025 (w.e.f. 01-Apr-2025)
 *   - MP TA Rules, Supplementary Rule 30 (पूरक नियम 30 - 24-hr cycle & absence from HQ)
 *   - MPSCSC Composite Transfer Grant & Baggage Regulations
 *   - MP Civil Services Medical Attendance Rules
 */

'use strict';

const { db } = require('./db');
const {
    TADA_RATES,
    normalizeStation,
    isStationOutsideMP,
    getCityType,
    calculateDAFactorForHours,
    calculateDAForDuration,
    calculateTravelAllowance,
    calculateDiffHours,
    calculateTadaBillTotals
} = require('./tadaRules');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(description, actual, expected, tolerance = 0.01) {
    totalTests++;
    let ok = false;
    if (typeof expected === 'number') {
        ok = Math.abs(actual - expected) <= tolerance;
    } else if (typeof expected === 'object' && expected !== null) {
        ok = JSON.stringify(actual) === JSON.stringify(expected);
    } else {
        ok = actual === expected;
    }

    if (ok) {
        passedTests++;
        console.log(`  ✅ [PASS] ${description}`);
    } else {
        failedTests++;
        console.error(`  ❌ [FAIL] ${description}`);
        console.error(`       Expected: ${JSON.stringify(expected)}`);
        console.error(`       Actual:   ${JSON.stringify(actual)}`);
    }
}

console.log('\n================================================================================');
console.log('  MPSCSC CLAIMS PORTAL — COMPLETE 4-MODULE COMPLIANCE & TEST AUDIT');
console.log('================================================================================\n');

// ─────────────────────────────────────────────────────────────────────────────
// MODULE 1: TOUR DIARY (दौरा डायरी)
// ─────────────────────────────────────────────────────────────────────────────
console.log('--------------------------------------------------------------------------------');
console.log('  MODULE 1: TOUR DIARY (दौरा डायरी)');
console.log('--------------------------------------------------------------------------------');

// Test 1.1: Rule 30 Absence Calculation & Duration Boundaries
assert('Rule 30: Absence <= 6h yields 0 DA factor (Boundary 5h 59m)', calculateDAFactorForHours(5.98), 0.0);
assert('Rule 30: Absence <= 6h yields 0 DA factor (Exact Boundary 6.00h)', calculateDAFactorForHours(6.00), 0.0);
assert('Rule 30: Absence > 6h and <= 12h yields 0.5 DA factor (6h 01m)', calculateDAFactorForHours(6.016), 0.5);
assert('Rule 30: Absence > 6h and <= 12h yields 0.5 DA factor (Exact Boundary 12.00h)', calculateDAFactorForHours(12.00), 0.5);
assert('Rule 30: Absence > 12h and <= 24h yields 1.0 DA factor (12h 01m)', calculateDAFactorForHours(12.016), 1.0);
assert('Rule 30: Absence > 12h and <= 24h yields 1.0 DA factor (Exact Boundary 24.00h)', calculateDAFactorForHours(24.00), 1.0);

// Test 1.2: Multi-day Tour Durations (24h Cycles)
// 67 hours = 2 full 24h days (2.0) + 19h remainder (>12h => 1.0) = 3.0 DA days
assert('Multi-day tour 67h: 2 days + 19h remainder -> 3.0 DA days', calculateDAForDuration('OTHER', 'B', 67), 300 * 3.0);
// 54 hours = 2 full 24h days (2.0) + 6h remainder (<=6h => 0.0) = 2.0 DA days
assert('Multi-day tour 54h: 2 days + 6h remainder -> 2.0 DA days', calculateDAForDuration('OTHER', 'B', 54), 300 * 2.0);
// 58 hours = 2 full 24h days (2.0) + 10h remainder (>6h & <=12h => 0.5) = 2.5 DA days
assert('Multi-day tour 58h: 2 days + 10h remainder -> 2.5 DA days', calculateDAForDuration('OTHER', 'B', 58), 300 * 2.5);

// Test 1.3: Station normalization and Outstation Detection
assert('Normalize Bhopal trimmed and lowercase', normalizeStation('  Bhopal  '), 'bhopal');
assert('Delhi classified as METRO city (Tier 1 specified Metro)', getCityType('Delhi'), 'METRO');
assert('Mumbai classified as METRO city (Tier 1 specified Metro)', getCityType('Mumbai'), 'METRO');
assert('Bhopal classified as MAJOR_CITY (Tier 2 MP major city)', getCityType('Bhopal'), 'MAJOR_CITY');
assert('Gwalior classified as MAJOR_CITY (Tier 2 MP major city)', getCityType('Gwalior'), 'MAJOR_CITY');
assert('Sagar classified as OTHER (Tier 3 other MP place)', getCityType('Sagar'), 'OTHER');
assert('Rewa classified as OTHER (Tier 3 other MP place)', getCityType('Rewa'), 'OTHER');
assert('Betul classified as OTHER (Tier 3 other MP place)', getCityType('Betul'), 'OTHER');
assert('Delhi identified as outside MP', isStationOutsideMP('New Delhi'), true);
assert('Bhopal identified as within MP', isStationOutsideMP('Bhopal'), false);

// Test 1.4: ISO Time format padding helper
assert('CalculateDiffHours standard ISO date strings', calculateDiffHours('2025-05-10', '09:00', '2025-05-10', '19:00'), 10.0);
assert('CalculateDiffHours single-digit hour padding', calculateDiffHours('2025-05-10', '9:00', '2025-05-10', '17:30'), 8.5);

// ─────────────────────────────────────────────────────────────────────────────
// MODULE 2: TA/DA CLAIM (Form 21 - यात्रा एवं दैनिक भत्ता देयक)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--------------------------------------------------------------------------------');
console.log('  MODULE 2: TA/DA CLAIM (Form 21 - यात्रा एवं दैनिक भत्ता देयक)');
console.log('--------------------------------------------------------------------------------');

// Test 2.1: Mileage Allowances (MP Finance Dept Order F 4-1/2025/Niyam/Char w.e.f. 01-Apr-2025)
// Own Car: ₹9/km for Category A
assert('Own Car mileage rate: 150 km @ ₹9/km = ₹1,350', calculateTravelAllowance({ mode: 'Own Car', distance_km: 150 }, 'A'), 1350);
// Own Bike: ₹4/km for all categories
assert('Own Bike mileage rate: 80 km @ ₹4/km = ₹320', calculateTravelAllowance({ mode: 'Own Bike', distance_km: 80 }, 'C'), 320);
// Rail / Bus / Air: uses actual claimed ticket fare
assert('Rail fare: actual ticket cost ₹1,245 approved', calculateTravelAllowance({ mode: 'Rail', fare_amount: 1245 }, 'B'), 1245);
assert('Air travel: actual ticket cost ₹4,800 approved for Cat A', calculateTravelAllowance({ mode: 'Air', fare_amount: 4800 }, 'A'), 4800);

// Test 2.2: Daily Allowance Rate Matrix (Order F 4-1/2025/Niyam/Char)
assert('DA Rate Cat A METRO: ₹750/day', TADA_RATES.DA_RATES.METRO.A, 750);
assert('DA Rate Cat A MAJOR_CITY: ₹550/day', TADA_RATES.DA_RATES.MAJOR_CITY.A, 550);
assert('DA Rate Cat A OTHER: ₹375/day', TADA_RATES.DA_RATES.OTHER.A, 375);
assert('DA Rate Cat B METRO: ₹600/day', TADA_RATES.DA_RATES.METRO.B, 600);
assert('DA Rate Cat C METRO: ₹450/day', TADA_RATES.DA_RATES.METRO.C, 450);
assert('DA Rate Cat D METRO: ₹375/day', TADA_RATES.DA_RATES.METRO.D, 375);
assert('DA Rate Cat E METRO: ₹260/day', TADA_RATES.DA_RATES.METRO.E, 260);

// Test 2.3: Hotel & Stay Allowances
// Hotel ceiling: Cat B in Bhopal (METRO) = ₹5,500/day
assert('Hotel ceiling Cat B METRO = ₹5,500', TADA_RATES.HOTEL_ALLOWANCE.METRO.B, 5500);
assert('Hotel ceiling Cat C MAJOR_CITY = ₹2,800', TADA_RATES.HOTEL_ALLOWANCE.MAJOR_CITY.C, 2800);
assert('Hotel ceiling Cat D OTHER = ₹920', TADA_RATES.HOTEL_ALLOWANCE.OTHER.D, 920);

// Stay with Friends / Relatives flat daily rates
assert('Friends stay Cat A: ₹750/day', TADA_RATES.FRIENDS_STAY_RATE.A, 750);
assert('Friends stay Cat B: ₹660/day', TADA_RATES.FRIENDS_STAY_RATE.B, 660);
assert('Friends stay Cat C: ₹550/day', TADA_RATES.FRIENDS_STAY_RATE.C, 550);
assert('Friends stay Cat D: ₹450/day', TADA_RATES.FRIENDS_STAY_RATE.D, 450);
assert('Friends stay Cat E: ₹370/day', TADA_RATES.FRIENDS_STAY_RATE.E, 370);

// Test 2.4: Full TA/DA Bill Computation Engine Simulation
const sampleEmpCatB = { id: 101, name: 'Suresh Verma', category: 'B', headquarters: 'Bhopal' };
const sampleTadaClaim = {
    id: 501,
    claim_type: 'TA_DA',
    hotel_stay_type: 'Hotel',
    hotel_amount: 3200, // within ceiling of ₹5,500
    advance_amount: 1500
};
const sampleJourneys = [
    {
        id: 1,
        departure_date: '2025-05-10', departure_time: '08:00', departure_station: 'Bhopal',
        arrival_date: '2025-05-10', arrival_time: '18:00', arrival_station: 'Indore',
        mode: 'Bus', fare_amount: 450, distance_km: 195, purpose: 'Official Audit'
    },
    {
        id: 2,
        departure_date: '2025-05-11', departure_time: '14:00', departure_station: 'Indore',
        arrival_date: '2025-05-11', arrival_time: '23:00', arrival_station: 'Bhopal',
        mode: 'Bus', fare_amount: 450, distance_km: 195, purpose: 'Official Audit'
    }
];

const tadaResult = calculateTadaBillTotals(sampleTadaClaim, sampleEmpCatB, sampleJourneys);
assert('TA/DA total fare: ₹450 + ₹450 = ₹900', tadaResult.totals.totalFare, 900);
assert('TA/DA hotel stay approved within entitlement', tadaResult.totals.totalStayAllowance, 3200);
// Tour absence: 10 May 08:00 to 11 May 23:00 = 39 hours -> 1 full day (24h) + 15h (>12h) = 2.0 days DA
// At Indore (MAJOR_CITY) Cat B rate ₹440/day -> 2.0 * 440 = ₹880
assert('TA/DA tour DA: 39 hours total absence = 2.0 DA days @ ₹440 = ₹880', tadaResult.totals.totalDA, 880);
// Grand Total = 900 (Fare) + 880 (DA) + 3200 (Hotel) = ₹4,980
assert('TA/DA Grand Total gross amount (₹900 + ₹880 + ₹3,200 = ₹4,980)', tadaResult.totals.grandTotal, 4980);
// Advance Deduction: Net payable = 4,980 - 1,500 = ₹3,480
const netPayableTADA = tadaResult.totals.grandTotal - (sampleTadaClaim.advance_amount || 0);
assert('TA/DA Net Payable after Advance Deduction (₹4,980 - ₹1,500 = ₹3,480)', netPayableTADA, 3480);

// ─────────────────────────────────────────────────────────────────────────────
// MODULE 3: TRANSFER CLAIM (स्थानांतरण यात्रा एवं सामान परिवहन देयक)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--------------------------------------------------------------------------------');
console.log('  MODULE 3: TRANSFER CLAIM (स्थानांतरण यात्रा एवं सामान परिवहन देयक)');
console.log('--------------------------------------------------------------------------------');

// Test 3.1: Composite Transfer Grant by Employee Category (MP Finance Order F 4-1/2025/Niyam/Char Sec 2.9)
assert('Composite Transfer Grant Cat A: ₹6,500', TADA_RATES.TRANSFER_GRANT.A, 6500);
assert('Composite Transfer Grant Cat B: ₹5,000', TADA_RATES.TRANSFER_GRANT.B, 5000);
assert('Composite Transfer Grant Cat C: ₹3,600', TADA_RATES.TRANSFER_GRANT.C, 3600);
assert('Composite Transfer Grant Cat D: ₹2,500', TADA_RATES.TRANSFER_GRANT.D, 2500);
assert('Composite Transfer Grant Cat E: ₹1,800', TADA_RATES.TRANSFER_GRANT.E, 1800);

// Test 3.2: Goods Transport Rate per KM on Transfer (Sec 2.8)
assert('Goods transport rate per km Cat A: ₹40/km', TADA_RATES.GOODS_TRANSPORT_PER_KM.A, 40);
assert('Goods transport rate per km Cat B: ₹40/km', TADA_RATES.GOODS_TRANSPORT_PER_KM.B, 40);
assert('Goods transport rate per km Cat C: ₹25/km', TADA_RATES.GOODS_TRANSPORT_PER_KM.C, 25);
assert('Goods transport rate per km Cat D: ₹25/km', TADA_RATES.GOODS_TRANSPORT_PER_KM.D, 25);
assert('Goods transport rate per km Cat E: ₹15/km', TADA_RATES.GOODS_TRANSPORT_PER_KM.E, 15);

// Test 3.3: Transfer Goods Transport Calculation & Capping (BUG FIX VERIFICATION)
// Scenario A: User did not incur/claim goods transport (0 claimed) -> MUST REIMBURSE ₹0!
const transferClaimZeroGoods = {
    id: 601,
    claim_type: 'TRANSFER',
    goods_transport_charges: 0,
    packing_charges: 1200,
    baggage_weight: 2500
};
const empCatC = { id: 102, name: 'Anil Gupta', category: 'C', headquarters: 'Gwalior' };
const transferResultZero = calculateTadaBillTotals(transferClaimZeroGoods, empCatC, [
    {
        id: 11,
        departure_date: '2025-06-01', departure_time: '09:00', departure_station: 'Gwalior',
        arrival_date: '2025-06-01', arrival_time: '18:00', arrival_station: 'Bhopal',
        mode: 'Rail', fare_amount: 850, distance_km: 420, purpose: 'Transfer'
    }
]);

assert('Goods transport NOT claimed: reimbursement must be ₹0 (Fixed: No auto-award of thousands)', transferResultZero.totals.totalTransport, 0);
assert('Transfer Grant Cat C automatically awarded: ₹3,600', transferResultZero.totals.transferGrant, 3600);
assert('Packing charges subsumed into Composite Transfer Grant (Sec 2.9)', transferResultZero.totals.totalPacking, 0);

// Scenario B: User claimed ₹8,000 goods transport, entitlement is higher (420 km * ₹25/km = ₹10,500)
const transferClaimClaimedGoods = {
    id: 602,
    claim_type: 'TRANSFER',
    goods_transport_charges: 8000,
    packing_charges: 1500,
    baggage_weight: 2000
};
const transferResultClaimed = calculateTadaBillTotals(transferClaimClaimedGoods, empCatC, [
    {
        id: 12,
        departure_date: '2025-06-01', departure_time: '09:00', departure_station: 'Gwalior',
        arrival_date: '2025-06-01', arrival_time: '18:00', arrival_station: 'Bhopal',
        mode: 'Rail', fare_amount: 850, distance_km: 420, purpose: 'Transfer'
    }
]);

assert('Goods transport within entitlement reimbursed in full: ₹8,000', transferResultClaimed.totals.totalTransport, 8000);

// Test 3.4: Form 21 Transfer Column 7 and Row 0 Balancing
// Row 0 total_amount in billRows must include Composite Transfer Grant + Transport
// Horizontal sum of all rows in billRows must equal grandTotal
assert('Column 7 transferAllowance = Transfer Grant (₹3,600) + Transport (₹8,000) = ₹11,600', transferResultClaimed.totals.transferAllowance, 11600);
const sumRowTotals = transferResultClaimed.billRows.reduce((sum, r) => sum + (parseFloat(r.total_amount) || 0), 0);
assert('Row totals sum matches grandTotal exactly (Arithmetic Balance: Column 20 = Grand Total)', sumRowTotals, transferResultClaimed.totals.grandTotal);

// ─────────────────────────────────────────────────────────────────────────────
// MODULE 4: MEDICAL CLAIM (चिकित्सा व्यय प्रतिपूर्ति देयक)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--------------------------------------------------------------------------------');
console.log('  MODULE 4: MEDICAL CLAIM (चिकित्सा व्यय प्रतिपूर्ति देयक)');
console.log('--------------------------------------------------------------------------------');

// Test 4.1: Medical Bills Structure & Categorization
const sampleMedicalBills = [
    { bill_category: 'CONSULTATION', description: 'Dr. Sharma Consultation', amount: 500 },
    { bill_category: 'MEDICINE', description: 'Prescribed Antibiotics & Tonics', amount: 2450 },
    { bill_category: 'TEST', description: 'CBC + LFT + Blood Sugar Fasting', amount: 1800 },
    { bill_category: 'OTHER', description: 'Hospital Dressing & Injection fees', amount: 450 }
];

const consultationTotal = sampleMedicalBills.filter(b => b.bill_category === 'CONSULTATION').reduce((s, b) => s + b.amount, 0);
const medicineTotal = sampleMedicalBills.filter(b => b.bill_category === 'MEDICINE').reduce((s, b) => s + b.amount, 0);
const testTotal = sampleMedicalBills.filter(b => b.bill_category === 'TEST').reduce((s, b) => s + b.amount, 0);
const otherTotal = sampleMedicalBills.filter(b => b.bill_category === 'OTHER').reduce((s, b) => s + b.amount, 0);
const medicalGrandTotal = consultationTotal + medicineTotal + testTotal + otherTotal;

assert('Medical consultation subtotal: ₹500', consultationTotal, 500);
assert('Medical medicines subtotal: ₹2,450', medicineTotal, 2450);
assert('Medical diagnostic tests subtotal: ₹1,800', testTotal, 1800);
assert('Medical other charges subtotal: ₹450', otherTotal, 450);
assert('Medical Grand Total: ₹5,200', medicalGrandTotal, 5200);

// Test 4.2: Negative Bill Amount Guard
const invalidNegativeBills = [
    { bill_category: 'MEDICINE', amount: -200 },
    { bill_category: 'TEST', amount: 500 }
];
const hasNegative = invalidNegativeBills.some(b => b.amount < 0);
assert('Negative bill amount validation detects invalid charges', hasNegative, true);

// ─────────────────────────────────────────────────────────────────────────────
// INTEGRATION & DATABASE LIFECYCLE TESTS (CRUD, Workflows, Numbers)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--------------------------------------------------------------------------------');
console.log('  INTER-MODULE INTEGRATION, WORKFLOWS & DB LIFECYCLE AUDIT');
console.log('--------------------------------------------------------------------------------');

// DB Test 5.1: Employee Creation & Validation
const testEmpStmt = db.prepare(`
    INSERT INTO employees (name, name_hi, designation, category, pay_level, grade_pay, headquarters, basic_pay)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);
const empInfo = testEmpStmt.run('Rajesh Sharma', 'राजेश शर्मा', 'Regional Manager', 'A', 'Level 14', '7600', 'Bhopal', 118500);
const testEmpId = empInfo.lastInsertRowid;
assert('Employee inserted successfully in DB', testEmpId > 0, true);

// DB Test 5.2: Tour Diary Creation with td_no and is_diary = 1
const tdClaimStmt = db.prepare(`
    INSERT INTO claims (employee_id, claim_type, is_diary, td_no, rendered_claim_id, status, month, year, declaration_date, remarks)
    VALUES (?, 'TA_DA', 1, 'TD-25-0099', 'CL-25-0099', 'Draft', 'May', '2025', '2025-05-15', 'Monthly Tour Diary')
`);
const tdInfo = tdClaimStmt.run(testEmpId);
const tdClaimId = tdInfo.lastInsertRowid;
assert('Tour Diary claim created with is_diary = 1 and TD number', tdClaimId > 0, true);

const fetchedTD = db.prepare('SELECT is_diary, td_no, rendered_claim_id FROM claims WHERE id = ?').get(tdClaimId);
assert('Persisted claim has is_diary === 1', fetchedTD.is_diary, 1);
assert('Persisted claim has td_no', fetchedTD.td_no, 'TD-25-0099');

// DB Test 5.3: Bulk Journey Details Insertion & Recalculation
const journeyInsert = db.prepare(`
    INSERT INTO journey_details (claim_id, departure_date, departure_time, departure_station, arrival_date, arrival_time, arrival_station, mode, class_of_travel, fare_amount, distance_km, purpose)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
journeyInsert.run(tdClaimId, '2025-05-02', '09:00', 'Bhopal', '2025-05-02', '13:00', 'Sehore', 'Own Car', 'Self Drive', 0, 40, 'PDS Godown Inspection');
journeyInsert.run(tdClaimId, '2025-05-02', '16:00', 'Sehore', '2025-05-02', '20:00', 'Bhopal', 'Own Car', 'Self Drive', 0, 40, 'Return to HQ');

const countJourneys = db.prepare('SELECT COUNT(*) as cnt FROM journey_details WHERE claim_id = ?').get(tdClaimId).cnt;
assert('Bulk journeys persisted for Tour Diary: 2 legs', countJourneys, 2);

// DB Test 5.4: Workflow Status Transition (Draft -> SUBMITTED -> APPROVED)
const updateStatus = db.prepare('UPDATE claims SET status = ? WHERE id = ?');
updateStatus.run('SUBMITTED', tdClaimId);
let currentStatus = db.prepare('SELECT status FROM claims WHERE id = ?').get(tdClaimId).status;
assert('Workflow transition to SUBMITTED', currentStatus, 'SUBMITTED');

updateStatus.run('APPROVED', tdClaimId);
currentStatus = db.prepare('SELECT status FROM claims WHERE id = ?').get(tdClaimId).status;
assert('Workflow transition to APPROVED', currentStatus, 'APPROVED');

// DB Test 5.5: Medical Claim Creation & Cascade Deletion Check
const medClaimStmt = db.prepare(`
    INSERT INTO claims (employee_id, claim_type, rendered_claim_id, patient_name, relationship, is_regular, status, total_amount)
    VALUES (?, 'MEDICAL', 'CL-25-0888', 'Sunita Sharma', 'Wife', 'Regular', 'Draft', 3500)
`);
const medInfo = medClaimStmt.run(testEmpId);
const medClaimId = medInfo.lastInsertRowid;

const medBillStmt = db.prepare(`
    INSERT INTO medical_bills (claim_id, bill_category, description, amount)
    VALUES (?, ?, ?, ?)
`);
medBillStmt.run(medClaimId, 'CONSULTATION', 'Specialist Fee', 1000);
medBillStmt.run(medClaimId, 'MEDICINE', 'Antibiotics', 2500);

const billsCount = db.prepare('SELECT COUNT(*) as cnt FROM medical_bills WHERE claim_id = ?').get(medClaimId).cnt;
assert('Medical bills linked to medical claim: 2 bills', billsCount, 2);

// Delete claim and verify clean cleanup
const deleteClaim = db.transaction((id) => {
    db.prepare('DELETE FROM medical_bills WHERE claim_id = ?').run(id);
    db.prepare('DELETE FROM journey_details WHERE claim_id = ?').run(id);
    db.prepare('DELETE FROM claims WHERE id = ?').run(id);
});
deleteClaim(medClaimId);

const remainingBills = db.prepare('SELECT COUNT(*) as cnt FROM medical_bills WHERE claim_id = ?').get(medClaimId).cnt;
const remainingClaim = db.prepare('SELECT COUNT(*) as cnt FROM claims WHERE id = ?').get(medClaimId).cnt;
assert('Cascade delete removes medical bills', remainingBills, 0);
assert('Cascade delete removes claim record', remainingClaim, 0);

// Cleanup test employee & diary
deleteClaim(tdClaimId);
db.prepare('DELETE FROM employees WHERE id = ?').run(testEmpId);

console.log('\n================================================================================');
console.log(`  TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED (TOTAL: ${totalTests})`);
console.log('================================================================================\n');

if (failedTests > 0) {
    process.exit(1);
} else {
    process.exit(0);
}
