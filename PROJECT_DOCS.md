<!--
  MASTER PROJECT DOCUMENT - MPSCSC CLAIMS PORTAL
  ===============================================
  SINGLE SOURCE OF TRUTH for the MPSCSC Claims Portal web application.
  Every code change MUST be reflected here by the AI assistant.
-->

# MPSCSC Claims Portal — Master Project Document

> **Organisation:** MPSCSC (Madhya Pradesh State Civil Supplies Corporation)
> **System:** Claims Portal Web Application
> **Stack:** Express.js (Node.js) · React 19 · Vite · Better-SQLite3 · React Router v7 · Lucide React
> **Document Status:** LIVE — auto-updated on every project change
> **Last Sync:** 2026-07-24

---

## QUICK STATUS DASHBOARD

| Metric | Value |
|---|---|
| **App Version** | 1.0.0 |
| **Architecture** | Client-Server (SPA + REST API) |
| **Server Port** | 5000 (Express) |
| **Client Port** | 5173 (Vite dev) / `/claims/` base path in production |
| **Database** | Better-SQLite3 (`server/claims.db`) |
| **Active Modules** | 6 (Dashboard, Employees, TA/DA Claims, Transfer Claims, Medical Claims, Reports) |
| **Claim Types** | TA_DA, TRANSFER, MEDICAL |
| **Total API Routes** | 22 REST endpoints |
| **Bilingual Support** | Hindi + English (LanguageContext + translations.js) |
| **Open Critical Issues** | 0 known critical |
| **DB Foreign Keys** | OFF (intentionally disabled for flexible deletes) |
| **Startup** | `run_portal.bat` (launches both server + client concurrently) |
| **Excel Export** | SheetJS (`xlsx`) — available in Reports and Bill views |
| **Print Support** | CSS `no-print` class system — all views have print-ready layouts |

---

## TABLE OF CONTENTS

1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [Directory Structure](#3-directory-structure)
4. [End-to-End Process Flows](#4-end-to-end-process-flows)
5. [Key Modules Reference](#5-key-modules-reference)
6. [Database Schema](#6-database-schema)
7. [REST API Reference](#7-rest-api-reference)
8. [TA/DA Calculation Engine](#8-tada-calculation-engine)
9. [Configuration and Environment](#9-configuration-and-environment)
10. [Setup and Running Guide](#10-setup-and-running-guide)
11. [Progress Tracker](#11-progress-tracker)
12. [Pending Tasks](#12-pending-tasks)
13. [Watchlist — Regression Risks](#13-watchlist--regression-risks)
14. [Known Issues Register](#14-known-issues-register)
15. [Change Log](#15-change-log)
16. [Developer Tips and Troubleshooting](#16-developer-tips-and-troubleshooting)

---

## 1. PROJECT OVERVIEW

### Purpose

The **MPSCSC Claims Portal** is a **multi-user, offline-capable, browser-based web application** designed to manage financial claims for officers of the Madhya Pradesh State Civil Supplies Corporation. It digitises the entire workflow for:
- **TA/DA (Travelling Allowance / Daily Allowance)** claims
- **Transfer claims** (with family, baggage, packing, goods transport)
- **Medical reimbursement claims**

The portal runs entirely on the local network (LAN) with no internet dependency. The Express server serves the SQLite database; the React frontend is served from Vite.

### Organisation Context

- **Organisation:** MPSCSC — a state PSU under the Food, Civil Supplies and Consumer Protection Department, Govt. of Madhya Pradesh
- **Users:** Administrative clerks and officers managing employee claims
- **Regulatory Framework:** MP Government TA/DA Rules, Medical Reimbursement Rules, Transfer Entitlement Rules

### Claims Management Portal

The portal is a dedicated claims management solution covering:
- **TA/DA (Travelling Allowance / Daily Allowance)** claims
- **Transfer claims** (with family, baggage, packing, goods transport)
- **Medical reimbursement claims**
- **Tour Diaries & Employee Master**

---

## 2. SYSTEM ARCHITECTURE

### Client-Server Architecture

```
BROWSER (React 19 SPA)
┌─────────────────────────────────────────────────────────────┐
│ client/src/main.jsx       - React app entry point           │
│ client/src/App.jsx        - Router, NavBar, HubDashboard    │
│                                                             │
│ client/src/pages/         - 13 page components              │
│  - Employees.jsx          - Employee master CRUD            │
│  - TADAClaims.jsx         - TA/DA claims list               │
│  - ClaimEditor.jsx        - TA/DA journey entry             │
│  - TADABill.jsx           - Bill view + print + Excel       │
│  - TourDiaries.jsx        - Tour diary list                 │
│  - TourDiary.jsx          - Tour diary entry form           │
│  - TransferClaims.jsx     - Transfer claims list            │
│  - TransferClaim.jsx      - Transfer claim editor           │
│  - MedicalClaims.jsx      - Medical claims list             │
│  - MedicalClaim.jsx       - Medical claim editor            │
│  - Reports.jsx            - Summary reports + Excel export  │
│  - Claims.jsx             - All claims list (cross-type)    │
│  - ServiceBook.jsx        - Stub/iframe for Service Book    │
│                                                             │
│ client/src/contexts/                                        │
│  - LanguageContext.jsx    - React Context: en/hi language   │
│                                                             │
│ client/src/utils/                                           │
│  - translations.js        - All UI strings (en + hi)        │
│  - rules.js               - TA/DA rate tables (client-side) │
│  - mp_districts.js        - 52 MP districts (English)       │
│  - mp_districts_bilingual.js - 52 MP districts (en + hi)    │
└─────────────────┬───────────────────────────────────────────┘
                  │ fetch('/api/...')  [HTTP REST on port 5000]
                  │ Vite dev proxy OR nginx in production
                  ▼
EXPRESS REST SERVER (Node.js)
┌─────────────────────────────────────────────────────────────┐
│ server/index.js           - All 22 API routes               │
│  - calculateTadaBillTotals() - Core TA/DA bill engine       │
│                                                             │
│ server/db.js              - Better-SQLite3 init + schema    │
│  - initDb()               - CREATE TABLE + migrations       │
│                                                             │
│ server/tadaRules.js       - TA/DA rate constants + helpers  │
│  - TADA_RATES             - DA/Hotel/Mileage rate tables    │
│  - getCityType()          - Classify city as METRO/MAJOR/OTHER│
│  - calculateDAForDuration() - 0/50/100% rule                │
│  - calculateTravelAllowance() - Fare/mileage calc           │
│  - formatDate/formatTime  - DD/MM/YYYY and 12h display      │
│  - calculateDiffHours()   - Duration in hours               │
│                                                             │
│ server/claims.db          - Better-SQLite3 database file    │
└─────────────────────────────────────────────────────────────┘

Storage:
  server/claims.db  - All application data (SQLite)
  backups/          - Manual ZIP backups
```

### Routing Architecture

React Router v7 (Browser Router) with base path `/claims/` in production:

| Route | Component | Purpose |
|---|---|---|
| `/` | `HubDashboard` | Landing hub with module cards + analytics |
| `/employees` | `Employees` | Employee master list and CRUD |
| `/claims` | `Claims` | All claims list (cross-type) |
| `/claims/tada` | `TADAClaims` | TA/DA claims list |
| `/claims/transfer-list` | `TransferClaims` | Transfer claims list |
| `/claims/:id` | `ClaimEditor` | TA/DA journey entry + save |
| `/claims/transfer/:id` | `TransferClaim` | Transfer claim editor |
| `/claims/:id/tour-diary` | `TourDiary` | Tour diary linked to a claim |
| `/claims/:id/bill` | `TADABill` | TA/DA bill view, print, Excel export |
| `/tour-diaries` | `TourDiaries` | Standalone tour diaries list |
| `/medical` | `MedicalClaims` | Medical claims list |
| `/medical-claims/:id` | `MedicalClaim` | Medical claim editor and printer |
| `/reports` | `Reports` | Summary reports with date filter |

---

## 3. DIRECTORY STRUCTURE

```
F:\AI Projects\Anti Gravity\mpscsc-claims-portal\     <- Project Root
│
├── server/                    <- Express REST API server
│   ├── index.js              <- All 22 API routes + TA/DA bill calculator
│   ├── db.js                 <- SQLite schema init + inline migrations
│   ├── tadaRules.js          <- TA/DA rate tables + calculation helpers
│   ├── claims.db             <- SQLite database file
│   ├── package.json          <- Node deps: express, cors, better-sqlite3
│   └── check_stay.js         <- Debug utility for stay calculation
│
├── client/                    <- React 19 SPA (Vite)
│   ├── index.html            <- Vite entry HTML
│   ├── vite.config.js        <- base: '/claims/', plugin-react
│   ├── package.json          <- React 19, react-router-dom v7, xlsx, lucide-react
│   └── src/
│       ├── main.jsx          <- React app mount
│       ├── App.jsx           <- Router, layout, HubDashboard, NavBar
│       ├── App.css           <- Global utility classes (pills, nav, etc.)
│       ├── index.css         <- Full design system (variables, components)
│       │
│       ├── pages/            <- 13 page components
│       │   ├── Employees.jsx           <- Employee CRUD, family members
│       │   ├── Claims.jsx              <- All claims aggregate list
│       │   ├── TADAClaims.jsx          <- TA/DA claims list
│       │   ├── ClaimEditor.jsx         <- TA/DA journey legs entry
│       │   ├── TADABill.jsx            <- Bill calculation view + print
│       │   ├── TourDiaries.jsx         <- Standalone tour diaries list
│       │   ├── TourDiary.jsx           <- Tour diary form (journey entry)
│       │   ├── TransferClaims.jsx      <- Transfer claims list
│       │   ├── TransferClaim.jsx       <- Transfer claim editor
│       │   ├── MedicalClaims.jsx       <- Medical claims list
│       │   ├── MedicalClaim.jsx        <- Medical claim editor + print
│       │   ├── Reports.jsx             <- Summary reports + Excel export
│       │   └── ServiceBook.jsx         <- Service Book stub page
│       │
│       ├── contexts/
│       │   └── LanguageContext.jsx     <- React context: 'en' / 'hi'
│       │
│       └── utils/
│           ├── translations.js         <- All UI strings in en + hi
│           ├── rules.js                <- Client-side TA/DA rate tables
│           ├── mp_districts.js         <- 52 MP district names (English)
│           └── mp_districts_bilingual.js <- 52 MP districts (en + hi)
│
├── backups/                   <- Manual database backups (ZIP)
├── run_portal.bat             <- One-click start: server + client
├── install_dependencies.bat   <- One-click npm install for both
├── backup_database.bat        <- Manual backup bat script
├── reset_database.bat         <- Drops and re-initialises DB (CAUTION)
├── package_for_transfer.bat   <- Packages for deployment on another PC
├── TRANSFER_GUIDE.md          <- Guide for moving to another machine
├── logo.png / logo - Copy.png <- MPSCSC logo used in NavBar
└── README.md                  <- End-user guide
```

---

## 4. END-TO-END PROCESS FLOWS

### A. Application Startup

```
1. Admin runs run_portal.bat
   -> Starts: cd server && node index.js (port 5000)
   -> Waits 2 seconds
   -> Starts: cd client && npm run dev (port 5173)
2. Server startup: initDb() called
   -> CREATE TABLE IF NOT EXISTS (employees, claims, journey_details,
      daily_allowances, medical_bills, family_members)
   -> Inline try/catch ALTER TABLE migrations for all added columns
   -> Console: "Database initialized successfully."
3. Browser opens http://localhost:5173
   -> React SPA loads; Router resolves to '/' -> HubDashboard
   -> HubDashboard fetches GET /api/dashboard-stats
      and GET /service-book/api/status (with 2.5s timeout)
   -> Shows online/offline pill badges for both modules
```

### B. Creating a TA/DA Claim

```
1. User navigates to /employees -> selects employee
2. Navigate to /claims/tada -> click "New TA/DA Claim"
   -> POST /api/claims { employee_id, claim_type: 'TA_DA', month, year }
   -> Server creates claim with rendered_claim_id (CL-YY-XXXX)
   -> Navigate to /claims/:id (ClaimEditor)
3. ClaimEditor loads:
   -> GET /api/claim-details/:id -> { claim, journeys }
4. User adds journey legs (departure/arrival station, date/time, mode, fare)
   -> POST /api/journey-details-bulk { claim_id, journeys, month, year, ... }
   -> Server deletes existing journeys, re-inserts all
   -> Recalculates total via calculateTadaBillTotals()
   -> Updates claim.total_amount, start_date, end_date
5. User clicks "View Bill" -> navigate to /claims/:id/bill
   -> GET /api/calculate-bill/:claimId
   -> Server runs full bill calculation (TA + DA + Stay)
   -> Returns { claim, employee, billRows, totals }
6. User reviews bill -> Print (CSS print) or Export Excel (SheetJS)
```

### C. TA/DA Bill Calculation Logic

```
Input: claim, employee, journeys (ordered by departure_date/time)

1. Group journeys into CHAINS by purpose
   (consecutive legs with same purpose form one chain)

2. For each chain:
   - Determine maxCityType (METRO > MAJOR_CITY > OTHER)
     based on arrival_station of all legs in chain
   - Calculate totalHours of chain
   - Calculate totalDA = calculateDAForDuration(cityType, category, hours)
     - <= 6 hours:  0%  of daily rate
     - 6-12 hours: 50% of daily rate
     - > 12 hours: 100% of daily rate

3. Stay Allowance calculation (across ALL journeys):
   - For each inter-journey gap: calculate stay hours
   - Total stay days = ceil(totalStayHours / 24), min 1
   - hotel_stay_type = 'friends':
       entitlement = FRIENDS_STAY_RATE[category] x stayDays
   - hotel_stay_type = 'hotel':
       entitlement = min(actual_hotel_amount, HOTEL_ALLOWANCE[cityType][category] x stayDays)

4. Per-leg row:
   - TA = calculateTravelAllowance(leg, category)
          Rail/Bus -> fare_amount
          Own Car  -> distance_km x 12 Rs/km
          Own Bike -> distance_km x 6 Rs/km
   - journey_DA = proportional share of chain DA
   - stay_DA    = proportional share of chain stay DA
   - stay_allowance = remaining combined stay entitlement (assigned once)

5. Totals:
   grandTotal = totalFare + totalDA + totalStayAllowance + goods_transport + packing
```

### D. Creating a Medical Claim

```
1. User navigates to /medical -> click "New Medical Claim"
2. MedicalClaim form: patient details, relationship, illness, duration
3. Add bill line items (CONSULTATION / MEDICINE / TEST / OTHER)
   -> POST /api/medical-claims { employee_id, patient info, bills[], ... }
   -> Server: transaction INSERT into claims + loop INSERT into medical_bills
   -> total_amount = sum of all bill amounts
4. View/Edit -> GET /api/medical-claims/:id
5. Print -> CSS print layout generates formal medical claim form
```

### E. Reports Generation

```
1. User navigates to /reports
2. Reports.jsx fetches all claims with employee join
3. User selects date range filter (start/end)
4. Client-side filters claims, calculates totals
5. Print: CSS no-print system hides navbar/filters
6. Excel Export: SheetJS (xlsx) generates .xlsx workbook with:
   - Employee-wise summary sheet
   - Claim-type breakdown
   - Raw claims data sheet
```

---

## 5. KEY MODULES REFERENCE

### 5.1 Hub Dashboard

**Route:** `/` | **Component:** `HubDashboard` (inside `App.jsx`)

Fetches `GET /api/dashboard-stats` and renders:
- **4 KPI cards:** Total Employees, Total Claims, Total Disbursed, Pending Approval
- **Mini bar chart (CSS-only):** Monthly claims trend (last 6 months) — proportional height bars
- **Claims by Type breakdown:** Progress bars for TA/DA, Transfer, Medical
- **Recent Claims list:** Last 5 claims with status badge
- **Top Claimants list:** Top 5 by total amount
- **2 Module Launch Cards:** Claims Management (teal gradient), Service Book (purple gradient)
- **Online/Offline pills:** Live status check for both modules

### 5.2 Employee Master

**Route:** `/employees` | **Component:** `Employees.jsx`

Fields stored per employee:
| Field | Type | Notes |
|---|---|---|
| name | TEXT | English name |
| name_hi | TEXT | Hindi name |
| designation | TEXT | Post/title |
| category | TEXT | A, B, C, D, or E — drives DA/TA rates |
| pay_level | TEXT | e.g., "Level 14" |
| basic_pay | REAL | Basic pay for reference |
| headquarters | TEXT | Home HQ for HQ-to-HQ detection |

Features:
- Search by name or designation (client-side filter)
- Edit/Delete with cascade delete of all linked claims
- Family members sub-panel per employee (for transfer claims)

### 5.3 TA/DA Claims

**Route:** `/claims/tada` | **Component:** `TADAClaims.jsx`

List of all `claim_type = 'TA_DA'` claims. Each row shows:
- Claim ID (CL-YY-XXXX), employee, month/year, total amount, status

**Claim Editor** (`/claims/:id`, `ClaimEditor.jsx`):
- Journey legs table (departure/arrival date+time+station, mode, class, ticket no., fare, distance, purpose)
- `merge_purpose` flag: combines consecutive same-purpose legs on the bill
- Hotel stay type (none / hotel / friends) + hotel amount
- Declaration date
- Packing charges + Goods transport charges
- Language toggle (Hindi / English for bill printing)

**Bill View** (`/claims/:id/bill`, `TADABill.jsx`):
- Calls `GET /api/calculate-bill/:id` for server-side recalculation
- Renders professional MP-format Tour Allowance Bill
- Columns: S.No, Departure (Date/Time/Station), Arrival, Mode, Dist (km), Ticket No, Fare (₹), Travel Duration, Stay Duration, DA Rate, Journey DA, Stay DA, Stay Allowance, Total Amount
- Footer: Totals row + Grand Total
- Print button: CSS `@media print` hides nav/toolbar
- Excel Export: SheetJS generates `.xlsx`

### 5.4 Tour Diaries

**Route:** `/tour-diaries` | **Component:** `TourDiaries.jsx`

Standalone day-wise tour log (separate from TA/DA claims but linkable):
- `is_diary = 1` flag in claims table
- Auto-generates `td_no` (TD-YY-XXXX) identifier
- Journey entry form identical to ClaimEditor
- Can be linked to a TA/DA claim via `linked_td_id`

**Tour Diary Entry** (`/claims/:id/tour-diary`, `TourDiary.jsx`):
- Journey legs with auto-calculated travel hours and stay hours
- Purpose and remarks per leg

### 5.5 Transfer Claims

**Route:** `/claims/transfer-list` | **Component:** `TransferClaims.jsx`
**Editor:** `/claims/transfer/:id` | **Component:** `TransferClaim.jsx`

Additional fields over TA/DA:
- `family_details`: TEXT (family member count/description)
- `baggage_weight`: REAL (kg)
- `packing_charges`: REAL (₹)
- `goods_transport_charges`: REAL (₹)
- From District / To District (selected from 52 MP districts)
- From Office / To Office (free text)
- Transfer order number and date
- Joining date at new posting

Import from Tour Diary: Can pull journey legs from an existing linked TD.

### 5.6 Medical Claims

**Route:** `/medical` | **Component:** `MedicalClaims.jsx`
**Editor:** `/medical-claims/:id` | **Component:** `MedicalClaim.jsx`

Claim-level fields:
- `patient_name`, `relationship` (self/spouse/child/parent)
- `is_regular` (regular/casual treatment)
- `pay_scale`
- `child_sl_no_dob`, `illness_name`, `illness_duration`
- `total_enclosures`

Bill line items (`medical_bills` table):
- `bill_category`: CONSULTATION / MEDICINE / TEST / OTHER
- `description`, `illness_name`, `lab_name`
- `receipt_no`, `receipt_date`, `amount`

Print output: Formal Medical Reimbursement Claim form (Hindi format).

### 5.7 Reports

**Route:** `/reports` | **Component:** `Reports.jsx`

Client-side analytics with date-range filter:
- Summary by employee (claim count + total amount)
- Summary by claim type
- Status breakdown (DRAFT / SUBMITTED / APPROVED / REJECTED)
- Full claims data table
- Excel export (SheetJS) with multiple sheets

### 5.8 Language System

**Context:** `LanguageContext.jsx` | **Translations:** `translations.js`

- State: `language` = `'en'` or `'hi'`
- `getTranslations(language)` returns object with all UI strings
- Toggle buttons in NavBar sidebar: `हिं` / `Eng`
- Covers all nav labels, form labels, button text, table headers
- Bill print respects language selection for Hindi/English output

---

## 6. DATABASE SCHEMA

### Database File

`server/claims.db` — Better-SQLite3, **no WAL mode configured** (default journal mode), foreign keys OFF.

> **Note:** `PRAGMA foreign_keys = OFF` is explicitly set at startup. Cascade deletes are handled manually in transactions.

### Tables

#### `employees`

| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK AUTOINCREMENT | |
| name | TEXT NOT NULL | English name |
| name_hi | TEXT | Hindi name |
| designation | TEXT | |
| category | TEXT NOT NULL | A / B / C / D / E — drives all rate calculations |
| pay_level | TEXT | e.g., "Level 14" |
| basic_pay | REAL | |
| headquarters | TEXT | Home station |

#### `claims`

| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK AUTOINCREMENT | |
| employee_id | INTEGER NOT NULL | FK -> employees |
| claim_type | TEXT NOT NULL | TA_DA / TRANSFER / MEDICAL |
| start_date | TEXT | Auto-set from journey min date |
| end_date | TEXT | Auto-set from journey max date |
| status | TEXT DEFAULT 'DRAFT' | DRAFT / SUBMITTED / APPROVED / REJECTED |
| created_at | DATETIME DEFAULT CURRENT_TIMESTAMP | |
| is_diary | INTEGER DEFAULT 0 | 1 = Tour Diary |
| remarks | TEXT | |
| packing_charges | REAL | Transfer claims |
| goods_transport_charges | REAL | Transfer claims |
| family_details | TEXT | Transfer claims |
| baggage_weight | REAL | Transfer claims |
| total_amount | REAL DEFAULT 0 | Auto-calculated |
| td_no | TEXT | Tour Diary number (TD-YY-XXXX) |
| rendered_claim_id | TEXT | Display ID (CL-YY-XXXX) |
| month | TEXT | Bill month |
| year | TEXT | Bill year |
| hotel_stay_type | TEXT | 'hotel' / 'friends' / null |
| hotel_amount | REAL DEFAULT 0 | Actual hotel bill paid |
| linked_td_id | INTEGER | Links claim to a tour diary |
| linked_claim_id | INTEGER | |
| declaration_date | TEXT | |
| patient_name | TEXT | Medical claims |
| relationship | TEXT | Medical claims |
| is_regular | TEXT | Medical claims |
| pay_scale | TEXT | Medical claims |
| child_sl_no_dob | TEXT | Medical claims |
| illness_name | TEXT | Medical claims |
| illness_duration | TEXT | Medical claims |
| total_enclosures | TEXT | Medical claims |

#### `journey_details`

| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK AUTOINCREMENT | |
| claim_id | INTEGER NOT NULL | FK -> claims ON DELETE CASCADE |
| departure_date | TEXT | YYYY-MM-DD |
| departure_time | TEXT | HH:MM |
| departure_station | TEXT | |
| arrival_date | TEXT | |
| arrival_time | TEXT | |
| arrival_station | TEXT | Used for city classification (DA rate) |
| mode | TEXT | Rail / Bus / Own Car / Own Bike / Air |
| class_of_travel | TEXT | |
| ticket_no | TEXT | |
| fare_amount | REAL DEFAULT 0 | |
| distance_km | REAL DEFAULT 0 | Used for mileage calculation |
| purpose | TEXT | Groups legs into chains for DA calc |
| merge_purpose | INTEGER DEFAULT 0 | Display flag for bill formatting |

#### `daily_allowances`

| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK AUTOINCREMENT | |
| claim_id | INTEGER NOT NULL | FK -> claims |
| city | TEXT | City name |
| stay_type | TEXT | METRO / MAJOR_CITY / OTHER |
| days | REAL | Number of days |
| rate | REAL | Daily rate (₹) |
| amount | REAL | Total amount for this row |

> **Note:** This table exists in the schema but is not actively used in the bill calculation flow (which computes DA inline in `calculateTadaBillTotals`). Reserved for future manual DA override.

#### `medical_bills`

| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK AUTOINCREMENT | |
| claim_id | INTEGER NOT NULL | FK -> claims |
| bill_category | TEXT | CONSULTATION / MEDICINE / TEST / OTHER |
| description | TEXT | |
| illness_name | TEXT | |
| lab_name | TEXT | |
| receipt_no_date | TEXT | Legacy combined field |
| receipt_no | TEXT | |
| receipt_date | TEXT | |
| amount | REAL DEFAULT 0 | |

#### `family_members`

| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK AUTOINCREMENT | |
| employee_id | INTEGER NOT NULL | FK -> employees |
| name | TEXT NOT NULL | |
| relationship | TEXT | Spouse / Son / Daughter / etc. |
| dob | TEXT | Date of birth |

### Inline Migrations Strategy

`db.js` uses a `try { ALTER TABLE ... ADD COLUMN } catch(e) {}` pattern for all column additions. This means:
- New columns added after initial schema creation are applied idempotently
- No migration version tracking table
- Safe to re-run on any existing database

---

## 7. REST API REFERENCE

All routes served by `server/index.js` on **port 5000**.

### Dashboard

| Method | Route | Description |
|---|---|---|
| GET | `/api/dashboard-stats` | Rich analytics: employee count, claims by type, status breakdown, monthly trend (last 6 months), top 5 claimants, recent 5 claims |

### Employees

| Method | Route | Description |
|---|---|---|
| GET | `/api/employees` | All employees, ORDER BY name |
| POST | `/api/employees` | Create new employee |
| PUT | `/api/employees/:id` | Update employee (COALESCE pattern) |
| DELETE | `/api/employees/:id` | Delete employee + all linked claims (manual cascade transaction) |
| GET | `/api/employees/:id/family` | Get family members for employee |

### Employee Journey History

| Method | Route | Description |
|---|---|---|
| GET | `/api/employee-journeys/:empId` | All journey legs for an employee across all claims (for import into Transfer Claim) |

### Family Members

| Method | Route | Description |
|---|---|---|
| POST | `/api/family` | Add family member |
| DELETE | `/api/family/:id` | Delete family member |

### Claims

| Method | Route | Description |
|---|---|---|
| GET | `/api/claims` | All claims (all types, all employees), with employee join |
| GET | `/api/claims/:employeeId` | Claims for specific employee |
| POST | `/api/claims` | Create new claim (generates rendered_claim_id / td_no) |
| PUT | `/api/claims/:id` | Update claim fields (COALESCE pattern) |
| PUT | `/api/claims/:id/submit` | Set status = 'SUBMITTED', update total_amount |
| DELETE | `/api/claims/:id` | Delete claim + journey_details + medical_bills + daily_allowances (transaction) |
| GET | `/api/claim-details/:claimId` | Get claim + all journeys |

### Journey Details

| Method | Route | Description |
|---|---|---|
| POST | `/api/journey-details-bulk` | Delete all existing journeys for claim, re-insert all, recalculate total, update claim dates + metadata |

### TA/DA Bill Calculation

| Method | Route | Description |
|---|---|---|
| GET | `/api/calculate-bill/:claimId` | Full bill calculation: returns `{ claim, employee, billRows[], totals }` |

### Medical Claims

| Method | Route | Description |
|---|---|---|
| POST | `/api/medical-claims` | Create medical claim + all bills (transaction) |
| GET | `/api/medical-claims/:id` | Get medical claim + bills |
| PUT | `/api/medical-claims/:id` | Update medical claim + replace all bills (transaction) |

---

## 8. TA/DA CALCULATION ENGINE

### Rate Tables (`server/tadaRules.js`)

#### Daily Allowance Rates (DA_RATES) — MP Govt April 2025

| Category | METRO (₹/day) | MAJOR_CITY (₹/day) | OTHER (₹/day) |
|---|---|---|---|
| A | 750 | 550 | 375 |
| B | 600 | 440 | 300 |
| C | 450 | 330 | 225 |
| D | 375 | 280 | 185 |
| E | 260 | 190 | 125 |

#### Hotel/Lodge Allowance (HOTEL_ALLOWANCE) — Max per day

| Category | METRO (₹) | MAJOR_CITY (₹) | OTHER (₹) |
|---|---|---|---|
| A | 7,400 | 5,500 | 3,700 |
| B | 5,500 | 4,000 | 2,750 |
| C | 3,700 | 2,800 | 1,850 |
| D | 2,000 | 1,400 | 920 |
| E | 1,000 | 700 | 450 |

#### Stay with Friends/Relatives (FRIENDS_STAY_RATE) — per day

| A | B | C | D | E |
|---|---|---|---|---|
| 750 | 660 | 550 | 450 | 370 |

#### Mileage Rates (MP Govt Order F 4-1/2025/Niyam/Char)

| Vehicle | Rate |
|---|---|
| Own Car | ₹9/km |
| Own Bike | ₹4/km |
| Taxi | ₹9/km |
| Auto | ₹4/km |

#### Composite Transfer Grant (TRANSFER_GRANT)

| Category | Grant Amount (₹) | Max Entitled Goods (Kg) | Goods Transport Rate |
|---|---|---|---|
| A | ₹6,500 | 6,000 kg | ₹4.50/kg/km |
| B | ₹4,500 | 6,000 kg | ₹4.50/kg/km |
| C | ₹3,000 | 3,000 kg | ₹2.25/kg/km |
| D | ₹2,400 | 1,500 kg | ₹1.20/kg/km |
| E | ₹1,800 | 1,500 kg | ₹1.20/kg/km |


#### City Classification

| Tier | Cities |
|---|---|
| METRO | Indore, Bhopal, Jabalpur, Gwalior |
| MAJOR_CITY | Ujjain, Sagar, Dewas, Satna, Ratlam, Rewa, Murwara, Singrauli, Burhanpur, Khandwa |
| OTHER | All other places |

### DA Duration Rules (MP Govt)

| Duration | DA Payable |
|---|---|
| ≤ 6 hours | 0% (No DA) |
| 6 to 12 hours | 50% of daily rate |
| > 12 hours | 100% of daily rate |

### Entitled Travel Class by Category

| A | B | C | D | E |
|---|---|---|---|---|
| AC First Class | AC 2-Tier | AC 3-Tier | Sleeper | Unreserved |

---

## 9. CONFIGURATION AND ENVIRONMENT

### Server Configuration (`server/index.js`)

| Setting | Value |
|---|---|
| Port | 5000 (hardcoded) |
| CORS | Enabled for all origins (`app.use(cors())`) |
| JSON Body Parser | `app.use(express.json())` |
| Database | `server/claims.db` (relative to server/ dir) |

### Client Configuration (`client/vite.config.js`)

| Setting | Value |
|---|---|
| Base Path | `/claims/` (production) |
| Plugin | `@vitejs/plugin-react` |
| Dev Port | 5173 (Vite default) |

### Vite Proxy (Development)

The client makes API calls to `/api/...`. In development, Vite proxies these to the Express server. In the current config, **no proxy is configured in vite.config.js** — this means in dev mode, the client fetches from the same port or the backend must be CORS-enabled (which it is).

> **Note:** The Hub Dashboard fetches `/api/claims/api/dashboard-stats` — this is a double-prefix bug if proxying; it works when the React app is served under `/claims/` base path by the Express server in production.

### No `.env` File

There are no environment variables. All configuration is hardcoded:
- Server port: `5000` in `server/index.js`
- Database path: relative `server/claims.db`

---

## 10. SETUP AND RUNNING GUIDE

### Prerequisites

- Node.js LTS (v18 or higher)
- A modern web browser

### First-time Install

```bat
.\install_dependencies.bat
```

This runs:
```bat
cd server && npm install
cd ../client && npm install
```

### Development Run

```bat
.\run_portal.bat
```

Opens two terminal windows:
1. **Server:** `cd server && node index.js` → runs on port 5000
2. **Client:** `cd client && npm run dev` → runs on port 5173

Access at: `http://localhost:5173`

### Production Build (for deployment)

```bat
cd client
npm run build
```

Output in `client/dist/`. Must be served under `/claims/` path due to `base: '/claims/'` in vite.config.js.

In production, the Express server should also serve the `dist/` directory:
```js
app.use('/claims', express.static(path.join(__dirname, '../client/dist')));
```

### Database Backup

```bat
.\backup_database.bat
```

Creates a timestamped ZIP of `server/claims.db` in `backups/`.

### Database Reset (DANGER — all data lost)

```bat
.\reset_database.bat
```

### Transfer to Another Machine

Follow `TRANSFER_GUIDE.md`:
1. Run `package_for_transfer.bat` — creates a ZIP excluding `node_modules`
2. On target machine: extract, run `install_dependencies.bat`, then `run_portal.bat`

---

## 11. PROGRESS TRACKER

| Feature | Status | Notes |
|---|---|---|
| Hub Dashboard with KPI analytics | COMPLETE | Monthly trend, top claimants, status breakdown |
| Employee Master (CRUD + Family) | COMPLETE | Category A-E drives all rates |
| TA/DA Claims (list + create) | COMPLETE | |
| ClaimEditor (journey legs) | COMPLETE | merge_purpose flag, hotel/friends stay |
| TA/DA Bill Calculation Engine | COMPLETE | Server-side in calculateTadaBillTotals() |
| TADABill print view | COMPLETE | CSS print layout |
| Excel export for TA/DA bill | COMPLETE | SheetJS xlsx |
| Tour Diary (standalone) | COMPLETE | is_diary flag, TD-YY-XXXX ID |
| Transfer Claims | COMPLETE | Family, baggage, packing, goods, district select |
| Medical Claims | COMPLETE | Multi-bill entry, print form |
| Reports with date filter | COMPLETE | Excel export |
| Bilingual support (en/hi) | COMPLETE | LanguageContext + translations.js |
| MP Districts dropdown | COMPLETE | 52 districts in utils/ |
| Dashboard Service Book status pill | COMPLETE | Live check with 2.5s timeout |
| Service Book module | STUB | Renders placeholder; actual SRM handles it |
| Audit Log | NOT IMPLEMENTED | No action logging |
| Authentication / Login | NOT IMPLEMENTED | No user authentication |
| Status approval workflow | PARTIAL | SUBMITTED/APPROVED status fields exist; no UI for approval |

---

## 12. PENDING TASKS

### High Priority

- [ ] **API Proxy Fix:** `/api/claims/api/dashboard-stats` has double prefix — fix Vite proxy or adjust fetch URL
- [ ] **WAL Mode:** Enable `PRAGMA journal_mode = WAL` in `db.js` for better concurrent access
- [ ] **Foreign Keys:** Consider enabling `PRAGMA foreign_keys = ON` after auditing all delete handlers

### Medium Priority

- [ ] **Approval Workflow UI:** Add approve/reject buttons for SUBMITTED claims
- [ ] **Authentication:** Add basic PIN or user login to prevent unauthorized access
- [ ] **Vite Proxy Config:** Add `server.proxy` in `vite.config.js` to properly route `/api/*` to port 5000 in dev
- [ ] **Error Boundaries:** React error boundaries around page components

### Low Priority

- [ ] **Audit Log:** Track all CRUD operations in an `audit_log` table
- [ ] **DA Rules Update:** Keep `tadaRules.js` FRIENDS_STAY_RATE in sync with latest Govt circulars
- [ ] **Mileage Rate Discrepancy:** `tadaRules.js` uses 12/6 Rs/km; `rules.js` client-side uses 9/4 Rs/km — must be reconciled
- [ ] **Print Preview:** Add print preview mode before sending to printer
- [ ] **Claim Status Filter:** Add status filter to claims lists

---

## 13. WATCHLIST — REGRESSION RISKS

| Risk | Description | Mitigation |
|---|---|---|
| **Double API Prefix** | HubDashboard fetches `/api/claims/api/dashboard-stats` (double `/api/`) — only works when app served at `/claims/` base | Fix fetch URL or add proxy |
| **Mileage Rate Mismatch** | `server/tadaRules.js` uses Car=12, Bike=6 Rs/km; `client/utils/rules.js` uses Car=9, Bike=4 Rs/km | Server calculation is authoritative; client rules.js is legacy |
| **FK Disabled** | `PRAGMA foreign_keys = OFF` — manual cascade deletes in transactions must cover all child tables | Any new child table must add manual delete in `DELETE /api/employees/:id` and `DELETE /api/claims/:id` |
| **No Migrations Table** | DB schema changes use try/catch ALTER TABLE — no version tracking | If a migration silently fails, column will be missing |
| **No Auth** | Any network user can access and modify all data | Add auth before LAN deployment |
| **Inline DA table in daily_allowances** | Table exists but is unused — may cause confusion when reading code | Documented here |
| **Base path `/claims/`** | Vite build uses `/claims/` base — if served from root, all routes 404 | Ensure nginx/Express serves from `/claims/` path |

---

## 14. KNOWN ISSUES REGISTER

| ID | Severity | Module | Issue | Status |
|---|---|---|---|---|
| ISS-001 | Medium | Dashboard | `fetch('/api/claims/api/dashboard-stats')` has double prefix — works only when app is under `/claims/` base path | Open — works in production layout |
| ISS-002 | Medium | TA/DA | Mileage rates differ between server (`tadaRules.js`: 12/6) and client (`rules.js`: 9/4) — server is authoritative for bill but client-side preview may show different value | Open |
| ISS-003 | Low | DB | `daily_allowances` table is created but never populated by any current API route | Open — reserved for future |
| ISS-004 | Low | DB | Foreign keys disabled (`PRAGMA foreign_keys = OFF`) — child table orphans possible if manual cascade logic has bugs | Open — by design for now |
| ISS-005 | Info | Medical | `receipt_no_date` (legacy combined field) and separate `receipt_no` / `receipt_date` columns both exist — legacy field unused in new code | Resolved in code; old DB rows may have stale data |

---

## 15. CHANGE LOG

| Date | Change | Module |
|---|---|---|
| 2026-07 | PROJECT_DOCS.md created | Documentation |
| 2026-02 | Database backup created (mpscsc-claims-portal_backup_20260210_1245.zip) | DB |
| 2026-07 | Hub Dashboard with module cards, KPI analytics, monthly trend chart, top claimants | Dashboard |
| 2026-07 | Bilingual support (Hindi/English) via LanguageContext | All |
| 2026-07 | MP Districts dropdown — 52 districts in English + bilingual | Transfer Claims |
| 2026-07 | Medical Claims module: multi-bill entry, print form | Medical |
| 2026-07 | Transfer Claims: family members, baggage, packing, goods transport, district select | Transfer |
| 2026-07 | Tour Diary module (standalone + linked to claims) | Tour Diary |
| 2026-07 | Reports module with Excel export (SheetJS) | Reports |
| 2026-07 | TA/DA Bill: stay allowance (hotel vs friends), stay days calculation | TA/DA |
| 2026-07 | Service Book module stub page | Service Book |
| 2026-02 | Initial portal: Employee CRUD, TA/DA Claims, bill calculation | Core |

---

## 16. DEVELOPER TIPS AND TROUBLESHOOTING

### Starting the App

```bat
REM From project root
.\run_portal.bat
```

If the `run_portal.bat` doesn't start correctly, start each manually:

```bat
REM Terminal 1:
cd "F:\AI Projects\Anti Gravity\mpscsc-claims-portal\server"
node index.js

REM Terminal 2:
cd "F:\AI Projects\Anti Gravity\mpscsc-claims-portal\client"
npm run dev
```

### Common Errors

| Error | Cause | Fix |
|---|---|---|
| `EADDRINUSE: port 5000` | Previous server process still running | Kill `node.exe` in Task Manager or use `taskkill /F /IM node.exe` |
| `Cannot GET /api/...` | Server not running | Start server first, then client |
| Bill shows ₹0 DA | Journey duration ≤ 6 hours | Expected by MP rules — DA only for > 6 hours |
| React routes show 404 | Opening `dist/index.html` directly without a server | Must serve via Express or Vite, not file:// |
| Missing columns error | DB schema mismatch after update | Run `reset_database.bat` (WARNING: data loss) or add column manually via SQLite CLI |
| `fetch failed` on dashboard | Service Book server not running | Normal — dashboard shows "Offline" pill; does not crash |

### Inspecting the Database

Using `sqlite3` CLI or DB Browser for SQLite:
```sql
-- Check all tables
.tables

-- Inspect claims
SELECT c.*, e.name FROM claims c JOIN employees e ON c.employee_id = e.id ORDER BY c.created_at DESC LIMIT 10;

-- Check journey_details
SELECT * FROM journey_details WHERE claim_id = 5;

-- Check medical bills
SELECT * FROM medical_bills WHERE claim_id = 5;
```

### Adding a New API Route

1. Add route handler in `server/index.js`
2. Add corresponding `fetch('/api/...')` call in the relevant React page
3. Update this document

### Adding a New Database Column

1. Add column to the appropriate `CREATE TABLE` statement in `server/db.js`
2. Add a try/catch migration line:
   ```js
   try { db.prepare('ALTER TABLE claims ADD COLUMN new_col TEXT').run(); } catch (e) { }
   ```
3. Update affected API routes in `server/index.js`
4. Update this document

### Production File Locations

| File | Path |
|---|---|
| Database | `server/claims.db` |
| Backups | `backups/` |
| Client Build | `client/dist/` |
| Server Entry | `server/index.js` |

---

*Document generated by Antigravity IDE — Last Sync: 2026-07-24*
*This is the SINGLE SOURCE OF TRUTH for the MPSCSC Claims Portal. Auto-update this document on every code change.*
