/**
 * scripts/populate_live_dummy_data.js
 * ==============================================================================
 * Populates realistic dummy data for ALL 10 test users in the live MPSCSC portal.
 *
 * For EVERY user:
 *   1. Ensures Employee Profile exists in Employee Master
 *   2. Creates Tour Diary with realistic journey legs
 *   3. Creates TA/DA Claim with journey legs, hotel, and calculated amounts
 *   4. Creates Transfer Claim with packing/transport allowances
 *   5. Creates Medical Claim with patient details and itemised medical bills
 *
 * Target: https://mpscsc-claims-portal.onrender.com
 * ==============================================================================
 */

const BASE_URL = process.env.LIVE_URL || 'https://mpscsc-claims-portal.onrender.com';

const testUsersData = [
    {
        user: { name: "Rajesh Sharma", email: "rajesh.bhopal@mpscsc.test", pass: "Password@123" },
        emp: { name: "Rajesh Sharma", designation: "District Manager", category: "A", headquarters: "Bhopal", pay_level: "Level 14", basic_pay: 85000, grade_pay: "7600" },
        diary: { month: "July", year: "2026", start_date: "2026-07-10", end_date: "2026-07-11", remarks: "State PDS Warehouse Inspection [DUMMY_DATA_RECORD]",
            journeys: [
                { departure_date: "2026-07-10", departure_time: "08:00", departure_station: "Bhopal", arrival_date: "2026-07-10", arrival_time: "12:30", arrival_station: "Indore", mode: "Bus", class_of_travel: "AC", fare_amount: 450, distance_km: 195, purpose: "State PDS Warehouse Inspection [DUMMY_DATA_RECORD]" }
            ]
        },
        tada: { month: "August", year: "2026", start_date: "2026-08-04", end_date: "2026-08-05", hotel: "Hotel", hotelAmt: 2800, remarks: "District food grain distribution audit [DUMMY_DATA_RECORD]",
            journeys: [
                { departure_date: "2026-08-04", departure_time: "07:00", departure_station: "Bhopal", arrival_date: "2026-08-04", arrival_time: "11:30", arrival_station: "Ujjain", mode: "Bus", class_of_travel: "AC", fare_amount: 420, distance_km: 185, purpose: "District food grain distribution audit [DUMMY_DATA_RECORD]" },
                { departure_date: "2026-08-05", departure_time: "14:00", departure_station: "Ujjain", arrival_date: "2026-08-05", arrival_time: "18:30", arrival_station: "Bhopal", mode: "Bus", class_of_travel: "AC", fare_amount: 420, distance_km: 185, purpose: "Return to Headquarters" }
            ]
        },
        transfer: { month: "January", year: "2026", start_date: "2026-01-15", end_date: "2026-01-16", packing: 5000, transport: 22000, family: "Spouse and 2 Dependents [DUMMY_DATA_RECORD]", remarks: "Administrative Transfer Order #MP-2026-01 [DUMMY_DATA_RECORD]" },
        medical: { patient: "Rajesh Sharma", relation: "Self", illness: "Viral Fever & Dehydration [DUMMY_DATA_RECORD]", duration: "3 days", bills: [{ desc: "Apollo Meds [DUMMY_DATA_RECORD]", amt: 1950, no: "AP-201" }] }
    },
    {
        user: { name: "Pooja Verma", email: "pooja.indore@mpscsc.test", pass: "Password@123" },
        emp: { name: "Pooja Verma", designation: "Assistant Accounts Officer", category: "B", headquarters: "Indore", pay_level: "Level 12", basic_pay: 68000, grade_pay: "6600" },
        diary: { month: "August", year: "2026", start_date: "2026-08-12", end_date: "2026-08-13", remarks: "Headquarters Financial Audit Review [DUMMY_DATA_RECORD]",
            journeys: [
                { departure_date: "2026-08-12", departure_time: "09:00", departure_station: "Indore", arrival_date: "2026-08-12", arrival_time: "14:00", arrival_station: "Bhopal", mode: "Rail", class_of_travel: "AC 2-Tier", fare_amount: 680, distance_km: 220, purpose: "Headquarters Financial Audit Review [DUMMY_DATA_RECORD]" }
            ]
        },
        tada: { month: "September", year: "2026", start_date: "2026-09-02", end_date: "2026-09-03", hotel: "None", hotelAmt: 0, remarks: "Sub-division account reconciliation [DUMMY_DATA_RECORD]",
            journeys: [
                { departure_date: "2026-09-02", departure_time: "08:30", departure_station: "Indore", arrival_date: "2026-09-02", arrival_time: "10:30", arrival_station: "Dewas", mode: "Bus", class_of_travel: "Ordinary", fare_amount: 80, distance_km: 45, purpose: "Sub-division account reconciliation [DUMMY_DATA_RECORD]" },
                { departure_date: "2026-09-03", departure_time: "16:00", departure_station: "Dewas", arrival_date: "2026-09-03", arrival_time: "18:00", arrival_station: "Indore", mode: "Bus", class_of_travel: "Ordinary", fare_amount: 80, distance_km: 45, purpose: "Return to HQ" }
            ]
        },
        transfer: { month: "February", year: "2026", start_date: "2026-02-10", end_date: "2026-02-11", packing: 4000, transport: 16000, family: "Self and Mother [DUMMY_DATA_RECORD]", remarks: "Zonal office rotation order [DUMMY_DATA_RECORD]" },
        medical: { patient: "Pooja Verma", relation: "Self", illness: "Eye Strain & Clinic Consultation [DUMMY_DATA_RECORD]", duration: "2 days", bills: [{ desc: "Dr. Agarwal Eye Care [DUMMY_DATA_RECORD]", amt: 1450, no: "EYE-88" }] }
    },
    {
        user: { name: "Amitabh Patel", email: "amitabh.jabalpur@mpscsc.test", pass: "Password@123" },
        emp: { name: "Amitabh Patel", designation: "Quality Inspector", category: "C", headquarters: "Jabalpur", pay_level: "Level 8", basic_pay: 48000, grade_pay: "4200" },
        diary: { month: "July", year: "2026", start_date: "2026-07-15", end_date: "2026-07-16", remarks: "Paddy procurement center sample testing [DUMMY_DATA_RECORD]",
            journeys: [
                { departure_date: "2026-07-15", departure_time: "06:30", departure_station: "Jabalpur", arrival_date: "2026-07-15", arrival_time: "09:30", arrival_station: "Katni", mode: "Rail", class_of_travel: "Sleeper", fare_amount: 140, distance_km: 90, purpose: "Paddy procurement center sample testing [DUMMY_DATA_RECORD]" }
            ]
        },
        tada: { month: "August", year: "2026", start_date: "2026-08-18", end_date: "2026-08-19", hotel: "None", hotelAmt: 0, remarks: "Field stock inspection [DUMMY_DATA_RECORD]",
            journeys: [
                { departure_date: "2026-08-18", departure_time: "07:00", departure_station: "Jabalpur", arrival_date: "2026-08-18", arrival_time: "12:00", arrival_station: "Mandla", mode: "Bus", class_of_travel: "Ordinary", fare_amount: 160, distance_km: 100, purpose: "Field stock inspection [DUMMY_DATA_RECORD]" },
                { departure_date: "2026-08-19", departure_time: "14:00", departure_station: "Mandla", arrival_date: "2026-08-19", arrival_time: "19:00", arrival_station: "Jabalpur", mode: "Bus", class_of_travel: "Ordinary", fare_amount: 160, distance_km: 100, purpose: "Return to HQ" }
            ]
        },
        transfer: { month: "January", year: "2026", start_date: "2026-01-20", end_date: "2026-01-21", packing: 3000, transport: 12000, family: "Spouse [DUMMY_DATA_RECORD]", remarks: "Transfer from Mandla to Jabalpur HQ [DUMMY_DATA_RECORD]" },
        medical: { patient: "Amitabh Patel", relation: "Self", illness: "Dental Root Canal [DUMMY_DATA_RECORD]", duration: "5 days", bills: [{ desc: "Dental Clinic [DUMMY_DATA_RECORD]", amt: 1920, no: "DEN-44" }] }
    },
    {
        user: { name: "Sunita Yadav", email: "sunita.gwalior@mpscsc.test", pass: "Password@123" },
        emp: { name: "Sunita Yadav", designation: "Store In-charge", category: "D", headquarters: "Gwalior", pay_level: "Level 6", basic_pay: 34000, grade_pay: "2800" },
        diary: { month: "August", year: "2026", start_date: "2026-08-08", end_date: "2026-08-09", remarks: "Depot stock verification [DUMMY_DATA_RECORD]",
            journeys: [
                { departure_date: "2026-08-08", departure_time: "08:00", departure_station: "Gwalior", arrival_date: "2026-08-08", arrival_time: "09:30", arrival_station: "Morena", mode: "Bus", class_of_travel: "Ordinary", fare_amount: 70, distance_km: 40, purpose: "Depot stock verification [DUMMY_DATA_RECORD]" }
            ]
        },
        tada: { month: "September", year: "2026", start_date: "2026-09-05", end_date: "2026-09-06", hotel: "None", hotelAmt: 0, remarks: "Silo storage inspection [DUMMY_DATA_RECORD]",
            journeys: [
                { departure_date: "2026-09-05", departure_time: "07:30", departure_station: "Gwalior", arrival_date: "2026-09-05", arrival_time: "10:00", arrival_station: "Bhind", mode: "Bus", class_of_travel: "Ordinary", fare_amount: 110, distance_km: 75, purpose: "Silo storage inspection [DUMMY_DATA_RECORD]" },
                { departure_date: "2026-09-06", departure_time: "15:00", departure_station: "Bhind", arrival_date: "2026-09-06", arrival_time: "17:30", arrival_station: "Gwalior", mode: "Bus", class_of_travel: "Ordinary", fare_amount: 110, distance_km: 75, purpose: "Return to HQ" }
            ]
        },
        transfer: { month: "March", year: "2026", start_date: "2026-03-01", end_date: "2026-03-02", packing: 2500, transport: 9500, family: "Self [DUMMY_DATA_RECORD]", remarks: "Transfer from Shivpuri to Gwalior Depot [DUMMY_DATA_RECORD]" },
        medical: { patient: "Sunita Yadav", relation: "Self", illness: "Hypertension & Checkup [DUMMY_DATA_RECORD]", duration: "3 days", bills: [{ desc: "City Hospital OPD [DUMMY_DATA_RECORD]", amt: 1350, no: "OPD-302" }] }
    },
    {
        user: { name: "Dinesh Malviya", email: "dinesh.ujjain@mpscsc.test", pass: "Password@123" },
        emp: { name: "Dinesh Malviya", designation: "Field Supervisor", category: "C", headquarters: "Ujjain", pay_level: "Level 7", basic_pay: 44000, grade_pay: "3600" },
        diary: { month: "July", year: "2026", start_date: "2026-07-22", end_date: "2026-07-23", remarks: "Fair Price Shop monitoring [DUMMY_DATA_RECORD]",
            journeys: [
                { departure_date: "2026-07-22", departure_time: "08:30", departure_station: "Ujjain", arrival_date: "2026-07-22", arrival_time: "10:00", arrival_station: "Nagda", mode: "Bus", class_of_travel: "Ordinary", fare_amount: 85, distance_km: 55, purpose: "Fair Price Shop monitoring [DUMMY_DATA_RECORD]" }
            ]
        },
        tada: { month: "August", year: "2026", start_date: "2026-08-14", end_date: "2026-08-15", hotel: "None", hotelAmt: 0, remarks: "Ration distribution inspection [DUMMY_DATA_RECORD]",
            journeys: [
                { departure_date: "2026-08-14", departure_time: "09:00", departure_station: "Ujjain", arrival_date: "2026-08-14", arrival_time: "11:00", arrival_station: "Shajapur", mode: "Bus", class_of_travel: "Ordinary", fare_amount: 120, distance_km: 65, purpose: "Ration distribution inspection [DUMMY_DATA_RECORD]" },
                { departure_date: "2026-08-15", departure_time: "15:00", departure_station: "Shajapur", arrival_date: "2026-08-15", arrival_time: "17:00", arrival_station: "Ujjain", mode: "Bus", class_of_travel: "Ordinary", fare_amount: 120, distance_km: 65, purpose: "Return to HQ" }
            ]
        },
        transfer: { month: "February", year: "2026", start_date: "2026-02-14", end_date: "2026-02-15", packing: 3000, transport: 11000, family: "Spouse & Child [DUMMY_DATA_RECORD]", remarks: "Transfer order from Agar to Ujjain [DUMMY_DATA_RECORD]" },
        medical: { patient: "Dinesh Malviya", relation: "Self", illness: "Ankle Sprain [DUMMY_DATA_RECORD]", duration: "4 days", bills: [{ desc: "Orthopedic Clinic [DUMMY_DATA_RECORD]", amt: 1140, no: "ORTH-12" }] }
    },
    {
        user: { name: "Kavita Soni", email: "kavita.sagar@mpscsc.test", pass: "Password@123" },
        emp: { name: "Kavita Soni", designation: "Assistant Manager (Wheat)", category: "B", headquarters: "Sagar", pay_level: "Level 11", basic_pay: 65000, grade_pay: "5400" },
        diary: { month: "August", year: "2026", start_date: "2026-08-20", end_date: "2026-08-21", remarks: "Wheat Procurement Center inspection [DUMMY_DATA_RECORD]",
            journeys: [
                { departure_date: "2026-08-20", departure_time: "07:30", departure_station: "Sagar", arrival_date: "2026-08-20", arrival_time: "10:00", arrival_station: "Damoh", mode: "Bus", class_of_travel: "Express", fare_amount: 130, distance_km: 80, purpose: "Wheat Procurement Center inspection [DUMMY_DATA_RECORD]" }
            ]
        },
        tada: { month: "September", year: "2026", start_date: "2026-09-10", end_date: "2026-09-11", hotel: "None", hotelAmt: 0, remarks: "Mandi procurement center visit [DUMMY_DATA_RECORD]",
            journeys: [
                { departure_date: "2026-09-10", departure_time: "08:00", departure_station: "Sagar", arrival_date: "2026-09-10", arrival_time: "10:30", arrival_station: "Bina", mode: "Rail", class_of_travel: "AC Chair", fare_amount: 195, distance_km: 75, purpose: "Mandi procurement center visit [DUMMY_DATA_RECORD]" },
                { departure_date: "2026-09-11", departure_time: "16:00", departure_station: "Bina", arrival_date: "2026-09-11", arrival_time: "18:30", arrival_station: "Sagar", mode: "Rail", class_of_travel: "AC Chair", fare_amount: 195, distance_km: 75, purpose: "Return to Headquarters" }
            ]
        },
        transfer: { month: "January", year: "2026", start_date: "2026-01-25", end_date: "2026-01-26", packing: 3500, transport: 13500, family: "Spouse and Daughter [DUMMY_DATA_RECORD]", remarks: "Transfer from Chhatarpur to Sagar HQ [DUMMY_DATA_RECORD]" },
        medical: { patient: "Kavita Soni", relation: "Self", illness: "Migraine Treatment [DUMMY_DATA_RECORD]", duration: "3 days", bills: [{ desc: "District Hospital OPD [DUMMY_DATA_RECORD]", amt: 850, no: "DH-101" }] }
    },
    {
        user: { name: "Manoj Tiwari", email: "manoj.rewa@mpscsc.test", pass: "Password@123" },
        emp: { name: "Manoj Tiwari", designation: "Procurement Officer", category: "B", headquarters: "Rewa", pay_level: "Level 10", basic_pay: 56000, grade_pay: "4800" },
        diary: { month: "July", year: "2026", start_date: "2026-07-28", end_date: "2026-07-29", remarks: "Buffer storage verification [DUMMY_DATA_RECORD]",
            journeys: [
                { departure_date: "2026-07-28", departure_time: "08:00", departure_station: "Rewa", arrival_date: "2026-07-28", arrival_time: "10:30", arrival_station: "Sidhi", mode: "Bus", class_of_travel: "Ordinary", fare_amount: 120, distance_km: 85, purpose: "Buffer storage verification [DUMMY_DATA_RECORD]" }
            ]
        },
        tada: { month: "August", year: "2026", start_date: "2026-08-25", end_date: "2026-08-26", hotel: "None", hotelAmt: 0, remarks: "Civil supplies godown audit [DUMMY_DATA_RECORD]",
            journeys: [
                { departure_date: "2026-08-25", departure_time: "07:30", departure_station: "Rewa", arrival_date: "2026-08-25", arrival_time: "11:30", arrival_station: "Satna", mode: "Bus", class_of_travel: "Ordinary", fare_amount: 100, distance_km: 55, purpose: "Civil supplies godown audit [DUMMY_DATA_RECORD]" },
                { departure_date: "2026-08-26", departure_time: "15:30", departure_station: "Satna", arrival_date: "2026-08-26", arrival_time: "19:30", arrival_station: "Rewa", mode: "Bus", class_of_travel: "Ordinary", fare_amount: 100, distance_km: 55, purpose: "Return to HQ" }
            ]
        },
        transfer: { month: "February", year: "2026", start_date: "2026-02-20", end_date: "2026-02-21", packing: 3000, transport: 11500, family: "Spouse & 2 Sons [DUMMY_DATA_RECORD]", remarks: "Transfer from Singrauli to Rewa HQ [DUMMY_DATA_RECORD]" },
        medical: { patient: "Manoj Tiwari", relation: "Self", illness: "Gastric Ulcer Treatment [DUMMY_DATA_RECORD]", duration: "4 days", bills: [{ desc: "Shree Ram Clinic [DUMMY_DATA_RECORD]", amt: 1280, no: "SRC-78" }] }
    },
    {
        user: { name: "Deepak Chouhan", email: "deepak.satna@mpscsc.test", pass: "Password@123" },
        emp: { name: "Deepak Chouhan", designation: "Quality Analyst", category: "C", headquarters: "Satna", pay_level: "Level 8", basic_pay: 49000, grade_pay: "4200" },
        diary: { month: "August", year: "2026", start_date: "2026-08-24", end_date: "2026-08-25", remarks: "Grain quality grading inspection [DUMMY_DATA_RECORD]",
            journeys: [
                { departure_date: "2026-08-24", departure_time: "08:30", departure_station: "Satna", arrival_date: "2026-08-24", arrival_time: "10:30", arrival_station: "Maihar", mode: "Rail", class_of_travel: "Sleeper", fare_amount: 80, distance_km: 40, purpose: "Grain quality grading inspection [DUMMY_DATA_RECORD]" }
            ]
        },
        tada: { month: "September", year: "2026", start_date: "2026-09-12", end_date: "2026-09-13", hotel: "None", hotelAmt: 0, remarks: "Seed & fertilizer depot inspection [DUMMY_DATA_RECORD]",
            journeys: [
                { departure_date: "2026-09-12", departure_time: "08:00", departure_station: "Satna", arrival_date: "2026-09-12", arrival_time: "11:00", arrival_station: "Panna", mode: "Bus", class_of_travel: "Ordinary", fare_amount: 110, distance_km: 70, purpose: "Seed & fertilizer depot inspection [DUMMY_DATA_RECORD]" },
                { departure_date: "2026-09-13", departure_time: "14:00", departure_station: "Panna", arrival_date: "2026-09-13", arrival_time: "17:00", arrival_station: "Satna", mode: "Bus", class_of_travel: "Ordinary", fare_amount: 110, distance_km: 70, purpose: "Return to Headquarters" }
            ]
        },
        transfer: { month: "January", year: "2026", start_date: "2026-01-28", end_date: "2026-01-29", packing: 2500, transport: 9000, family: "Self & Spouse [DUMMY_DATA_RECORD]", remarks: "Transfer order from Nagod to Satna [DUMMY_DATA_RECORD]" },
        medical: { patient: "Deepak Chouhan", relation: "Self", illness: "Back Sprain Consultation [DUMMY_DATA_RECORD]", duration: "3 days", bills: [{ desc: "Civil Hospital Satna [DUMMY_DATA_RECORD]", amt: 720, no: "CH-50" }] }
    },
    {
        user: { name: "Ritu Raghuwanshi", email: "ritu.betul@mpscsc.test", pass: "Password@123" },
        emp: { name: "Ritu Raghuwanshi", designation: "Accounts Officer", category: "B", headquarters: "Betul", pay_level: "Level 11", basic_pay: 62000, grade_pay: "5400" },
        diary: { month: "August", year: "2026", start_date: "2026-08-16", end_date: "2026-08-17", remarks: "Sub-division account audit [DUMMY_DATA_RECORD]",
            journeys: [
                { departure_date: "2026-08-16", departure_time: "08:00", departure_station: "Betul", arrival_date: "2026-08-16", arrival_time: "10:30", arrival_station: "Multai", mode: "Bus", class_of_travel: "Ordinary", fare_amount: 90, distance_km: 50, purpose: "Sub-division account audit [DUMMY_DATA_RECORD]" }
            ]
        },
        tada: { month: "September", year: "2026", start_date: "2026-09-08", end_date: "2026-09-09", hotel: "None", hotelAmt: 0, remarks: "Field store audit & inspection [DUMMY_DATA_RECORD]",
            journeys: [
                { departure_date: "2026-09-08", departure_time: "07:30", departure_station: "Betul", arrival_date: "2026-09-08", arrival_time: "10:00", arrival_station: "Amla", mode: "Rail", class_of_travel: "Sleeper", fare_amount: 80, distance_km: 35, purpose: "Field store audit & inspection [DUMMY_DATA_RECORD]" },
                { departure_date: "2026-09-09", departure_time: "15:00", departure_station: "Amla", arrival_date: "2026-09-09", arrival_time: "17:30", arrival_station: "Betul", mode: "Rail", class_of_travel: "Sleeper", fare_amount: 80, distance_km: 35, purpose: "Return to HQ" }
            ]
        },
        transfer: { month: "March", year: "2026", start_date: "2026-03-05", end_date: "2026-03-06", packing: 3500, transport: 14000, family: "Spouse & Child [DUMMY_DATA_RECORD]", remarks: "Transfer order from Hoshangabad to Betul HQ [DUMMY_DATA_RECORD]" },
        medical: { patient: "Ritu Raghuwanshi", relation: "Self", illness: "Allergy & Skin Treatment [DUMMY_DATA_RECORD]", duration: "3 days", bills: [{ desc: "Skin Care Clinic [DUMMY_DATA_RECORD]", amt: 1480, no: "SK-901" }] }
    },
    {
        user: { name: "Sandeep Mishra", email: "sandeep.chhindwara@mpscsc.test", pass: "Password@123" },
        emp: { name: "Sandeep Mishra", designation: "Assistant Grade-II", category: "D", headquarters: "Chhindwara", pay_level: "Level 5", basic_pay: 30000, grade_pay: "2400" },
        diary: { month: "July", year: "2026", start_date: "2026-07-18", end_date: "2026-07-19", remarks: "Mandi procurement assistance [DUMMY_DATA_RECORD]",
            journeys: [
                { departure_date: "2026-07-18", departure_time: "08:00", departure_station: "Chhindwara", arrival_date: "2026-07-18", arrival_time: "10:30", arrival_station: "Parasia", mode: "Bus", class_of_travel: "Ordinary", fare_amount: 70, distance_km: 30, purpose: "Mandi procurement assistance [DUMMY_DATA_RECORD]" }
            ]
        },
        tada: { month: "August", year: "2026", start_date: "2026-08-22", end_date: "2026-08-23", hotel: "None", hotelAmt: 0, remarks: "Godown maintenance audit [DUMMY_DATA_RECORD]",
            journeys: [
                { departure_date: "2026-08-22", departure_time: "07:30", departure_station: "Chhindwara", arrival_date: "2026-08-22", arrival_time: "10:30", arrival_station: "Sausar", mode: "Bus", class_of_travel: "Ordinary", fare_amount: 90, distance_km: 55, purpose: "Godown maintenance audit [DUMMY_DATA_RECORD]" },
                { departure_date: "2026-08-23", departure_time: "15:00", departure_station: "Sausar", arrival_date: "2026-08-23", arrival_time: "18:00", arrival_station: "Chhindwara", mode: "Bus", class_of_travel: "Ordinary", fare_amount: 90, distance_km: 55, purpose: "Return to HQ" }
            ]
        },
        transfer: { month: "February", year: "2026", start_date: "2026-02-18", end_date: "2026-02-19", packing: 2200, transport: 8000, family: "Self [DUMMY_DATA_RECORD]", remarks: "Transfer order from Junnardeo to Chhindwara [DUMMY_DATA_RECORD]" },
        medical: { patient: "Sandeep Mishra", relation: "Self", illness: "Seasonal Flu & Fever [DUMMY_DATA_RECORD]", duration: "3 days", bills: [{ desc: "Community Health Center [DUMMY_DATA_RECORD]", amt: 630, no: "CHC-12" }] }
    }
];

async function run() {
    console.log(`Starting data population for ${testUsersData.length} users on ${BASE_URL}...`);

    for (let i = 0; i < testUsersData.length; i++) {
        const item = testUsersData[i];
        console.log(`\n[${i + 1}/${testUsersData.length}] Processing User: ${item.user.name} (${item.user.email})`);

        // 1. Login
        const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: item.user.email, password: item.user.pass })
        });
        const loginData = await loginRes.json();
        if (!loginData.token) {
            console.error(`  ❌ Failed to log in as ${item.user.email}:`, loginData.error);
            continue;
        }
        const token = loginData.token;
        const authHeaders = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };

        // 2. Check / Create Employee
        const empListRes = await fetch(`${BASE_URL}/api/employees`, { headers: authHeaders });
        let employees = await empListRes.json();
        let empId = employees.find(e => e.name === item.emp.name)?.id;

        if (!empId) {
            console.log(`  Creating Employee Master record for ${item.emp.name}...`);
            const createEmpRes = await fetch(`${BASE_URL}/api/employees`, {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify({
                    name: item.emp.name,
                    name_hi: item.emp.name,
                    designation: item.emp.designation,
                    category: item.emp.category,
                    pay_level: item.emp.pay_level,
                    grade_pay: item.emp.grade_pay,
                    headquarters: item.emp.headquarters,
                    basic_pay: item.emp.basic_pay
                })
            });
            const empData = await createEmpRes.json();
            empId = empData.id;
            console.log(`  ✓ Employee created with ID: ${empId}`);
        } else {
            console.log(`  ✓ Existing Employee found with ID: ${empId}`);
        }

        // 3. Check existing claims
        const claimsListRes = await fetch(`${BASE_URL}/api/claims`, { headers: authHeaders });
        const existingClaims = await claimsListRes.json();

        // 4. Tour Diary
        const existingTD = existingClaims.find(c => c.is_diary && c.month === item.diary.month);
        if (!existingTD) {
            console.log(`  Creating Tour Diary for ${item.diary.month} ${item.diary.year}...`);
            const tdRes = await fetch(`${BASE_URL}/api/claims`, {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify({
                    employee_id: empId,
                    claim_type: 'TA_DA',
                    is_diary: true,
                    month: item.diary.month,
                    year: item.diary.year,
                    start_date: item.diary.start_date,
                    end_date: item.diary.end_date,
                    remarks: item.diary.remarks
                })
            });
            const td = await tdRes.json();
            if (td.id) {
                await fetch(`${BASE_URL}/api/journey-details-bulk`, {
                    method: 'POST',
                    headers: authHeaders,
                    body: JSON.stringify({
                        claim_id: td.id,
                        journeys: item.diary.journeys,
                        status: 'SUBMITTED'
                    })
                });
                console.log(`  ✓ Tour Diary created with ID: ${td.id} (${td.td_no})`);
            }
        } else {
            console.log(`  ✓ Tour Diary already exists: ${existingTD.td_no || existingTD.id}`);
        }

        // 5. TA/DA Claim
        const existingTADA = existingClaims.find(c => !c.is_diary && c.claim_type === 'TA_DA');
        if (!existingTADA) {
            console.log(`  Creating TA/DA Claim for ${item.tada.month} ${item.tada.year}...`);
            const tadaRes = await fetch(`${BASE_URL}/api/claims`, {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify({
                    employee_id: empId,
                    claim_type: 'TA_DA',
                    is_diary: false,
                    month: item.tada.month,
                    year: item.tada.year,
                    start_date: item.tada.start_date,
                    end_date: item.tada.end_date,
                    remarks: item.tada.remarks
                })
            });
            const tada = await tadaRes.json();
            if (tada.id) {
                await fetch(`${BASE_URL}/api/journey-details-bulk`, {
                    method: 'POST',
                    headers: authHeaders,
                    body: JSON.stringify({
                        claim_id: tada.id,
                        journeys: item.tada.journeys,
                        hotel_stay_type: item.tada.hotel,
                        hotel_amount: item.tada.hotelAmt,
                        status: 'SUBMITTED'
                    })
                });
                console.log(`  ✓ TA/DA Claim created with ID: ${tada.id} (${tada.rendered_claim_id})`);
            }
        } else {
            console.log(`  ✓ TA/DA Claim already exists: ${existingTADA.rendered_claim_id || existingTADA.id}`);
        }

        // 6. Transfer Claim
        const existingTransfer = existingClaims.find(c => c.claim_type === 'TRANSFER');
        if (!existingTransfer) {
            console.log(`  Creating Transfer Claim for ${item.transfer.month} ${item.transfer.year}...`);
            const transferTotal = item.transfer.packing + item.transfer.transport;
            const transRes = await fetch(`${BASE_URL}/api/claims`, {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify({
                    employee_id: empId,
                    claim_type: 'TRANSFER',
                    is_diary: false,
                    month: item.transfer.month,
                    year: item.transfer.year,
                    start_date: item.transfer.start_date,
                    end_date: item.transfer.end_date,
                    remarks: item.transfer.remarks
                })
            });
            const trans = await transRes.json();
            if (trans.id) {
                await fetch(`${BASE_URL}/api/claims/${trans.id}`, {
                    method: 'PUT',
                    headers: authHeaders,
                    body: JSON.stringify({
                        claim_type: 'TRANSFER',
                        packing_charges: item.transfer.packing,
                        goods_transport_charges: item.transfer.transport,
                        family_details: item.transfer.family,
                        baggage_weight: "3000 kg",
                        status: 'SUBMITTED',
                        total_amount: transferTotal,
                        remarks: item.transfer.remarks
                    })
                });
                console.log(`  ✓ Transfer Claim created with ID: ${trans.id} (${trans.rendered_claim_id}) for ₹${transferTotal}`);
            }
        } else {
            console.log(`  ✓ Transfer Claim already exists: ${existingTransfer.rendered_claim_id || existingTransfer.id}`);
        }

        // 7. Medical Claim
        const existingMed = existingClaims.find(c => c.claim_type === 'MEDICAL');
        if (!existingMed) {
            console.log(`  Creating Medical Claim for ${item.medical.patient}...`);
            const medRes = await fetch(`${BASE_URL}/api/medical-claims`, {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify({
                    employee_id: empId,
                    patient_name: item.medical.patient,
                    relationship: item.medical.relation,
                    illness_name: item.medical.illness,
                    illness_duration: item.medical.duration,
                    bills: item.medical.bills.map(b => ({
                        bill_category: 'MEDICINE',
                        description: b.desc,
                        receipt_no: b.no,
                        amount: b.amt,
                        receipt_date: '2026-08-20'
                    })),
                    status: 'SUBMITTED',
                    month: 'August',
                    year: '2026'
                })
            });
            const med = await medRes.json();
            console.log(`  ✓ Medical Claim created with ID: ${med.id || 'OK'}`);
        } else {
            console.log(`  ✓ Medical Claim already exists: ${existingMed.rendered_claim_id || existingMed.id}`);
        }
    }

    console.log(`\n🎉 Data population completed successfully for all users!`);
}

run().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
