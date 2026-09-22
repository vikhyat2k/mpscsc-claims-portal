const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, 'claims.db'));

// Check Ajay Chouhan (ID 6)
const ajayClaim = db.prepare("SELECT id FROM claims WHERE employee_id = 6 AND claim_type = 'TA_DA'").get();
if (!ajayClaim) {
  const insertClaim = db.prepare(`
    INSERT INTO claims (employee_id, claim_type, is_diary, td_no, rendered_claim_id, status, month, year, start_date, end_date, total_amount, advance_amount, remarks)
    VALUES (?, 'TA_DA', 1, ?, ?, 'Draft', 'September', '2026', '2026-09-08', '2026-09-08', ?, 0, ?)
  `);
  
  const res = insertClaim.run(6, 'TD-26-6101', 'CL-26-6101', 695, 'PDS Godown & Warehouse Inspection at Ujjain and Dewas');
  const claimId = res.lastInsertRowid;
  
  const insertJourney = db.prepare(`
    INSERT INTO journey_details (claim_id, departure_date, departure_time, departure_station, arrival_date, arrival_time, arrival_station, mode, class_of_travel, fare_amount, distance_km, purpose)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  insertJourney.run(claimId, '2026-09-08', '07:30', 'Bhopal', '2026-09-08', '11:00', 'Ujjain', 'Rail', 'Sleeper', 125, 184, 'Ujjain PDS Godown Quality Check');
  insertJourney.run(claimId, '2026-09-08', '16:30', 'Ujjain', '2026-09-08', '17:45', 'Dewas', 'Bus', 'Express', 60, 37, 'Dewas Warehouse Inspection');
  insertJourney.run(claimId, '2026-09-08', '19:30', 'Dewas', '2026-09-08', '23:00', 'Bhopal', 'Bus', 'Express', 180, 153, 'Return to Headquarters');
  
  console.log('Seeded TA/DA claim for Ajay Chouhan, ID:', claimId);
} else {
  console.log('Ajay Chouhan already has TA/DA claim:', ajayClaim.id);
}

// Check Manoj Kushwaha (ID 7)
const manojClaim = db.prepare("SELECT id FROM claims WHERE employee_id = 7 AND claim_type = 'TA_DA'").get();
if (!manojClaim) {
  const insertClaim = db.prepare(`
    INSERT INTO claims (employee_id, claim_type, is_diary, td_no, rendered_claim_id, status, month, year, start_date, end_date, total_amount, advance_amount, remarks)
    VALUES (?, 'TA_DA', 1, ?, ?, 'Draft', 'September', '2026', '2026-09-12', '2026-09-12', ?, 0, ?)
  `);
  const res = insertClaim.run(7, 'TD-26-7102', 'CL-26-7102', 375, 'Tehsil Depot Audit & Stock Verification');
  const claimId = res.lastInsertRowid;
  const insertJourney = db.prepare(`
    INSERT INTO journey_details (claim_id, departure_date, departure_time, departure_station, arrival_date, arrival_time, arrival_station, mode, class_of_travel, fare_amount, distance_km, purpose)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertJourney.run(claimId, '2026-09-12', '08:00', 'Indore', '2026-09-12', '10:30', 'Dhar', 'Bus', 'Ordinary', 95, 65, 'Tehsil Depot Audit');
  insertJourney.run(claimId, '2026-09-12', '17:00', 'Dhar', '2026-09-12', '19:30', 'Indore', 'Bus', 'Ordinary', 95, 65, 'Return to HQ');
  console.log('Seeded TA/DA claim for Manoj Kushwaha, ID:', claimId);
} else {
  console.log('Manoj Kushwaha already has TA/DA claim:', manojClaim.id);
}

// Check Rameshwar Dhurve (ID 8)
const rameshwarClaim = db.prepare("SELECT id FROM claims WHERE employee_id = 8 AND claim_type = 'TA_DA'").get();
if (!rameshwarClaim) {
  const insertClaim = db.prepare(`
    INSERT INTO claims (employee_id, claim_type, is_diary, td_no, rendered_claim_id, status, month, year, start_date, end_date, total_amount, advance_amount, remarks)
    VALUES (?, 'TA_DA', 1, ?, ?, 'Draft', 'September', '2026', '2026-09-15', '2026-09-15', ?, 0, ?)
  `);
  const res = insertClaim.run(8, 'TD-26-8103', 'CL-26-8103', 215, 'Official Dak Delivery to Katni Collectorate');
  const claimId = res.lastInsertRowid;
  const insertJourney = db.prepare(`
    INSERT INTO journey_details (claim_id, departure_date, departure_time, departure_station, arrival_date, arrival_time, arrival_station, mode, class_of_travel, fare_amount, distance_km, purpose)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertJourney.run(claimId, '2026-09-15', '09:00', 'Jabalpur', '2026-09-15', '11:15', 'Katni', 'Rail', 'Second Class', 45, 91, 'Dak Delivery');
  insertJourney.run(claimId, '2026-09-15', '16:00', 'Katni', '2026-09-15', '18:15', 'Jabalpur', 'Rail', 'Second Class', 45, 91, 'Return to HQ');
  console.log('Seeded TA/DA claim for Rameshwar Dhurve, ID:', claimId);
} else {
  console.log('Rameshwar Dhurve already has TA/DA claim:', rameshwarClaim.id);
}
