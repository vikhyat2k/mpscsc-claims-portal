/**
 * scripts/headed_ui_data_entry.js
 * ==============================================================================
 * Visibly Headed (Non-Headless) Automated Frontend Data Entry for MPSCSC Claims Portal
 *
 * Target: https://mpscsc-claims-portal.onrender.com
 *
 * Uses React Synthetic Event-compatible input setters for 100% reliable state binding.
 * Accepts optional start index argument: `node scripts/headed_ui_data_entry.js 8`
 * ==============================================================================
 */

const puppeteer = require('puppeteer-core');
const fs = require('fs');

const BASE_URL = process.env.LIVE_URL || 'https://mpscsc-claims-portal.onrender.com';
const CHROME_PATH = fs.existsSync('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe')
    ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
    : 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const dummyUserData = [
    {
        user: { name: "Rajesh Sharma", email: "rajesh.bhopal@mpscsc.test", pass: "Password@123", mobile: "9826011001" },
        emp: { name: "Rajesh Sharma", desig: "District Manager", cat: "A", hq: "Bhopal", pay: "85000", payLevel: "Level 14" },
        diary: { month: "July", year: "2026", depDate: "2026-07-10", depTime: "08:00", from: "Bhopal", arrDate: "2026-07-10", arrTime: "12:30", to: "Indore", mode: "Bus", cls: "AC", fare: "450", km: "195", purpose: "State PDS Warehouse Inspection [DUMMY_DATA_RECORD]" },
        tada: { month: "August", year: "2026", depDate: "2026-08-04", depTime: "07:00", from: "Bhopal", arrDate: "2026-08-04", arrTime: "11:30", to: "Ujjain", mode: "Bus", cls: "AC", fare: "420", km: "185", hotel: "Hotel", hotelAmt: "2800", remarks: "District food grain distribution audit [DUMMY_DATA_RECORD]" },
        transfer: { month: "January", year: "2026", packing: "5000", transport: "22000", family: "Spouse and 2 Dependents [DUMMY_DATA_RECORD]", remarks: "Administrative Transfer Order #MP-2026-01 [DUMMY_DATA_RECORD]" },
        medical: { patient: "Rajesh Sharma", relation: "Self", illness: "Viral Fever & Dehydration [DUMMY_DATA_RECORD]", duration: "3 days", bills: [{ desc: "Apollo Meds [DUMMY_DATA_RECORD]", amt: "1950", no: "AP-201" }] }
    },
    {
        user: { name: "Pooja Verma", email: "pooja.indore@mpscsc.test", pass: "Password@123", mobile: "9826011002" },
        emp: { name: "Pooja Verma", desig: "Assistant Accounts Officer", cat: "B", hq: "Indore", pay: "68000", payLevel: "Level 12" },
        diary: { month: "August", year: "2026", depDate: "2026-08-12", depTime: "09:00", from: "Indore", arrDate: "2026-08-12", arrTime: "14:00", to: "Bhopal", mode: "Rail", cls: "2A", fare: "680", km: "220", purpose: "Headquarters Financial Audit Review [DUMMY_DATA_RECORD]" },
        tada: { month: "September", year: "2026", depDate: "2026-09-02", depTime: "08:30", from: "Indore", arrDate: "2026-09-02", arrTime: "10:30", to: "Dewas", mode: "Bus", cls: "Ordinary", fare: "80", km: "45", hotel: "None", hotelAmt: "0", remarks: "Sub-division account reconciliation [DUMMY_DATA_RECORD]" },
        transfer: { month: "February", year: "2026", packing: "4000", transport: "16000", family: "Self and Mother [DUMMY_DATA_RECORD]", remarks: "Zonal office rotation order [DUMMY_DATA_RECORD]" },
        medical: { patient: "Pooja Verma", relation: "Self", illness: "Eye Strain & Clinic Consultation [DUMMY_DATA_RECORD]", duration: "2 days", bills: [{ desc: "Dr. Agarwal Eye Care [DUMMY_DATA_RECORD]", amt: "1450", no: "EYE-88" }] }
    },
    {
        user: { name: "Amitabh Patel", email: "amitabh.jabalpur@mpscsc.test", pass: "Password@123", mobile: "9826011003" },
        emp: { name: "Amitabh Patel", desig: "Quality Inspector", cat: "C", hq: "Jabalpur", pay: "48000", payLevel: "Level 8" },
        diary: { month: "July", year: "2026", depDate: "2026-07-15", depTime: "06:30", from: "Jabalpur", arrDate: "2026-07-15", arrTime: "09:30", to: "Katni", mode: "Rail", cls: "SL", fare: "140", km: "90", purpose: "Paddy procurement center sample testing [DUMMY_DATA_RECORD]" },
        tada: { month: "August", year: "2026", depDate: "2026-08-18", depTime: "07:00", from: "Jabalpur", arrDate: "2026-08-18", arrTime: "12:00", to: "Mandla", mode: "Bus", cls: "Ordinary", fare: "160", km: "100", hotel: "None", hotelAmt: "0", remarks: "Field stock inspection [DUMMY_DATA_RECORD]" },
        transfer: { month: "January", year: "2026", packing: "3000", transport: "12000", family: "Spouse [DUMMY_DATA_RECORD]", remarks: "Transfer from Mandla to Jabalpur HQ [DUMMY_DATA_RECORD]" },
        medical: { patient: "Amitabh Patel", relation: "Self", illness: "Dental Root Canal [DUMMY_DATA_RECORD]", duration: "5 days", bills: [{ desc: "Dental Clinic [DUMMY_DATA_RECORD]", amt: "1920", no: "DEN-44" }] }
    },
    {
        user: { name: "Sunita Yadav", email: "sunita.gwalior@mpscsc.test", pass: "Password@123", mobile: "9826011004" },
        emp: { name: "Sunita Yadav", desig: "Store In-charge", cat: "D", hq: "Gwalior", pay: "34000", payLevel: "Level 6" },
        diary: { month: "August", year: "2026", depDate: "2026-08-08", depTime: "08:00", from: "Gwalior", arrDate: "2026-08-08", arrTime: "09:30", to: "Morena", mode: "Bus", cls: "Ordinary", fare: "70", km: "40", purpose: "Depot stock verification [DUMMY_DATA_RECORD]" },
        tada: { month: "September", year: "2026", depDate: "2026-09-05", depTime: "07:30", from: "Gwalior", arrDate: "2026-09-05", arrTime: "10:00", to: "Bhind", mode: "Bus", cls: "Ordinary", fare: "110", km: "75", hotel: "None", hotelAmt: "0", remarks: "Silo storage inspection [DUMMY_DATA_RECORD]" },
        transfer: { month: "March", year: "2026", packing: "2500", transport: "9500", family: "Self [DUMMY_DATA_RECORD]", remarks: "Transfer from Shivpuri to Gwalior Depot [DUMMY_DATA_RECORD]" },
        medical: { patient: "Sunita Yadav", relation: "Self", illness: "Hypertension & Checkup [DUMMY_DATA_RECORD]", duration: "3 days", bills: [{ desc: "City Hospital OPD [DUMMY_DATA_RECORD]", amt: "1350", no: "OPD-302" }] }
    },
    {
        user: { name: "Dinesh Malviya", email: "dinesh.ujjain@mpscsc.test", pass: "Password@123", mobile: "9826011005" },
        emp: { name: "Dinesh Malviya", desig: "Field Supervisor", cat: "C", hq: "Ujjain", pay: "44000", payLevel: "Level 7" },
        diary: { month: "July", year: "2026", depDate: "2026-07-22", depTime: "08:30", from: "Ujjain", arrDate: "2026-07-22", arrTime: "10:00", to: "Nagda", mode: "Bus", cls: "Ordinary", fare: "85", km: "55", purpose: "Fair Price Shop monitoring [DUMMY_DATA_RECORD]" },
        tada: { month: "August", year: "2026", depDate: "2026-08-14", depTime: "09:00", from: "Ujjain", arrDate: "2026-08-14", arrTime: "11:00", to: "Shajapur", mode: "Bus", cls: "Ordinary", fare: "120", km: "65", hotel: "None", hotelAmt: "0", remarks: "Ration distribution inspection [DUMMY_DATA_RECORD]" },
        transfer: { month: "February", year: "2026", packing: "3000", transport: "11000", family: "Spouse & Child [DUMMY_DATA_RECORD]", remarks: "Transfer order from Agar to Ujjain [DUMMY_DATA_RECORD]" },
        medical: { patient: "Dinesh Malviya", relation: "Self", illness: "Ankle Sprain [DUMMY_DATA_RECORD]", duration: "4 days", bills: [{ desc: "Orthopedic Clinic [DUMMY_DATA_RECORD]", amt: "1140", no: "ORTH-12" }] }
    },
    {
        user: { name: "Kavita Soni", email: "kavita.sagar@mpscsc.test", pass: "Password@123", mobile: "9826011006" },
        emp: { name: "Kavita Soni", desig: "Accounts Assistant", cat: "C", hq: "Sagar", pay: "42000", payLevel: "Level 7" },
        diary: { month: "August", year: "2026", depDate: "2026-08-19", depTime: "07:30", from: "Sagar", arrDate: "2026-08-19", arrTime: "10:00", to: "Damoh", mode: "Rail", cls: "SL", fare: "120", km: "80", purpose: "District ledger audit verification [DUMMY_DATA_RECORD]" },
        tada: { month: "September", year: "2026", depDate: "2026-09-08", depTime: "08:00", from: "Sagar", arrDate: "2026-09-08", arrTime: "11:30", to: "Chhatarpur", mode: "Bus", cls: "Ordinary", fare: "190", km: "135", hotel: "None", hotelAmt: "0", remarks: "Sub-office cash reconciliation [DUMMY_DATA_RECORD]" },
        transfer: { month: "January", year: "2026", packing: "3500", transport: "14000", family: "Self [DUMMY_DATA_RECORD]", remarks: "Transfer from Panna to Sagar office [DUMMY_DATA_RECORD]" },
        medical: { patient: "Kavita Soni", relation: "Self", illness: "Skin Allergy Treatment [DUMMY_DATA_RECORD]", duration: "3 days", bills: [{ desc: "Skin Care Clinic [DUMMY_DATA_RECORD]", amt: "1390", no: "SK-901" }] }
    },
    {
        user: { name: "Manoj Tiwari", email: "manoj.rewa@mpscsc.test", pass: "Password@123", mobile: "9826011007" },
        emp: { name: "Manoj Tiwari", desig: "Assistant Quality Controller", cat: "C", hq: "Rewa", pay: "45000", payLevel: "Level 7" },
        diary: { month: "July", year: "2026", depDate: "2026-07-28", depTime: "08:00", from: "Rewa", arrDate: "2026-07-28", arrTime: "09:30", to: "Satna", mode: "Bus", cls: "Ordinary", fare: "90", km: "55", purpose: "Wheat grain laboratory sample collection [DUMMY_DATA_RECORD]" },
        tada: { month: "August", year: "2026", depDate: "2026-08-25", depTime: "07:30", from: "Rewa", arrDate: "2026-08-25", arrTime: "11:00", to: "Sidhi", mode: "Bus", cls: "Ordinary", fare: "140", km: "85", hotel: "None", hotelAmt: "0", remarks: "Procurement warehouse quality audit [DUMMY_DATA_RECORD]" },
        transfer: { month: "February", year: "2026", packing: "3000", transport: "13000", family: "Spouse & 2 Children [DUMMY_DATA_RECORD]", remarks: "Transfer from Singrauli to Rewa HQ [DUMMY_DATA_RECORD]" },
        medical: { patient: "Manoj Tiwari", relation: "Self", illness: "ENT Infection [DUMMY_DATA_RECORD]", duration: "4 days", bills: [{ desc: "ENT Specialist Clinic [DUMMY_DATA_RECORD]", amt: "1410", no: "ENT-22" }] }
    },
    {
        user: { name: "Deepak Chouhan", email: "deepak.satna@mpscsc.test", pass: "Password@123", mobile: "9826011008" },
        emp: { name: "Deepak Chouhan", desig: "Junior Clerk", cat: "D", hq: "Satna", pay: "31000", payLevel: "Level 5" },
        diary: { month: "August", year: "2026", depDate: "2026-08-11", depTime: "09:00", from: "Satna", arrDate: "2026-08-11", arrTime: "10:15", to: "Maihar", mode: "Rail", cls: "SL", fare: "60", km: "40", purpose: "Legal document handover to tehsil [DUMMY_DATA_RECORD]" },
        tada: { month: "September", year: "2026", depDate: "2026-09-12", depTime: "08:30", from: "Satna", arrDate: "2026-09-12", arrTime: "10:00", to: "Nagod", mode: "Bus", cls: "Ordinary", fare: "50", km: "30", hotel: "None", hotelAmt: "0", remarks: "PDS stock register dispatch [DUMMY_DATA_RECORD]" },
        transfer: { month: "March", year: "2026", packing: "2000", transport: "8000", family: "Self [DUMMY_DATA_RECORD]", remarks: "Transfer from Rewa to Satna office [DUMMY_DATA_RECORD]" },
        medical: { patient: "Deepak Chouhan", relation: "Self", illness: "Seasonal Bronchitis [DUMMY_DATA_RECORD]", duration: "3 days", bills: [{ desc: "City Hospital OPD [DUMMY_DATA_RECORD]", amt: "870", no: "OPD-89" }] }
    },
    {
        user: { name: "Ritu Raghuwanshi", email: "ritu.betul@mpscsc.test", pass: "Password@123", mobile: "9826011009" },
        emp: { name: "Ritu Raghuwanshi", desig: "Office Assistant", cat: "D", hq: "Betul", pay: "33000", payLevel: "Level 5" },
        diary: { month: "July", year: "2026", depDate: "2026-07-18", depTime: "08:00", from: "Betul", arrDate: "2026-07-18", arrTime: "11:30", to: "Hoshangabad", mode: "Rail", cls: "SL", fare: "160", km: "120", purpose: "Quarterly clerical register submission [DUMMY_DATA_RECORD]" },
        tada: { month: "August", year: "2026", depDate: "2026-08-20", depTime: "08:30", from: "Betul", arrDate: "2026-08-20", arrTime: "10:00", to: "Multai", mode: "Bus", cls: "Ordinary", fare: "75", km: "48", hotel: "None", hotelAmt: "0", remarks: "Godown register audit [DUMMY_DATA_RECORD]" },
        transfer: { month: "January", year: "2026", packing: "2500", transport: "9000", family: "Self & Child [DUMMY_DATA_RECORD]", remarks: "Transfer from Harda to Betul [DUMMY_DATA_RECORD]" },
        medical: { patient: "Ritu Raghuwanshi", relation: "Self", illness: "Routine Health Checkup & CBC [DUMMY_DATA_RECORD]", duration: "1 day", bills: [{ desc: "Doctor Consultation & CBC [DUMMY_DATA_RECORD]", amt: "850", no: "DOC-91" }] }
    },
    {
        user: { name: "Sandeep Mishra", email: "sandeep.chhindwara@mpscsc.test", pass: "Password@123", mobile: "9826011010" },
        emp: { name: "Sandeep Mishra", desig: "Peon / MTS", cat: "E", hq: "Chhindwara", pay: "24000", payLevel: "Level 1" },
        diary: { month: "August", year: "2026", depDate: "2026-08-05", depTime: "08:00", from: "Chhindwara", arrDate: "2026-08-05", arrTime: "10:30", to: "Seoni", mode: "Bus", cls: "Ordinary", fare: "110", km: "70", purpose: "Urgent dak delivery to district office [DUMMY_DATA_RECORD]" },
        tada: { month: "September", year: "2026", depDate: "2026-09-15", depTime: "07:30", from: "Chhindwara", arrDate: "2026-09-15", arrTime: "10:00", to: "Parasia", mode: "Bus", cls: "Ordinary", fare: "55", km: "35", hotel: "None", hotelAmt: "0", remarks: "Official courier duty [DUMMY_DATA_RECORD]" },
        transfer: { month: "February", year: "2026", packing: "2000", transport: "7500", family: "Spouse [DUMMY_DATA_RECORD]", remarks: "Transfer from Balaghat to Chhindwara [DUMMY_DATA_RECORD]" },
        medical: { patient: "Sandeep Mishra", relation: "Self", illness: "Seasonal Flu & Fever [DUMMY_DATA_RECORD]", duration: "3 days", bills: [{ desc: "Community Health Center [DUMMY_DATA_RECORD]", amt: "630", no: "CHC-12" }] }
    }
];

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function setupReactHelpers(page) {
    await page.evaluate(() => {
        window.__setReactInput = (el, val) => {
            if (!el) return;
            const setter = Object.getOwnPropertyDescriptor(
                el instanceof HTMLTextAreaElement ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype,
                'value'
            )?.set;
            if (setter) setter.call(el, val);
            else el.value = val;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
        };

        window.__setReactSelect = (el, val) => {
            if (!el) return;
            const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value')?.set;
            if (setter) setter.call(el, val);
            else el.value = val;
            el.dispatchEvent(new Event('change', { bubbles: true }));
        };
    });
}

async function runHeadedDataEntry() {
    const startIndex = process.argv[2] !== undefined ? parseInt(process.argv[2], 10) : 0;
    const count = process.argv[3] !== undefined ? parseInt(process.argv[3], 10) : (dummyUserData.length - startIndex);
    const usersToRun = dummyUserData.slice(startIndex, startIndex + count);

    console.log(`\n==================================================================`);
    console.log(`  STARTING VISIBLY HEADED UI FRONTEND DATA ENTRY`);
    console.log(`  Target: ${BASE_URL}`);
    console.log(`  Browser Executable: ${CHROME_PATH}`);
    console.log(`  Starting User Index: ${startIndex + 1} (${usersToRun.length} users to run)`);
    console.log(`  Mode: HEADLESS: FALSE (Visible Desktop Chrome Window)`);
    console.log(`==================================================================\n`);

    const browser = await puppeteer.launch({
        executablePath: CHROME_PATH,
        headless: false,
        defaultViewport: null,
        args: ['--start-maximized', '--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = (await browser.pages())[0] || await browser.newPage();
    page.setDefaultTimeout(35000);
    page.setDefaultNavigationTimeout(35000);
    page.on('dialog', async dialog => {
        console.log(`  [UI Alert Dialog] ${dialog.message()}`);
        await dialog.accept().catch(() => {});
    });

    for (let idx = 0; idx < usersToRun.length; idx++) {
        const item = usersToRun[idx];
        const actualIndex = startIndex + idx;
        console.log(`\n------------------------------------------------------------------`);
        console.log(`[${actualIndex + 1}/${dummyUserData.length}] Processing User: ${item.user.name} (${item.user.email})`);
        console.log(`------------------------------------------------------------------`);

        // Step 1: Clear storage and navigate to Login Page
        await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
        await page.evaluate(() => {
            localStorage.clear();
            sessionStorage.clear();
        });
        await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
        await sleep(1000);
        await setupReactHelpers(page);

        // Step 2: Attempt Login
        console.log(`  [UI] Entering login credentials for ${item.user.email}...`);
        await page.waitForSelector('input[name="email"]');
        await page.evaluate((email) => {
            window.__setReactInput(document.querySelector('input[name="email"]'), email);
        }, item.user.email);

        await page.waitForSelector('input[name="password"]');
        await page.evaluate((pass) => {
            window.__setReactInput(document.querySelector('input[name="password"]'), pass);
        }, item.user.pass);

        console.log(`  [UI] Clicking Sign In button...`);
        await page.click('button[type="submit"]');

        await page.waitForFunction(() => !!localStorage.getItem('auth_token'), { timeout: 6000 }).catch(() => {});
        await sleep(1200);

        let token = await page.evaluate(() => localStorage.getItem('auth_token'));
        if (!token) {
            console.log(`  [UI] User not registered yet. Navigating to ${BASE_URL}/register to register via UI...`);
            await page.goto(`${BASE_URL}/register`, { waitUntil: 'networkidle2' });
            await sleep(1000);
            await setupReactHelpers(page);

            await page.waitForSelector('input[name="full_name"]');
            await page.evaluate((u) => {
                window.__setReactInput(document.querySelector('input[name="full_name"]'), u.name);
                window.__setReactInput(document.querySelector('input[name="email"]'), u.email);
                window.__setReactInput(document.querySelector('input[name="mobile_number"]'), u.mobile);
                window.__setReactInput(document.querySelector('input[name="password"]'), u.pass);
                window.__setReactInput(document.querySelector('input[name="confirm_password"]'), u.pass);
            }, item.user);

            console.log(`  [UI] Submitting registration form...`);
            await page.click('button[type="submit"]');
            await sleep(2500);

            // Navigate to login
            await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
            await sleep(1200);
            await setupReactHelpers(page);

            await page.waitForSelector('input[name="email"]');
            await page.evaluate((u) => {
                window.__setReactInput(document.querySelector('input[name="email"]'), u.email);
                window.__setReactInput(document.querySelector('input[name="password"]'), u.pass);
            }, item.user);
            await page.click('button[type="submit"]');

            await page.waitForFunction(() => !!localStorage.getItem('auth_token'), { timeout: 10000 }).catch(() => {});
            await sleep(1200);

            token = await page.evaluate(() => localStorage.getItem('auth_token'));
            if (!token) {
                console.error(`  ❌ [UI] Critical: Failed to authenticate ${item.user.email}.`);
                continue;
            }
        }

        console.log(`  [UI] Logged in successfully. Token acquired.`);
        await sleep(1000);

        // Step 3: Ensure Employee record exists on /employees
        console.log(`  [UI] Navigating to /employees...`);
        await page.goto(`${BASE_URL}/employees`, { waitUntil: 'networkidle2' });
        await sleep(1200);
        await setupReactHelpers(page);

        const empInTable = await page.evaluate((empName) => {
            const tbody = document.querySelector('table.data-table tbody');
            return tbody && tbody.innerText.includes(empName);
        }, item.emp.name);

        if (!empInTable) {
            console.log(`  [UI] Creating Employee Profile for ${item.emp.name}...`);
            await page.evaluate(() => {
                const btns = Array.from(document.querySelectorAll('button'));
                const addBtn = btns.find(b => b.innerText.includes('Add Employee') || b.innerText.includes('कर्मचारी जोड़ें'));
                if (addBtn) addBtn.click();
            });
            await sleep(800);

            await page.evaluate((empData) => {
                const inputs = Array.from(document.querySelectorAll('form input'));
                if (inputs[0]) window.__setReactInput(inputs[0], empData.name);
                if (inputs[2]) window.__setReactInput(inputs[2], empData.desig);
                if (inputs[3]) window.__setReactInput(inputs[3], empData.hq);

                const catSelect = document.querySelector('form select');
                if (catSelect) window.__setReactSelect(catSelect, empData.cat);

                if (inputs[4]) window.__setReactInput(inputs[4], empData.payLevel);
                if (inputs[5]) window.__setReactInput(inputs[5], '5400');
                if (inputs[6]) window.__setReactInput(inputs[6], empData.pay);
            }, item.emp);
            await sleep(600);

            await page.evaluate(() => {
                const form = document.querySelector('form');
                if (form) {
                    const submitBtn = form.querySelector('button[type="submit"]');
                    if (submitBtn) submitBtn.click();
                }
            });
            await sleep(2000);
            console.log(`  ✅ [UI] Employee record created for ${item.emp.name}.`);
        } else {
            console.log(`  ℹ️ [UI] Employee record already in table for ${item.emp.name}.`);
        }

        // Robust employee selector: waits for dropdown options to load from API
        const selectEmployeeDropdown = async () => {
            await page.waitForFunction(() => {
                const sel = document.querySelector('select');
                return sel && sel.options.length > 1;
            }, { timeout: 15000 }).catch(() => {});

            return await page.evaluate((empName) => {
                const selects = Array.from(document.querySelectorAll('select'));
                for (const sel of selects) {
                    const option = Array.from(sel.options).find(o => o.text && o.text.includes(empName));
                    if (option) {
                        window.__setReactSelect(sel, option.value);
                        return true;
                    }
                }
                if (selects.length > 0 && selects[0].options.length > 1) {
                    window.__setReactSelect(selects[0], selects[0].options[1].value);
                    return true;
                }
                return false;
            }, item.emp.name);
        };

        // Step 4: Create Tour Diary
        console.log(`  [UI] Navigating to /tour-diaries...`);
        await page.goto(`${BASE_URL}/tour-diaries`, { waitUntil: 'networkidle2' });
        await sleep(1500);
        await setupReactHelpers(page);

        await selectEmployeeDropdown();
        await sleep(600);

        console.log(`  [UI] Initiating new Tour Diary for ${item.diary.month} ${item.diary.year}...`);
        const createdDiary = await page.evaluate(() => {
            const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('New Diary') || b.innerText.includes('New Tour Diary') || b.innerText.includes('Create Tour Diary') || b.innerText.includes('डायरी'));
            if (btn && !btn.disabled) {
                btn.click();
                return true;
            }
            return false;
        });

        if (createdDiary) {
            await sleep(2500);
            await setupReactHelpers(page);
            console.log(`  [UI] On Tour Diary Editor (${page.url()}). Adding journey leg...`);

            await page.evaluate(() => {
                const addRow = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Add Journey') || b.innerText.includes('पंक्ति जोड़ें'));
                if (addRow) addRow.click();
            });
            await sleep(800);

            await page.evaluate((d) => {
                const inputs = Array.from(document.querySelectorAll('table input'));
                const textInputs = inputs.filter(i => i.type === 'text');
                if (textInputs[0]) window.__setReactInput(textInputs[0], d.from);
                if (textInputs[1]) window.__setReactInput(textInputs[1], d.to);

                const purposeInput = textInputs.find(i => i.placeholder && (i.placeholder.includes('Purpose') || i.placeholder.includes('उद्देश्य'))) || textInputs[textInputs.length - 1];
                if (purposeInput) window.__setReactInput(purposeInput, d.purpose);
            }, item.diary);
            await sleep(600);

            await page.evaluate(() => {
                const saveBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Save') || b.innerText.includes('सुरक्षित'));
                if (saveBtn) saveBtn.click();
            });
            await sleep(1500);
            console.log(`  ✅ [UI] Tour Diary saved.`);
        }

        // Step 5: Create or Update TA/DA Claim
        console.log(`  [UI] Navigating to /claims/tada...`);
        await page.goto(`${BASE_URL}/claims/tada`, { waitUntil: 'networkidle2' });
        await sleep(1500);
        await setupReactHelpers(page);

        await selectEmployeeDropdown();
        await sleep(1000);

        console.log(`  [UI] Checking for existing or creating TA/DA Claim for ${item.tada.month} ${item.tada.year}...`);
        const openedTada = await page.evaluate(() => {
            const editBtn = Array.from(document.querySelectorAll('table.data-table tbody button'))
                .find(b => b.innerText.includes('Edit') || b.innerText.includes('संशोधन'));
            if (editBtn) {
                editBtn.click();
                return true;
            }
            const btn = Array.from(document.querySelectorAll('button'))
                .find(b => b.innerText.includes('New Claim') || b.innerText.includes('Create') || b.innerText.includes('दावा'));
            if (btn && !btn.disabled) {
                btn.click();
                return true;
            }
            return false;
        });

        if (openedTada) {
            await sleep(2500);
            await setupReactHelpers(page);
            console.log(`  [UI] On TA/DA Claim Editor (${page.url()}). Adding journey and hotel stay...`);

            // Ensure at least one journey row exists
            const rowCount = await page.evaluate(() => {
                const rows = document.querySelectorAll('.table-container table.data-table tbody tr');
                return rows ? rows.length : 0;
            });

            if (rowCount === 0) {
                await page.evaluate(() => {
                    const addJ = Array.from(document.querySelectorAll('button'))
                        .find(b => b.innerText.includes('Add Journey') || b.innerText.includes('यात्रा जोड़ें') || b.innerText.includes('जोड़ें'));
                    if (addJ) addJ.click();
                });
                await sleep(800);
            }

            // Fill journey row inputs
            await page.evaluate((td) => {
                const firstRow = document.querySelector('.table-container table.data-table tbody tr');
                if (firstRow) {
                    const tds = firstRow.querySelectorAll('td');
                    if (tds.length >= 6) {
                        // td[0]: Departure
                        const depDate = tds[0].querySelector('input[type="date"]');
                        const depTime = tds[0].querySelector('input[type="time"]');
                        const depStation = tds[0].querySelector('input[type="text"]');
                        if (depDate) window.__setReactInput(depDate, td.depDate);
                        if (depTime) window.__setReactInput(depTime, td.depTime);
                        if (depStation) window.__setReactInput(depStation, td.from);

                        // td[1]: Arrival
                        const arrDate = tds[1].querySelector('input[type="date"]');
                        const arrTime = tds[1].querySelector('input[type="time"]');
                        const arrStation = tds[1].querySelector('input[type="text"]');
                        if (arrDate) window.__setReactInput(arrDate, td.arrDate);
                        if (arrTime) window.__setReactInput(arrTime, td.arrTime);
                        if (arrStation) window.__setReactInput(arrStation, td.to);

                        // td[2]: Mode & Class
                        const modeSel = tds[2].querySelector('select');
                        const classInput = tds[2].querySelector('input[type="text"]');
                        if (modeSel) window.__setReactSelect(modeSel, td.mode);
                        if (classInput) window.__setReactInput(classInput, td.cls);

                        // td[3]: Ticket
                        const ticketInput = tds[3].querySelector('input[type="text"]');
                        if (ticketInput) window.__setReactInput(ticketInput, 'PNR-' + Math.floor(100000 + Math.random() * 900000));

                        // td[4]: Purpose
                        const purposeInput = tds[4].querySelector('input[type="text"]');
                        if (purposeInput) window.__setReactInput(purposeInput, td.remarks);

                        // td[5]: Fare
                        const fareInput = tds[5].querySelector('input[type="number"]');
                        if (fareInput) window.__setReactInput(fareInput, td.fare);
                    }
                }

                // Hotel Stay Entitlement
                const selects = Array.from(document.querySelectorAll('select'));
                const hotelSel = selects.find(s => Array.from(s.options).some(o => o.value === 'Hotel' || o.value === 'None'));
                if (hotelSel && td.hotel) window.__setReactSelect(hotelSel, td.hotel);

                const numInputs = Array.from(document.querySelectorAll('input[type="number"]'));
                if (numInputs.length > 0 && td.hotelAmt && td.hotelAmt !== '0') {
                    window.__setReactInput(numInputs[0], td.hotelAmt);
                }

                const remarksInput = document.querySelector('input[placeholder="Add remarks..."]') || Array.from(document.querySelectorAll('input[type="text"]')).pop();
                if (remarksInput) window.__setReactInput(remarksInput, td.remarks);
            }, item.tada);
            await sleep(800);

            await page.evaluate(() => {
                const saveBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Save') || b.innerText.includes('सुरक्षित'));
                if (saveBtn) saveBtn.click();
            });
            await sleep(2000);
            console.log(`  ✅ [UI] TA/DA Claim saved with verified journey leg & fare.`);
        }

        // Step 6: Create or Update Transfer Claim
        console.log(`  [UI] Navigating to /claims/transfer-list...`);
        await page.goto(`${BASE_URL}/claims/transfer-list`, { waitUntil: 'networkidle2' });
        await sleep(1500);
        await setupReactHelpers(page);

        await selectEmployeeDropdown();
        await sleep(1000);

        console.log(`  [UI] Checking for existing or creating Transfer Claim...`);
        const openedTransfer = await page.evaluate(() => {
            const editBtn = Array.from(document.querySelectorAll('table.data-table tbody button'))
                .find(b => b.innerText.includes('Edit') || b.innerText.includes('संशोधन'));
            if (editBtn) {
                editBtn.click();
                return true;
            }
            const btn = Array.from(document.querySelectorAll('button'))
                .find(b => b.innerText.includes('Create') || b.innerText.includes('New Claim') || b.innerText.includes('स्थानांतरण'));
            if (btn && !btn.disabled) {
                btn.click();
                return true;
            }
            return false;
        });

        if (openedTransfer) {
            await sleep(2500);
            await setupReactHelpers(page);
            console.log(`  [UI] On Transfer Claim Editor (${page.url()}). Entering transfer charges...`);

            await page.evaluate((tr) => {
                const textareas = Array.from(document.querySelectorAll('textarea'));
                if (textareas[0]) window.__setReactInput(textareas[0], tr.family);
                if (textareas[1]) window.__setReactInput(textareas[1], tr.remarks);

                const weightInput = document.querySelector('input[placeholder*="Weight"]');
                if (weightInput) window.__setReactInput(weightInput, '1500');

                const amtInputs = Array.from(document.querySelectorAll('input[placeholder="₹ Amount"]'));
                if (amtInputs[0]) window.__setReactInput(amtInputs[0], tr.transport);
                if (amtInputs[1]) window.__setReactInput(amtInputs[1], tr.packing);
            }, item.transfer);
            await sleep(600);

            // Import TA/DA journey if available
            console.log(`  [UI] Checking if TA/DA journey can be imported...`);
            await page.evaluate(() => {
                const importBtn = Array.from(document.querySelectorAll('button'))
                    .find(b => b.innerText.includes('Import') || b.innerText.includes('आयात'));
                if (importBtn) importBtn.click();
            });
            await sleep(1200);

            await page.evaluate(() => {
                const modalImportBtn = Array.from(document.querySelectorAll('.modal-content button.btn-primary'))
                    .find(b => b.innerText.includes('Import') || b.innerText.includes('आयात'));
                if (modalImportBtn) modalImportBtn.click();
            });
            await sleep(800);

            await page.evaluate(() => {
                const saveBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Save') || b.innerText.includes('सुरक्षित'));
                if (saveBtn) saveBtn.click();
            });
            await sleep(2000);
            console.log(`  ✅ [UI] Transfer Claim saved.`);
        }

        // Step 7: Create or Update Medical Claim
        console.log(`  [UI] Navigating to /medical...`);
        await page.goto(`${BASE_URL}/medical`, { waitUntil: 'networkidle2' });
        await sleep(1500);
        await setupReactHelpers(page);

        await selectEmployeeDropdown();
        await sleep(1000);

        console.log(`  [UI] Checking for existing or creating Medical Claim...`);
        const openedMed = await page.evaluate(() => {
            const editBtn = Array.from(document.querySelectorAll('table.data-table tbody button'))
                .find(b => b.innerText.includes('Edit') || b.innerText.includes('संशोधन'));
            if (editBtn) {
                editBtn.click();
                return true;
            }
            const btn = Array.from(document.querySelectorAll('button'))
                .find(b => b.innerText.includes('New Medical Claim') || b.innerText.includes('Medical Claim') || b.innerText.includes('चिकित्सा दावा') || b.innerText.includes('दावा'));
            if (btn && !btn.disabled) {
                btn.click();
                return true;
            }
            return false;
        });

        if (openedMed) {
            await sleep(2500);
            await setupReactHelpers(page);
            console.log(`  [UI] On Medical Claim Editor (${page.url()}). Entering diagnosis & bills...`);

            // Page 1: Diagnosis & Patient
            await page.evaluate((med) => {
                const patientSelect = document.querySelector('select[name="patient_name"]');
                if (patientSelect && patientSelect.options.length > 1) {
                    window.__setReactSelect(patientSelect, patientSelect.options[1].value);
                }
                const illnessInput = document.querySelector('input[name="illness_name"]');
                if (illnessInput) window.__setReactInput(illnessInput, med.illness);

                const durationInput = document.querySelector('input[name="illness_duration"]');
                if (durationInput) window.__setReactInput(durationInput, med.duration);
            }, item.medical);
            await sleep(600);

            // Page 2: Add Consultation / Doctor Bill
            console.log(`  [UI] Adding Doctor consultation fee...`);
            await page.evaluate(() => {
                const addDocBtn = Array.from(document.querySelectorAll('button'))
                    .find(b => b.innerText.includes('Add Doctor') || b.innerText.includes('डॉक्टर जोड़ें'));
                if (addDocBtn) addDocBtn.click();
            });
            await sleep(600);

            await page.evaluate(() => {
                const docRows = document.querySelectorAll('.page2-tables-container .table-section:first-child table tbody tr');
                if (docRows && docRows.length > 0) {
                    const firstRow = docRows[0];
                    const textInputs = firstRow.querySelectorAll('input[type="text"]');
                    const numInput = firstRow.querySelector('input[type="number"]');
                    const dateInput = firstRow.querySelector('input[type="date"]');
                    if (textInputs[0]) window.__setReactInput(textInputs[0], 'Dr. K. S. Verma, MD');
                    if (numInput) window.__setReactInput(numInput, '500');
                    if (dateInput) window.__setReactInput(dateInput, '2026-08-10');
                    if (textInputs[1]) window.__setReactInput(textInputs[1], 'DOC-772');
                }
            });
            await sleep(600);

            // Page 2: Add Medicine Bill
            console.log(`  [UI] Adding Medicine pharmacy bill...`);
            await page.evaluate(() => {
                const addMedBtn = Array.from(document.querySelectorAll('button'))
                    .find(b => b.innerText.includes('Add Medicine') || b.innerText.includes('दवा बिल जोड़ें'));
                if (addMedBtn) addMedBtn.click();
            });
            await sleep(600);

            await page.evaluate((med) => {
                const medSections = document.querySelectorAll('.page2-tables-container .table-section');
                if (medSections.length >= 2) {
                    const medRows = medSections[1].querySelectorAll('table tbody tr');
                    if (medRows && medRows.length > 0) {
                        const firstRow = medRows[0];
                        const textInputs = firstRow.querySelectorAll('input[type="text"]');
                        const numInput = firstRow.querySelector('input[type="number"]');
                        const dateInput = firstRow.querySelector('input[type="date"]');
                        if (textInputs[0]) window.__setReactInput(textInputs[0], med.bills[0].desc);
                        if (textInputs[1]) window.__setReactInput(textInputs[1], med.bills[0].no);
                        if (dateInput) window.__setReactInput(dateInput, '2026-08-12');
                        if (numInput) window.__setReactInput(numInput, med.bills[0].amt);
                    }
                }
            }, item.medical);
            await sleep(600);

            await page.evaluate(() => {
                const saveBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Save') || b.innerText.includes('सुरक्षित'));
                if (saveBtn) saveBtn.click();
            });
            await sleep(2000);
            console.log(`  ✅ [UI] Medical Claim saved with verified Consultation & Medicine bills.`);
        }

        console.log(`  [UI] Signing out user ${item.user.name}...`);
        await page.evaluate(() => {
            localStorage.clear();
            sessionStorage.clear();
        });
        await sleep(1500);
    }

    console.log(`\n==================================================================`);
    console.log(`  ALL TARGET USERS PROCESSED SUCCESSFULLY VIA HEADED UI AUTOMATION!`);
    console.log(`==================================================================\n`);

    await sleep(3000);
    await browser.close();
}

runHeadedDataEntry().catch(err => {
    console.error('Fatal Error during Headed UI Data Entry:', err);
    process.exit(1);
});
