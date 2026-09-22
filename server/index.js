const express = require('express');
const cors = require('cors');
const { db, initDb } = require('./db');
const {
    TADA_RATES,
    getCityType,
    calculateDAForDuration,
    calculateTravelAllowance,
    calculateDiffHours,
    formatDate,
    formatTime,
    calculateTadaBillTotals: calculateTadaBillTotalsCore
} = require('./tadaRules');

// Helper for TADA Calculation logic (shared between bill view and bulk save)
function getOtherClaimsMileageTotal(employeeId, month, year, excludeClaimId, mode, rate) {
    if (!month || !year || !employeeId) return 0;
    const rows = db.prepare(`
        SELECT jd.distance_km FROM journey_details jd
        JOIN claims c ON jd.claim_id = c.id
        WHERE c.employee_id = ? AND c.month = ? AND c.year = ? AND c.id != ? AND jd.mode = ?
    `).all(employeeId, month, year, excludeClaimId ?? -1, mode);
    return rows.reduce((sum, r) => sum + (parseFloat(r.distance_km) || 0) * rate, 0);
}

// Master TADA Bill Calculation wrapper incorporating monthly mileage headroom
function calculateTadaBillTotals(claim, employee, journeys) {
    if (!employee || !journeys) {
        return calculateTadaBillTotalsCore(claim, employee, journeys);
    }
    const otherMileageUsage = {
        car: getOtherClaimsMileageTotal(employee.id, claim.month, claim.year, claim.id, 'Own Car', TADA_RATES.MILEAGE.CAR),
        bike: getOtherClaimsMileageTotal(employee.id, claim.month, claim.year, claim.id, 'Own Bike', TADA_RATES.MILEAGE.BIKE)
    };
    return calculateTadaBillTotalsCore(claim, employee, journeys, otherMileageUsage);
}

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// Initialize DB
initDb();

// Dashboard Stats API — Rich Analytics
app.get('/api/dashboard-stats', (req, res) => {
    try {
        const empCount = db.prepare('SELECT COUNT(*) as count FROM employees').get().count;

        // Claims by type
        const tadaStats = db.prepare(`SELECT COUNT(*) as count, COALESCE(SUM(total_amount),0) as total FROM claims WHERE claim_type = 'TA_DA'`).get();
        const transferStats = db.prepare(`SELECT COUNT(*) as count, COALESCE(SUM(total_amount),0) as total FROM claims WHERE claim_type = 'TRANSFER'`).get();
        const medicalStats = db.prepare(`SELECT COUNT(*) as count, COALESCE(SUM(total_amount),0) as total FROM claims WHERE claim_type = 'MEDICAL'`).get();

        // Status breakdown
        const statusBreakdown = db.prepare(`
            SELECT status, COUNT(*) as count, COALESCE(SUM(total_amount),0) as amount
            FROM claims GROUP BY status
        `).all();

        // Pending amount (Draft + Submitted)
        const pendingAmount = db.prepare(`
            SELECT COALESCE(SUM(total_amount),0) as total FROM claims WHERE status IN ('Draft','SUBMITTED')
        `).get().total;

        // Monthly trend — last 6 months
        const monthlyTrend = db.prepare(`
            SELECT strftime('%Y-%m', created_at) as month,
                   COUNT(*) as count,
                   COALESCE(SUM(total_amount),0) as amount
            FROM claims
            WHERE created_at >= date('now', '-6 months')
            GROUP BY month ORDER BY month ASC
        `).all();

        // Top 5 claimants by total amount
        const topClaimants = db.prepare(`
            SELECT e.name, COUNT(c.id) as claims, COALESCE(SUM(c.total_amount),0) as total
            FROM claims c JOIN employees e ON c.employee_id = e.id
            GROUP BY e.id ORDER BY total DESC LIMIT 5
        `).all();

        // Recent 5 claims
        const recentClaims = db.prepare(`
            SELECT c.id, c.claim_type, c.status, c.total_amount, c.created_at,
                   e.name as employee_name
            FROM claims c LEFT JOIN employees e ON c.employee_id = e.id
            ORDER BY c.created_at DESC LIMIT 5
        `).all();

        // Total claim amount
        const totalAmount = db.prepare(`SELECT COALESCE(SUM(total_amount),0) as total FROM claims`).get().total;
        const totalCount = db.prepare(`SELECT COUNT(*) as count FROM claims`).get().count;

        res.json({
            employees: empCount,
            totalClaims: totalCount,
            totalAmount: Math.round(totalAmount),
            pendingAmount: Math.round(pendingAmount),
            tada: { count: tadaStats.count || 0, amount: Math.round(tadaStats.total || 0) },
            transfer: { count: transferStats.count || 0, amount: Math.round(transferStats.total || 0) },
            medical: { count: medicalStats.count || 0, amount: Math.round(medicalStats.total || 0) },
            statusBreakdown,
            monthlyTrend,
            topClaimants,
            recentClaims,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Dedicated Dashboard API for complete real-time dashboard data
app.get('/api/dashboard', (req, res) => {
    try {
        const claims = db.prepare(`
            SELECT c.id, c.rendered_claim_id, c.claim_type, c.status, c.total_amount, c.created_at,
                   c.start_date, c.end_date, c.td_no, c.is_diary,
                   e.id as employee_id, e.name as employee_name, e.name_hi as employee_name_hi,
                   e.designation, e.category, e.headquarters
            FROM claims c
            LEFT JOIN employees e ON c.employee_id = e.id
            ORDER BY c.created_at DESC
        `).all();

        // Normalize claims for client dashboard
        const normalizedClaims = claims.map(c => {
            let normalizedType = 'ta';
            if (c.claim_type === 'TRANSFER') normalizedType = 'transfer';
            else if (c.claim_type === 'MEDICAL') normalizedType = 'medical';
            else if (c.is_diary) normalizedType = 'diary';

            return {
                id: c.rendered_claim_id || (c.td_no || `CL-${c.id}`),
                raw_id: c.id,
                emp: c.employee_name || 'Unknown',
                emp_hi: c.employee_name_hi || c.employee_name || 'अज्ञात',
                emp_id: c.employee_id,
                designation: c.designation || '',
                headquarters: c.headquarters || '',
                type: normalizedType,
                claim_type: c.claim_type,
                status: c.status || 'Draft',
                amt: parseFloat(c.total_amount) || 0,
                date: c.created_at || new Date().toISOString(),
                start_date: c.start_date,
                end_date: c.end_date,
                is_diary: !!c.is_diary
            };
        });

        const empCount = db.prepare('SELECT COUNT(*) as count FROM employees').get().count;

        res.json({
            claims: normalizedClaims,
            employees: empCount,
            serverOnline: true,
            serverTime: new Date().toISOString()
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// Fetch all journeys for an employee (from previous claims/diaries)
app.get('/api/employee-journeys/:empId', (req, res) => {
    try {
        const journeys = db.prepare(`
            SELECT j.*, c.claim_type, c.start_date, c.end_date 
            FROM journey_details j
            JOIN claims c ON j.claim_id = c.id
            WHERE c.employee_id = ?
            ORDER BY j.departure_date ASC, j.departure_time ASC
        `).all(req.params.empId);
        res.json(journeys);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Employees API ---
app.get('/api/employees', (req, res) => {
    try {
        const stmt = db.prepare('SELECT * FROM employees ORDER BY name');
        const rows = stmt.all();
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/employees', (req, res) => {
    const { name, name_hi, designation, category, pay_level, grade_pay, headquarters, basic_pay } = req.body;
    if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Employee name is required' });
    }
    const cat = (category || 'E').toString().toUpperCase().trim();
    if (!['A', 'B', 'C', 'D', 'E'].includes(cat)) {
        return res.status(400).json({ error: 'Category must be one of A, B, C, D, or E' });
    }
    try {
        const stmt = db.prepare(`
            INSERT INTO employees (name, name_hi, designation, category, pay_level, grade_pay, headquarters, basic_pay)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const info = stmt.run(name.trim(), name_hi || null, designation || null, cat, pay_level || null, grade_pay || null, headquarters || null, parseFloat(basic_pay) || null);
        res.json({ id: info.lastInsertRowid });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/employees/:id', (req, res) => {
    const { id } = req.params;
    const { name, name_hi, designation, category, pay_level, grade_pay, headquarters, basic_pay } = req.body;
    try {
        const stmt = db.prepare(`
            UPDATE employees 
            SET name = COALESCE(?, name), 
                name_hi = COALESCE(?, name_hi), 
                designation = COALESCE(?, designation), 
                category = COALESCE(?, category), 
                pay_level = COALESCE(?, pay_level), 
                grade_pay = COALESCE(?, grade_pay),
                headquarters = COALESCE(?, headquarters), 
                basic_pay = COALESCE(?, basic_pay)
            WHERE id = ?
        `);
        const info = stmt.run(name, name_hi, designation, category, pay_level, grade_pay, headquarters, basic_pay, id);
        if (info.changes === 0) {
            return res.status(404).json({ error: 'Employee not found' });
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/employees/:id', (req, res) => {
    const { id } = req.params;
    try {
        const deleteJourneyDetails = db.prepare(`
            DELETE FROM journey_details 
            WHERE claim_id IN (SELECT id FROM claims WHERE employee_id = ?)
        `);
        const deleteMedicalBills = db.prepare(`
            DELETE FROM medical_bills 
            WHERE claim_id IN (SELECT id FROM claims WHERE employee_id = ?)
        `);
        const deleteDailyAllowances = db.prepare(`
            DELETE FROM daily_allowances 
            WHERE claim_id IN (SELECT id FROM claims WHERE employee_id = ?)
        `);
        const deleteClaims = db.prepare('DELETE FROM claims WHERE employee_id = ?');
        const deleteFamily = db.prepare('DELETE FROM family_members WHERE employee_id = ?');
        const deleteEmployee = db.prepare('DELETE FROM employees WHERE id = ?');

        const deleteTx = db.transaction((empId) => {
            deleteJourneyDetails.run(empId);
            deleteMedicalBills.run(empId);
            deleteDailyAllowances.run(empId);
            deleteClaims.run(empId);
            deleteFamily.run(empId);
            deleteEmployee.run(empId);
        });

        deleteTx(id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Family Master API ---
app.get('/api/employees/:id/family', (req, res) => {
    try {
        const rows = db.prepare('SELECT * FROM family_members WHERE employee_id = ?').all(req.params.id);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/family', (req, res) => {
    const { employee_id, name, relationship, dob } = req.body;
    try {
        const stmt = db.prepare('INSERT INTO family_members (employee_id, name, relationship, dob) VALUES (?, ?, ?, ?)');
        const info = stmt.run(employee_id, name, relationship, dob);
        res.json({ id: info.lastInsertRowid, success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/family/:id', (req, res) => {
    try {
        db.prepare('DELETE FROM family_members WHERE id = ?').run(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Claims API ---
app.get('/api/claims', (req, res) => {
    try {
        const stmt = db.prepare(`
            SELECT c.*, e.name as employee_name, e.name_hi as employee_name_hi, e.designation 
            FROM claims c 
            LEFT JOIN employees e ON c.employee_id = e.id 
            ORDER BY c.created_at DESC
        `);
        const rows = stmt.all();
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/claims/:employeeId', (req, res) => {
    try {
        const stmt = db.prepare(`
            SELECT c.*, e.name as employee_name, e.name_hi as employee_name_hi, e.designation 
            FROM claims c 
            LEFT JOIN employees e ON c.employee_id = e.id 
            WHERE c.employee_id = ? 
            ORDER BY c.created_at DESC
        `);
        const rows = stmt.all(req.params.employeeId);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/claims', (req, res) => {
    const { employee_id, claim_type, start_date, end_date, month, year } = req.body;
    try {
        // Generate Identifiers
        const date = new Date();
        const yearSuffix = date.getFullYear().toString().slice(-2);
        const random = Math.floor(1000 + Math.random() * 9000);

        let rendered_claim_id = `CL-${yearSuffix}-${random}`;
        let td_no = null;

        // If it's a Tour Diary (Special identifying flag or just usage)
        if (req.body.is_diary) {
            td_no = `TD-${yearSuffix}-${random}`;
        }

        const stmt = db.prepare(`
            INSERT INTO claims (employee_id, claim_type, start_date, end_date, month, year, rendered_claim_id, td_no, remarks, is_diary)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const info = stmt.run(employee_id, claim_type, start_date, end_date, month, year, rendered_claim_id, td_no, req.body.remarks || null, req.body.is_diary ? 1 : 0);
        res.json({ id: info.lastInsertRowid, rendered_claim_id, td_no });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/claims/:id', (req, res) => {
    const { id } = req.params;
    try {
        const deleteDetails = db.prepare('DELETE FROM journey_details WHERE claim_id = ?');
        const deleteBills = db.prepare('DELETE FROM medical_bills WHERE claim_id = ?');
        const deleteDA = db.prepare('DELETE FROM daily_allowances WHERE claim_id = ?');
        const deleteClaim = db.prepare('DELETE FROM claims WHERE id = ?');
        const deleteTx = db.transaction((claimId) => {
            deleteDetails.run(claimId);
            deleteBills.run(claimId);
            deleteDA.run(claimId);
            deleteClaim.run(claimId);
        });
        deleteTx(id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/claim-details/:claimId', (req, res) => {
    const { claimId } = req.params;
    try {
        const claim = db.prepare('SELECT * FROM claims WHERE id = ?').get(claimId);
        if (!claim) return res.status(404).json({ error: 'Claim not found' });
        const journeys = db.prepare('SELECT * FROM journey_details WHERE claim_id = ?').all(claimId);
        res.json({ claim, journeys });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/journey-details-bulk', (req, res) => {
    const { claim_id, journeys } = req.body;
    try {
        const deleteStmt = db.prepare('DELETE FROM journey_details WHERE claim_id = ?');
        const insertStmt = db.prepare(`
            INSERT INTO journey_details (
                claim_id, departure_date, departure_time, departure_station,
                arrival_date, arrival_time, arrival_station,
                mode, class_of_travel, ticket_no, fare_amount, distance_km, purpose, merge_purpose
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        // Prepare Date Update logic
        const updateClaimDateStmt = db.prepare(`
            UPDATE claims 
            SET start_date = COALESCE(?, start_date), 
                end_date = COALESCE(?, end_date), 
                family_details = COALESCE(?, family_details), 
                baggage_weight = COALESCE(?, baggage_weight), 
                packing_charges = COALESCE(?, packing_charges), 
                goods_transport_charges = COALESCE(?, goods_transport_charges),
                month = COALESCE(?, month), 
                year = COALESCE(?, year), 
                hotel_stay_type = COALESCE(?, hotel_stay_type), 
                hotel_amount = COALESCE(?, hotel_amount), 
                advance_amount = COALESCE(?, advance_amount),
                declaration_date = COALESCE(?, declaration_date),
                total_amount = COALESCE(?, total_amount),
                remarks = COALESCE(?, remarks),
                status = COALESCE(?, status)
            WHERE id = ?
        `);

        // Helper to find min/max
        const getMinMaxDates = (js) => {
            if (!js.length) return { start: null, end: null };
            const dates = js.map(j => j.departure_date).filter(d => d).sort();
            const dates2 = js.map(j => j.arrival_date).filter(d => d).sort();
            const all = [...dates, ...dates2].sort();
            return { start: all[0], end: all[all.length - 1] };
        };

        const { start, end } = getMinMaxDates(journeys);
        const {
            family_details: fDetails, baggage_weight: bWeight, packing_charges: pCharges,
            goods_transport_charges: gCharges, month, year,
            hotel_stay_type, hotel_amount, declaration_date, remarks, advance_amount
        } = req.body;

        const updateJourneys = db.transaction((journeys, body) => {
            deleteStmt.run(claim_id);
            let totalFare = 0;
            let lastPurpose = '';
            for (let idx = 0; idx < journeys.length; idx++) {
                const j = journeys[idx];
                totalFare += (parseFloat(j.fare_amount) || 0);
                const isMerged = idx > 0 && !!j.merge_purpose;
                let legPurpose = (j.purpose || '').trim();
                if (isMerged && !legPurpose) {
                    legPurpose = lastPurpose;
                } else if (legPurpose) {
                    lastPurpose = legPurpose;
                }
                insertStmt.run(
                    claim_id, j.departure_date, j.departure_time, j.departure_station,
                    j.arrival_date, j.arrival_time, j.arrival_station,
                    j.mode, j.class_of_travel, j.ticket_no, j.fare_amount,
                    j.distance_km, legPurpose, isMerged ? 1 : 0
                );
            }

            // Re-calculate full total including DA by simulating a bill calculation
            const currentClaimInDb = db.prepare('SELECT employee_id, claim_type, month, year FROM claims WHERE id = ?').get(claim_id);
            const updatedClaim = {
                ...body,
                id: claim_id,
                hotel_stay_type: hotel_stay_type,
                hotel_amount: parseFloat(hotel_amount) || 0,
                advance_amount: parseFloat(advance_amount) || 0,
                claim_type: currentClaimInDb.claim_type,
                month: month || currentClaimInDb.month,
                year: year || currentClaimInDb.year
            };
            const employee = db.prepare('SELECT * FROM employees WHERE id = ?').get(currentClaimInDb.employee_id);
            const { totals: fullTotals } = calculateTadaBillTotals(updatedClaim, employee, journeys);

            updateClaimDateStmt.run(
                start, end, fDetails, bWeight, pCharges, gCharges,
                month, year, hotel_stay_type, parseFloat(hotel_amount) || 0,
                advance_amount !== undefined ? parseFloat(advance_amount) || 0 : null,
                declaration_date,
                fullTotals.grandTotal, remarks, body.status,
                claim_id
            );
        });

        updateJourneys(journeys, req.body);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const handleSubmitClaim = (req, res) => {
    const { id } = req.params;
    const total_amount = req.body && req.body.total_amount !== undefined ? req.body.total_amount : null;
    try {
        const stmt = db.prepare(`
            UPDATE claims 
            SET status = 'SUBMITTED', total_amount = COALESCE(?, total_amount)
            WHERE id = ?
        `);
        const info = stmt.run(total_amount, id);
        if (info.changes === 0) {
            return res.status(404).json({ error: 'Claim not found' });
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

app.put('/api/claims/:id/submit', handleSubmitClaim);
app.post('/api/claims/:id/submit', handleSubmitClaim);


app.put('/api/claims/:id/status', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const allowedStatuses = ['Draft', 'DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'];
    if (!status || !allowedStatuses.includes(status)) {
        return res.status(400).json({ error: `Invalid status. Must be one of: ${allowedStatuses.join(', ')}` });
    }
    try {
        const stmt = db.prepare('UPDATE claims SET status = ? WHERE id = ?');
        const info = stmt.run(status, id);
        if (info.changes === 0) {
            return res.status(404).json({ error: 'Claim not found' });
        }
        res.json({ success: true, status });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/claims/:id', (req, res) => {
    const { id } = req.params;
    const {
        claim_type, start_date, end_date, status, month, year,
        hotel_stay_type, hotel_amount, advance_amount, declaration_date, remarks,
        packing_charges, goods_transport_charges, family_details, baggage_weight,
        patient_name, relationship, is_regular, pay_scale, child_sl_no_dob,
        illness_name, illness_duration, total_enclosures
    } = req.body;
    try {
        const stmt = db.prepare(`
            UPDATE claims 
            SET claim_type = COALESCE(?, claim_type), 
                start_date = COALESCE(?, start_date), 
                end_date = COALESCE(?, end_date), 
                status = COALESCE(?, status), 
                month = COALESCE(?, month), 
                year = COALESCE(?, year), 
                hotel_stay_type = COALESCE(?, hotel_stay_type), 
                hotel_amount = COALESCE(?, hotel_amount),
                advance_amount = COALESCE(?, advance_amount),
                packing_charges = COALESCE(?, packing_charges),
                goods_transport_charges = COALESCE(?, goods_transport_charges),
                family_details = COALESCE(?, family_details),
                baggage_weight = COALESCE(?, baggage_weight),
                declaration_date = COALESCE(?, declaration_date), 
                remarks = COALESCE(?, remarks),
                patient_name = COALESCE(?, patient_name),
                relationship = COALESCE(?, relationship),
                is_regular = COALESCE(?, is_regular),
                pay_scale = COALESCE(?, pay_scale),
                child_sl_no_dob = COALESCE(?, child_sl_no_dob),
                illness_name = COALESCE(?, illness_name),
                illness_duration = COALESCE(?, illness_duration),
                total_enclosures = COALESCE(?, total_enclosures)
            WHERE id = ?
        `);
        stmt.run(
            claim_type, start_date, end_date, status, month, year,
            hotel_stay_type, hotel_amount, advance_amount,
            packing_charges, goods_transport_charges, family_details, baggage_weight,
            declaration_date, remarks,
            patient_name, relationship, is_regular, pay_scale,
            child_sl_no_dob, illness_name, illness_duration, total_enclosures,
            id
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// TA/DA Bill Calculation Endpoint
app.get('/api/calculate-bill/:claimId', (req, res) => {
    const { claimId } = req.params;
    try {
        const claim = db.prepare('SELECT * FROM claims WHERE id = ?').get(claimId);
        if (!claim) return res.status(404).json({ error: 'Claim not found' });

        const employee = db.prepare('SELECT * FROM employees WHERE id = ?').get(claim.employee_id);
        const journeys = db.prepare('SELECT * FROM journey_details WHERE claim_id = ? ORDER BY departure_date, departure_time').all(claimId);

        const { billRows, totals } = calculateTadaBillTotals(claim, employee, journeys);

        res.json({
            claim,
            employee: {
                ...employee,
                start_date: formatDate(claim.start_date),
                end_date: formatDate(claim.end_date)
            },
            billRows,
            totals
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Medical Claims API ---
app.post('/api/medical-claims', (req, res) => {
    const {
        employee_id, patient_name, relationship, is_regular, pay_scale,
        child_sl_no_dob, illness_name, illness_duration, total_enclosures, bills,
        start_date, end_date, remarks, status, month, year
    } = req.body;

    if (!employee_id) {
        return res.status(400).json({ error: 'Employee ID is required' });
    }

    const billsList = Array.isArray(bills) ? bills : [];
    const hasNegative = billsList.some(b => parseFloat(b.amount || 0) < 0);
    if (hasNegative) {
        return res.status(400).json({ error: 'Bill amount cannot be negative' });
    }

    try {
        const createClaim = db.transaction(() => {
            const totalAmount = billsList.reduce((sum, b) => sum + (parseFloat(b.amount) || 0), 0);

            // Generate official Claim ID
            const date = new Date();
            const yearSuffix = date.getFullYear().toString().slice(-2);
            const random = Math.floor(1000 + Math.random() * 9000);
            const rendered_claim_id = `CL-${yearSuffix}-${random}`;

            const monthsList = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
            const d = start_date ? new Date(start_date) : new Date();
            const claimMonth = month || monthsList[d.getMonth()];
            const claimYear = year || d.getFullYear().toString();

            const stmt = db.prepare(`
                INSERT INTO claims (
                    employee_id, claim_type, rendered_claim_id, month, year,
                    patient_name, relationship, is_regular, pay_scale,
                    child_sl_no_dob, illness_name, illness_duration, total_enclosures,
                    start_date, end_date, remarks, status, total_amount
                ) VALUES (?, 'MEDICAL', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            const info = stmt.run(
                employee_id, rendered_claim_id, claimMonth, claimYear,
                patient_name || null, relationship || null, is_regular || 'Regular', pay_scale || null,
                child_sl_no_dob || null, illness_name || null, illness_duration || null, total_enclosures || null,
                start_date || null, end_date || null, remarks || null, status || 'Draft', totalAmount
            );
            const claimId = info.lastInsertRowid;

            const billStmt = db.prepare(`
                INSERT INTO medical_bills (claim_id, bill_category, description, illness_name, lab_name, receipt_no, receipt_date, amount)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `);

            for (const bill of billsList) {
                billStmt.run(
                    claimId, bill.bill_category || 'OTHER', bill.description || '',
                    bill.illness_name || '', bill.lab_name || '', bill.receipt_no || '',
                    bill.receipt_date || '', parseFloat(bill.amount) || 0
                );
            }
            return { claimId, rendered_claim_id };
        });

        const result = createClaim();
        res.json({ id: result.claimId, rendered_claim_id: result.rendered_claim_id, success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/medical-claims/:id', (req, res) => {
    try {
        const claim = db.prepare('SELECT * FROM claims WHERE id = ?').get(req.params.id);
        if (!claim) return res.status(404).json({ error: 'Claim not found' });

        const bills = db.prepare('SELECT * FROM medical_bills WHERE claim_id = ?').all(req.params.id);
        res.json({ claim, bills });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/medical-claims/:id', (req, res) => {
    const {
        patient_name, relationship, is_regular, pay_scale,
        child_sl_no_dob, illness_name, illness_duration, total_enclosures, bills,
        start_date, end_date, remarks, status, month, year
    } = req.body;
    const { id } = req.params;

    const billsList = Array.isArray(bills) ? bills : [];
    const hasNegative = billsList.some(b => parseFloat(b.amount || 0) < 0);
    if (hasNegative) {
        return res.status(400).json({ error: 'Bill amount cannot be negative' });
    }

    try {
        const updateClaim = db.transaction(() => {
            const totalAmount = billsList.reduce((sum, b) => sum + (parseFloat(b.amount) || 0), 0);

            const stmt = db.prepare(`
                UPDATE claims 
                SET patient_name=COALESCE(?, patient_name), 
                    relationship=COALESCE(?, relationship), 
                    is_regular=COALESCE(?, is_regular), 
                    pay_scale=COALESCE(?, pay_scale),
                    child_sl_no_dob=COALESCE(?, child_sl_no_dob), 
                    illness_name=COALESCE(?, illness_name), 
                    illness_duration=COALESCE(?, illness_duration), 
                    total_enclosures=COALESCE(?, total_enclosures), 
                    start_date=COALESCE(?, start_date), 
                    end_date=COALESCE(?, end_date), 
                    month=COALESCE(?, month),
                    year=COALESCE(?, year),
                    remarks=COALESCE(?, remarks), 
                    status=COALESCE(?, status),
                    total_amount=?
                WHERE id=?
            `);
            stmt.run(
                patient_name, relationship, is_regular, pay_scale,
                child_sl_no_dob, illness_name, illness_duration, total_enclosures,
                start_date, end_date, month, year, remarks, status, totalAmount, id
            );

            db.prepare('DELETE FROM medical_bills WHERE claim_id=?').run(id);
            const billStmt = db.prepare(`
                INSERT INTO medical_bills (claim_id, bill_category, description, illness_name, lab_name, receipt_no, receipt_date, amount)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `);

            for (const bill of billsList) {
                billStmt.run(
                    id, bill.bill_category || 'OTHER', bill.description || '',
                    bill.illness_name || '', bill.lab_name || '', bill.receipt_no || '',
                    bill.receipt_date || '', parseFloat(bill.amount) || 0
                );
            }
        });

        updateClaim();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

if (require.main === module) {
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}

module.exports = { app, calculateTadaBillTotals };
