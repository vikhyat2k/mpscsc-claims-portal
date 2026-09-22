// TA/DA Calculation Rules and Rates (MP Government)
// Reference: Finance Department, Govt of Madhya Pradesh Memorandum No. F 4-1/2025/Niyam/Char (03 April 2025)
// and Supplementary Rule 30 (पूरक नियम 30) of MP Travelling Allowance Rules.

const { numberToWordsEnglish, numberToWordsHindi } = require('./numberToWords');

const TADA_RATES = {
    // 2.3 समेकित दैनिक भत्ता (Daily Allowance by City Type and Category - April 2025)
    DA_RATES: {
        METRO: { // 9 Specified National Metros (Col 4)
            A: 750, B: 600, C: 450, D: 375, E: 260
        },
        MAJOR_CITY: { // 4 Major MP Cities (Bhopal, Indore, Jabalpur, Gwalior) & All Outside MP (Col 3)
            A: 550, B: 440, C: 330, D: 280, E: 190
        },
        OTHER: { // Other Places in MP / साधारण दर (Col 2)
            A: 375, B: 300, C: 225, D: 185, E: 125
        }
    },

    // 2.6 ठहरने की पात्रता (Hotel/Lodge Allowance Max per day - April 2025)
    HOTEL_ALLOWANCE: {
        METRO: { // 9 Specified Metros (Col 2)
            A: 7400, B: 5500, C: 3700, D: 2000, E: 1000
        },
        MAJOR_CITY: { // 4 Major MP Cities & All Outside MP (Col 3)
            A: 5500, B: 4000, C: 2800, D: 1400, E: 700
        },
        OTHER: { // Other Places in State (Col 4)
            A: 3700, B: 2750, C: 1850, D: 920, E: 450
        }
    },

    // 2.6 ठहरने की पात्रता - कॉलम 5: प्रदेश के बाहर / महानगर में मित्र / रिश्तेदार के यहां ठहरने पर
    FRIENDS_STAY_RATE: {
        A: 750, B: 660, C: 550, D: 450, E: 370
    },

    // 2.5 मील भत्ता (Own Vehicle Mileage - Sec 2.5)
    MILEAGE: {
        CAR: 9,   // ₹9/km - Cat A executive officers without official vehicle
        BIKE: 4,  // ₹4/km - All categories for Motor Cycle / Scooter
        OTHER: 2, // ₹2/km - Other means
        MONTHLY_CAP: {
            CAR: 18300, // Max limit ₹18,300/month
            BIKE: 3700, // Max limit ₹3,700/month
            OTHER: 880  // Max limit ₹880/month
        }
    },

    // 2.7 प्रदेश के बाहर स्थानीय परिवहन व्यय (Local Transport Outside MP)
    LOCAL_TRANSPORT_OUTSIDE_MP: {
        A: 500, B: 380, C: 300, D: 200, E: 100, // Direct default (Own arrangement)
        REIMBURSEMENT: { // Col 3: प्रतिपूर्ति योग्य अधिकतम राशि (against bills)
            A: 2200, B: 1500, C: 1000, D: 600, E: 300
        },
        OWN_ARRANGEMENT: { // Col 4: परिवहन की व्यवस्था स्वयं करने पर देय राशि
            A: 500, B: 380, C: 300, D: 200, E: 100
        }
    },

    // 2.8 स्थानान्तरण पर घरेलू सामान का परिवहन (Goods Transport Rate ₹/km on Transfer)
    GOODS_TRANSPORT_PER_KM: {
        A: 40, B: 40, // ₹40/km
        C: 25, D: 25, // ₹25/km
        E: 15         // ₹15/km
    },

    // 2.9 स्थानान्तरण अनुदान (Composite Transfer Grant - Lump sum)
    TRANSFER_GRANT: {
        A: 6500, B: 5000, C: 3600, D: 2500, E: 1800
    },

    // 2.4 यात्रा के साधन (Entitled Travel Class)
    ENTITLED_CLASS: {
        A: 'AC_FIRST',
        B: 'AC_2_TIER',
        C: 'AC_3_TIER',
        D: 'SLEEPER',
        E: 'UNRESERVED'
    },

    // City Tier Lists (Sec 2.3 & 2.6)
    METRO_CITIES: [
        'delhi', 'new delhi', 'mumbai', 'bombay', 'kolkata', 'calcutta',
        'chennai', 'madras', 'bengaluru', 'bangalore', 'hyderabad', 'secunderabad',
        'ahmedabad', 'kanpur', 'pune',
        // Hindi variants
        'दिल्ली', 'नई दिल्ली', 'मुंबई', 'बंबई', 'कोलकाता', 'कलकत्ता',
        'चेन्नई', 'मद्रास', 'बेंगलूरू', 'बैंगलोर', 'बेंगलुरु', 'हैदराबाद',
        'अहमदाबाद', 'कानपुर', 'पुणे'
    ],

    MAJOR_MP_CITIES: [
        'bhopal', 'indore', 'jabalpur', 'gwalior',
        'rani kamlapati', 'habibganj',
        // Hindi variants
        'भोपाल', 'इंदौर', 'जबलपुर', 'ग्वालियर',
        'रानी कमलापति', 'हबीबगंज'
    ],

    // All 55 Madhya Pradesh districts (English & Hindi)
    MP_DISTRICTS: [
        'agar malwa', 'alirajpur', 'anuppur', 'ashoknagar', 'balaghat', 'barwani',
        'betul', 'bhind', 'bhopal', 'burhanpur', 'chhatarpur', 'chhindwara',
        'damoh', 'datia', 'dewas', 'dhar', 'dindori', 'guna', 'gwalior', 'harda',
        'narmadapuram', 'hoshangabad', 'indore', 'jabalpur', 'jhabua', 'katni',
        'khandwa', 'khargone', 'maihar', 'mandla', 'mandsaur', 'mauganj', 'morena',
        'narsinghpur', 'neemuch', 'niwari', 'panna', 'pandhurna', 'raisen',
        'rajgarh', 'ratlam', 'rewa', 'sagar', 'satna', 'sehore', 'seoni',
        'shahdol', 'shajapur', 'sheopur', 'shivpuri', 'sidhi', 'singrauli',
        'tikamgarh', 'ujjain', 'umaria', 'vidisha',
        // Common MP tehsil / railway hubs
        'itarsi', 'nagda', 'mhow', 'pithampur', 'mandideep', 'bina', 'pipariya',
        'ganjbasoda', 'sohagpur', 'multai', 'parasia', 'sihora', 'kareli',
        // Hindi names
        'आगर मालवा', 'अलीराजपुर', 'अनूपपुर', 'अशोकनगर', 'बालाघाट', 'बड़वानी',
        'बैतूल', 'भिंड', 'भोपाल', 'बुरहानपुर', 'छतरपुर', 'छिंदवाड़ा',
        'दमोह', 'दतिया', 'देवास', 'धार', 'डिंडौरी', 'गुना', 'ग्वालियर', 'हरदा',
        'नर्मदापुरम', 'होशंगाबाद', 'इंदौर', 'जबलपुर', 'झाबुआ', 'कटनी',
        'खंडवा', 'खरगोन', 'मैहर', 'मंडला', 'मंदसौर', 'मौगंज', 'मुरैना',
        'नरसिंहपुर', 'नीमच', 'निवाड़ी', 'पन्ना', 'पांढुर्ना', 'रायसेन',
        'राजगढ़', 'रतलाम', 'रीवा', 'सागर', 'सतना', 'सीहोर', 'सिवनी',
        'शहडोल', 'शाजापुर', 'श्योपुर', 'शिवपुरी', 'सीधी', 'सिंगरौली',
        'टीकमगढ़', 'उज्जैन', 'उमरिया', 'विदिशा', 'इटारसी', 'नागदा', 'महू',
        'पीथमपुर', 'मंडीदीप', 'बीना', 'पिपरिया'
    ]
};

// ─────────────────────────────────────────────
// Normalizes and cleans station names
// ─────────────────────────────────────────────
function normalizeStation(cityName) {
    if (!cityName) return '';
    let name = cityName.toString().trim().toLowerCase();
    // Remove station qualifiers like "Jn", "Junction", "Cantt", "City", "Terminus", "Railway Station"
    name = name.replace(/\s+(jn|junction|cantt|city|central|terminus|railway\s*station|स्टेशन|जंक्शन|केंट)(?=\s|$|\b)/gi, '').trim();
    return name;
}

// ─────────────────────────────────────────────
// Checks if a station is outside Madhya Pradesh
// ─────────────────────────────────────────────
function isStationOutsideMP(cityName) {
    if (!cityName) return false;
    const clean = normalizeStation(cityName);
    // If it's a known MP city/district, it's inside MP
    const inMP = TADA_RATES.MP_DISTRICTS.some(d => clean === d || clean.includes(d) || d.includes(clean));
    return !inMP;
}

// ─────────────────────────────────────────────
// City Classifier (Sec 2.3 & 2.6 of Order dated 03-Apr-2025)
// Tier 1: METRO (9 Specified Metros)
// Tier 2: MAJOR_CITY (4 MP Cities: Bhopal, Indore, Jabalpur, Gwalior AND All Outside MP)
// Tier 3: OTHER (All other places in MP)
// ─────────────────────────────────────────────
function getCityType(cityName) {
    if (!cityName) return 'OTHER';
    const clean = normalizeStation(cityName);

    // 1. Check Tier 1: 9 Specified Metros (Delhi, Mumbai, etc.)
    if (TADA_RATES.METRO_CITIES.some(m => clean === m || clean.includes(m) || m.includes(clean))) {
        return 'METRO';
    }

    // 2. Check 4 Major MP Cities (Bhopal, Indore, Jabalpur, Gwalior)
    if (TADA_RATES.MAJOR_MP_CITIES.some(mc => clean === mc || clean.includes(mc) || mc.includes(clean))) {
        return 'MAJOR_CITY';
    }

    // 3. Any station outside Madhya Pradesh (that is not in Metro) belongs to Tier 2
    if (isStationOutsideMP(cityName)) {
        return 'MAJOR_CITY';
    }

    // 4. All other places inside MP belong to Tier 3 (OTHER)
    return 'OTHER';
}

// ─────────────────────────────────────────────
// पूरक नियम 30 (Supplementary Rule 30) - Daily Allowance Factor
// - Less than 6 hours absence: 0% (0)
// - 6 to 12 hours absence: 50% (0.5)
// - 12 to 24 hours absence: 100% (1.0)
// - Total absence > 24 hours: Each 24h block = 1.0 DA;
//   remainder block: <6h = 0, 6-12h = 0.5, >12h = 1.0
// ─────────────────────────────────────────────
function calculateDAFactorForHours(hours) {
    if (!hours || hours < 6) return 0;
    const fullBlocks = Math.floor(hours / 24);
    const remainder = hours - (fullBlocks * 24);
    let remFactor = 0;
    if (remainder > 12) {
        remFactor = 1.0;
    } else if (remainder > 6) {
        remFactor = 0.5;
    }
    return fullBlocks + remFactor;
}

// Helper maintaining backward compatibility with single rate
function calculateDAForDuration(cityType, category, hours) {
    const dailyRate = (TADA_RATES.DA_RATES[cityType] && TADA_RATES.DA_RATES[cityType][category]) || 225;
    const factor = calculateDAFactorForHours(hours);
    return dailyRate * factor;
}

// ─────────────────────────────────────────────
// Travel Allowance Calculator (Sec 2.4 & 2.5)
// ─────────────────────────────────────────────
function calculateTravelAllowance(journey, employeeCategory) {
    const { mode, distance_km, fare_amount } = journey;
    const cat = (employeeCategory || 'E').toString().toUpperCase().replace(/[^ABCDE]/g, '') || 'E';

    if (mode === 'Rail' || mode === 'Bus') {
        return parseFloat(fare_amount || 0);
    } else if (mode === 'Air') {
        // Sec 2.4: Air travel is admissible for Category A (Level 14+)
        return parseFloat(fare_amount || 0);
    } else if (mode === 'Own Car') {
        // Sec 2.5 item 1: private car mileage ₹9/km for Category A executive officers
        if (cat === 'A') {
            return parseFloat(distance_km || 0) * TADA_RATES.MILEAGE.CAR;
        }
        // If Category B/C traveled by road, allow entered fare or 0
        return parseFloat(fare_amount || 0);
    } else if (mode === 'Own Bike') {
        // Sec 2.5 item 2: motorcycle / scooter ₹4/km for all categories
        return parseFloat(distance_km || 0) * TADA_RATES.MILEAGE.BIKE;
    }

    return parseFloat(fare_amount || 0);
}

// Formatters for DD/MM/YYYY and 12h Time
function formatDate(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const [y, m, d] = parts;
    return `${d}/${m}/${y}`;
}

function formatTime(timeStr) {
    if (!timeStr) return '';
    const parts = timeStr.split(':');
    if (parts.length < 2) return timeStr;
    let hrs = parseInt(parts[0], 10);
    const m = parts[1];
    const ampm = hrs >= 12 ? 'PM' : 'AM';
    hrs = hrs % 12;
    hrs = hrs ? hrs : 12; // 0 should be 12
    return `${hrs.toString().padStart(2, '0')}:${m} ${ampm}`;
}

function padTime(t) {
    if (!t) return '00:00';
    const parts = t.toString().trim().split(':');
    const h = (parts[0] || '0').padStart(2, '0');
    const m = (parts[1] || '0').padStart(2, '0');
    return `${h}:${m}`;
}

function calculateDiffHours(d1, t1, d2, t2) {
    if (!d1 || !t1 || !d2 || !t2) return 0;
    const start = new Date(`${d1}T${padTime(t1)}`);
    const end = new Date(`${d2}T${padTime(t2)}`);
    const diffMs = end - start;
    if (isNaN(diffMs) || diffMs < 0) return 0;
    return diffMs / (1000 * 60 * 60);
}

// ─────────────────────────────────────────────
// Groups chronological journeys into coherent tours separated by returns to headquarters
// ─────────────────────────────────────────────
function groupJourneysIntoTours(journeys, headquarters) {
    const sorted = [...journeys].sort((a, b) => {
        const da = (a.departure_date || '') + 'T' + (a.departure_time || '00:00');
        const db = (b.departure_date || '') + 'T' + (b.departure_time || '00:00');
        return da.localeCompare(db);
    });
    if (sorted.length === 0) return [];
    const normHQ = normalizeStation(headquarters);
    const tours = [];
    let currentTour = [];

    for (let i = 0; i < sorted.length; i++) {
        const leg = sorted[i];
        currentTour.push(leg);
        const arrNorm = normalizeStation(leg.arrival_station);
        const isBackAtHQ = normHQ && arrNorm && (arrNorm === normHQ || arrNorm.includes(normHQ) || (arrNorm.length >= 3 && normHQ.includes(arrNorm)));
        if (isBackAtHQ && i < sorted.length - 1) {
            tours.push(currentTour);
            currentTour = [];
        }
    }
    if (currentTour.length > 0) tours.push(currentTour);
    return tours;
}

// ─────────────────────────────────────────────
// Allocates DA cleanly into discrete Halt DA blocks and Journey DA (Supplementary Rule 30)
// ─────────────────────────────────────────────
function allocateTourDA(tour, empCat) {
    const validCat = (empCat && ['A', 'B', 'C', 'D', 'E'].includes(empCat)) ? empCat : 'E';
    if (!tour || tour.length === 0) return { totalHours: 0, totalDAFactor: 0, tourLegs: [] };

    const first = tour[0];
    const last = tour[tour.length - 1];
    const totalHours = calculateDiffHours(first.departure_date, first.departure_time, last.arrival_date, last.arrival_time);
    const totalDAFactor = calculateDAFactorForHours(totalHours);

    const tourLegs = tour.map((leg, idx) => {
        const travelHrs = calculateDiffHours(leg.departure_date, leg.departure_time, leg.arrival_date, leg.arrival_time);
        let stayHrs = 0;
        let nextLeg = null;
        if (idx < tour.length - 1) {
            nextLeg = tour[idx + 1];
            stayHrs = calculateDiffHours(leg.arrival_date, leg.arrival_time, nextLeg.departure_date, nextLeg.departure_time);
        }
        const haltCityType = getCityType(leg.arrival_station);
        const haltDaRate = TADA_RATES.DA_RATES[haltCityType][empCat];
        const depCityType = getCityType(leg.departure_station);
        const travelDaRate = Math.max(TADA_RATES.DA_RATES[depCityType][empCat], TADA_RATES.DA_RATES[haltCityType][empCat]);
        const fullHaltBlocks = Math.floor(stayHrs / 24);

        return {
            leg,
            travelHrs,
            stayHrs,
            haltCityType,
            haltDaRate,
            depCityType,
            travelDaRate,
            fullHaltBlocks,
            nextLeg,
            haltFactor: 0,
            travelFactor: 0
        };
    });

    // 1. Allocate full 24h halt blocks
    let remHaltToAlloc = totalDAFactor;
    tourLegs.forEach(d => {
        const alloc = Math.min(d.fullHaltBlocks, remHaltToAlloc);
        d.haltFactor = alloc;
        remHaltToAlloc -= alloc;
    });

    // 2. Allocate remaining factor to travel legs in 0.5 increments
    let remTravelFactor = totalDAFactor - tourLegs.reduce((s, d) => s + d.haltFactor, 0);
    while (remTravelFactor > 0) {
        let allocatedAny = false;
        for (const d of tourLegs) {
            if (remTravelFactor <= 0) break;
            if (d.travelHrs > 0 && d.travelFactor < 1.0) {
                d.travelFactor += 0.5;
                remTravelFactor -= 0.5;
                allocatedAny = true;
            }
        }
        if (!allocatedAny) {
            const firstWithTravel = tourLegs.find(d => d.travelHrs > 0) || tourLegs[0];
            firstWithTravel.travelFactor += remTravelFactor;
            remTravelFactor = 0;
        }
    }

    return { totalHours, totalDAFactor, tourLegs };
}

// ─────────────────────────────────────────────
// Master TA/DA Bill Totals & Treasury Form 21 rows calculation
// ─────────────────────────────────────────────
function calculateTadaBillTotals(claim, employee, journeys, otherMileageUsage = { car: 0, bike: 0 }) {
    if (!employee || !journeys || journeys.length === 0) {
        return {
            billRows: [],
            totals: {
                totalFare: 0,
                totalDA: 0,
                totalJourneyDA: 0,
                totalStayDA: 0,
                totalHotel: 0,
                totalStayAllowance: 0,
                totalTransport: 0,
                totalPacking: 0,
                totalLocalTransport: 0,
                transferGrant: 0,
                grandTotal: 0
            }
        };
    }

    const categoryMatch = (employee.category || '').match(/[ABCDE]/i);
    const empCat = categoryMatch ? categoryMatch[0].toUpperCase() : 'E';

    // Mileage monthly caps scaling (Sec 2.5)
    const rawCarTotal = journeys.filter(j => j.mode === 'Own Car').reduce((sum, j) => sum + calculateTravelAllowance(j, empCat), 0);
    const rawBikeTotal = journeys.filter(j => j.mode === 'Own Bike').reduce((sum, j) => sum + calculateTravelAllowance(j, empCat), 0);
    const carHeadroom = Math.max(0, TADA_RATES.MILEAGE.MONTHLY_CAP.CAR - (otherMileageUsage.car || 0));
    const bikeHeadroom = Math.max(0, TADA_RATES.MILEAGE.MONTHLY_CAP.BIKE - (otherMileageUsage.bike || 0));
    const carScale = rawCarTotal > 0 ? Math.min(1, carHeadroom / rawCarTotal) : 1;
    const bikeScale = rawBikeTotal > 0 ? Math.min(1, bikeHeadroom / rawBikeTotal) : 1;

    const tours = groupJourneysIntoTours(journeys, employee.headquarters);
    const billRows = [];
    let globalSrNo = 1;

    const stayType = (claim.hotel_stay_type || '').toLowerCase();
    let totalHotelClaimedRemaining = parseFloat(claim.hotel_amount || 0);
    let totalStayEntitlementSum = 0;
    let totalLocalTransportSum = 0;
    let totalDAFactor = 0;

    for (const tour of tours) {
        const { tourLegs, totalDAFactor: tourDAFactor } = allocateTourDA(tour, empCat);
        totalDAFactor += (tourDAFactor || 0);

        for (const d of tourLegs) {
            const leg = d.leg;
            let ta = calculateTravelAllowance(leg, empCat);
            if (leg.mode === 'Own Car') ta *= carScale;
            else if (leg.mode === 'Own Bike') ta *= bikeScale;

            const journeyDA = d.travelFactor * d.travelDaRate;
            const stayDA = d.haltFactor * d.haltDaRate;

            // Night Halt and Stay Allowance (Col 17)
            let rowStayAllowance = 0;
            let haltNights = 0;
            const isNightHalt = d.stayHrs >= 12 || (d.nextLeg && leg.arrival_date !== d.nextLeg.departure_date && d.stayHrs >= 6);

            if (isNightHalt && d.stayHrs > 0) {
                const dArr = new Date(leg.arrival_date);
                const dNextDep = d.nextLeg ? new Date(d.nextLeg.departure_date) : dArr;
                const calDays = Math.round((dNextDep - dArr) / (1000 * 60 * 60 * 24));
                haltNights = Math.max(1, calDays || Math.round(d.stayHrs / 24));

                if (stayType === 'friends') {
                    const friendsRate = TADA_RATES.FRIENDS_STAY_RATE[empCat] || 370;
                    rowStayAllowance = haltNights * friendsRate;
                } else if (stayType === 'hotel') {
                    const maxHotelRate = TADA_RATES.HOTEL_ALLOWANCE[d.haltCityType][empCat] || 0;
                    const maxAllowedForHalt = haltNights * maxHotelRate;
                    rowStayAllowance = Math.min(totalHotelClaimedRemaining, maxAllowedForHalt);
                    totalHotelClaimedRemaining = Math.max(0, totalHotelClaimedRemaining - rowStayAllowance);
                }
            }
            totalStayEntitlementSum += rowStayAllowance;

            // Local transport outside MP (Sec 2.7)
            let rowLocalTransport = 0;
            if (isStationOutsideMP(leg.arrival_station) && d.stayHrs > 0) {
                const stayDaysCount = Math.max(1, Math.round(d.stayHrs / 24));
                const ltRate = (TADA_RATES.LOCAL_TRANSPORT_OUTSIDE_MP.OWN_ARRANGEMENT && TADA_RATES.LOCAL_TRANSPORT_OUTSIDE_MP.OWN_ARRANGEMENT[empCat]) || 0;
                rowLocalTransport = stayDaysCount * ltRate;
                totalLocalTransportSum += rowLocalTransport;
            }

            const rowTotal = ta + journeyDA + stayDA + rowStayAllowance;

            let legPurpose = (leg.purpose || '').trim();
            if (leg.merge_purpose && !legPurpose && billRows.length > 0) {
                legPurpose = billRows[billRows.length - 1].purpose;
            }

            billRows.push({
                srNo: globalSrNo++,
                departure_date: formatDate(leg.departure_date),
                departure_time: formatTime(leg.departure_time),
                departure_station: leg.departure_station,
                arrival_date: formatDate(leg.arrival_date),
                arrival_time: formatTime(leg.arrival_time),
                arrival_station: leg.arrival_station,
                purpose: legPurpose,
                merge_purpose: !!leg.merge_purpose,
                mode: leg.mode,
                distance_km: leg.distance_km || 0,
                ticket_no: leg.ticket_no || '',
                fare_amount: leg.fare_amount || 0,
                travel_hrs: d.travelHrs.toFixed(1),
                stay_hrs: d.stayHrs > 0 ? d.stayHrs.toFixed(1) : '0.0',
                da_rate: d.travelDaRate,
                stay_rate: d.haltDaRate,
                journey_da: journeyDA.toFixed(2),
                stay_da: stayDA.toFixed(2),
                ta_approved: ta,
                hotel_allowance: rowStayAllowance,
                stay_allowance: rowStayAllowance,
                total_amount: rowTotal.toFixed(2),
                remarks: leg.remarks || ''
            });
        }
    }

    // Transfer claim specifics (Sec 2.8 & 2.9)
    let transferGrant = 0;
    let totalGoodsTransport = 0;
    let totalPacking = 0;
    let transferAllowance = 0;

    if (claim.claim_type === 'TRANSFER') {
        transferGrant = TADA_RATES.TRANSFER_GRANT[empCat] || 0;
        // Packing charges are subsumed in composite transfer grant (Sec 2.9)
        totalPacking = 0;

        const goodsRate = TADA_RATES.GOODS_TRANSPORT_PER_KM[empCat] || 15;
        const totalDistance = journeys.reduce((sum, j) => sum + (parseFloat(j.distance_km) || 0), 0);
        const maxEntitledGoods = totalDistance * goodsRate;
        const userClaimedGoods = parseFloat(claim.goods_transport_charges || 0);

        // Under MP Government financial rules, goods transport reimbursement requires actual expenditure.
        // If employee claimed ₹0 or did not claim, reimbursement is ₹0; otherwise capped at max entitlement.
        totalGoodsTransport = userClaimedGoods > 0 ? Math.min(userClaimedGoods, maxEntitledGoods) : 0;
        transferAllowance = transferGrant + totalGoodsTransport;

        // In Treasury Form 21, the transfer entitlement (Composite Grant + Goods Transport) is attributed to Row 0
        if (billRows.length > 0) {
            billRows[0].transfer_grant = transferGrant;
            billRows[0].goods_transport = totalGoodsTransport;
            billRows[0].transfer_allowance = transferAllowance;
            const curRowTotal = parseFloat(billRows[0].total_amount || 0);
            billRows[0].total_amount = (curRowTotal + transferAllowance).toFixed(2);
        }
    }

    const totals = {
        totalFare: billRows.reduce((sum, r) => sum + (parseFloat(r.ta_approved) || 0), 0),
        totalJourneyDA: billRows.reduce((sum, r) => sum + parseFloat(r.journey_da || 0), 0),
        totalStayDA: billRows.reduce((sum, r) => sum + parseFloat(r.stay_da || 0), 0),
        totalDA: 0,
        totalDAFactor: totalDAFactor,
        totalHotel: totalStayEntitlementSum,
        totalStayAllowance: totalStayEntitlementSum,
        totalTransport: totalGoodsTransport,
        totalPacking: totalPacking,
        totalLocalTransport: totalLocalTransportSum,
        transferGrant: transferGrant,
        transferAllowance: transferAllowance,
        grandTotal: 0
    };

    totals.totalDA = totals.totalJourneyDA + totals.totalStayDA;
    totals.grandTotal = Math.round(
        totals.totalFare + totals.totalDA + totals.totalStayAllowance +
        totals.totalTransport + totals.totalPacking + totals.totalLocalTransport + totals.transferGrant
    );

    const advanceAmount = parseFloat(claim.advance_amount || 0);
    const netPayable = Math.max(0, totals.grandTotal - advanceAmount);

    totals.advanceAmount = advanceAmount;
    totals.netPayable = netPayable;
    totals.amountInWords = numberToWordsEnglish(netPayable);
    totals.amountInWordsHi = numberToWordsHindi(netPayable);

    return { billRows, totals };
}

module.exports = {
    TADA_RATES,
    normalizeStation,
    isStationOutsideMP,
    getCityType,
    calculateDAFactorForHours,
    calculateDAForDuration,
    calculateTravelAllowance,
    calculateDiffHours,
    formatDate,
    formatTime,
    groupJourneysIntoTours,
    allocateTourDA,
    calculateTadaBillTotals
};

