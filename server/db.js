const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'claims.db'), { verbose: console.log });
db.pragma('foreign_keys = OFF');
// WAL mode gives much better concurrent read/write throughput than the
// default rollback-journal mode, which matters once more than one API
// request is hitting the database at the same time.
db.pragma('journal_mode = WAL');

// Initialize Database Schema
const initDb = () => {
    // ─────────────────────────────────────────────
    // 1. CREATE TABLES — schema-first. Every table's full, current column
    // set lives in its CREATE TABLE below, so a brand-new database is
    // correct on first run without depending on any ALTER TABLE migration.
    // The MIGRATIONS section further down runs AFTER all of these, purely
    // to backfill columns on databases created before this column existed.
    // ─────────────────────────────────────────────

    // 1. Employees Table
    db.prepare(`
        CREATE TABLE IF NOT EXISTS employees (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            name_hi TEXT,
            designation TEXT,
            category TEXT NOT NULL, -- A, B, C, D, E
            pay_level TEXT, -- e.g. "Level 14"
            grade_pay TEXT,
            basic_pay REAL,
            headquarters TEXT
        )
    `).run();

    // 2. Claims Table
    db.prepare(`
        CREATE TABLE IF NOT EXISTS claims (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_id INTEGER NOT NULL,
            claim_type TEXT NOT NULL, -- TA_DA, TRANSFER, MEDICAL
            start_date TEXT,
            end_date TEXT,
            status TEXT DEFAULT 'DRAFT', -- DRAFT, FINALIZED
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            is_diary INTEGER DEFAULT 0,
            remarks TEXT,
            packing_charges REAL, goods_transport_charges REAL, family_details TEXT, baggage_weight REAL,
            total_amount REAL DEFAULT 0, td_no TEXT, rendered_claim_id TEXT,
            month TEXT, year TEXT, hotel_stay_type TEXT, hotel_amount REAL DEFAULT 0,
            linked_td_id INTEGER, linked_claim_id INTEGER, declaration_date TEXT,
            patient_name TEXT, relationship TEXT, is_regular TEXT, pay_scale TEXT,
            child_sl_no_dob TEXT, illness_name TEXT, illness_duration TEXT, total_enclosures TEXT,
            FOREIGN KEY (employee_id) REFERENCES employees (id)
        )
    `).run();

    // 3. Journey Details
    db.prepare(`
        CREATE TABLE IF NOT EXISTS journey_details (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            claim_id INTEGER NOT NULL,
            departure_date TEXT,
            departure_time TEXT,
            departure_station TEXT,
            arrival_date TEXT,
            arrival_time TEXT,
            arrival_station TEXT,
            mode TEXT, -- Rail, Bus, Car, Air
            class_of_travel TEXT,
            ticket_no TEXT,
            fare_amount REAL DEFAULT 0,
            distance_km REAL DEFAULT 0,
            purpose TEXT,
            merge_purpose INTEGER DEFAULT 0,
            FOREIGN KEY (claim_id) REFERENCES claims (id) ON DELETE CASCADE
        )
    `).run();

    // 4. Daily Allowance Entries (Calculated or Manual override)
    db.prepare(`
        CREATE TABLE IF NOT EXISTS daily_allowances (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            claim_id INTEGER NOT NULL,
            city TEXT,
            stay_type TEXT, -- METRO, MAJOR_CITY, OTHER
            days REAL,
            rate REAL,
            amount REAL,
            FOREIGN KEY (claim_id) REFERENCES claims (id) ON DELETE CASCADE
        )
    `).run();

    // 5. Medical Bills (split-column schema included directly)
    db.prepare(`
        CREATE TABLE IF NOT EXISTS medical_bills (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            claim_id INTEGER NOT NULL,
            bill_category TEXT, -- CONSULTATION, MEDICINE, TEST, OTHER
            description TEXT,
            illness_name TEXT,
            lab_name TEXT,
            receipt_no_date TEXT, -- Legacy
            receipt_no TEXT,
            receipt_date TEXT,
            amount REAL DEFAULT 0,
            FOREIGN KEY (claim_id) REFERENCES claims (id) ON DELETE CASCADE
        )
    `).run();

    // 6. Family Members
    db.prepare(`
        CREATE TABLE IF NOT EXISTS family_members (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            relationship TEXT,
            dob TEXT,
            FOREIGN KEY (employee_id) REFERENCES employees (id) ON DELETE CASCADE
        )
    `).run();

    // ─────────────────────────────────────────────
    // 2. MIGRATIONS (for databases created before a column existed).
    // These now correctly run AFTER every CREATE TABLE above. On a fresh
    // database the table already has the column, so each ALTER below is a
    // harmless no-op caught by its own try/catch; on an older database it
    // backfills the missing column. Each statement gets its own try/catch
    // so one column that already exists doesn't block a sibling column's
    // migration from running.
    // ─────────────────────────────────────────────

    // Employee Migrations
    try { db.prepare('ALTER TABLE employees ADD COLUMN basic_pay REAL').run(); } catch (e) { }
    try { db.prepare('ALTER TABLE employees ADD COLUMN name_hi TEXT').run(); } catch (e) { }
    try { db.prepare('ALTER TABLE employees ADD COLUMN grade_pay TEXT').run(); } catch (e) { }

    // Claims Migrations
    try { db.prepare('ALTER TABLE journey_details ADD COLUMN merge_purpose INTEGER DEFAULT 0').run(); } catch (e) { }
    try { db.prepare('ALTER TABLE claims ADD COLUMN packing_charges REAL').run(); } catch (e) { }
    try { db.prepare('ALTER TABLE claims ADD COLUMN goods_transport_charges REAL').run(); } catch (e) { }
    try { db.prepare('ALTER TABLE claims ADD COLUMN family_details TEXT').run(); } catch (e) { }
    try { db.prepare('ALTER TABLE claims ADD COLUMN baggage_weight REAL').run(); } catch (e) { }
    try { db.prepare('ALTER TABLE claims ADD COLUMN total_amount REAL DEFAULT 0').run(); } catch (e) { }
    try { db.prepare('ALTER TABLE claims ADD COLUMN td_no TEXT').run(); } catch (e) { }
    try { db.prepare('ALTER TABLE claims ADD COLUMN rendered_claim_id TEXT').run(); } catch (e) { }
    try { db.prepare('ALTER TABLE claims ADD COLUMN month TEXT').run(); } catch (e) { }
    try { db.prepare('ALTER TABLE claims ADD COLUMN year TEXT').run(); } catch (e) { }
    try { db.prepare('ALTER TABLE claims ADD COLUMN hotel_stay_type TEXT').run(); } catch (e) { }
    try { db.prepare('ALTER TABLE claims ADD COLUMN hotel_amount REAL DEFAULT 0').run(); } catch (e) { }
    try { db.prepare('ALTER TABLE claims ADD COLUMN linked_td_id INTEGER').run(); } catch (e) { }
    try { db.prepare('ALTER TABLE claims ADD COLUMN linked_claim_id INTEGER').run(); } catch (e) { }
    try { db.prepare('ALTER TABLE claims ADD COLUMN declaration_date TEXT').run(); } catch (e) { }
    try { db.prepare('ALTER TABLE claims ADD COLUMN is_diary INTEGER DEFAULT 0').run(); } catch (e) { }
    try { db.prepare('ALTER TABLE claims ADD COLUMN remarks TEXT').run(); } catch (e) { }
    try { db.prepare('ALTER TABLE claims ADD COLUMN patient_name TEXT').run(); } catch (e) { }
    try { db.prepare('ALTER TABLE claims ADD COLUMN relationship TEXT').run(); } catch (e) { }
    try { db.prepare('ALTER TABLE claims ADD COLUMN is_regular TEXT').run(); } catch (e) { }
    try { db.prepare('ALTER TABLE claims ADD COLUMN pay_scale TEXT').run(); } catch (e) { }
    try { db.prepare('ALTER TABLE claims ADD COLUMN child_sl_no_dob TEXT').run(); } catch (e) { }
    try { db.prepare('ALTER TABLE claims ADD COLUMN illness_name TEXT').run(); } catch (e) { }
    try { db.prepare('ALTER TABLE claims ADD COLUMN illness_duration TEXT').run(); } catch (e) { }
    try { db.prepare('ALTER TABLE claims ADD COLUMN total_enclosures TEXT').run(); } catch (e) { }
    try { db.prepare('ALTER TABLE claims ADD COLUMN advance_amount REAL DEFAULT 0').run(); } catch (e) { }

    // Medical Bills Migrations (split-column backfill for pre-existing DBs).
    // Each ALTER now has its own try/catch (previously two were grouped in
    // one try, so if the first threw because its column already existed,
    // the second was silently skipped even when it still needed to run).
    try { db.prepare('ALTER TABLE medical_bills ADD COLUMN receipt_no TEXT').run(); } catch (e) { }
    try { db.prepare('ALTER TABLE medical_bills ADD COLUMN receipt_date TEXT').run(); } catch (e) { }
    try { db.prepare('ALTER TABLE medical_bills ADD COLUMN illness_name TEXT').run(); } catch (e) { }
    try { db.prepare('ALTER TABLE medical_bills ADD COLUMN lab_name TEXT').run(); } catch (e) { }

    // ─────────────────────────────────────────────
    // 3. INDEXES — the hot lookup paths (claims by employee, claims by
    // status for dashboards/reports, and the two child tables joined by
    // claim_id) were previously unindexed full-table scans.
    // ─────────────────────────────────────────────
    db.prepare('CREATE INDEX IF NOT EXISTS idx_claims_employee_id ON claims (employee_id)').run();
    db.prepare('CREATE INDEX IF NOT EXISTS idx_claims_status ON claims (status)').run();
    db.prepare('CREATE INDEX IF NOT EXISTS idx_journey_details_claim_id ON journey_details (claim_id)').run();
    db.prepare('CREATE INDEX IF NOT EXISTS idx_medical_bills_claim_id ON medical_bills (claim_id)').run();

    console.log('Database initialized successfully.');
};

module.exports = { db, initDb };
