<!--
  MASTER PROJECT DOCUMENT - MPSCSC CLAIMS PORTAL
  ===============================================
  SINGLE SOURCE OF TRUTH for the MPSCSC Claims Portal web application.
  NOTE: This document is manually maintained by developers/AI assistants
  and is NOT updated automatically by a compiler, background daemon, or CI script.
-->

# MPSCSC Claims Portal — Master Project Document

> **Organisation:** MPSCSC (Madhya Pradesh State Civil Supplies Corporation)  
> **System:** Claims Portal Web Application  
> **Stack:** Express.js (Node.js) · React 19 · Vite · Better-SQLite3 (WAL Mode) · React Router v7 · Lucide React · JWT (jsonwebtoken) · bcryptjs  
> **Document Status:** LIVE — Maintained by developer / AI assistant on every project change  
> **Last Sync:** 2026-09-23  

---

## QUICK STATUS DASHBOARD

| Metric | Value |
|---|---|
| **App Version** | 2.1.0 (Enterprise Multi-User Edition) |
| **Architecture** | Client-Server (SPA + REST API + JWT Authorization) |
| **Server Port** | 5000 (Express) |
| **Client Port** | 5173 (Vite dev with `/api` proxy) / `/` root base path |
| **Database** | Better-SQLite3 (`server/claims.db`) in **WAL Mode** with 6 Performance Indexes |
| **Active Modules** | 9 (Dashboard, Authentication & RBAC, Admin Portal, Employees, TA/DA Claims, Transfer Claims, Medical Claims, Tour Diaries, Reports) |
| **Claim Types** | TA_DA, TRANSFER, MEDICAL |
| **Total API Routes** | 37 REST endpoints (6 Auth, 9 Admin, 22 Core Domain) |
| **Authentication** | Bearer JWT (HS256), bcrypt password hashing (10 salt rounds), rate limiting (`express-rate-limit`) |
| **Default Admin Account** | `admin@mpscsc.gov.in` / `Admin@123` |
| **Bilingual Support** | Hindi + English (`LanguageContext`, `translations.js`, Google Font `Noto Sans Devanagari`) |
| **Typography & Print** | Form 21 MP TA/DA Bill layout (UTF-8 Devanagari verified), Medical Claim Hindi format, CSS `@media print` |
| **DB Foreign Keys** | OFF (`PRAGMA foreign_keys = OFF` — cascade operations governed by atomic transactions) |
| **Journal Mode** | WAL (`PRAGMA journal_mode = WAL` for concurrent read/write throughput) |
| **Startup** | `run_portal.bat` (launches both server + client concurrently) |
| **Excel Export** | SheetJS (`xlsx`) — available in Reports, Admin Ledger, and Bill views |
| **Data State** | Cleaned baseline — test/dummy records purged, production record **Vikhyat Hindoliya** preserved |

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

The **MPSCSC Claims Portal** is a **multi-user, offline-first, enterprise-grade browser application** designed to manage financial claims and entitlements for employees and officers of the Madhya Pradesh State Civil Supplies Corporation. It digitises the entire workflow for:
- **TA/DA (Travelling Allowance / Daily Allowance)** claims under MP Govt Circulars (April 2025 revision).
- **Transfer claims** (with family entitlement, baggage weight, packing allowances, and goods transport).
- **Medical reimbursement claims** (itemised consultations, pharmacy bills, diagnostic investigations).
- **Tour Diaries & Employee Master** with user-to-employee account linkage.
- **Administrative Oversight & Statewide Claims Governance** with role-based access control.

The application operates seamlessly in offline or local LAN environments without cloud dependencies.

### Organisation Context

- **Organisation:** MPSCSC — a premier state PSU under the Food, Civil Supplies and Consumer Protection Department, Government of Madhya Pradesh.
- **Audience:** District Managers, Accounts Officers, Administrative Clerks, and Corporate Headquarter Executives.
- **Regulatory Framework:** 
  - MP Civil Services (Travelling Allowance) Rules & Circular F 4-1/2025/Niyam/Char.
  - MP Civil Services Medical Attendance Rules.
  - MP Govt Composite Transfer Entitlement Guidelines.

---

## 2. SYSTEM ARCHITECTURE

### Architecture Diagram

```
BROWSER (React 19 SPA + Vite)
┌─────────────────────────────────────────────────────────────────────────────┐
│ client/src/main.jsx           - Entry mount                                │
│ client/src/App.jsx            - Root Router, AuthProvider, LanguageProvider│
│ client/src/components/        - ProtectedRoute, Nav, Modals, Glass UI Cards│
│                                                                             │
│ client/src/pages/             - 16 Page Components                          │
│  - Login.jsx / Register.jsx   - Auth & onboarding                          │
│  - ForgotPassword.jsx         - Self-service reset token request           │
│  - ResetPassword.jsx          - Password update form with token validation │
│  - Employees.jsx              - Employee master CRUD + Family links        │
│  - TADAClaims.jsx             - TA/DA claims list                          │
│  - ClaimEditor.jsx            - Multi-leg journey entry & rates            │
│  - TADABill.jsx               - Form 21 Bill view, print & Excel export    │
│  - TourDiaries.jsx            - Tour diary register                        │
│  - TourDiary.jsx              - Day-wise tour itinerary form               │
│  - TransferClaims.jsx         - Transfer claims list                       │
│  - TransferClaim.jsx          - Transfer claim editor                      │
│  - MedicalClaims.jsx          - Medical claims list                        │
│  - MedicalClaim.jsx           - Medical claim editor & Hindi print form    │
│  - Reports.jsx                - Summary reports + Excel export             │
│  - Claims.jsx                 - Aggregated cross-type claims view          │
│                                                                             │
│ client/src/pages/admin/       - Admin Suite (admin role only)              │
│  - AdminDashboard.jsx         - Global KPIs, status pipeline, audit summary│
│  - AdminUsers.jsx             - User account management, activation toggle │
│  - AdminUserDetail.jsx        - Deep dive on user, employees, claims       │
│  - AdminClaims.jsx            - Statewide claims ledger + status actions   │
│                                                                             │
│ client/src/contexts/                                                        │
│  - AuthContext.jsx            - JWT persistence, user profile, logout      │
│  - LanguageContext.jsx        - Bilingual English/Hindi toggle             │
│                                                                             │
│ client/src/utils/                                                           │
│  - api.js                     - Centralized API client with JWT injection  │
│  - translations.js            - Hindi & English localized UI strings       │
│  - rules.js                   - Client-side reference tables               │
│  - numberToWords.js           - Rupee amounts in words (En/Hi)             │
│  - mp_districts_bilingual.js  - 52 MP districts (en + hi)                  │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ fetch('/api/...') with Bearer JWT
                                       │ (Vite Proxy in dev: localhost:5000)
                                       ▼
EXPRESS REST API SERVER (Node.js)
┌─────────────────────────────────────────────────────────────────────────────┐
│ server/index.js               - 37 API routes, JWT middleware, rate-limit  │
│  - verifyToken                - Authentication guard                        │
│  - requireAdmin               - Role-based authorization guard              │
│  - calculateTadaBillTotals()  - Authoritative MP TA/DA calculation engine   │
│                                                                             │
│ server/db.js                  - Better-SQLite3 init, WAL mode, migrations   │
│  - PRAGMA journal_mode = WAL  - High concurrency                            │
│  - 6 Indexes                  - Fast lookups on email, user_id, status      │
│                                                                             │
│ server/tadaRules.js           - MP Govt TA/DA Rate Tables                   │
│  - DA_RATES, HOTEL_ALLOWANCE, FRIENDS_STAY_RATE, MILEAGE_RATES              │
│  - calculateDAForDuration()   - 0% (<=6h), 50% (6-12h), 100% (>12h)         │
│  - getCityType()              - METRO, MAJOR_CITY, OTHER classification     │
│                                                                             │
│ server/claims.db              - SQLite physical database                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Routing Architecture

All routes are governed by React Router v7 with base path `/`:

| Route | Component | Access Level | Purpose |
|---|---|---|---|
| `/login` | `Login` | Public | Email/Password login, JWT issuance |
| `/register` | `Register` | Public | New user onboarding (default role: user) |
| `/forgot-password` | `ForgotPassword` | Public | Request password reset token |
| `/reset-password` | `ResetPassword` | Public | Set new password with secure token |
| `/` | `Dashboard` | Authenticated | Personal claims hub, KPI cards, recent activity |
| `/employees` | `Employees` | Authenticated | Employee master records & family members |
| `/claims` | `Claims` | Authenticated | Cross-type aggregated claims list |
| `/claims/tada` | `TADAClaims` | Authenticated | TA/DA claims list |
| `/claims/transfer-list` | `TransferClaims` | Authenticated | Transfer claims list |
| `/claims/:id` | `ClaimEditor` | Authenticated | TA/DA journey legs editor |
| `/claims/transfer/:id` | `TransferClaim` | Authenticated | Transfer claim editor |
| `/claims/:id/tour-diary` | `TourDiary` | Authenticated | Linked tour diary editor |
| `/claims/:id/bill` | `TADABill` | Authenticated | Form 21 Bill view, Hindi print, Excel |
| `/tour-diaries` | `TourDiaries` | Authenticated | Standalone tour diaries list |
| `/medical` | `MedicalClaims` | Authenticated | Medical claims list |
| `/medical-claims/:id` | `MedicalClaim` | Authenticated | Medical claim editor & Hindi print form |
| `/reports` | `Reports` | Authenticated | Cross-filter summary analytics & exports |
| `/admin` | `AdminDashboard` | Admin Only | System metrics, user counts, claims funnel |
| `/admin/users` | `AdminUsers` | Admin Only | User directory, status toggle, search |
| `/admin/users/:id` | `AdminUserDetail` | Admin Only | User inspection, linked profiles, direct password reset |
| `/admin/claims` | `AdminClaims` | Admin Only | Centralized statewide claims register & status actions |

---

## 3. DIRECTORY STRUCTURE

```
mpscsc-claims-portal/
├── server/                         <- Express REST API Server
│   ├── index.js                    <- 37 API routes, JWT auth, admin endpoints, TA/DA engine
│   ├── db.js                       <- Better-SQLite3, WAL mode, schema init, indexes, migrations
│   ├── tadaRules.js                <- Official MP Govt rates, city tiers, allowance rules
│   ├── claims.db                   <- SQLite database file (WAL mode)
│   ├── package.json                <- express, cors, better-sqlite3, jsonwebtoken, bcryptjs
│   └── check_stay.js               <- Stay calculation verification utility
│
├── client/                         <- React 19 SPA (Vite)
│   ├── index.html                  <- Entry HTML (with Noto Sans Devanagari fonts)
│   ├── vite.config.js              <- base: '/', React plugin, /api proxy to port 5000
│   ├── package.json                <- React 19, react-router-dom v7, xlsx, lucide-react
│   └── src/
│       ├── main.jsx                <- Mounts App inside root DOM
│       ├── App.jsx                 <- Router, AuthProvider, LanguageProvider, NavBar layout
│       ├── App.css                 <- Component styling & utilities
│       ├── index.css               <- Global design system, glassmorphism tokens, print CSS
│       │
│       ├── components/
│       │   ├── ProtectedRoute.jsx  <- Route guard (checks JWT, admin role requirements)
│       │   └── dashboard/          <- Glassmorphism dashboard modular widgets
│       │       ├── Dashboard.jsx   <- Main dashboard container
│       │       ├── ClaimsRegister.jsx
│       │       ├── DecisionQueue.jsx
│       │       ├── KpiStrip.jsx
│       │       ├── TrendChart.jsx
│       │       ├── TypeDonut.jsx
│       │       └── WorkspaceTiles.jsx
│       │
│       ├── pages/                  <- Page views
│       │   ├── Login.jsx           <- Modern split-card login
│       │   ├── Register.jsx        <- Onboarding registration
│       │   ├── ForgotPassword.jsx  <- Self-service reset request
│       │   ├── ResetPassword.jsx   <- Password reset confirmation form
│       │   ├── Employees.jsx       <- Employee CRUD + family management
│       │   ├── Claims.jsx          <- Universal claims register
│       │   ├── TADAClaims.jsx      <- TA/DA claims list
│       │   ├── ClaimEditor.jsx     <- Multi-leg journey entry
│       │   ├── TADABill.jsx        <- Form 21 Hindi Bill view & print
│       │   ├── TourDiaries.jsx     <- Standalone tour diaries list
│       │   ├── TourDiary.jsx       <- Tour diary form
│       │   ├── TransferClaims.jsx  <- Transfer claims list
│       │   ├── TransferClaim.jsx   <- Transfer claim editor
│       │   ├── MedicalClaims.jsx   <- Medical reimbursement claims
│       │   ├── MedicalClaim.jsx    <- Medical claim form & printout
│       │   ├── Reports.jsx         <- Financial summaries & Excel export
│       │   └── admin/              <- Admin Suite
│       │       ├── AdminDashboard.jsx
│       │       ├── AdminUsers.jsx
│       │       ├── AdminUserDetail.jsx
│       │       └── AdminClaims.jsx
│       │
│       ├── contexts/
│       │   ├── AuthContext.jsx     <- Auth state, user profile, token persistence
│       │   └── LanguageContext.jsx <- Hindi ('hi') and English ('en') state
│       │
│       └── utils/
│           ├── api.js              <- Centralized API client with JWT Bearer auto-injection
│           ├── translations.js     <- Complete bilingual dictionary (en + hi)
│           ├── rules.js            <- Rate constants for quick client calculations
│           ├── numberToWords.js    <- Indian currency formatting in English & Hindi
│           └── mp_districts_bilingual.js <- 52 MP Districts bilingual list
│
├── backups/                        <- Automated & manual SQLite ZIP backups
├── run_portal.bat                  <- Starts Express backend (5000) and Vite frontend (5173)
├── install_dependencies.bat        <- Installs dependencies for server and client
├── backup_database.bat             <- Creates timestamped backup in backups/
├── reset_database.bat              <- Resets database to clean initial state
├── PROJECT_DOCS.md                 <- Master architecture and system documentation
└── README.md                       <- Quick start guide
```

---

## 4. END-TO-END PROCESS FLOWS

### A. Authentication & Onboarding Flow

```
1. User visits http://localhost:5173/
   -> App checks localStorage for 'auth_token'.
   -> If missing: Redirected to /login.
2. User logs in (or registers via /register):
   -> POST /api/auth/login with { email, password }
   -> Server checks user existence, compares bcrypt hash, checks account_status = 'active'
   -> Generates signed JWT (HS256) containing { id, email, role, full_name }
   -> Updates users.last_login_at
   -> Responds with { token, user }
3. Client stores token in localStorage ('auth_token') and user in ('auth_user')
   -> Redirects to / (or /admin for administrator logins)
```

### B. Password Reset Workflows

#### 1. Self-Service Workflow (User-Initiated)
```
1. User clicks "Forgot Password?" on /login -> navigates to /forgot-password
2. Submits registered email address or mobile number:
   -> POST /api/auth/forgot-password { email }
   -> Server signs a 15-minute JWT reset token containing { id, purpose: 'pwd_reset' }
   -> In production: Dispatches SMS/Email.
   -> In local LAN / dev mode: Generates direct reset link and token preview for instant recovery.
3. User opens /reset-password?token=...
   -> Enters new password (min 6 chars) and confirmation.
   -> POST /api/auth/reset-password { token, new_password }
   -> Server verifies token validity and signature.
   -> Hashes new password with bcrypt (10 rounds).
   -> Updates users.password_hash and users.updated_at.
4. Success screen displayed -> Redirects to /login.
```

#### 2. Administrative Password Override (Admin-Initiated)
```
1. Administrator navigates to /admin/users/:id
2. Enters new password in "Administrative Password Override" panel.
3. Clicks "Apply New Password":
   -> PATCH /api/admin/users/:id/reset-password { new_password }
   -> Server checks requireAdmin authorization.
   -> Hashes new password and updates user record.
   -> Instant feedback to administrator.
```

### C. Creating a TA/DA Claim & Bill Generation

```
1. User selects employee in /employees -> navigates to /claims/tada -> "New TA/DA Claim".
   -> POST /api/claims { employee_id, claim_type: 'TA_DA', month, year }
   -> Server generates unique claim ID (CL-YY-XXXX).
2. ClaimEditor (/claims/:id):
   -> User enters journey legs (departure/arrival station, date, time, mode, fare, purpose).
   -> Chooses Stay Allowance (None / Hotel Bill / Friends & Relatives).
   -> POST /api/journey-details-bulk { claim_id, journeys, ... }
   -> Server computes TA/DA chain totals via calculateTadaBillTotals() and updates claim.
3. User reviews bill at /claims/:id/bill (TADABill):
   -> GET /api/calculate-bill/:claimId
   -> Renders official MP Govt Form 21 (प्रपत्र २१) in restored Devanagari Hindi typography.
   -> User can Print (CSS @media print) or Export to Excel (.xlsx).
```

### D. Statewide Claims Processing (Admin Flow)

```
1. Administrator navigates to /admin/claims.
2. Views cross-user, statewide claims ledger with filters by Type, Status, and Search.
3. Selects claim -> clicks "Approve", "Reject", or "Finalize":
   -> PUT /api/claims/:id/status { status: 'APPROVED' | 'REJECTED' | 'SUBMITTED' }
   -> Server validates admin permissions and updates claim status.
   -> Status changes immediately reflect across employee dashboards.
```

---

## 5. KEY MODULES REFERENCE

### 5.1 Dashboard & Executive Workspace

**Route:** `/` | **Component:** `Dashboard.jsx` (under `client/src/components/dashboard/`)

- **KPI Cards:** Live counts for Total Employees, Total Claims, Disbursed Amount, Pending Approval Amount.
- **Decision Queue:** High-priority items awaiting submission or approval.
- **Type Distribution:** Breakdown visualising TA/DA, Transfer, and Medical allocations.
- **6-Month Trend Chart:** Dynamic monthly expenditure trajectory.
- **Workspace Navigation:** Fast-action links to all core modules.

### 5.2 Authentication & User Security

**Routes:** `/login`, `/register`, `/forgot-password`, `/reset-password`

- **JWT Token Management:** Stored in `localStorage` under `auth_token`, validated on every API request.
- **Auto-Logout on Expiry:** Global 401 interceptor removes credentials and broadcasts `auth:expired`.
- **Inactivity & Idle Timeout (Enterprise Security):** Managed via `InactivityHandler.jsx`. Monitors user input across tabs. If idle for 14 minutes, triggers a 60-second advance warning countdown dialog with options to "Stay Logged In" or "Log Out Now". If 15 minutes of inactivity elapse, automatically terminates the session, clears credentials, and redirects to `/login?reason=inactivity` with a prominent security banner. Cross-tab `localStorage` synchronization prevents premature timeouts when active in parallel tabs.
- **Role-Based Guards:** `ProtectedRoute.jsx` intercepts unauthorized routes based on role (`admin` vs `user`).
- **Brute Force Protection:** Express rate limiter (`authLimiter`) prevents credential spraying.

### 5.3 Administrative Portal

**Routes:** `/admin`, `/admin/users`, `/admin/users/:id`, `/admin/claims`

- **Global Metrics:** Real-time state overview of active users, total claims, system health.
- **User Directory:** Filterable by status (`active`, `suspended`, `pending`), search by name/email/phone.
- **User Detail Inspection:** Shows user profile, linked employees, and all submitted claims.
- **Account Actions:** Toggle active/suspended state, trigger administrative password reset.
- **User Impersonation ("Log In As This User"):** Administrators can safely assume the identity of any active user account with a single click. A scoped 4-hour impersonation JWT is issued without revealing passwords. A persistent top warning banner remains pinned throughout the portal while impersonating, with an instant 1-click "Exit & Return to Admin" action restoring the original admin session.
- **Centralized Claims Register:** Full oversight of all claims across all users with status action buttons.

### 5.4 Employee Master

**Route:** `/employees` | **Component:** `Employees.jsx`

- Linked to user accounts via `user_id`.
- Stores designation, pay level, grade pay, basic pay, headquarters, and category (`A`, `B`, `C`, `D`, `E`).
- Family members sub-table for transfer entitlement claims.
- Cascading delete protects database integrity via transaction wrappers.

### 5.5 TA/DA Claims & Form 21 Bill

**Routes:** `/claims/tada`, `/claims/:id`, `/claims/:id/bill`

- Full journey leg ledger (modes, tickets, distances, station classification).
- Automated grouping into travel chains based on purpose.
- Stay allowance calculations (hotel vs friends/relatives).
- **Form 21 Bill (प्रपत्र २१):**
  - Fully restored UTF-8 Devanagari Hindi text (heading, column labels, certificates, declaration).
  - Styled with Google Font `Noto Sans Devanagari` and `Inter`.
  - Export to Excel via SheetJS and CSS-optimized Print layout.
  - **Passing Order Access Control:** Section 4 Controlling Officer Certificate & Passing Order ("देयक पारित आदेश") is exclusively displayed to Administrators (`isAdmin`). For individual employee logins, the passing order is hidden and the bill terminates cleanly at the Claimant's Signature.
  - **Universal Print Orientation:** Independent A4 Landscape and A4 Portrait orientation toggles available in all user logins (Admin and Individual) with dynamic `@page` CSS and localized button labels.

### 5.6 Transfer Claims

**Routes:** `/claims/transfer-list`, `/claims/transfer/:id`

- Manages transfer entitlement rules under MP Government provisions.
- Tracks family details, baggage weight, packing charges, and composite goods transport grants.
- Integrated with 52 MP districts bilingual dropdown.

### 5.7 Medical Claims

**Routes:** `/medical`, `/medical-claims/:id`

- Captures patient details, relationship, illness category, and treatment dates.
- Itemised bills table (`CONSULTATION`, `MEDICINE`, `TEST`, `OTHER`).
- Formal bilingual medical reimbursement claim form printing with distinct A4 Portrait (Recommended) and A4 Landscape print orientation toggles available across all logins.
- Applicant / Employee signature footer formatted with page-break avoidance to ensure clear bottom visibility.

### 5.8 Reports & Analytics

**Route:** `/reports` | **Component:** `Reports.jsx`

- Date-range filtered claims audit.
- Employee-wise, claim-type, and status-wise expenditure summaries.
- Multi-sheet Excel workbook export via SheetJS.
- Dynamic A4 Landscape (Recommended) and A4 Portrait orientation toggles for printing across all user logins.

---

## 6. DATABASE SCHEMA

### Database Configuration

- **Engine:** Better-SQLite3 (`server/claims.db`)
- **Journal Mode:** `WAL` (`PRAGMA journal_mode = WAL`) for concurrent reads and writes.
- **Foreign Keys:** `OFF` (`PRAGMA foreign_keys = OFF` — cascades handled explicitly in transaction blocks).

### Tables

#### `users` (Multi-User Authentication)

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | INTEGER | PK AUTOINCREMENT | Unique user ID |
| full_name | TEXT | NOT NULL | User's full name |
| email | TEXT | NOT NULL UNIQUE | Registered email (login identifier) |
| mobile_number | TEXT | NOT NULL | Mobile number |
| password_hash | TEXT | NOT NULL | bcrypt password hash (10 salt rounds) |
| role | TEXT | NOT NULL DEFAULT 'user' | `'user'` or `'admin'` |
| account_status | TEXT | NOT NULL DEFAULT 'active' | `'active'`, `'suspended'`, `'pending'` |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | Registration timestamp |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | Last profile/password update |
| last_login_at | DATETIME | NULL | Timestamp of last successful login |

#### `employees` (Employee Master)

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | INTEGER | PK AUTOINCREMENT | Unique employee ID |
| user_id | INTEGER | FK -> users(id) | Associated user account |
| name | TEXT | NOT NULL | Name in English |
| name_hi | TEXT | NULL | Name in Devanagari Hindi |
| designation | TEXT | NULL | Post / Designation |
| category | TEXT | NOT NULL | A, B, C, D, or E (determines entitlements) |
| pay_level | TEXT | NULL | Pay Matrix Level (e.g. Level 14) |
| grade_pay | TEXT | NULL | Grade Pay |
| basic_pay | REAL | NULL | Basic Pay |
| headquarters | TEXT | NULL | Home station / HQ |

#### `claims` (Claims Register)

| Column | Type | Description |
|---|---|---|
| id | INTEGER PK AUTOINCREMENT | Unique claim ID |
| employee_id | INTEGER NOT NULL | FK -> employees(id) |
| claim_type | TEXT NOT NULL | `TA_DA`, `TRANSFER`, `MEDICAL` |
| start_date | TEXT | Minimum journey date |
| end_date | TEXT | Maximum journey date |
| status | TEXT DEFAULT 'DRAFT' | `DRAFT`, `SUBMITTED`, `APPROVED`, `REJECTED`, `FINALIZED` |
| created_at | DATETIME DEFAULT CURRENT_TIMESTAMP | Creation timestamp |
| is_diary | INTEGER DEFAULT 0 | 1 if standalone Tour Diary |
| remarks | TEXT | General remarks |
| packing_charges | REAL | Packing allowance for transfer |
| goods_transport_charges | REAL | Goods transit allowance |
| family_details | TEXT | JSON or comma-separated family members |
| baggage_weight | REAL | Baggage in kg |
| total_amount | REAL DEFAULT 0 | Authoritative calculated claim total |
| advance_amount | REAL DEFAULT 0 | TA advance taken |
| td_no | TEXT | Tour Diary identifier (TD-YY-XXXX) |
| rendered_claim_id | TEXT | Official claim identifier (CL-YY-XXXX) |
| month | TEXT | Claim month |
| year | TEXT | Claim year |
| hotel_stay_type | TEXT | `'hotel'`, `'friends'`, or null |
| hotel_amount | REAL DEFAULT 0 | Actual hotel bill paid |
| linked_td_id | INTEGER | Reference to linked Tour Diary |
| linked_claim_id | INTEGER | Cross-claim reference |
| declaration_date | TEXT | Bill declaration submission date |
| patient_name | TEXT | Medical: Patient name |
| relationship | TEXT | Medical: Relationship to employee |
| is_regular | TEXT | Medical: Regular vs casual treatment |
| pay_scale | TEXT | Medical: Pay scale |
| child_sl_no_dob | TEXT | Medical: Child SL / DOB |
| illness_name | TEXT | Medical: Illness diagnosis |
| illness_duration | TEXT | Medical: Treatment duration |
| total_enclosures | TEXT | Medical: Number of enclosures |

#### `journey_details` (TA/DA & Tour Diary Legs)

| Column | Type | Description |
|---|---|---|
| id | INTEGER PK AUTOINCREMENT | Unique journey leg ID |
| claim_id | INTEGER NOT NULL | FK -> claims(id) |
| departure_date | TEXT | YYYY-MM-DD |
| departure_time | TEXT | HH:MM |
| departure_station | TEXT | Origin station |
| arrival_date | TEXT | YYYY-MM-DD |
| arrival_time | TEXT | HH:MM |
| arrival_station | TEXT | Destination station (determines city tier) |
| mode | TEXT | Rail, Bus, Own Car, Own Bike, Air |
| class_of_travel | TEXT | Travel class |
| ticket_no | TEXT | Ticket or receipt number |
| fare_amount | REAL DEFAULT 0 | Actual ticket fare |
| distance_km | REAL DEFAULT 0 | Distance for mileage claims |
| purpose | TEXT | Official purpose (groups legs into chains) |
| merge_purpose | INTEGER DEFAULT 0 | Display flag for Form 21 formatting |

#### `medical_bills` (Medical Line Items)

| Column | Type | Description |
|---|---|---|
| id | INTEGER PK AUTOINCREMENT | Unique bill item ID |
| claim_id | INTEGER NOT NULL | FK -> claims(id) |
| bill_category | TEXT | `CONSULTATION`, `MEDICINE`, `TEST`, `OTHER` |
| description | TEXT | Particulars of bill |
| illness_name | TEXT | Specific condition |
| lab_name | TEXT | Hospital / Diagnostic lab name |
| receipt_no | TEXT | Bill receipt number |
| receipt_date | TEXT | Receipt date |
| amount | REAL DEFAULT 0 | Billed amount |

#### `family_members` (Transfer Entitlements)

| Column | Type | Description |
|---|---|---|
| id | INTEGER PK AUTOINCREMENT | Unique family member ID |
| employee_id | INTEGER NOT NULL | FK -> employees(id) |
| name | TEXT NOT NULL | Member name |
| relationship | TEXT | Spouse, Son, Daughter, etc. |
| dob | TEXT | Date of birth |

#### Database Indexes

```sql
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees (user_id);
CREATE INDEX IF NOT EXISTS idx_claims_employee_id ON claims (employee_id);
CREATE INDEX IF NOT EXISTS idx_claims_status ON claims (status);
CREATE INDEX IF NOT EXISTS idx_journey_details_claim_id ON journey_details (claim_id);
CREATE INDEX IF NOT EXISTS idx_medical_bills_claim_id ON medical_bills (claim_id);
```

---

## 7. REST API REFERENCE

All routes run on **port 5000** under base `/api`. Protected routes require `Authorization: Bearer <JWT>` header.

### 7.1 Authentication & Password Management

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public (Rate Limited) | Register new user account |
| `POST` | `/api/auth/login` | Public (Rate Limited) | Login with email & password, returns JWT |
| `GET` | `/api/auth/me` | Bearer Token | Fetch current logged-in user profile |
| `POST` | `/api/auth/logout` | Bearer Token | Invalidate current user session |
| `POST` | `/api/auth/forgot-password` | Public (Rate Limited) | Request password reset token |
| `POST` | `/api/auth/reset-password` | Public (Rate Limited) | Reset password with token |

### 7.2 Administrator Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/admin/stats` | Admin Only | System KPIs (total users, active users, total claims, pending amount) |
| `GET` | `/api/admin/users` | Admin Only | List all registered users with search & filters |
| `GET` | `/api/admin/users/:id` | Admin Only | Deep inspection of user, linked employees, and claims |
| `PATCH` | `/api/admin/users/:id/status` | Admin Only | Toggle user status (`active` / `suspended`) |
| `PATCH` | `/api/admin/users/:id/reset-password` | Admin Only | Direct administrative password override |
| `POST` | `/api/admin/impersonate/:userId` | Admin Only | Issue scoped JWT impersonation session for target user account |
| `GET` | `/api/admin/users/:id/employees` | Admin Only | Employees associated with specific user |
| `GET` | `/api/admin/claims` | Admin Only | Centralized statewide cross-user claims ledger |
| `POST` | `/api/admin/purge-dummy-data` | Admin Only | Cascade purge of all test dummy records matching `@mpscsc.test` / `[DUMMY_DATA_RECORD]` |

### 7.3 Dashboard & Analytics

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/dashboard-stats` | Bearer Token | User dashboard analytics (KPIs, status counts, trend chart) |
| `GET` | `/api/dashboard` | Bearer Token | Aggregated executive workspace data |

### 7.4 Employees

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/employees` | Bearer Token | All employees (ordered by name) |
| `POST` | `/api/employees` | Bearer Token | Create new employee (associated with user) |
| `PUT` | `/api/employees/:id` | Bearer Token | Update employee details |
| `DELETE` | `/api/employees/:id` | Bearer Token | Delete employee with manual cascade of linked claims |
| `GET` | `/api/employees/:id/family` | Bearer Token | Fetch family members for employee |
| `GET` | `/api/employee-journeys/:empId` | Bearer Token | Journey history across claims for transfer import |

### 7.5 Family Members

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/family` | Bearer Token | Add family member |
| `DELETE` | `/api/family/:id` | Bearer Token | Remove family member |

### 7.6 Claims Management

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/claims` | Bearer Token | All claims with employee join |
| `GET` | `/api/claims/:employeeId` | Bearer Token | Claims for specific employee |
| `POST` | `/api/claims` | Bearer Token | Create claim (generates `rendered_claim_id` / `td_no`) |
| `PUT` | `/api/claims/:id` | Bearer Token | Update claim header fields |
| `PUT` | `/api/claims/:id/submit` | Bearer Token | Mark claim status as `SUBMITTED` |
| `PUT` | `/api/claims/:id/status` | Bearer Token | Update claim workflow status (`APPROVED`, `REJECTED`, etc.) |
| `DELETE` | `/api/claims/:id` | Bearer Token | Delete claim + cascade delete journeys & medical bills |
| `GET` | `/api/claim-details/:claimId` | Bearer Token | Fetch claim header + journey details |

### 7.7 Journey Details & Bill Calculations

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/journey-details-bulk` | Bearer Token | Replace all journeys for claim & recalculate claim totals |
| `GET` | `/api/calculate-bill/:claimId` | Bearer Token | Execute full TA/DA calculation engine; returns formatted bill rows and grand totals |

### 7.8 Medical Claims

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/medical-claims` | Bearer Token | Create medical claim + insert itemised bills in transaction |
| `GET` | `/api/medical-claims/:id` | Bearer Token | Fetch medical claim header and bills |
| `PUT` | `/api/medical-claims/:id` | Bearer Token | Update medical claim and replace bills in transaction |

---

## 8. TA/DA CALCULATION ENGINE

### Rate Tables (`server/tadaRules.js`)

#### Daily Allowance (DA Rates) — MP Govt Order (April 2025)

| Category | METRO (₹/day) | MAJOR_CITY (₹/day) | OTHER (₹/day) |
|---|---|---|---|
| **A** | 750 | 550 | 375 |
| **B** | 600 | 440 | 300 |
| **C** | 450 | 330 | 225 |
| **D** | 375 | 280 | 185 |
| **E** | 260 | 190 | 125 |

#### Hotel / Lodge Allowance (Max per day)

| Category | METRO (₹) | MAJOR_CITY (₹) | OTHER (₹) |
|---|---|---|---|
| **A** | 7,400 | 5,500 | 3,700 |
| **B** | 5,500 | 4,000 | 2,750 |
| **C** | 3,700 | 2,800 | 1,850 |
| **D** | 2,000 | 1,400 | 920 |
| **E** | 1,000 | 700 | 450 |

#### Stay with Friends / Relatives (per day)

| Category A | Category B | Category C | Category D | Category E |
|---|---|---|---|---|
| ₹750 | ₹660 | ₹550 | ₹450 | ₹370 |

#### Mileage Rates

| Vehicle Mode | Rate (₹/km) |
|---|---|
| Own Car | ₹12/km (server authoritative) |
| Own Bike | ₹6/km (server authoritative) |
| Taxi | ₹12/km |
| Auto | ₹6/km |

#### Duration Rules

| Duration in Chain | DA Payable Percentage |
|---|---|
| ≤ 6 hours | **0%** (Nil) |
| 6 to 12 hours | **50%** of daily rate |
| > 12 hours | **100%** of daily rate |

#### City Classification

- **METRO:** Indore, Bhopal, Jabalpur, Gwalior.
- **MAJOR_CITY:** Ujjain, Sagar, Dewas, Satna, Ratlam, Rewa, Murwara, Singrauli, Burhanpur, Khandwa.
- **OTHER:** All other locations within or outside Madhya Pradesh.

---

## 9. CONFIGURATION AND ENVIRONMENT

### Server (`server/index.js`)

- **Port:** 5000 (configurable via `process.env.PORT`)
- **CORS:** Enabled with preflight support
- **JWT Secret:** Managed via `process.env.JWT_SECRET` (with secure development fallback)
- **Database Path:** Managed via `process.env.DB_PATH || 'server/claims.db'`

### Client (`client/vite.config.js`)

- **Base Path:** `'/'` (Root base path)
- **Dev Port:** 5173
- **API Proxy:** Configured to route `/api/*` to `http://localhost:5000`

### Client API Utility (`client/src/utils/api.js`)

- Injects `Authorization: Bearer <token>` on all requests.
- Handles 401 Session Expiry globally by clearing tokens and redirecting to `/login`.

---

## 10. SETUP AND RUNNING GUIDE

### Prerequisites

- Node.js LTS (v18 or higher)
- Modern Web Browser (Chrome, Edge, Firefox)

### Credentials

- **Admin Login:** `admin@mpscsc.gov.in`
- **Admin Password:** `Admin@123`

### Starting the Portal

Execute the root batch script:
```bat
.\run_portal.bat
```
This automatically launches:
1. Express REST Server on `http://localhost:5000`
2. Vite Development Server on `http://localhost:5173`

---

## 11. PROGRESS TRACKER

| Feature Area | Status | Verification & Notes |
|---|---|---|
| Multi-User Authentication | **COMPLETE** | JWT token flow, bcrypt password hashing, session expiry handling |
| Self-Service Password Reset | **COMPLETE** | 15-minute secure token, direct reset page, input validation |
| Administrator Suite | **COMPLETE** | User directory, account status toggle, admin password override, global claims ledger |
| TA/DA Form 21 Bill Typography | **COMPLETE** | UTF-8 Hindi Devanagari restored, Google Fonts `Noto Sans Devanagari` and `Inter` |
| Database Concurrency | **COMPLETE** | SQLite WAL mode enabled, 6 core indexes added |
| Database Baseline Cleanup | **COMPLETE** | Purged all test dummy records; retained production employee Vikhyat Hindoliya |
| TA/DA Calculation Engine | **COMPLETE** | MP Govt April 2025 rates, chain grouping, stay allowance |
| Transfer Claims Module | **COMPLETE** | Baggage, packing, goods transport, 52 MP districts |
| Medical Claims Module | **COMPLETE** | Itemised bill receipts, Hindi printout form |
| Reports & Excel Export | **COMPLETE** | SheetJS multi-sheet workbook generation |
| Bilingual Support | **COMPLETE** | Hindi and English toggle across all pages |

---

## 12. PENDING TASKS

### High Priority
- [ ] **Automated Backup Schedule:** Implement automated daily cron backup of `claims.db` to an external/secondary drive.
- [ ] **SMS/Email Gateway Integration:** Wire up an external SMS/SMTP provider in `server/index.js` for production password reset OTP delivery.

### Medium Priority
- [ ] **Multi-Level Approval Hierarchy:** Introduce tiered approval levels (District Manager -> Regional Manager -> Head Office Finance).
- [ ] **Audit Trail Table:** Dedicated `audit_logs` table tracking sensitive actions (deletions, status overrides, logins).

---

## 13. WATCHLIST — REGRESSION RISKS

| Risk | Status | Mitigation Applied |
|---|---|---|
| **Double API Prefix** | **RESOLVED** | Vite proxy configured for `/api`; base path set to `/` |
| **Concurrency Lockups** | **RESOLVED** | SQLite configured with `PRAGMA journal_mode = WAL` |
| **Unauthenticated Access** | **RESOLVED** | All endpoints (except login/register/reset) guarded by `verifyToken` |
| **Devanagari Font Corruption** | **RESOLVED** | UTF-8 files saved with proper encoding; `Noto Sans Devanagari` font linked |
| **Foreign Keys OFF** | **MANAGED** | Atomic transactions in `server/index.js` perform manual cascades on employee/claim deletion |

---

## 14. KNOWN ISSUES REGISTER

| ID | Module | Description | Status |
|---|---|---|---|
| ISS-001 | TA/DA Engine | Mileage rate differences between server (`12/6`) and client helper (`9/4`). | Server is authoritative and correct according to latest MP orders. Client displays server calculated total. |
| ISS-002 | Database | `daily_allowances` table schema exists but calculations are computed dynamically. | Harmless; preserved for future manual override interface. |

---

## 15. CHANGE LOG

<!-- AUTO-GENERATED-COMMITS-START -->
### Recent Git Commits (Auto-Synced)

| Commit | Date | Summary |
|---|---|---|
| `3dfecca` | 2026-09-23 | feat: optimise A4 landscape print layouts for all 4 forms - TADABill: default landscape, remove Part II forced page-break, compress column widths/fonts for 1-page; TourDiary: tighten margins/font/padding for 1-page; MedicalClaim: landscape recommended, 2-col grid on Page 2, smaller fonts/padding; TransferClaim: add orientation toggle, handlePrint, formal print-only bill section with full CSS |
| `5ed9f36` | 2026-09-23 | feat: Hide bill passing order from individual users; add A4 print orientation toggles across all modules |
| `078b3f8` | 2026-09-23 | fix(medical-claim): ensure Applicant and Doctor signatures are clearly visible and unclipped in print |
| `ad5b798` | 2026-09-23 | feat(auth): implement automatic inactivity logout with 60s warning modal and cross-tab sync |
| `5850f17` | 2026-09-22 | Add A4 Landscape printing support, orientation selector, and clean print layout for Tour Diary |
| `e174550` | 2026-09-22 | Fix dashboard date-filter clock skew and permanently bake 10 user claims into claims.db with auto-seeding |
| `5ad2703` | 2026-09-22 | feat(seed): populate comprehensive realistic records for all 10 user accounts across all 4 modules and support total_amount in claim update |
| `2bba7ce` | 2026-09-22 | feat(admin): implement Admin Impersonation ('Log In As This User') with persistent banner and 1-click exit |
<!-- AUTO-GENERATED-COMMITS-END -->

### Major Project Milestones

| Date | Milestone / Change | Details |
|---|---|---|
| **2026-09-23** | **Automated Update** | Medical Claim print: strict 2-page split enforced — Page 1 has exactly points 1-11 (break-after:page, no conflicting break-inside:avoid, compacted landscape CSS), Page 2 has PART II Itemized Details (break-before:page) |
| **2026-09-23** | **Automated Update** | Optimised print layouts for all 4 forms to A4 Landscape: TADABill (1 page, removed page-break, default landscape, compressed fonts/margins), TourDiary (1 page, tighter margins/padding/font), MedicalClaim (2 pages, landscape 2-column Page 2 tables, recommended landscape), TransferClaim (1 page, new formal print-only bill section with header/journey table/summary/signatures + orientation toggle) |
| **2026-09-22** | **Automated Update** | Hide bill passing order from individual users and enable A4 Landscape and Portrait printing across all modules |
| **2026-09-22** | **Automated Update** | Fix Medical Claim print layout: ensure applicant and doctor signature blocks are clearly visible, unclipped, and styled with solid rules |
| **2026-09-22** | **Automated Update** | Add automatic inactivity logout (idle timeout) with 60-second warning countdown and cross-tab synchronization |
| **2026-09-22** | **Automated Update** | Add A4 Landscape printing support, orientation selector, and clean print layout for Tour Diary |
| **2026-09-22** | **Automated Update** | Fix dashboard date filtering clock skew, auto-seed 10 test users on startup, and bake all user claims into claims.db |
| **2026-09-22** | **Automated Update** | Ensure all 10 registered user accounts have realistic live dummy records across all 4 modules and support total_amount in PUT /api/claims/:id |
| **2026-09-22** | **Automated Update** | Implement Admin User Impersonation ('Log In As This User') feature with persistent top banner and 1-click restore |
| **2026-09-22** | **Automated Update** | Fix ReferenceError: employee is not defined in TADABill.jsx by restoring destructuring of billData |
| **2026-09-22** | **Automated Update** | Add safe error fallback and 404 guard in TADABill.jsx to prevent ErrorBoundary crashes on missing or invalid claim bills |
| **2026-09-22** | **Automated Update** | Fix claim zero amount calculation: update headed UI script with accurate field mapping, import TA/DA journeys into transfer claims, add doctor and medicine items to medical claims, and clean up obsolete empty drafts |
| **2026-09-22** | **Automated Update** | Fix handleStartEditPayInfo ReferenceError in TADABill.jsx |
| **2026-09-22** | **Automated Update** | Add dummy data purge endpoint, headed UI entry script, and increased auth rate limiter |
| **2026-09-22** | **Automated Update** | Standardize authLimiter and enhance QA runner for live server validation |
| **2026-09-22** | **Self-Service Password Reset System** | Created [ResetPassword.jsx](file:///f:/AI%20Projects/Anti%20Gravity/mpscsc-claims-portal/client/src/pages/ResetPassword.jsx), integrated with `ForgotPassword.jsx` and `/api/auth/reset-password` endpoint. Validated end-to-end token flow. |
| **2026-09-22** | **Master Documentation Overhaul** | Comprehensive sync of `PROJECT_DOCS.md` reflecting all 37 API routes, new architecture, auth security, and admin workflows. |
| **2026-09-22** | **Form 21 Bill Typography Repair** | Restored UTF-8 Hindi Devanagari across Form 21 TA/DA Bill (`TADABill.jsx`); imported `Noto Sans Devanagari` font; aligned bill columns. |
| **2026-09-22** | **Database Cleanup** | Purged all test/dummy employee and claim records, preserving only production record Vikhyat Hindoliya and admin user. |
| **2026-09-22** | **Admin Suite & Statewide Claims Ledger** | Implemented `AdminDashboard.jsx`, `AdminUsers.jsx`, `AdminUserDetail.jsx`, and `AdminClaims.jsx` with full status approval capabilities. |
| **2026-09-22** | **Multi-User Authentication & RBAC** | Added `users` table, JWT authentication, `bcryptjs`, route guards, and admin authorization. |
| **2026-09-22** | **Database Concurrency & Indexing** | Enabled `PRAGMA journal_mode = WAL` and added 6 performance indexes. |
| **2026-07-24** | Master Project Document Creation | Initial compilation of portal architecture and specifications. |
| **2026-07-15** | Bilingual Support & District Dropdown | Added 52 MP districts and English/Hindi language toggle. |
| **2026-07-01** | Medical Reimbursement Module | Itemised medical bill entry and Hindi reimbursement form. |
| **2026-02-10** | Core Claims Engine & Employee Master | Initial TA/DA claim engine and SQLite database setup. |

---

## 16. DEVELOPER TIPS AND TROUBLESHOOTING

### Common Issues & Quick Fixes

1. **Port 5000 in use (`EADDRINUSE`)**:
   ```powershell
   Get-Process -Id (Get-NetTCPConnection -LocalPort 5000).OwningProcess | Stop-Process -Force
   ```
2. **Reset Admin Password Manually**:
   If locked out of the admin account, run from the `server` directory:
   ```javascript
   const bcrypt = require('bcryptjs');
   const { db } = require('./db');
   const hash = bcrypt.hashSync('Admin@123', 10);
   db.prepare("UPDATE users SET password_hash = ? WHERE email = 'admin@mpscsc.gov.in'").run(hash);
   console.log('Admin password reset successfully.');
   ```
3. **Inspect Active Database State**:
   ```sql
   SELECT id, full_name, email, role, account_status FROM users;
   SELECT id, name, designation, category FROM employees;
   SELECT id, rendered_claim_id, claim_type, total_amount, status FROM claims;
   ```

---

*Document maintained by Antigravity IDE & MPSCSC Development Team.*  
*Single Source of Truth for the MPSCSC Claims Portal.*
