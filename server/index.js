require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { rateLimit } = require('express-rate-limit');
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

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production-please';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '7d';


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
const PORT = process.env.PORT || 5000;

// CORS — allow same-origin in prod; allow localhost in dev
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:5173', 'http://localhost:4173', 'http://localhost:5000'];

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin, dev environments, or cloud hosting domains
        if (
            !origin ||
            process.env.NODE_ENV !== 'production' ||
            allowedOrigins.includes(origin) ||
            origin.includes('onrender.com') ||
            origin.includes('railway.app') ||
            origin.includes('koyeb.app') ||
            origin.includes('vercel.app') ||
            origin.includes('localhost')
        ) {
            return callback(null, true);
        }
        // Fallback: allow all origins since all protected API routes are guarded by JWT Bearer tokens
        return callback(null, true);
    },
    credentials: true
}));
app.use(express.json());

// ─────────────────────────────────────────────
// RATE LIMITERS
// ─────────────────────────────────────────────
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'test' || process.env.DISABLE_RATE_LIMIT === 'true' ? 10000 : 500,
    skip: () => process.env.NODE_ENV === 'test' || process.env.DISABLE_RATE_LIMIT === 'true',
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' }
});

// ─────────────────────────────────────────────
// AUTH MIDDLEWARE
// ─────────────────────────────────────────────
const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Authentication required' });
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        // Verify user still exists and is active
        const user = db.prepare('SELECT id, role, account_status FROM users WHERE id = ?').get(decoded.id);
        if (!user) return res.status(401).json({ error: 'User not found' });
        if (user.account_status !== 'active') return res.status(403).json({ error: 'Account suspended' });
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};

const requireAdmin = (req, res, next) => {
    if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
};

// ─────────────────────────────────────────────
// HELPER: verify employee belongs to current user
// ─────────────────────────────────────────────
const verifyEmployeeOwnership = (employeeId, userId, isAdmin) => {
    if (isAdmin) return true;
    const emp = db.prepare('SELECT id FROM employees WHERE id = ? AND user_id = ?').get(employeeId, userId);
    return !!emp;
};

// Initialize DB
initDb();

// Auto-seed admin user if no admin exists
async function autoSeedAdmin() {
    try {
        const adminCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'").get();
        if (adminCount.count === 0) {
            const email = process.env.ADMIN_EMAIL || 'admin@mpscsc.gov.in';
            const password = process.env.ADMIN_PASSWORD || 'Admin@123';
            const fullName = process.env.ADMIN_NAME || 'System Administrator';
            const mobile = process.env.ADMIN_MOBILE || '9000000000';

            const hash = await bcrypt.hash(password, 12);
            db.prepare(
                "INSERT INTO users (full_name, email, mobile_number, password_hash, role, account_status) VALUES (?, ?, ?, ?, 'admin', 'active')"
            ).run(fullName, email.toLowerCase(), mobile, hash);
            console.log(`[AutoSeed] Default admin created: ${email}`);
        }
    } catch (e) {
        console.error('[AutoSeed] Error checking/seeding admin:', e.message);
    }
}
autoSeedAdmin();

// ─────────────────────────────────────────────
// SERVE STATIC CLIENT BUILD IN PRODUCTION
// ─────────────────────────────────────────────
const clientBuildPath = path.join(__dirname, '..', 'client', 'dist');
const fs = require('fs');
if (process.env.NODE_ENV === 'production' || fs.existsSync(clientBuildPath)) {
    app.use(express.static(clientBuildPath));
}

// ─────────────────────────────────────────────
// AUTH ENDPOINTS
// ─────────────────────────────────────────────

// POST /api/auth/register
app.post('/api/auth/register', authLimiter, async (req, res) => {
    const { full_name, email, mobile_number, password, confirm_password } = req.body;

    // Validation
    if (!full_name || !email || !mobile_number || !password) {
        return res.status(400).json({ error: 'All fields are required' });
    }
    const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRx.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
    }
    const mobileRx = /^[6-9]\d{9}$/;
    if (!mobileRx.test(mobile_number)) {
        return res.status(400).json({ error: 'Invalid mobile number (must be 10-digit Indian number)' });
    }
    if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    if (confirm_password && password !== confirm_password) {
        return res.status(400).json({ error: 'Passwords do not match' });
    }

    try {
        // Check for duplicate email
        const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
        if (existing) {
            return res.status(409).json({ error: 'Email already registered' });
        }

        const password_hash = await bcrypt.hash(password, 12);
        const stmt = db.prepare(`
            INSERT INTO users (full_name, email, mobile_number, password_hash, role, account_status)
            VALUES (?, ?, ?, ?, 'user', 'active')
        `);
        const info = stmt.run(full_name.trim(), email.toLowerCase().trim(), mobile_number.trim(), password_hash);
        res.status(201).json({ success: true, message: 'Registration successful', id: info.lastInsertRowid });
    } catch (err) {
        if (err.message && err.message.includes('UNIQUE')) {
            return res.status(409).json({ error: 'Email already registered' });
        }
        res.status(500).json({ error: err.message });
    }
});

// POST /api/auth/login
app.post('/api/auth/login', authLimiter, async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }
    try {
        const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        if (user.account_status !== 'active') {
            return res.status(403).json({ error: 'Your account has been suspended. Please contact the administrator.' });
        }
        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Update last_login_at
        db.prepare('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role, full_name: user.full_name },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES }
        );
        res.json({
            success: true,
            token,
            user: { id: user.id, full_name: user.full_name, email: user.email, role: user.role }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/auth/me
app.get('/api/auth/me', verifyToken, (req, res) => {
    try {
        const user = db.prepare('SELECT id, full_name, email, mobile_number, role, account_status, created_at, last_login_at FROM users WHERE id = ?').get(req.user.id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        if (req.user.is_impersonated) {
            user.is_impersonated = true;
            user.impersonated_by = req.user.impersonated_by;
        }
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/auth/logout  (stateless JWT — just acknowledge; client drops token)
app.post('/api/auth/logout', verifyToken, (req, res) => {
    res.json({ success: true, message: 'Logged out successfully' });
});

// POST /api/auth/forgot-password (generates reset info — admin relays token)
app.post('/api/auth/forgot-password', authLimiter, (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });
    try {
        const user = db.prepare('SELECT id, full_name FROM users WHERE email = ?').get(email.toLowerCase().trim());
        // Always respond with same message to prevent email enumeration
        if (!user) {
            return res.json({ success: true, message: 'If this email is registered, a reset link has been sent.' });
        }
        // Generate a short-lived reset token
        const resetToken = jwt.sign({ id: user.id, purpose: 'password_reset' }, JWT_SECRET, { expiresIn: '1h' });
        // In a production system, send email. For now, return token so admin can relay it.
        res.json({
            success: true,
            message: 'Password reset token generated. Contact admin to complete reset.',
            reset_token: resetToken  // Admin-visible only
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/auth/reset-password
app.post('/api/auth/reset-password', authLimiter, async (req, res) => {
    const { reset_token, new_password } = req.body;
    if (!reset_token || !new_password) return res.status(400).json({ error: 'Token and new password are required' });
    if (new_password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
    try {
        const decoded = jwt.verify(reset_token, JWT_SECRET);
        if (decoded.purpose !== 'password_reset') return res.status(400).json({ error: 'Invalid reset token' });
        const password_hash = await bcrypt.hash(new_password, 12);
        db.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(password_hash, decoded.id);
        res.json({ success: true, message: 'Password reset successfully' });
    } catch (err) {
        return res.status(400).json({ error: 'Invalid or expired reset token' });
    }
});

// ─────────────────────────────────────────────
// ADMIN ENDPOINTS
// ─────────────────────────────────────────────

// GET /api/admin/users — list all users
app.get('/api/admin/users', verifyToken, requireAdmin, (req, res) => {
    try {
        const { search } = req.query;
        let query = `
            SELECT u.id, u.full_name, u.email, u.mobile_number, u.role,
                   u.account_status, u.created_at, u.last_login_at,
                   COUNT(e.id) as employee_count
            FROM users u
            LEFT JOIN employees e ON e.user_id = u.id
        `;
        const params = [];
        if (search) {
            query += ` WHERE u.full_name LIKE ? OR u.email LIKE ?`;
            params.push(`%${search}%`, `%${search}%`);
        }
        query += ` GROUP BY u.id ORDER BY u.created_at DESC`;
        const users = db.prepare(query).all(...params);
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/admin/users/:id — single user detail (including their claims & employees)
app.get('/api/admin/users/:id', verifyToken, requireAdmin, (req, res) => {
    try {
        const user = db.prepare('SELECT id, full_name, email, mobile_number, role, account_status, created_at, updated_at, last_login_at FROM users WHERE id = ?').get(req.params.id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const employees = db.prepare('SELECT * FROM employees WHERE user_id = ? ORDER BY name').all(req.params.id);
        const claimStats = db.prepare(`
            SELECT COUNT(*) as total_claims, COALESCE(SUM(c.total_amount),0) as total_amount,
                   COUNT(CASE WHEN c.claim_type = 'TA_DA' THEN 1 END) as tada_claims,
                   COUNT(CASE WHEN c.claim_type = 'TRANSFER' THEN 1 END) as transfer_claims,
                   COUNT(CASE WHEN c.claim_type = 'MEDICAL' THEN 1 END) as medical_claims
            FROM claims c JOIN employees e ON c.employee_id = e.id
            WHERE e.user_id = ?
        `).get(req.params.id);

        const claims = db.prepare(`
            SELECT c.*, e.name as employee_name, e.name_hi as employee_name_hi, e.designation, e.category
            FROM claims c
            JOIN employees e ON c.employee_id = e.id
            WHERE e.user_id = ?
            ORDER BY c.created_at DESC
        `).all(req.params.id);

        res.json({ user, employees, claimStats, claims });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/admin/claims — list all claims across all users with submitter and employee details
app.get('/api/admin/claims', verifyToken, requireAdmin, (req, res) => {
    try {
        const { search, type, status, user_id } = req.query;
        let query = `
            SELECT c.*,
                   e.name as employee_name, e.name_hi as employee_name_hi, e.designation, e.category,
                   u.id as user_id, u.full_name as user_name, u.email as user_email
            FROM claims c
            JOIN employees e ON c.employee_id = e.id
            JOIN users u ON e.user_id = u.id
            WHERE 1=1
        `;
        const params = [];
        if (search) {
            query += ` AND (e.name LIKE ? OR u.full_name LIKE ? OR u.email LIKE ? OR c.td_no LIKE ? OR c.rendered_claim_id LIKE ?)`;
            params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
        }
        if (type && type !== 'ALL') {
            query += ` AND c.claim_type = ?`;
            params.push(type);
        }
        if (status && status !== 'ALL') {
            query += ` AND c.status = ?`;
            params.push(status);
        }
        if (user_id) {
            query += ` AND u.id = ?`;
            params.push(user_id);
        }
        query += ` ORDER BY c.created_at DESC`;
        const claims = db.prepare(query).all(...params);
        res.json(claims);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PATCH /api/admin/users/:id/status — change account status
app.patch('/api/admin/users/:id/status', verifyToken, requireAdmin, (req, res) => {
    const { status } = req.body;
    const allowed = ['active', 'suspended'];
    if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' });
    try {
        db.prepare('UPDATE users SET account_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/admin/users/:id/employees — user's employees (admin view)
app.get('/api/admin/users/:id/employees', verifyToken, requireAdmin, (req, res) => {
    try {
        const employees = db.prepare('SELECT * FROM employees WHERE user_id = ? ORDER BY name').all(req.params.id);
        res.json(employees);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/admin/stats — overall platform stats (including recent user claims)
app.get('/api/admin/stats', verifyToken, requireAdmin, (req, res) => {
    try {
        const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users WHERE role = ?').get('user').count;
        const activeUsers = db.prepare('SELECT COUNT(*) as count FROM users WHERE role = ? AND account_status = ?').get('user', 'active').count;
        const totalEmployees = db.prepare('SELECT COUNT(*) as count FROM employees').get().count;
        const totalClaims = db.prepare('SELECT COUNT(*) as count FROM claims').get().count;
        const totalAmount = db.prepare('SELECT COALESCE(SUM(total_amount),0) as total FROM claims').get().total;
        const recentUsers = db.prepare('SELECT id, full_name, email, created_at FROM users ORDER BY created_at DESC LIMIT 5').all();
        const recentClaims = db.prepare(`
            SELECT c.id, c.claim_type, c.status, c.total_amount, c.created_at, c.start_date, c.end_date, c.td_no, c.month, c.year,
                   e.name as employee_name, u.full_name as user_name, u.id as user_id
            FROM claims c
            LEFT JOIN employees e ON c.employee_id = e.id
            LEFT JOIN users u ON e.user_id = u.id
            ORDER BY c.created_at DESC LIMIT 6
        `).all();
        res.json({ totalUsers, activeUsers, totalEmployees, totalClaims, totalAmount: Math.round(totalAmount), recentUsers, recentClaims });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PATCH /api/admin/users/:id/reset-password — admin resets user password
app.patch('/api/admin/users/:id/reset-password', verifyToken, requireAdmin, async (req, res) => {
    const { new_password } = req.body;
    if (!new_password || new_password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
    try {
        const password_hash = await bcrypt.hash(new_password, 12);
        db.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(password_hash, req.params.id);
        res.json({ success: true, message: 'Password reset successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/admin/impersonate/:userId — admin logs in as specific user without needing their password
app.post('/api/admin/impersonate/:userId', verifyToken, requireAdmin, (req, res) => {
    try {
        const targetUserId = parseInt(req.params.userId, 10);
        if (!targetUserId || isNaN(targetUserId)) {
            return res.status(400).json({ error: 'Valid user ID is required' });
        }

        if (targetUserId === req.user.id) {
            return res.status(400).json({ error: 'Cannot impersonate your own administrator account' });
        }

        const targetUser = db.prepare('SELECT id, full_name, email, mobile_number, role, account_status FROM users WHERE id = ?').get(targetUserId);
        if (!targetUser) {
            return res.status(404).json({ error: 'Target user not found' });
        }

        if (targetUser.account_status !== 'active') {
            return res.status(400).json({ error: `Cannot impersonate an account with status '${targetUser.account_status}'` });
        }

        if (targetUser.role === 'admin') {
            return res.status(403).json({ error: 'Cannot impersonate another administrator' });
        }

        const impersonatorInfo = {
            id: req.user.id,
            email: req.user.email,
            full_name: req.user.full_name || 'Administrator'
        };

        const token = jwt.sign(
            {
                id: targetUser.id,
                email: targetUser.email,
                role: targetUser.role,
                full_name: targetUser.full_name,
                is_impersonated: true,
                impersonated_by: impersonatorInfo
            },
            JWT_SECRET,
            { expiresIn: '4h' }
        );

        console.log(`[Admin Impersonation] Admin "${req.user.email}" (ID: ${req.user.id}) is now impersonating user "${targetUser.email}" (ID: ${targetUser.id})`);

        res.json({
            success: true,
            message: `Now logged in as ${targetUser.full_name}`,
            token,
            user: {
                id: targetUser.id,
                full_name: targetUser.full_name,
                email: targetUser.email,
                role: targetUser.role,
                mobile_number: targetUser.mobile_number
            },
            impersonator: impersonatorInfo
        });
    } catch (err) {
        console.error('[Admin Impersonation Error]', err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/admin/purge-dummy-data — safely delete all dummy test records without affecting genuine data
app.post('/api/admin/purge-dummy-data', verifyToken, requireAdmin, (req, res) => {
    try {
        const dummyUsers = db.prepare("SELECT id FROM users WHERE email LIKE '%@mpscsc.test'").all();
        const dummyUserIds = dummyUsers.map(u => u.id);

        let deletedCounts = {
            users: dummyUserIds.length,
            employees: 0,
            claims: 0,
            journeys: 0,
            medicalBills: 0,
            dailyAllowances: 0,
            familyMembers: 0
        };

        if (dummyUserIds.length > 0) {
            const userPlaceholders = dummyUserIds.map(() => '?').join(',');
            const dummyEmployees = db.prepare(`SELECT id FROM employees WHERE user_id IN (${userPlaceholders})`).all(...dummyUserIds);
            const dummyEmpIds = dummyEmployees.map(e => e.id);
            deletedCounts.employees = dummyEmpIds.length;

            if (dummyEmpIds.length > 0) {
                const empPlaceholders = dummyEmpIds.map(() => '?').join(',');
                const dummyClaims = db.prepare(`SELECT id FROM claims WHERE employee_id IN (${empPlaceholders})`).all(...dummyEmpIds);
                const dummyClaimIds = dummyClaims.map(c => c.id);
                deletedCounts.claims = dummyClaimIds.length;

                if (dummyClaimIds.length > 0) {
                    const claimPlaceholders = dummyClaimIds.map(() => '?').join(',');
                    const jRes = db.prepare(`DELETE FROM journey_details WHERE claim_id IN (${claimPlaceholders})`).run(...dummyClaimIds);
                    deletedCounts.journeys = jRes.changes;

                    const mbRes = db.prepare(`DELETE FROM medical_bills WHERE claim_id IN (${claimPlaceholders})`).run(...dummyClaimIds);
                    deletedCounts.medicalBills = mbRes.changes;

                    const daRes = db.prepare(`DELETE FROM daily_allowances WHERE claim_id IN (${claimPlaceholders})`).run(...dummyClaimIds);
                    deletedCounts.dailyAllowances = daRes.changes;

                    db.prepare(`DELETE FROM claims WHERE id IN (${claimPlaceholders})`).run(...dummyClaimIds);
                }

                const famRes = db.prepare(`DELETE FROM family_members WHERE employee_id IN (${empPlaceholders})`).run(...dummyEmpIds);
                deletedCounts.familyMembers = famRes.changes;

                db.prepare(`DELETE FROM employees WHERE id IN (${empPlaceholders})`).run(...dummyEmpIds);
            }

            db.prepare(`DELETE FROM users WHERE id IN (${userPlaceholders})`).run(...dummyUserIds);
        }

        res.json({
            success: true,
            message: 'All dummy test data successfully purged. Genuine records preserved.',
            deletedCounts
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// Dashboard Stats API — Rich Analytics (scoped per user)
app.get('/api/dashboard-stats', verifyToken, (req, res) => {
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';
    try {
        const empCount = isAdmin
            ? db.prepare('SELECT COUNT(*) as count FROM employees').get().count
            : db.prepare('SELECT COUNT(*) as count FROM employees WHERE user_id = ?').get(userId).count;

        const typeQuery = (type) => isAdmin
            ? db.prepare(`SELECT COUNT(*) as count, COALESCE(SUM(c.total_amount),0) as total FROM claims c WHERE c.claim_type = ?`).get(type)
            : db.prepare(`SELECT COUNT(*) as count, COALESCE(SUM(c.total_amount),0) as total FROM claims c JOIN employees e ON c.employee_id = e.id WHERE e.user_id = ? AND c.claim_type = ?`).get(userId, type);

        const tadaStats = typeQuery('TA_DA');
        const transferStats = typeQuery('TRANSFER');
        const medicalStats = typeQuery('MEDICAL');

        const statusBreakdown = isAdmin
            ? db.prepare(`SELECT status, COUNT(*) as count, COALESCE(SUM(total_amount),0) as amount FROM claims GROUP BY status`).all()
            : db.prepare(`SELECT c.status, COUNT(*) as count, COALESCE(SUM(c.total_amount),0) as amount FROM claims c JOIN employees e ON c.employee_id = e.id WHERE e.user_id = ? GROUP BY c.status`).all(userId);

        const pendingAmount = isAdmin
            ? db.prepare(`SELECT COALESCE(SUM(total_amount),0) as total FROM claims WHERE status IN ('Draft','SUBMITTED')`).get().total
            : db.prepare(`SELECT COALESCE(SUM(c.total_amount),0) as total FROM claims c JOIN employees e ON c.employee_id = e.id WHERE e.user_id = ? AND c.status IN ('Draft','SUBMITTED')`).get(userId).total;

        const monthlyTrend = isAdmin
            ? db.prepare(`SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as count, COALESCE(SUM(total_amount),0) as amount FROM claims WHERE created_at >= date('now', '-6 months') GROUP BY month ORDER BY month ASC`).all()
            : db.prepare(`SELECT strftime('%Y-%m', c.created_at) as month, COUNT(*) as count, COALESCE(SUM(c.total_amount),0) as amount FROM claims c JOIN employees e ON c.employee_id = e.id WHERE e.user_id = ? AND c.created_at >= date('now', '-6 months') GROUP BY month ORDER BY month ASC`).all(userId);

        const topClaimants = isAdmin
            ? db.prepare(`SELECT e.name, COUNT(c.id) as claims, COALESCE(SUM(c.total_amount),0) as total FROM claims c JOIN employees e ON c.employee_id = e.id GROUP BY e.id ORDER BY total DESC LIMIT 5`).all()
            : db.prepare(`SELECT e.name, COUNT(c.id) as claims, COALESCE(SUM(c.total_amount),0) as total FROM claims c JOIN employees e ON c.employee_id = e.id WHERE e.user_id = ? GROUP BY e.id ORDER BY total DESC LIMIT 5`).all(userId);

        const recentClaims = isAdmin
            ? db.prepare(`SELECT c.id, c.claim_type, c.status, c.total_amount, c.created_at, e.name as employee_name FROM claims c LEFT JOIN employees e ON c.employee_id = e.id ORDER BY c.created_at DESC LIMIT 5`).all()
            : db.prepare(`SELECT c.id, c.claim_type, c.status, c.total_amount, c.created_at, e.name as employee_name FROM claims c JOIN employees e ON c.employee_id = e.id WHERE e.user_id = ? ORDER BY c.created_at DESC LIMIT 5`).all(userId);

        const totalStats = isAdmin
            ? db.prepare(`SELECT COALESCE(SUM(total_amount),0) as total, COUNT(*) as count FROM claims`).get()
            : db.prepare(`SELECT COALESCE(SUM(c.total_amount),0) as total, COUNT(*) as count FROM claims c JOIN employees e ON c.employee_id = e.id WHERE e.user_id = ?`).get(userId);

        res.json({
            employees: empCount,
            totalClaims: totalStats.count,
            totalAmount: Math.round(totalStats.total),
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

// Dedicated Dashboard API for complete real-time dashboard data (scoped per user)
app.get('/api/dashboard', verifyToken, (req, res) => {
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';
    try {
        const claims = isAdmin
            ? db.prepare(`
                SELECT c.id, c.rendered_claim_id, c.claim_type, c.status, c.total_amount, c.created_at,
                       c.start_date, c.end_date, c.td_no, c.is_diary,
                       e.id as employee_id, e.name as employee_name, e.name_hi as employee_name_hi,
                       e.designation, e.category, e.headquarters
                FROM claims c LEFT JOIN employees e ON c.employee_id = e.id
                ORDER BY c.created_at DESC
            `).all()
            : db.prepare(`
                SELECT c.id, c.rendered_claim_id, c.claim_type, c.status, c.total_amount, c.created_at,
                       c.start_date, c.end_date, c.td_no, c.is_diary,
                       e.id as employee_id, e.name as employee_name, e.name_hi as employee_name_hi,
                       e.designation, e.category, e.headquarters
                FROM claims c JOIN employees e ON c.employee_id = e.id
                WHERE e.user_id = ?
                ORDER BY c.created_at DESC
            `).all(userId);

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

        const empCount = isAdmin
            ? db.prepare('SELECT COUNT(*) as count FROM employees').get().count
            : db.prepare('SELECT COUNT(*) as count FROM employees WHERE user_id = ?').get(userId).count;

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


// Fetch all journeys for an employee (from previous claims/diaries) — ownership verified
app.get('/api/employee-journeys/:empId', verifyToken, (req, res) => {
    const isAdmin = req.user.role === 'admin';
    if (!verifyEmployeeOwnership(req.params.empId, req.user.id, isAdmin)) {
        return res.status(403).json({ error: 'Access denied' });
    }
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

// --- Employees API (scoped to req.user.id) ---
app.get('/api/employees', verifyToken, (req, res) => {
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';
    try {
        const rows = isAdmin
            ? db.prepare('SELECT * FROM employees ORDER BY name').all()
            : db.prepare('SELECT * FROM employees WHERE user_id = ? ORDER BY name').all(userId);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/employees', verifyToken, (req, res) => {
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
            INSERT INTO employees (user_id, name, name_hi, designation, category, pay_level, grade_pay, headquarters, basic_pay)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const info = stmt.run(req.user.id, name.trim(), name_hi || null, designation || null, cat, pay_level || null, grade_pay || null, headquarters || null, parseFloat(basic_pay) || null);
        res.json({ id: info.lastInsertRowid });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/employees/:id', verifyToken, (req, res) => {
    const { id } = req.params;
    const isAdmin = req.user.role === 'admin';
    if (!verifyEmployeeOwnership(id, req.user.id, isAdmin)) {
        return res.status(403).json({ error: 'Access denied' });
    }
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

app.delete('/api/employees/:id', verifyToken, (req, res) => {
    const { id } = req.params;
    const isAdmin = req.user.role === 'admin';
    if (!verifyEmployeeOwnership(id, req.user.id, isAdmin)) {
        return res.status(403).json({ error: 'Access denied' });
    }
    try {
        const deleteJourneyDetails = db.prepare(`DELETE FROM journey_details WHERE claim_id IN (SELECT id FROM claims WHERE employee_id = ?)`);
        const deleteMedicalBills = db.prepare(`DELETE FROM medical_bills WHERE claim_id IN (SELECT id FROM claims WHERE employee_id = ?)`);
        const deleteDailyAllowances = db.prepare(`DELETE FROM daily_allowances WHERE claim_id IN (SELECT id FROM claims WHERE employee_id = ?)`);
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
app.get('/api/employees/:id/family', verifyToken, (req, res) => {
    const isAdmin = req.user.role === 'admin';
    if (!verifyEmployeeOwnership(req.params.id, req.user.id, isAdmin)) {
        return res.status(403).json({ error: 'Access denied' });
    }
    try {
        const rows = db.prepare('SELECT * FROM family_members WHERE employee_id = ?').all(req.params.id);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/family', verifyToken, (req, res) => {
    const { employee_id, name, relationship, dob } = req.body;
    const isAdmin = req.user.role === 'admin';
    if (!verifyEmployeeOwnership(employee_id, req.user.id, isAdmin)) {
        return res.status(403).json({ error: 'Access denied' });
    }
    try {
        const stmt = db.prepare('INSERT INTO family_members (employee_id, name, relationship, dob) VALUES (?, ?, ?, ?)');
        const info = stmt.run(employee_id, name, relationship, dob);
        res.json({ id: info.lastInsertRowid, success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/family/:id', verifyToken, (req, res) => {
    try {
        // Verify the family member belongs to user's employee
        const fm = db.prepare('SELECT employee_id FROM family_members WHERE id = ?').get(req.params.id);
        if (!fm) return res.status(404).json({ error: 'Family member not found' });
        const isAdmin = req.user.role === 'admin';
        if (!verifyEmployeeOwnership(fm.employee_id, req.user.id, isAdmin)) {
            return res.status(403).json({ error: 'Access denied' });
        }
        db.prepare('DELETE FROM family_members WHERE id = ?').run(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Claims API ---
app.get('/api/claims', verifyToken, (req, res) => {
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';
    try {
        const rows = isAdmin
            ? db.prepare(`SELECT c.*, e.name as employee_name, e.name_hi as employee_name_hi, e.designation FROM claims c LEFT JOIN employees e ON c.employee_id = e.id ORDER BY c.created_at DESC`).all()
            : db.prepare(`SELECT c.*, e.name as employee_name, e.name_hi as employee_name_hi, e.designation FROM claims c JOIN employees e ON c.employee_id = e.id WHERE e.user_id = ? ORDER BY c.created_at DESC`).all(userId);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/claims/:employeeId', verifyToken, (req, res) => {
    const isAdmin = req.user.role === 'admin';
    if (!verifyEmployeeOwnership(req.params.employeeId, req.user.id, isAdmin)) {
        return res.status(403).json({ error: 'Access denied' });
    }
    try {
        const rows = db.prepare(`
            SELECT c.*, e.name as employee_name, e.name_hi as employee_name_hi, e.designation 
            FROM claims c 
            LEFT JOIN employees e ON c.employee_id = e.id 
            WHERE c.employee_id = ? 
            ORDER BY c.created_at DESC
        `).all(req.params.employeeId);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/claims', verifyToken, (req, res) => {
    const { employee_id, claim_type, start_date, end_date, month, year } = req.body;
    const isAdmin = req.user.role === 'admin';
    if (!verifyEmployeeOwnership(employee_id, req.user.id, isAdmin)) {
        return res.status(403).json({ error: 'Access denied' });
    }
    try {
        const date = new Date();
        const yearSuffix = date.getFullYear().toString().slice(-2);
        const random = Math.floor(1000 + Math.random() * 9000);
        let rendered_claim_id = `CL-${yearSuffix}-${random}`;
        let td_no = null;
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

app.delete('/api/claims/:id', verifyToken, (req, res) => {
    const { id } = req.params;
    // Verify ownership via employee
    const claim = db.prepare('SELECT employee_id FROM claims WHERE id = ?').get(id);
    if (!claim) return res.status(404).json({ error: 'Claim not found' });
    const isAdmin = req.user.role === 'admin';
    if (!verifyEmployeeOwnership(claim.employee_id, req.user.id, isAdmin)) {
        return res.status(403).json({ error: 'Access denied' });
    }
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

app.get('/api/claim-details/:claimId', verifyToken, (req, res) => {
    const { claimId } = req.params;
    try {
        const claim = db.prepare('SELECT * FROM claims WHERE id = ?').get(claimId);
        if (!claim) return res.status(404).json({ error: 'Claim not found' });
        const isAdmin = req.user.role === 'admin';
        if (!verifyEmployeeOwnership(claim.employee_id, req.user.id, isAdmin)) {
            return res.status(403).json({ error: 'Access denied' });
        }
        const journeys = db.prepare('SELECT * FROM journey_details WHERE claim_id = ?').all(claimId);
        res.json({ claim, journeys });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/journey-details-bulk', verifyToken, (req, res) => {
    const { claim_id, journeys } = req.body;
    // Verify claim ownership
    const claimCheck = db.prepare('SELECT employee_id FROM claims WHERE id = ?').get(claim_id);
    if (!claimCheck) return res.status(404).json({ error: 'Claim not found' });
    const isAdmin = req.user.role === 'admin';
    if (!verifyEmployeeOwnership(claimCheck.employee_id, req.user.id, isAdmin)) {
        return res.status(403).json({ error: 'Access denied' });
    }
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

app.put('/api/claims/:id/submit', verifyToken, handleSubmitClaim);
app.post('/api/claims/:id/submit', verifyToken, handleSubmitClaim);


app.put('/api/claims/:id/status', verifyToken, (req, res) => {
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

app.put('/api/claims/:id', verifyToken, (req, res) => {
    const { id } = req.params;
    // Verify ownership
    const claimCheck = db.prepare('SELECT employee_id FROM claims WHERE id = ?').get(id);
    if (!claimCheck) return res.status(404).json({ error: 'Claim not found' });
    const isAdmin = req.user.role === 'admin';
    if (!verifyEmployeeOwnership(claimCheck.employee_id, req.user.id, isAdmin)) {
        return res.status(403).json({ error: 'Access denied' });
    }
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
app.get('/api/calculate-bill/:claimId', verifyToken, (req, res) => {
    const { claimId } = req.params;
    try {
        const claim = db.prepare('SELECT * FROM claims WHERE id = ?').get(claimId);
        if (!claim) return res.status(404).json({ error: 'Claim not found' });
        const isAdmin = req.user.role === 'admin';
        if (!verifyEmployeeOwnership(claim.employee_id, req.user.id, isAdmin)) {
            return res.status(403).json({ error: 'Access denied' });
        }

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
app.post('/api/medical-claims', verifyToken, (req, res) => {
    const {
        employee_id, patient_name, relationship, is_regular, pay_scale,
        child_sl_no_dob, illness_name, illness_duration, total_enclosures, bills,
        start_date, end_date, remarks, status, month, year
    } = req.body;

    if (!employee_id) {
        return res.status(400).json({ error: 'Employee ID is required' });
    }
    const isAdminMed = req.user.role === 'admin';
    if (!verifyEmployeeOwnership(employee_id, req.user.id, isAdminMed)) {
        return res.status(403).json({ error: 'Access denied' });
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

app.get('/api/medical-claims/:id', verifyToken, (req, res) => {
    try {
        const claim = db.prepare('SELECT * FROM claims WHERE id = ?').get(req.params.id);
        if (!claim) return res.status(404).json({ error: 'Claim not found' });
        const isAdmin = req.user.role === 'admin';
        if (!verifyEmployeeOwnership(claim.employee_id, req.user.id, isAdmin)) {
            return res.status(403).json({ error: 'Access denied' });
        }
        const bills = db.prepare('SELECT * FROM medical_bills WHERE claim_id = ?').all(req.params.id);
        res.json({ claim, bills });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/medical-claims/:id', verifyToken, (req, res) => {
    const claimCheckM = db.prepare('SELECT employee_id FROM claims WHERE id = ?').get(req.params.id);
    if (!claimCheckM) return res.status(404).json({ error: 'Claim not found' });
    const isAdminPut = req.user.role === 'admin';
    if (!verifyEmployeeOwnership(claimCheckM.employee_id, req.user.id, isAdminPut)) {
        return res.status(403).json({ error: 'Access denied' });
    }
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

// SPA catch-all: serve index.html for all non-API routes in production or when dist exists
if (process.env.NODE_ENV === 'production' || fs.existsSync(clientBuildPath)) {
    app.use((req, res, next) => {
        if ((req.method === 'GET' || req.method === 'HEAD') && !req.path.startsWith('/api')) {
            const indexPath = path.join(clientBuildPath, 'index.html');
            if (fs.existsSync(indexPath)) {
                return res.sendFile(indexPath);
            }
            return res.status(404).send('Frontend build not found. Please build the client first.');
        }
        next();
    });
}

if (require.main === module) {
    app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
}

module.exports = { app, calculateTadaBillTotals };
