/**
 * scripts/seed_local_db_all_users.js
 * ==============================================================================
 * Seeds realistic dummy data directly into server/claims.db for ALL 10 test users.
 * Bakes the records permanently into claims.db so they persist across Render git deployments.
 * ==============================================================================
 */

const path = require('path');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

const dbPath = path.resolve(__dirname, '../server/claims.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

const testUsersData = [
    {
        user: { name: "Rajesh Sharma", email: "rajesh.bhopal@mpscsc.test", pass: "Password@123", mobile: "9826011001" },
        emp: { name: "Rajesh Sharma", designation: "District Manager", category: "A", headquarters: "Bhopal", pay_level: "Level 14", basic_pay: 85000, grade_pay: "7600" },
        diary: { month: "July", year: "2026", start_date: "2026-07-10", end_date: "2026-07-11", remarks: "State PDS Warehouse Inspection [DUMMY_DATA_RECORD]",
            journeys: [
                { departure_date: "2026-07-10", departure_time: "08:00", departure_station: "Bhopal", arrival_date: "2026-07-10", arrival_time: "12:30", arrival_station: "Indore", mode: "Bus", class_of_travel: "AC", fare_amount: 450, distance_km: 195, purpose: "State PDS Warehouse Inspection [DUMMY_DATA_RECORD]" }
            ]
        },
        tada: { month: "August", year: "2026", start_date: "2026-08-04", end_date: "2026-08-05", hotel: "Hotel", hotelAmt: 2800, total_amount: 4925, remarks: "District food grain distribution audit [DUMMY_DATA_RECORD]",
            journeys: [
                { departure_date: "2026-08-04", departure_time: "07:00", departure_station: "Bhopal", arrival_date: "2026-08-04", arrival_time: "11:30", arrival_station: "Ujjain", mode: "Bus", class_of_travel: "AC", fare_amount: 420, distance_km: 185, purpose: "District food grain distribution audit [DUMMY_DATA_RECORD]" },
                { departure_date: "2026-08-05", departure_time: "14:00", departure_station: "Ujjain", arrival_date: "2026-08-05", arrival_time: "18:30", arrival_station: "Bhopal", mode: "Bus", class_of_travel: "AC", fare_amount: 420, distance_km: 185, purpose: "Return to Headquarters" }
            ]
        },
        transfer: { month: "January", year: "2026", start_date: "2026-01-15", end_date: "2026-01-16", packing: 5000, transport: 22000, total_amount: 27000, family: "Spouse and 2 Dependents [DUMMY_DATA_RECORD]", remarks: "Administrative Transfer Order #MP-2026-01 [DUMMY_DATA_RECORD]" },
        medical: { patient: "Rajesh Sharma", relation: "Self", illness: "Viral Fever & Dehydration [DUMMY_DATA_RECORD]", duration: "3 days", total_amount: 1950, bills: [{ desc: "Apollo Meds [DUMMY_DATA_RECORD]", amt: 1950, no: "AP-201" }] }
    },
    {
        user: { name: "Pooja Verma", email: "pooja.indore@mpscsc.test", pass: "Password@123", mobile: "9826011002" },
        emp: { name: "Pooja Verma", designation: "Assistant Accounts Officer", category: "B", headquarters: "Indore", pay_level: "Level 12", basic_pay: 68000, grade_pay: "6600" },
        diary: { month: "August", year: "2026", start_date: "2026-08-12", end_date: "2026-08-13", remarks: "Headquarters Financial Audit Review [DUMMY_DATA_RECORD]",
            journeys: [
                { departure_date: "2026-08-12", departure_time: "09:00", departure_station: "Indore", arrival_date: "2026-08-12", arrival_time: "14:00", arrival_station: "Bhopal", mode: "Rail", class_of_travel: "AC 2-Tier", fare_amount: 680, distance_km: 220, purpose: "Headquarters Financial Audit Review [DUMMY_DATA_RECORD]" }
            ]
        },
        tada: { month: "September", year: "2026", start_date: "2026-09-02", end_date: "2026-09-03", hotel: "None", hotelAmt: 0, total_amount: 1360, remarks: "Sub-division account reconciliation [DUMMY_DATA_RECORD]",
            journeys: [
                { departure_date: "2026-09-02", departure_time: "08:30", departure_station: "Indore", arrival_date: "2026-09-02", arrival_time: "10:30", arrival_station: "Dewas", mode: "Bus", class_of_travel: "Ordinary", fare_amount: 80, distance_km: 45, purpose: "Sub-division account reconciliation [DUMMY_DATA_RECORD]" },
                { departure_date: "2026-09-03", departure_time: "16:00", departure_station: "Dewas", arrival_date: "2026-09-03", arrival_time: "18:00", arrival_station: "Indore", mode: "Bus", class_of_travel: "Ordinary", fare_amount: 80, distance_km: 45, purpose: "Return to HQ" }
            ]
        },
        transfer: { month: "February", year: "2026", start_date: "2026-02-10", end_date: "2026-02-11", packing: 4000, transport: 16000, total_amount: 20000, family: "Self and Mother [DUMMY_DATA_RECORD]", remarks: "Zonal office rotation order [DUMMY_DATA_RECORD]" },
        medical: { patient: "Pooja Verma", relation: "Self", illness: "Eye Strain & Clinic Consultation [DUMMY_DATA_RECORD]", duration: "2 days", total_amount: 1450, bills: [{ desc: "Dr. Agarwal Eye Care [DUMMY_DATA_RECORD]", amt: 1450, no: "EYE-88" }] }
    },
    {
        user: { name: "Amitabh Patel", email: "amitabh.jabalpur@mpscsc.test", pass: "Password@123", mobile: "9826011003" },
        emp: { name: "Amitabh Patel", designation: "Quality Inspector", category: "C", headquarters: "Jabalpur", pay_level: "Level 8", basic_pay: 48000, grade_pay: "4200" },
        diary: { month: "July", year: "2026", start_date: "2026-07-15", end_date: "2026-07-16", remarks: "Paddy procurement center sample testing [DUMMY_DATA_RECORD]",
            journeys: [
                { departure_date: "2026-07-15", departure_time: "06:30", departure_station: "Jabalpur", arrival_date: "2026-07-15", arrival_time: "09:30", arrival_station: "Katni", mode: "Rail", class_of_travel: "Sleeper", fare_amount: 140, distance_km: 90, purpose: "Paddy procurement center sample testing [DUMMY_DATA_RECORD]" }
            ]
        },
        tada: { month: "August", year: "2026", start_date: "2026-08-18", end_date: "2026-08-19", hotel: "None", hotelAmt: 0, total_amount: 850, remarks: "Field stock inspection [DUMMY_DATA_RECORD]",
            journeys: [
                { departure_date: "2026-08-18", departure_time: "07:00", departure_station: "Jabalpur", arrival_date: "2026-08-18", arrival_time: "12:00", arrival_station: "Mandla", mode: "Bus", class_of_travel: "Ordinary", fare_amount: 160, distance_km: 100, purpose: "Field stock inspection [DUMMY_DATA_RECORD]" },
                { departure_date: "2026-08-19", departure_time: "14:00", departure_station: "Mandla", arrival_date: "2026-08-19", arrival_time: "19:00", arrival_station: "Jabalpur", mode: "Bus", class_of_travel: "Ordinary", fare_amount: 160, distance_km: 100, purpose: "Return to HQ" }
            ]
        },
        transfer: { month: "January", year: "2026", start_date: "2026-01-20", end_date: "2026-01-21", packing: 3000, transport: 12000, total_amount: 15000, family: "Spouse [DUMMY_DATA_RECORD]", remarks: "Transfer from Mandla to Jabalpur HQ [DUMMY_DATA_RECORD]" },
        medical: { patient: "Amitabh Patel", relation: "Self", illness: "Dental Root Canal [DUMMY_DATA_RECORD]", duration: "5 days", total_amount: 1920, bills: [{ desc: "Dental Clinic [DUMMY_DATA_RECORD]", amt: 1920, no: "DEN-44" }] }
    },
    {
        user: { name: "Sunita Yadav", email: "sunita.gwalior@mpscsc.test", pass: "Password@123", mobile: "9826011004" },
        emp: { name: "Sunita Yadav", designation: "Store In-charge", category: "D", headquarters: "Gwalior", pay_level: "Level 6", basic_pay: 34000, grade_pay: "2800" },
        diary: { month: "August", year: "2026", start_date: "2026-08-08", end_date: "2026-08-09", remarks: "Depot stock verification [DUMMY_DATA_RECORD]",
            journeys: [
                { departure_date: "2026-08-08", departure_time: "08:00", departure_station: "Gwalior", arrival_date: "2026-08-08", arrival_time: "09:30", arrival_station: "Morena", mode: "Bus", class_of_travel: "Ordinary", fare_amount: 70, distance_km: 40, purpose: "Depot stock verification [DUMMY_DATA_RECORD]" }
            ]
        },
        tada: { month: "September", year: "2026", start_date: "2026-09-05", end_date: "2026-09-06", hotel: "None", hotelAmt: 0, total_amount: 615, remarks: "Silo storage inspection [DUMMY_DATA_RECORD]",
            journeys: [
                { departure_date: "2026-09-05", departure_time: "07:30", departure_station: "Gwalior", arrival_date: "2026-09-05", arrival_time: "10:00", arrival_station: "Bhind", mode: "Bus", class_of_travel: "Ordinary", fare_amount: 110, distance_km: 75, purpose: "Silo storage inspection [DUMMY_DATA_RECORD]" },
                { departure_date: "2026-09-06", departure_time: "15:00", departure_station: "Bhind", arrival_date: "2026-09-06", arrival_time: "17:30", arrival_station: "Gwalior", mode: "Bus", class_of_travel: "Ordinary", fare_amount: 110, distance_km: 75, purpose: "Return to HQ" }
            ]
        },
        transfer: { month: "March", year: "2026", start_date: "2026-03-01", end_date: "2026-03-02", packing: 2500, transport: 9500, total_amount: 12000, family: "Self [DUMMY_DATA_RECORD]", remarks: "Transfer from Shivpuri to Gwalior Depot [DUMMY_DATA_RECORD]" },
        medical: { patient: "Sunita Yadav", relation: "Self", illness: "Hypertension & Checkup [DUMMY_DATA_RECORD]", duration: "3 days", total_amount: 1350, bills: [{ desc: "City Hospital OPD [DUMMY_DATA_RECORD]", amt: 1350, no: "OPD-302" }] }
    },
    {
        user: { name: "Dinesh Malviya", email: "dinesh.ujjain@mpscsc.test", pass: "Password@123", mobile: "9826011005" },
        emp: { name: "Dinesh Malviya", designation: "Field Supervisor", category: "C", headquarters: "Ujjain", pay_level: "Level 7", basic_pay: 44000, grade_pay: "3600" },
        diary: { month: "July", year: "2026", start_date: "2026-07-22", end_date: "2026-07-23", remarks: "Fair Price Shop monitoring [DUMMY_DATA_RECORD]",
            journeys: [
                { departure_date: "2026-07-22", departure_time: "08:30", departure_station: "Ujjain", arrival_date: "2026-07-22", arrival_time: "10:00", arrival_station: "Nagda", mode: "Bus", class_of_travel: "Ordinary", fare_amount: 85, distance_km: 55, purpose: "Fair Price Shop monitoring [DUMMY_DATA_RECORD]" }
            ]
        },
        tada: { month: "August", year: "2026", start_date: "2026-08-14", end_date: "2026-08-15", hotel: "None", hotelAmt: 0, total_amount: 663, remarks: "Ration distribution inspection [DUMMY_DATA_RECORD]",
            journeys: [
                { departure_date: "2026-08-14", departure_time: "09:00", departure_station: "Ujjain", arrival_date: "2026-08-14", arrival_time: "11:00", arrival_station: "Shajapur", mode: "Bus", class_of_travel: "Ordinary", fare_amount: 120, distance_km: 65, purpose: "Ration distribution inspection [DUMMY_DATA_RECORD]" },
                { departure_date: "2026-08-15", departure_time: "15:00", departure_station: "Shajapur", arrival_date: "2026-08-15", arrival_time: "17:00", arrival_station: "Ujjain", mode: "Bus", class_of_travel: "Ordinary", fare_amount: 120, distance_km: 65, purpose: "Return to HQ" }
            ]
        },
        transfer: { month: "February", year: "2026", start_date: "2026-02-14", end_date: "2026-02-15", packing: 3000, transport: 11000, total_amount: 14000, family: "Spouse & Child [DUMMY_DATA_RECORD]", remarks: "Transfer order from Agar to Ujjain [DUMMY_DATA_RECORD]" },
        medical: { patient: "Dinesh Malviya", relation: "Self", illness: "Ankle Sprain [DUMMY_DATA_RECORD]", duration: "4 days", total_amount: 1140, bills: [{ desc: "Orthopedic Clinic [DUMMY_DATA_RECORD]", amt: 1140, no: "ORTH-12" }] }
    },
    {
        user: { name: "Kavita Soni", email: "kavita.sagar@mpscsc.test", pass: "Password@123", mobile: "9826011006" },
        emp: { name: "Kavita Soni", designation: "Assistant Manager (Wheat)", category: "B", headquarters: "Sagar", pay_level: "Level 11", basic_pay: 65000, grade_pay: "5400" },
        diary: { month: "August", year: "2026", start_date: "2026-08-20", end_date: "2026-08-21", remarks: "Wheat Procurement Center inspection [DUMMY_DATA_RECORD]",
            journeys: [
                { departure_date: "2026-08-20", departure_time: "07:30", departure_station: "Sagar", arrival_date: "2026-08-20", arrival_time: "10:00", arrival_station: "Damoh", mode: "Bus", class_of_travel: "Express", fare_amount: 130, distance_km: 80, purpose: "Wheat Procurement Center inspection [DUMMY_DATA_RECORD]" }
            ]
        },
        tada: { month: "September", year: "2026", start_date: "2026-09-10", end_date: "2026-09-11", hotel: "None", hotelAmt: 0, total_amount: 970, remarks: "Mandi procurement center visit [DUMMY_DATA_RECORD]",
            journeys: [
                { departure_date: "2026-09-10", departure_time: "08:00", departure_station: "Sagar", arrival_date: "2026-09-10", arrival_time: "10:30", arrival_station: "Bina", mode: "Rail", class_of_travel: "AC Chair", fare_amount: 195, distance_km: 75, purpose: "Mandi procurement center visit [DUMMY_DATA_RECORD]" },
                { departure_date: "2026-09-11", departure_time: "16:00", departure_station: "Bina", arrival_date: "2026-09-11", arrival_time: "18:30", arrival_station: "Sagar", mode: "Rail", class_of_travel: "AC Chair", fare_amount: 195, distance_km: 75, purpose: "Return to Headquarters" }
            ]
        },
        transfer: { month: "January", year: "2026", start_date: "2026-01-25", end_date: "2026-01-26", packing: 3500, transport: 13500, total_amount: 17000, family: "Spouse and Daughter [DUMMY_DATA_RECORD]", remarks: "Transfer from Chhatarpur to Sagar HQ [DUMMY_DATA_RECORD]" },
        medical: { patient: "Kavita Soni", relation: "Self", illness: "Migraine Treatment [DUMMY_DATA_RECORD]", duration: "3 days", total_amount: 850, bills: [{ desc: "District Hospital OPD [DUMMY_DATA_RECORD]", amt: 850, no: "DH-101" }] }
    },
    {
        user: { name: "Manoj Tiwari", email: "manoj.rewa@mpscsc.test", pass: "Password@123", mobile: "9826011007" },
        emp: { name: "Manoj Tiwari", designation: "Procurement Officer", category: "B", headquarters: "Rewa", pay_level: "Level 10", basic_pay: 56000, grade_pay: "4800" },
        diary: { month: "July", year: "2026", start_date: "2026-07-28", end_date: "2026-07-29", remarks: "Buffer storage verification [DUMMY_DATA_RECORD]",
            journeys: [
                { departure_date: "2026-07-28", departure_time: "08:00", departure_station: "Rewa", arrival_date: "2026-07-28", arrival_time: "10:30", arrival_station: "Sidhi", mode: "Bus", class_of_travel: "Ordinary", fare_amount: 120, distance_km: 85, purpose: "Buffer storage verification [DUMMY_DATA_RECORD]" }
            ]
        },
        tada: { month: "August", year: "2026", start_date: "2026-08-25", end_date: "2026-08-26", hotel: "None", hotelAmt: 0, total_amount: 770, remarks: "Civil supplies godown audit [DUMMY_DATA_RECORD]",
            journeys: [
                { departure_date: "2026-08-25", departure_time: "07:30", departure_station: "Rewa", arrival_date: "2026-08-25", arrival_time: "11:30", arrival_station: "Satna", mode: "Bus", class_of_travel: "Ordinary", fare_amount: 100, distance_km: 55, purpose: "Civil supplies godown audit [DUMMY_DATA_RECORD]" },
                { departure_date: "2026-08-26", departure_time: "15:30", departure_station: "Satna", arrival_date: "2026-08-26", arrival_time: "19:30", arrival_station: "Rewa", mode: "Bus", class_of_travel: "Ordinary", fare_amount: 100, distance_km: 55, purpose: "Return to HQ" }
            ]
        },
        transfer: { month: "February", year: "2026", start_date: "2026-02-20", end_date: "2026-02-21", packing: 3000, transport: 11500, total_amount: 14500, family: "Spouse & 2 Sons [DUMMY_DATA_RECORD]", remarks: "Transfer from Singrauli to Rewa HQ [DUMMY_DATA_RECORD]" },
        medical: { patient: "Manoj Tiwari", relation: "Self", illness: "Gastric Ulcer Treatment [DUMMY_DATA_RECORD]", duration: "4 days", total_amount: 1280, bills: [{ desc: "Shree Ram Clinic [DUMMY_DATA_RECORD]", amt: 1280, no: "SRC-78" }] }
    },
    {
        user: { name: "Deepak Chouhan", email: "deepak.satna@mpscsc.test", pass: "Password@123", mobile: "9826011008" },
        emp: { name: "Deepak Chouhan", designation: "Quality Analyst", category: "C", headquarters: "Satna", pay_level: "Level 8", basic_pay: 49000, grade_pay: "4200" },
        diary: { month: "August", year: "2026", start_date: "2026-08-24", end_date: "2026-08-25", remarks: "Grain quality grading inspection [DUMMY_DATA_RECORD]",
            journeys: [
                { departure_date: "2026-08-24", departure_time: "08:30", departure_station: "Satna", arrival_date: "2026-08-24", arrival_time: "10:30", arrival_station: "Maihar", mode: "Rail", class_of_travel: "Sleeper", fare_amount: 80, distance_km: 40, purpose: "Grain quality grading inspection [DUMMY_DATA_RECORD]" }
            ]
        },
        tada: { month: "September", year: "2026", start_date: "2026-09-12", end_date: "2026-09-13", hotel: "None", hotelAmt: 0, total_amount: 638, remarks: "Seed & fertilizer depot inspection [DUMMY_DATA_RECORD]",
            journeys: [
                { departure_date: "2026-09-12", departure_time: "08:00", departure_station: "Satna", arrival_date: "2026-09-12", arrival_time: "11:00", arrival_station: "Panna", mode: "Bus", class_of_travel: "Ordinary", fare_amount: 110, distance_km: 70, purpose: "Seed & fertilizer depot inspection [DUMMY_DATA_RECORD]" },
                { departure_date: "2026-09-13", departure_time: "14:00", departure_station: "Panna", arrival_date: "2026-09-13", arrival_time: "17:00", arrival_station: "Satna", mode: "Bus", class_of_travel: "Ordinary", fare_amount: 110, distance_km: 70, purpose: "Return to Headquarters" }
            ]
        },
        transfer: { month: "January", year: "2026", start_date: "2026-01-28", end_date: "2026-01-29", packing: 2500, transport: 9000, total_amount: 11500, family: "Self & Spouse [DUMMY_DATA_RECORD]", remarks: "Transfer order from Nagod to Satna [DUMMY_DATA_RECORD]" },
        medical: { patient: "Deepak Chouhan", relation: "Self", illness: "Back Sprain Consultation [DUMMY_DATA_RECORD]", duration: "3 days", total_amount: 720, bills: [{ desc: "Civil Hospital Satna [DUMMY_DATA_RECORD]", amt: 720, no: "CH-50" }] }
    },
    {
        user: { name: "Ritu Raghuwanshi", email: "ritu.betul@mpscsc.test", pass: "Password@123", mobile: "9826011009" },
        emp: { name: "Ritu Raghuwanshi", designation: "Accounts Officer", category: "B", headquarters: "Betul", pay_level: "Level 11", basic_pay: 62000, grade_pay: "5400" },
        diary: { month: "August", year: "2026", start_date: "2026-08-16", end_date: "2026-08-17", remarks: "Sub-division account audit [DUMMY_DATA_RECORD]",
            journeys: [
                { departure_date: "2026-08-16", departure_time: "08:00", departure_station: "Betul", arrival_date: "2026-08-16", arrival_time: "10:30", arrival_station: "Multai", mode: "Bus", class_of_travel: "Ordinary", fare_amount: 90, distance_km: 50, purpose: "Sub-division account audit [DUMMY_DATA_RECORD]" }
            ]
        },
        tada: { month: "September", year: "2026", start_date: "2026-09-08", end_date: "2026-09-09", hotel: "None", hotelAmt: 0, total_amount: 1200, remarks: "Field store audit & inspection [DUMMY_DATA_RECORD]",
            journeys: [
                { departure_date: "2026-09-08", departure_time: "07:30", departure_station: "Betul", arrival_date: "2026-09-08", arrival_time: "10:00", arrival_station: "Amla", mode: "Rail", class_of_travel: "Sleeper", fare_amount: 80, distance_km: 35, purpose: "Field store audit & inspection [DUMMY_DATA_RECORD]" },
                { departure_date: "2026-09-09", departure_time: "15:00", departure_station: "Amla", arrival_date: "2026-09-09", arrival_time: "17:30", arrival_station: "Betul", mode: "Rail", class_of_travel: "Sleeper", fare_amount: 80, distance_km: 35, purpose: "Return to HQ" }
            ]
        },
        transfer: { month: "March", year: "2026", start_date: "2026-03-05", end_date: "2026-03-06", packing: 3500, transport: 14000, total_amount: 17500, family: "Spouse & Child [DUMMY_DATA_RECORD]", remarks: "Transfer order from Hoshangabad to Betul HQ [DUMMY_DATA_RECORD]" },
        medical: { patient: "Ritu Raghuwanshi", relation: "Self", illness: "Allergy & Skin Treatment [DUMMY_DATA_RECORD]", duration: "3 days", total_amount: 1480, bills: [{ desc: "Skin Care Clinic [DUMMY_DATA_RECORD]", amt: 1480, no: "SK-901" }] }
    },
    {
        user: { name: "Sandeep Mishra", email: "sandeep.chhindwara@mpscsc.test", pass: "Password@123", mobile: "9826011010" },
        emp: { name: "Sandeep Mishra", designation: "Assistant Grade-II", category: "D", headquarters: "Chhindwara", pay_level: "Level 5", basic_pay: 30000, grade_pay: "2400" },
        diary: { month: "July", year: "2026", start_date: "2026-07-18", end_date: "2026-07-19", remarks: "Mandi procurement assistance [DUMMY_DATA_RECORD]",
            journeys: [
                { departure_date: "2026-07-18", departure_time: "08:00", departure_station: "Chhindwara", arrival_date: "2026-07-18", arrival_time: "10:30", arrival_station: "Parasia", mode: "Bus", class_of_travel: "Ordinary", fare_amount: 70, distance_km: 30, purpose: "Mandi procurement assistance [DUMMY_DATA_RECORD]" }
            ]
        },
        tada: { month: "August", year: "2026", start_date: "2026-08-22", end_date: "2026-08-23", hotel: "None", hotelAmt: 0, total_amount: 870, remarks: "Godown maintenance audit [DUMMY_DATA_RECORD]",
            journeys: [
                { departure_date: "2026-08-22", departure_time: "07:30", departure_station: "Chhindwara", arrival_date: "2026-08-22", arrival_time: "10:30", arrival_station: "Sausar", mode: "Bus", class_of_travel: "Ordinary", fare_amount: 90, distance_km: 55, purpose: "Godown maintenance audit [DUMMY_DATA_RECORD]" },
                { departure_date: "2026-08-23", departure_time: "15:00", departure_station: "Sausar", arrival_date: "2026-08-23", arrival_time: "18:00", arrival_station: "Chhindwara", mode: "Bus", class_of_travel: "Ordinary", fare_amount: 90, distance_km: 55, purpose: "Return to HQ" }
            ]
        },
        transfer: { month: "February", year: "2026", start_date: "2026-02-18", end_date: "2026-02-19", packing: 2200, transport: 8000, total_amount: 10200, family: "Self [DUMMY_DATA_RECORD]", remarks: "Transfer order from Junnardeo to Chhindwara [DUMMY_DATA_RECORD]" },
        medical: { patient: "Sandeep Mishra", relation: "Self", illness: "Seasonal Flu & Fever [DUMMY_DATA_RECORD]", duration: "3 days", total_amount: 630, bills: [{ desc: "Community Health Center [DUMMY_DATA_RECORD]", amt: 630, no: "CHC-12" }] }
    }
];

function seedLocalDb() {
    console.log('Seeding SQLite database directly at:', dbPath);

    const insertUser = db.prepare(`
        INSERT INTO users (full_name, email, mobile_number, password_hash, role, account_status)
        VALUES (?, ?, ?, ?, 'user', 'active')
    `);

    const insertEmp = db.prepare(`
        INSERT INTO employees (user_id, name, name_hi, designation, category, pay_level, grade_pay, headquarters, basic_pay)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertClaim = db.prepare(`
        INSERT INTO claims (
            employee_id, claim_type, rendered_claim_id, td_no, is_diary,
            month, year, start_date, end_date, remarks, status, total_amount,
            hotel_stay_type, hotel_amount, packing_charges, goods_transport_charges,
            family_details, baggage_weight, patient_name, relationship, illness_name, illness_duration
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertJourney = db.prepare(`
        INSERT INTO journey_details (
            claim_id, departure_date, departure_time, departure_station,
            arrival_date, arrival_time, arrival_station, mode, class_of_travel,
            ticket_no, fare_amount, distance_km, purpose
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMedicalBill = db.prepare(`
        INSERT INTO medical_bills (
            claim_id, bill_category, description, illness_name, lab_name, receipt_no, receipt_date, amount
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const yearSuffix = '26';

    const seedTransaction = db.transaction(() => {
        for (const item of testUsersData) {
            console.log(`Processing: ${item.user.name} (${item.user.email})`);

            // 1. User
            let user = db.prepare('SELECT id, full_name, email FROM users WHERE email = ?').get(item.user.email);
            if (!user) {
                const passHash = bcrypt.hashSync(item.user.pass, 10);
                const info = insertUser.run(item.user.name, item.user.email, item.user.mobile, passHash);
                user = { id: info.lastInsertRowid, full_name: item.user.name, email: item.user.email };
                console.log(`  Created User ID: ${user.id}`);
            }

            // 2. Employee
            let emp = db.prepare('SELECT id, name FROM employees WHERE user_id = ?').get(user.id);
            if (!emp) {
                const info = insertEmp.run(
                    user.id, item.emp.name, item.emp.name, item.emp.designation,
                    item.emp.category, item.emp.pay_level, item.emp.grade_pay,
                    item.emp.headquarters, item.emp.basic_pay
                );
                emp = { id: info.lastInsertRowid, name: item.emp.name };
                console.log(`  Created Employee ID: ${emp.id}`);
            }

            // 3. Tour Diary
            let td = db.prepare('SELECT id FROM claims WHERE employee_id = ? AND is_diary = 1').get(emp.id);
            if (!td) {
                const tdNo = `TD-${yearSuffix}-${Math.floor(1000 + Math.random() * 9000)}`;
                const renderedClaimId = `CL-${yearSuffix}-${Math.floor(1000 + Math.random() * 9000)}`;
                const totalFare = item.diary.journeys.reduce((sum, j) => sum + (j.fare_amount || 0), 0);
                const info = insertClaim.run(
                    emp.id, 'TA_DA', renderedClaimId, tdNo, 1,
                    item.diary.month, item.diary.year, item.diary.start_date, item.diary.end_date,
                    item.diary.remarks, 'SUBMITTED', totalFare,
                    'None', 0, 0, 0, null, null, null, null, null, null
                );
                const tdId = info.lastInsertRowid;
                for (const j of item.diary.journeys) {
                    insertJourney.run(
                        tdId, j.departure_date, j.departure_time, j.departure_station,
                        j.arrival_date, j.arrival_time, j.arrival_station,
                        j.mode, j.class_of_travel, 'TIK-' + Math.floor(10000 + Math.random() * 90000),
                        j.fare_amount, j.distance_km, j.purpose
                    );
                }
                console.log(`  Created Tour Diary ID: ${tdId} (${tdNo})`);
            }

            // 4. TA/DA Claim
            let tada = db.prepare("SELECT id FROM claims WHERE employee_id = ? AND is_diary = 0 AND claim_type = 'TA_DA'").get(emp.id);
            if (!tada) {
                const renderedClaimId = `CL-${yearSuffix}-${Math.floor(1000 + Math.random() * 9000)}`;
                const info = insertClaim.run(
                    emp.id, 'TA_DA', renderedClaimId, null, 0,
                    item.tada.month, item.tada.year, item.tada.start_date, item.tada.end_date,
                    item.tada.remarks, 'SUBMITTED', item.tada.total_amount,
                    item.tada.hotel, item.tada.hotelAmt, 0, 0, null, null, null, null, null, null
                );
                const tadaId = info.lastInsertRowid;
                for (const j of item.tada.journeys) {
                    insertJourney.run(
                        tadaId, j.departure_date, j.departure_time, j.departure_station,
                        j.arrival_date, j.arrival_time, j.arrival_station,
                        j.mode, j.class_of_travel, 'TIK-' + Math.floor(10000 + Math.random() * 90000),
                        j.fare_amount, j.distance_km, j.purpose
                    );
                }
                console.log(`  Created TA/DA Claim ID: ${tadaId} (${renderedClaimId}) - ₹${item.tada.total_amount}`);
            }

            // 5. Transfer Claim
            let transfer = db.prepare("SELECT id FROM claims WHERE employee_id = ? AND claim_type = 'TRANSFER'").get(emp.id);
            if (!transfer) {
                const renderedClaimId = `CL-${yearSuffix}-${Math.floor(1000 + Math.random() * 9000)}`;
                const info = insertClaim.run(
                    emp.id, 'TRANSFER', renderedClaimId, null, 0,
                    item.transfer.month, item.transfer.year, item.transfer.start_date, item.transfer.end_date,
                    item.transfer.remarks, 'SUBMITTED', item.transfer.total_amount,
                    'None', 0, item.transfer.packing, item.transfer.transport,
                    item.transfer.family, '3000 kg', null, null, null, null
                );
                console.log(`  Created Transfer Claim ID: ${info.lastInsertRowid} (${renderedClaimId}) - ₹${item.transfer.total_amount}`);
            }

            // 6. Medical Claim
            let med = db.prepare("SELECT id FROM claims WHERE employee_id = ? AND claim_type = 'MEDICAL'").get(emp.id);
            if (!med) {
                const renderedClaimId = `CL-${yearSuffix}-${Math.floor(1000 + Math.random() * 9000)}`;
                const info = insertClaim.run(
                    emp.id, 'MEDICAL', renderedClaimId, null, 0,
                    'August', '2026', '2026-08-10', '2026-08-13',
                    item.medical.illness, 'SUBMITTED', item.medical.total_amount,
                    'None', 0, 0, 0, null, null,
                    item.medical.patient, item.medical.relation, item.medical.illness, item.medical.duration
                );
                const medId = info.lastInsertRowid;
                for (const bill of item.medical.bills) {
                    insertMedicalBill.run(
                        medId, 'MEDICINE', bill.desc, item.medical.illness,
                        'City Medical Center', bill.no, '2026-08-12', bill.amt
                    );
                }
                console.log(`  Created Medical Claim ID: ${medId} (${renderedClaimId}) - ₹${item.medical.total_amount}`);
            }
        }
    });

    seedTransaction();

    // Checkpoint WAL into claims.db binary directly!
    console.log('Checkpointing SQLite WAL into claims.db binary...');
    db.pragma('wal_checkpoint(TRUNCATE)');
    console.log('✓ WAL Checkpoint complete!');
}

seedLocalDb();
db.close();
console.log('Database seeded and closed successfully.');
