/**
 * Realistic Dummy Data Seeder for Complete Project Testing & Rule Compliance Audit
 * Populates diverse, verified test cases across all 4 modules and Categories A to E.
 */

'use strict';

const { db } = require('./db');

console.log('Seeding realistic dummy data for all 4 modules...');

// 1. Employees (Categories A, B, C, D, E)
const employees = [
    {
        name: 'Rajesh Verma', name_hi: 'राजेश वर्मा', designation: 'General Manager (Procurement)',
        category: 'A', pay_level: 'Level 14', grade_pay: '7600', headquarters: 'Bhopal', basic_pay: 122000
    },
    {
        name: 'Sunita Malviya', name_hi: 'सुनीता मालवीय', designation: 'District Manager',
        category: 'B', pay_level: 'Level 12', grade_pay: '6600', headquarters: 'Indore', basic_pay: 88700
    },
    {
        name: 'Ajay Chouhan', name_hi: 'अजय चौहान', designation: 'Quality Inspector',
        category: 'C', pay_level: 'Level 9', grade_pay: '4200', headquarters: 'Gwalior', basic_pay: 46200
    },
    {
        name: 'Manoj Kushwaha', name_hi: 'मनोज कुशवाहा', designation: 'Assistant Grade-III',
        category: 'D', pay_level: 'Level 4', grade_pay: '2400', headquarters: 'Jabalpur', basic_pay: 28700
    },
    {
        name: 'Rameshwar Dhurve', name_hi: 'रामेश्वर धुर्वे', designation: 'Office Attendant',
        category: 'E', pay_level: 'Level 1', grade_pay: '1300', headquarters: 'Betul', basic_pay: 18000
    }
];

const empMap = {};
for (const emp of employees) {
    const existing = db.prepare('SELECT id FROM employees WHERE name = ?').get(emp.name);
    if (existing) {
        empMap[emp.category] = existing.id;
    } else {
        const info = db.prepare(`
            INSERT INTO employees (name, name_hi, designation, category, pay_level, grade_pay, headquarters, basic_pay)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(emp.name, emp.name_hi, emp.designation, emp.category, emp.pay_level, emp.grade_pay, emp.headquarters, emp.basic_pay);
        empMap[emp.category] = info.lastInsertRowid;
    }
}

// 2. Family Members
const familyMembers = [
    { empId: empMap.A, name: 'Kavita Verma', relationship: 'Wife', dob: '1980-08-14' },
    { empId: empMap.A, name: 'Aarav Verma', relationship: 'Son', dob: '2008-04-21' },
    { empId: empMap.B, name: 'Sanjay Malviya', relationship: 'Husband', dob: '1982-11-05' },
    { empId: empMap.B, name: 'Ananya Malviya', relationship: 'Daughter', dob: '2012-07-19' },
    { empId: empMap.C, name: 'Pooja Chouhan', relationship: 'Wife', dob: '1989-02-10' }
];

for (const fam of familyMembers) {
    const existing = db.prepare('SELECT id FROM family_members WHERE employee_id = ? AND name = ?').get(fam.empId, fam.name);
    if (!existing) {
        db.prepare('INSERT INTO family_members (employee_id, name, relationship, dob) VALUES (?, ?, ?, ?)').run(
            fam.empId, fam.name, fam.relationship, fam.dob
        );
    }
}

// 3. Module 1: Tour Diary (Category A - Bhopal to Hoshangabad, Raisen, Sehore)
const tdExist = db.prepare('SELECT id FROM claims WHERE td_no = ?').get('TD-25-0101');
if (!tdExist) {
    const tdInfo = db.prepare(`
        INSERT INTO claims (employee_id, claim_type, is_diary, td_no, rendered_claim_id, status, month, year, declaration_date, remarks, start_date, end_date)
        VALUES (?, 'TA_DA', 1, 'TD-25-0101', 'CL-25-0101', 'SUBMITTED', 'May', '2025', '2025-05-20', 'PDS Godown and Procurement Center Inspection', '2025-05-12', '2025-05-14')
    `).run(empMap.A);
    const tdId = tdInfo.lastInsertRowid;

    const insertJ = db.prepare(`
        INSERT INTO journey_details (claim_id, departure_date, departure_time, departure_station, arrival_date, arrival_time, arrival_station, mode, class_of_travel, fare_amount, distance_km, purpose)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertJ.run(tdId, '2025-05-12', '08:00', 'Bhopal', '2025-05-12', '10:30', 'Hoshangabad', 'Own Car', 'Self Drive', 0, 75, 'Procurement Center Verification');
    insertJ.run(tdId, '2025-05-13', '11:00', 'Hoshangabad', '2025-05-13', '14:00', 'Raisen', 'Own Car', 'Self Drive', 0, 95, 'Buffer Stock Audit');
    insertJ.run(tdId, '2025-05-14', '15:30', 'Raisen', '2025-05-14', '17:30', 'Bhopal', 'Own Car', 'Self Drive', 0, 45, 'Return to Headquarters');
}

// 4. Module 2: TA/DA Claim (Category B - Indore to Bhopal with Hotel stay & Advance)
const tadaExist = db.prepare('SELECT id FROM claims WHERE rendered_claim_id = ?').get('CL-25-0201');
if (!tadaExist) {
    const tadaInfo = db.prepare(`
        INSERT INTO claims (employee_id, claim_type, is_diary, rendered_claim_id, status, month, year, declaration_date, remarks, hotel_stay_type, hotel_amount, advance_amount, start_date, end_date, total_amount)
        VALUES (?, 'TA_DA', 0, 'CL-25-0201', 'Draft', 'June', '2025', '2025-06-18', 'State Level Kharif Meeting at HQ Bhopal', 'Hotel', 4200, 2000, '2025-06-15', '2025-06-17', 6280)
    `).run(empMap.B);
    const tadaId = tadaInfo.lastInsertRowid;

    const insertJ = db.prepare(`
        INSERT INTO journey_details (claim_id, departure_date, departure_time, departure_station, arrival_date, arrival_time, arrival_station, mode, class_of_travel, ticket_no, fare_amount, distance_km, purpose)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertJ.run(tadaId, '2025-06-15', '06:00', 'Indore', '2025-06-15', '09:30', 'Bhopal', 'Rail', 'AC 2-Tier', 'PNR-24910294', 600, 230, 'HQ Review Meeting');
    insertJ.run(tadaId, '2025-06-17', '18:00', 'Bhopal', '2025-06-17', '21:45', 'Indore', 'Rail', 'AC 2-Tier', 'PNR-24910295', 600, 230, 'Return to HQ');
}

// 5. Module 3: Transfer Claim (Category C - Transfer from Gwalior to Bhopal)
const transferExist = db.prepare('SELECT id FROM claims WHERE rendered_claim_id = ?').get('CL-25-0301');
if (!transferExist) {
    const trInfo = db.prepare(`
        INSERT INTO claims (employee_id, claim_type, is_diary, rendered_claim_id, status, month, year, declaration_date, remarks, family_details, baggage_weight, goods_transport_charges, packing_charges, start_date, end_date, total_amount)
        VALUES (?, 'TRANSFER', 0, 'CL-25-0301', 'Draft', 'July', '2025', '2025-07-05', 'Transfer from Gwalior Regional Office to Bhopal Head Office', 'Pooja Chouhan (Wife)', 2200, 8500, 0, '2025-07-01', '2025-07-01', 13010)
    `).run(empMap.C);
    const trId = trInfo.lastInsertRowid;

    db.prepare(`
        INSERT INTO journey_details (claim_id, departure_date, departure_time, departure_station, arrival_date, arrival_time, arrival_station, mode, class_of_travel, ticket_no, fare_amount, distance_km, purpose)
        VALUES (?, '2025-07-01', '08:00', 'Gwalior', '2025-07-01', '14:30', 'Bhopal', 'Rail', 'AC 3-Tier', 'PNR-88192011', 910, 420, 'Transfer Movement')
    `).run(trId);
}

// 6. Module 4: Medical Claim (Category B - Pediatric treatment & tests)
const medExist = db.prepare('SELECT id FROM claims WHERE rendered_claim_id = ?').get('CL-25-0401');
if (!medExist) {
    const medInfo = db.prepare(`
        INSERT INTO claims (employee_id, claim_type, rendered_claim_id, status, patient_name, relationship, is_regular, pay_scale, illness_name, illness_duration, total_enclosures, month, year, declaration_date, remarks, total_amount)
        VALUES (?, 'MEDICAL', 'CL-25-0401', 'Draft', 'Ananya Malviya', 'Daughter', 'Regular', 'Level 12 / GP 6600', 'Viral Fever (विषाणु ज्वर)', '5 Days', '4 Bills Attached', 'August', '2025', '2025-08-10', 'OPD consultation and medications as prescribed', 4750)
    `).run(empMap.B);
    const medId = medInfo.lastInsertRowid;

    const insertMedBill = db.prepare(`
        INSERT INTO medical_bills (claim_id, bill_category, description, lab_name, receipt_no, receipt_date, amount)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    insertMedBill.run(medId, 'CONSULTATION', 'Dr. Alok Kulkarni, MD Paediatrics', '', 'REC-1044', '2025-08-01', 600);
    insertMedBill.run(medId, 'MEDICINE', 'Antibiotics & Antipyretic Syrups', 'Apollo Pharmacy Indore', 'AP-99210', '2025-08-01', 1650);
    insertMedBill.run(medId, 'TEST', 'Complete Blood Count (CBC) & Dengue NS1', 'Central Diagnostic Lab', 'LAB-5512', '2025-08-02', 2100);
    insertMedBill.run(medId, 'OTHER', 'ORS electrolytes & thermocool compresses', 'City Medicals', 'CM-119', '2025-08-03', 400);
}

console.log('✅ Realistic dummy data seeded successfully for all 4 modules.');
