/**
 * Number to Words Utility for MP Government TA/DA Claims
 * Supports Indian numbering format (Lakhs, Crores) in both English & Hindi
 */

'use strict';

const HINDI_ONES = [
    '', 'एक', 'दो', 'तीन', 'चार', 'पाँच', 'छह', 'सात', 'आठ', 'नौ',
    'दस', 'ग्यारह', 'बारह', 'तेरह', 'चौदह', 'पंद्रह', 'सोलह', 'सत्रह', 'अठारह', 'उन्नीस'
];

const HINDI_TENS = [
    '', '', 'बीस', 'तीस', 'चालीस', 'पचास', 'साठ', 'सत्तर', 'अस्सी', 'नब्बे'
];

const HINDI_TWO_DIGITS = [
    '', 'एक', 'दो', 'तीन', 'चार', 'पाँच', 'छह', 'सात', 'आठ', 'नौ',
    'दस', 'ग्यारह', 'बारह', 'तेरह', 'चौदह', 'पंद्रह', 'सोलह', 'सत्रह', 'अठारह', 'उन्नीस',
    'बीस', 'इक्कीस', 'बाईस', 'तेईस', 'चौबीस', 'पच्चीस', 'छब्बीस', 'सत्ताईस', 'अट्ठाईस', 'उनतीस',
    'तीस', 'इकतीस', 'बत्तीस', 'तैंतीस', 'चौंतीस', 'पैंतीस', 'छत्तीस', 'सैंतीस', 'अड़तीस', 'उनतालीस',
    'चालीस', 'इकतालीस', 'बयालीस', 'तैंतालीस', 'चवालीस', 'पैंतालीस', 'छियालीस', 'सैंतालीस', 'अड़तालीस', 'उनचास',
    'पचास', 'इक्यावन', 'बावन', 'तिरेपन', 'चौवन', 'पचपन', 'छप्पन', 'सत्तावन', 'अट्ठावन', 'उनसठ',
    'साठ', 'इकसठ', 'बासठ', 'तिरेसठ', 'चौंसठ', 'पैंसठ', 'छियासठ', 'सरसठ', 'अड़सठ', 'उनहत्तर',
    'सत्तर', 'इकहत्तर', 'बहत्तर', 'तिहत्तर', 'चौहत्तर', 'पचहत्तर', 'छिहत्तर', 'सतहत्तर', 'अठहत्तर', 'उनासी',
    'अस्सी', 'इक्यासी', 'बयासी', 'तिरासी', 'चौरासी', 'पचासी', 'छियासी', 'सत्तासी', 'अट्ठासी', 'नवासी',
    'नब्बे', 'इक्यानवे', 'बानवे', 'तिरानवे', 'चौरानवे', 'पंचानवे', 'छियानवे', 'सत्तानवे', 'अट्ठानवे', 'निन्यानवे'
];

const ENGLISH_ONES = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
];

const ENGLISH_TENS = [
    '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
];

function numberToWordsEnglish(num) {
    num = Math.round(Number(num) || 0);
    if (num <= 0) return 'Zero Rupees Only';

    function convertTwoDigits(n) {
        if (n < 20) return ENGLISH_ONES[n];
        const tens = Math.floor(n / 10);
        const ones = n % 10;
        return ENGLISH_TENS[tens] + (ones ? ' ' + ENGLISH_ONES[ones] : '');
    }

    function convertThreeDigits(n) {
        const hundreds = Math.floor(n / 100);
        const rem = n % 100;
        let res = '';
        if (hundreds > 0) res += ENGLISH_ONES[hundreds] + ' Hundred';
        if (rem > 0) res += (res ? ' ' : '') + convertTwoDigits(rem);
        return res;
    }

    let parts = [];
    const crore = Math.floor(num / 10000000);
    num %= 10000000;
    const lakh = Math.floor(num / 100000);
    num %= 100000;
    const thousand = Math.floor(num / 1000);
    num %= 1000;
    const remainder = num;

    if (crore > 0) parts.push(convertThreeDigits(crore) + ' Crore');
    if (lakh > 0) parts.push(convertThreeDigits(lakh) + ' Lakh');
    if (thousand > 0) parts.push(convertThreeDigits(thousand) + ' Thousand');
    if (remainder > 0) parts.push(convertThreeDigits(remainder));

    return parts.join(' ') + ' Rupees Only';
}

function numberToWordsHindi(num) {
    num = Math.round(Number(num) || 0);
    if (num <= 0) return 'शून्य रुपये मात्र';

    function convertUpTo99(n) {
        if (n <= 0) return '';
        return HINDI_TWO_DIGITS[n] || '';
    }

    function convertThreeDigits(n) {
        const hundreds = Math.floor(n / 100);
        const rem = n % 100;
        let res = '';
        if (hundreds > 0) res += (HINDI_ONES[hundreds] || '') + ' सौ';
        if (rem > 0) res += (res ? ' ' : '') + convertUpTo99(rem);
        return res;
    }

    let parts = [];
    const crore = Math.floor(num / 10000000);
    num %= 10000000;
    const lakh = Math.floor(num / 100000);
    num %= 100000;
    const thousand = Math.floor(num / 1000);
    num %= 1000;
    const remainder = num;

    if (crore > 0) parts.push(convertThreeDigits(crore) + ' करोड़');
    if (lakh > 0) parts.push(convertThreeDigits(lakh) + ' लाख');
    if (thousand > 0) parts.push(convertThreeDigits(thousand) + ' हज़ार');
    if (remainder > 0) parts.push(convertThreeDigits(remainder));

    return parts.join(' ') + ' रुपये मात्र';
}

module.exports = {
    numberToWordsEnglish,
    numberToWordsHindi
};
