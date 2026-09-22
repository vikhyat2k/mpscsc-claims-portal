/**
 * Comprehensive Unit and Integration Tests for TA/DA Engine
 *
 * References:
 *  1. Finance Department, Govt of Madhya Pradesh Memorandum No. F 4-1/2025/Niyam/Char (03 April 2025)
 *  2. Supplementary Rule 30 (पूरक नियम 30) of MP Travelling Allowance Rules
 *  3. Form 21 Treasury Standards
 *
 * Run with:   node server/test_da_calculation.js
 */

'use strict';

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

// ─── Test Runner Helpers ────────────────────────────────────────────────────

function isoToHours(dep, arr) {
    const diff = new Date(arr) - new Date(dep);
    return diff / (1000 * 60 * 60);
}

let passed = 0;
let failed = 0;

function assert(label, actual, expected, tolerance = 0.01) {
    const ok = typeof expected === 'number'
        ? Math.abs(actual - expected) <= tolerance
        : actual === expected;
    const status = ok ? '✅ PASS' : '❌ FAIL';
    if (ok) passed++; else failed++;
    console.log(`${status}  ${label}`);
    if (!ok) {
        console.log(`        expected : ${expected}`);
        console.log(`        actual   : ${actual}`);
    }
}

console.log('\n======================================================================');
console.log('  MP TA/DA ENGINE COMPREHENSIVE REGRESSION & INTEGRATION SUITE');
console.log('======================================================================\n');

// ─── PART 1: Rule 30 DA Duration Calculations ──────────────────────────────
console.log('▶ [PART 1] Supplementary Rule 30 Duration Calculations');
console.log('─'.repeat(70));

const DAILY_A_OTHER = TADA_RATES.DA_RATES['OTHER']['A']; // 375

// Test 1: Multi-day (60 h) -> 2 full days + 12 h remainder (0.5) = 2.5
assert('Multi-day 60h: 2.5 days DA @ ₹375', calculateDAForDuration('OTHER', 'A', 60), DAILY_A_OTHER * 2.5);

// Test 2: Multi-day (64 h) -> 2 full days + 16 h remainder (1.0) = 3.0
assert('Multi-day 64h: 3.0 days DA @ ₹375', calculateDAForDuration('OTHER', 'A', 64), DAILY_A_OTHER * 3.0);

// Test 3: Multi-day (50 h) -> 2 full days + 2 h remainder (0) = 2.0
assert('Multi-day 50h: 2.0 days DA @ ₹375', calculateDAForDuration('OTHER', 'A', 50), DAILY_A_OTHER * 2.0);

// Test 4: Exactly 48 h -> 2 full days = 2.0
assert('Exact 48h: 2.0 days DA @ ₹375', calculateDAForDuration('OTHER', 'A', 48), DAILY_A_OTHER * 2.0);

// Test 5: Same-day 5 h (< 6 h) -> 0%
assert('Same-day 5h: 0 DA', calculateDAForDuration('OTHER', 'A', 5), 0);

// Test 6: Same-day 9 h (6-12 h) -> 50%
assert('Same-day 9h: 0.5 day DA @ ₹375', calculateDAForDuration('OTHER', 'A', 9), DAILY_A_OTHER * 0.5);

// Test 7: Same-day 14 h (> 12 h) -> 100%
assert('Same-day 14h: 1.0 day DA @ ₹375', calculateDAForDuration('OTHER', 'A', 14), DAILY_A_OTHER * 1.0);

// Test 8: Metro city, Cat B, 74 h -> 3 full days = 3.0 * 600 = 1800
const METRO_B_RATE = TADA_RATES.DA_RATES['METRO']['B']; // 600
assert('METRO Cat-B 74h: 3 full days @ ₹600', calculateDAForDuration('METRO', 'B', 74), METRO_B_RATE * 3.0);

// ─── PART 2: City Classification & Station Normalization ────────────────────
console.log('\n▶ [PART 2] Station Normalization & City Tier Classification (Sec 2.3 & 2.6)');
console.log('─'.repeat(70));

assert('Station Normalizer: Bhopal Jn -> bhopal', normalizeStation('Bhopal Jn'), 'bhopal');
assert('Station Normalizer: New Delhi Cantt -> new delhi', normalizeStation('New Delhi Cantt'), 'new delhi');
assert('Station Normalizer: Jabalpur Railway Station -> jabalpur', normalizeStation('Jabalpur Railway Station'), 'jabalpur');
assert('Station Normalizer: इंदौर जंक्शन -> इंदौर', normalizeStation('इंदौर जंक्शन'), 'इंदौर');

assert('City Classifier: Delhi is METRO', getCityType('Delhi'), 'METRO');
assert('City Classifier: Mumbai is METRO', getCityType('Mumbai'), 'METRO');
assert('City Classifier: New Delhi Cantt is METRO', getCityType('New Delhi Cantt'), 'METRO');
assert('City Classifier: Bhopal is MAJOR_CITY', getCityType('Bhopal'), 'MAJOR_CITY');
assert('City Classifier: Bhopal Jn is MAJOR_CITY', getCityType('Bhopal Jn'), 'MAJOR_CITY');
assert('City Classifier: इंदौर (Hindi) is MAJOR_CITY', getCityType('इंदौर'), 'MAJOR_CITY');
assert('City Classifier: Gwalior is MAJOR_CITY', getCityType('Gwalior'), 'MAJOR_CITY');
assert('City Classifier: Betul is OTHER', getCityType('Betul'), 'OTHER');
assert('City Classifier: बैतूल (Hindi) is OTHER', getCityType('बैतूल'), 'OTHER');
assert('City Classifier: Nagpur (Outside MP) is MAJOR_CITY (Tier 2)', getCityType('Nagpur'), 'MAJOR_CITY');
assert('City Classifier: Raipur (Outside MP) is MAJOR_CITY (Tier 2)', getCityType('Raipur'), 'MAJOR_CITY');

// ─── PART 3: Discrete Halt DA & Journey DA Allocation ───────────────────────
console.log('\n▶ [PART 3] Discrete Form 21 Halt DA & Journey DA Allocation (No Decimals)');
console.log('─'.repeat(70));

const empCatC = { id: 1, name: 'District Manager', category: 'C', headquarters: 'Betul' };

// Same-day trip 10h (Betul -> Bhopal -> Betul)
const sameDay10h = [
    { departure_date: '2026-07-20', departure_time: '07:00', departure_station: 'Betul', arrival_date: '2026-07-20', arrival_time: '10:30', arrival_station: 'Bhopal', mode: 'Bus', fare_amount: 250, distance_km: 205, ticket_no: '1' },
    { departure_date: '2026-07-20', departure_time: '14:00', departure_station: 'Bhopal', arrival_date: '2026-07-20', arrival_time: '17:00', arrival_station: 'Betul', mode: 'Bus', fare_amount: 250, distance_km: 205, ticket_no: '2' }
];
const billSameDay = calculateTadaBillTotals({ claim_type: 'TA_DA' }, empCatC, sameDay10h);
assert('Same-day 10h Total DA is 165 (0.5 day @ ₹330)', billSameDay.totals.totalDA, 165);
assert('Same-day 10h Halt DA is 0', billSameDay.totals.totalStayDA, 0);
assert('Same-day 10h Journey DA is 165', billSameDay.totals.totalJourneyDA, 165);
assert('Same-day 10h Row 1 Jrn DA is discrete 165.00', billSameDay.billRows[0].journey_da, '165.00');

// Multi-day tour (Betul -> Bhopal -> Betul, 67h)
const multiDay67h = [
    { departure_date: '2026-07-20', departure_time: '17:10', departure_station: 'Betul', arrival_date: '2026-07-20', arrival_time: '22:45', arrival_station: 'Bhopal', mode: 'Bus', fare_amount: 250, distance_km: 205, ticket_no: '1' },
    { departure_date: '2026-07-23', departure_time: '09:00', departure_station: 'Bhopal', arrival_date: '2026-07-23', arrival_time: '12:15', arrival_station: 'Betul', mode: 'Rail', fare_amount: 771, distance_km: 205, ticket_no: '8151234552' }
];
const billMultiDay = calculateTadaBillTotals({ claim_type: 'TA_DA' }, empCatC, multiDay67h);
assert('Multi-day 67h Total DA is 990 (3.0 days @ ₹330)', billMultiDay.totals.totalDA, 990);
assert('Multi-day 67h Halt DA is 660 (2 full days in Bhopal)', billMultiDay.totals.totalStayDA, 660);
assert('Multi-day 67h Journey DA is 330 (1.0 day allocated 0.5 per leg)', billMultiDay.totals.totalJourneyDA, 330);
assert('Multi-day 67h Row 1 Stay DA is discrete 660.00', billMultiDay.billRows[0].stay_da, '660.00');
assert('Multi-day 67h Row 1 Journey DA is discrete 165.00', billMultiDay.billRows[0].journey_da, '165.00');
assert('Multi-day 67h Row 2 Journey DA is discrete 165.00', billMultiDay.billRows[1].journey_da, '165.00');

// ─── PART 4: Hotel & Friends Stay Allowance (Sec 2.6) ───────────────────────
console.log('\n▶ [PART 4] Hotel & Friends Stay Accommodation Allowance (Sec 2.6)');
console.log('─'.repeat(70));

// Friends Stay in Bhopal (Major City, Cat C = ₹550/night)
const billFriends = calculateTadaBillTotals({ claim_type: 'TA_DA', hotel_stay_type: 'friends' }, empCatC, multiDay67h);
assert('Friends stay: 3 nights @ ₹550 = ₹1,650', billFriends.totals.totalStayAllowance, 1650);
assert('Friends stay: Stay DA remains pure ₹660', billFriends.totals.totalStayDA, 660);
assert('Friends stay: Grand Total = 1021 fare + 990 DA + 1650 Stay = 3661', billFriends.totals.grandTotal, 3661);

// Hotel Stay in Bhopal (Ceiling = ₹2,800/night, Claimed ₹5,000 <= 3 * 2800 = 8400)
const billHotelApproved = calculateTadaBillTotals({ claim_type: 'TA_DA', hotel_stay_type: 'hotel', hotel_amount: 5000 }, empCatC, multiDay67h);
assert('Hotel stay within ceiling: ₹5,000 approved', billHotelApproved.totals.totalStayAllowance, 5000);
assert('Hotel stay Grand Total = 1021 fare + 990 DA + 5000 Hotel = 7011', billHotelApproved.totals.grandTotal, 7011);

// Hotel Stay exceeding ceiling (3 nights @ Bhopal max ₹2,800 = ₹8,400 max. Claimed ₹10,000)
const billHotelCapped = calculateTadaBillTotals({ claim_type: 'TA_DA', hotel_stay_type: 'hotel', hotel_amount: 10000 }, empCatC, multiDay67h);
assert('Hotel stay exceeding ceiling capped at ₹8,400', billHotelCapped.totals.totalStayAllowance, 8400);

// Same-day trip claiming friends stay (Daytime only -> 0 night halt -> 0 Stay Allowance)
const billSameDayFriends = calculateTadaBillTotals({ claim_type: 'TA_DA', hotel_stay_type: 'friends' }, empCatC, sameDay10h);
assert('Daytime-only trip has 0 Stay Allowance even if friends selected', billSameDayFriends.totals.totalStayAllowance, 0);

// ─── PART 5: Transfer Claims (Sec 2.8 & 2.9) ────────────────────────────────
console.log('\n▶ [PART 5] Transfer Claim Entitlements (Sec 2.8 & 2.9)');
console.log('─'.repeat(70));

const transferJourneys = [
    { departure_date: '2026-08-01', departure_time: '08:00', departure_station: 'Betul', arrival_date: '2026-08-01', arrival_time: '18:00', arrival_station: 'Gwalior', mode: 'Rail', fare_amount: 850, distance_km: 430, ticket_no: 'T123', purpose: 'Transfer' }
];

const billTransferCatC = calculateTadaBillTotals({
    claim_type: 'TRANSFER',
    goods_transport_charges: 12000,
    packing_charges: 3000
}, empCatC, transferJourneys);

assert('Transfer: Composite Transfer Grant Cat C = ₹3,600 (Sec 2.9)', billTransferCatC.totals.transferGrant, 3600);
assert('Transfer: Packing charges zeroed out (subsumed in grant)', billTransferCatC.totals.totalPacking, 0);
// Goods transport: 430 km @ ₹25/km = ₹10,750 (user claimed 12000, capped at 10750)
assert('Transfer: Goods transport capped at ₹10,750 (430km × ₹25)', billTransferCatC.totals.totalTransport, 10750);
assert('Transfer: Grand Total = 850 fare + 165 DA + 3600 grant + 10750 goods = 15365', billTransferCatC.totals.grandTotal, 15365);

// ─── PART 6: Mode Entitlement & Own Mileage (Sec 2.4 & 2.5) ─────────────────
console.log('\n▶ [PART 6] Travel Mode & Mileage Caps (Sec 2.4 & 2.5)');
console.log('─'.repeat(70));

const empCatA = { id: 2, name: 'Managing Director', category: 'A', headquarters: 'Bhopal' };

// Air travel entitlement for Category A
const airJourney = [
    { departure_date: '2026-08-10', departure_time: '09:00', departure_station: 'Bhopal', arrival_date: '2026-08-10', arrival_time: '11:00', arrival_station: 'New Delhi', mode: 'Air', fare_amount: 6500, distance_km: 600, ticket_no: 'AI434' },
    { departure_date: '2026-08-11', departure_time: '17:00', departure_station: 'New Delhi', arrival_date: '2026-08-11', arrival_time: '19:00', arrival_station: 'Bhopal', mode: 'Air', fare_amount: 6500, distance_km: 600, ticket_no: 'AI435' }
];
const billAir = calculateTadaBillTotals({ claim_type: 'TA_DA' }, empCatA, airJourney);
assert('Cat A Air travel fare approved', billAir.totals.totalFare, 13000);

// Own Car mileage for Category A (₹9/km)
const carJourney = { mode: 'Own Car', distance_km: 100, fare_amount: 0 };
assert('Cat A Own Car mileage @ ₹9/km = ₹900', calculateTravelAllowance(carJourney, 'A'), 900);

// Own Bike mileage for all categories (₹4/km)
const bikeJourney = { mode: 'Own Bike', distance_km: 50, fare_amount: 0 };
assert('Own Bike mileage @ ₹4/km = ₹200', calculateTravelAllowance(bikeJourney, 'C'), 200);

// ─── PART 7: Integration Test on Database Claim 6 ───────────────────────────
console.log('\n▶ [PART 7] Integration Test on Live Database Claim #6');
console.log('─'.repeat(70));

try {
    const Database = require('better-sqlite3');
    const db = new Database('server/claims.db');
    const claim6FromDb = db.prepare('SELECT * FROM claims WHERE id = 6').get();
    const emp6FromDb = db.prepare('SELECT * FROM employees WHERE id = ?').get(claim6FromDb.employee_id);
    const journeys6FromDb = db.prepare('SELECT * FROM journey_details WHERE claim_id = 6 ORDER BY departure_date, departure_time').all();

    const verifiedClaim6 = calculateTadaBillTotals(claim6FromDb, emp6FromDb, journeys6FromDb);
    assert('DB Claim #6 Total Fare = ₹1,021', verifiedClaim6.totals.totalFare, 1021);
    assert('DB Claim #6 Total Journey DA = ₹330', verifiedClaim6.totals.totalJourneyDA, 330);
    assert('DB Claim #6 Total Stay DA = ₹660', verifiedClaim6.totals.totalStayDA, 660);
    assert('DB Claim #6 Grand Total = ₹2,011', verifiedClaim6.totals.grandTotal, 2011);
    assert('DB Claim #6 Net Payable without advance = ₹2,011', verifiedClaim6.totals.netPayable, 2011);
    assert('DB Claim #6 Amount in Words En', verifiedClaim6.totals.amountInWords, 'Two Thousand Eleven Rupees Only');
    assert('DB Claim #6 Amount in Words Hi', verifiedClaim6.totals.amountInWordsHi, 'दो हज़ार ग्यारह रुपये मात्र');

    // Test with ₹500 Travel Advance deduction
    const claim6WithAdvance = { ...claim6FromDb, advance_amount: 500 };
    const billWithAdv = calculateTadaBillTotals(claim6WithAdvance, emp6FromDb, journeys6FromDb);
    assert('Advance deduction: ₹500 advance deducted from ₹2,011 = ₹1,511', billWithAdv.totals.netPayable, 1511);
    assert('Advance deduction words En: One Thousand Five Hundred Eleven Rupees Only', billWithAdv.totals.amountInWords, 'One Thousand Five Hundred Eleven Rupees Only');
    db.close();
} catch (err) {
    console.error('DB test error:', err.message);
    failed++;
}

// ─── Summary ────────────────────────────────────────────────────────────────
console.log('\n======================================================================');
console.log(`TOTAL RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log('======================================================================\n');

if (failed > 0) {
    process.exitCode = 1;
}
