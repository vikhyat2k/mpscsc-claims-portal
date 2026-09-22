// Bilingual district names for MP
export const MP_DISTRICTS_BILINGUAL = {
    "Agar Malwa": { en: "Agar Malwa", hi: "आगर मालवा" },
    "Alirajpur": { en: "Alirajpur", hi: "अलीराजपुर" },
    "Anuppur": { en: "Anuppur", hi: "अनूपपुर" },
    "Ashoknagar": { en: "Ashoknagar", hi: "अशोकनगर" },
    "Balaghat": { en: "Balaghat", hi: "बालाघाट" },
    "Barwani": { en: "Barwani", hi: "बड़वानी" },
    "Betul": { en: "Betul", hi: "बैतूल" },
    "Bhind": { en: "Bhind", hi: "भिंड" },
    "Bhopal": { en: "Bhopal", hi: "भोपाल" },
    "Burhanpur": { en: "Burhanpur", hi: "बुरहानपुर" },
    "Chhatarpur": { en: "Chhatarpur", hi: "छतरपुर" },
    "Chhindwara": { en: "Chhindwara", hi: "छिंदवाड़ा" },
    "Damoh": { en: "Damoh", hi: "दमोह" },
    "Datia": { en: "Datia", hi: "दतिया" },
    "Dewas": { en: "Dewas", hi: "देवास" },
    "Dhar": { en: "Dhar", hi: "धार" },
    "Dindori": { en: "Dindori", hi: "डिंडौरी" },
    "Guna": { en: "Guna", hi: "गुना" },
    "Gwalior": { en: "Gwalior", hi: "ग्वालियर" },
    "Harda": { en: "Harda", hi: "हरदा" },
    "Narmadapuram": { en: "Narmadapuram", hi: "नर्मदापुरम" },
    "Indore": { en: "Indore", hi: "इंदौर" },
    "Jabalpur": { en: "Jabalpur", hi: "जबलपुर" },
    "Jhabua": { en: "Jhabua", hi: "झाबुआ" },
    "Katni": { en: "Katni", hi: "कटनी" },
    "Khandwa": { en: "Khandwa", hi: "खंडवा" },
    "Khargone": { en: "Khargone", hi: "खरगोन" },
    "Maihar": { en: "Maihar", hi: "मैहर" },
    "Mandla": { en: "Mandla", hi: "मंडला" },
    "Mandsaur": { en: "Mandsaur", hi: "मंदसौर" },
    "Mauganj": { en: "Mauganj", hi: "मौगंज" },
    "Morena": { en: "Morena", hi: "मुरैना" },
    "Narsinghpur": { en: "Narsinghpur", hi: "नरसिंहपुर" },
    "Neemuch": { en: "Neemuch", hi: "नीमच" },
    "Niwari": { en: "Niwari", hi: "निवाड़ी" },
    "Panna": { en: "Panna", hi: "पन्ना" },
    "Pandhurna": { en: "Pandhurna", hi: "पांढुर्ना" },
    "Raisen": { en: "Raisen", hi: "रायसेन" },
    "Rajgarh": { en: "Rajgarh", hi: "राजगढ़" },
    "Ratlam": { en: "Ratlam", hi: "रतलाम" },
    "Rewa": { en: "Rewa", hi: "रीवा" },
    "Sagar": { en: "Sagar", hi: "सागर" },
    "Satna": { en: "Satna", hi: "सतना" },
    "Sehore": { en: "Sehore", hi: "सीहोर" },
    "Seoni": { en: "Seoni", hi: "सिवनी" },
    "Shahdol": { en: "Shahdol", hi: "शहडोल" },
    "Shajapur": { en: "Shajapur", hi: "शाजापुर" },
    "Sheopur": { en: "Sheopur", hi: "श्योपुर" },
    "Shivpuri": { en: "Shivpuri", hi: "शिवपुरी" },
    "Sidhi": { en: "Sidhi", hi: "सीधी" },
    "Singrauli": { en: "Singrauli", hi: "सिंगरौली" },
    "Tikamgarh": { en: "Tikamgarh", hi: "टीकमगढ़" },
    "Ujjain": { en: "Ujjain", hi: "उज्जैन" },
    "Umaria": { en: "Umaria", hi: "उमरिया" },
    "Vidisha": { en: "Vidisha", hi: "विदिशा" }
};

// Get district name in specified language
export const getDistrictName = (district, language = 'en') => {
    if (!district) return '';
    const districtData = MP_DISTRICTS_BILINGUAL[district];
    return districtData ? districtData[language] : district;
};

// Get all district keys (English values for storage)
export const getDistrictKeys = () => Object.keys(MP_DISTRICTS_BILINGUAL);
