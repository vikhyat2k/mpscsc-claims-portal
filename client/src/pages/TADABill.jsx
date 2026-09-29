import api, { apiRequest } from '../utils/api';
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Printer, ArrowLeft, FileSpreadsheet, MousePointer2, Receipt, Edit, Check, X, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { getTranslations } from '../utils/translations';
import { numberToWordsEnglish, numberToWordsHindi } from '../utils/numberToWords';
import ExcelJS from 'exceljs';
import logoIco from '../assets/logo.ico';

function formatPayLevelAndGradePay(emp, lang) {
    if (!emp) return '—';
    const payLevel = (emp.pay_level || '').trim();
    let gradePay = (emp.grade_pay || '').toString().trim();
    if (gradePay && !gradePay.startsWith('₹') && !gradePay.toLowerCase().startsWith('gp')) {
        gradePay = `₹${gradePay}`;
    }

    if (payLevel && gradePay) {
        return lang === 'hi'
            ? `${payLevel} / ग्रेड वेतन: ${gradePay}`
            : `${payLevel} / GP: ${gradePay}`;
    }
    if (payLevel) {
        return payLevel;
    }
    if (gradePay) {
        return lang === 'hi'
            ? `ग्रेड वेतन: ${gradePay}`
            : `GP: ${gradePay}`;
    }
    return emp.category ? `Category ${emp.category}` : '—';
}

function formatDateDMY(dStr) {
    if (!dStr) return '';
    const s = String(dStr).trim();
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return s;
    const match = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
        return `${match[3]}/${match[2]}/${match[1]}`;
    }
    return s;
}

function formatTime12Hr(tStr) {
    if (!tStr) return '';
    const s = String(tStr).trim();
    if (/am|pm/i.test(s)) return s;
    const match = s.match(/^(\d{1,2}):(\d{2})/);
    if (!match) return s;
    let hrs = parseInt(match[1], 10);
    const mins = match[2];
    const ampm = hrs >= 12 ? 'PM' : 'AM';
    hrs = hrs % 12;
    if (hrs === 0) hrs = 12;
    const hrsStr = hrs < 10 ? `0${hrs}` : `${hrs}`;
    return `${hrsStr}:${mins} ${ampm}`;
}

function formatDACount(factor, lang, compact = false) {
    const f = parseFloat(factor) || 0;
    if (f <= 0) return compact ? '' : (lang === 'hi' ? 'निरंक' : 'Nil');

    const fullCount = Math.floor(f);
    const hasHalf = (f - fullCount) >= 0.4;

    if (compact) {
        if (fullCount === 0 && hasHalf) return 'Half';
        if (fullCount === 1 && !hasHalf) return '1 Full';
        if (fullCount === 1 && hasHalf) return '1 Full Half';
        if (fullCount > 1 && !hasHalf) return `${fullCount} Full`;
        if (fullCount > 1 && hasHalf) return `${fullCount} Full Half`;
        return `${f}`;
    }

    if (fullCount === 0 && hasHalf) {
        return lang === 'hi' ? 'Half (आधा)' : 'Half';
    }
    if (fullCount === 1 && !hasHalf) {
        return lang === 'hi' ? '1 Full (1 पूर्ण)' : '1 Full';
    }
    if (fullCount === 1 && hasHalf) {
        return lang === 'hi' ? '1 Full 1 Half (1 पूर्ण 1 आधा)' : '1 Full 1 Half';
    }
    if (fullCount > 1 && !hasHalf) {
        return lang === 'hi' ? `${fullCount} Full (${fullCount} पूर्ण)` : `${fullCount} Full`;
    }
    if (fullCount > 1 && hasHalf) {
        return lang === 'hi' ? `${fullCount} Full 1 Half (${fullCount} पूर्ण 1 आधा)` : `${fullCount} Full 1 Half`;
    }
    return `${f}`;
}

function getClaimDAFactor(totals, billRows) {
    if (totals && totals.totalDAFactor !== undefined && totals.totalDAFactor !== null) {
        return totals.totalDAFactor;
    }
    if (!billRows || billRows.length === 0) return 0;
    return billRows.reduce((sum, r) => {
        const jFactor = r.da_rate > 0 ? (parseFloat(r.journey_da) || 0) / r.da_rate : 0;
        const sFactor = r.stay_rate > 0 ? (parseFloat(r.stay_da) || 0) / r.stay_rate : 0;
        return sum + jFactor + sFactor;
    }, 0);
}

export default function TADABill() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { language } = useLanguage();
    const t = getTranslations(language);
    const { user, isAdmin } = useAuth();

    // Check if accessed directly from Admin Control section (?from=admin or state.fromAdminControl)
    const searchParams = new URLSearchParams(location.search);
    const fromAdminControl = searchParams.get('from') === 'admin'
        || searchParams.get('admin') === '1'
        || location.state?.fromAdminControl === true;

    // Admin passing order toggle state (null = follow entry context: show when from Admin Control, hide when from individual login)
    const [adminPassingOrderOverride, setAdminPassingOrderOverride] = useState(null);

    // Active visibility for "2. Controlling Officer Certificate & Bill Passing Order"
    // Strictly FALSE for non-admin users (individual login) under all circumstances.
    const showPassingOrder = Boolean(isAdmin && (
        adminPassingOrderOverride !== null ? adminPassingOrderOverride : fromAdminControl
    ));

    const [loading, setLoading] = useState(true);
    const [printOrientation, setPrintOrientation] = useState(() => {
        const p = new URLSearchParams(window.location.search).get('orientation');
        return p === 'portrait' ? 'portrait' : 'landscape';
    });
    const [billData, setBillData] = useState(null);
    const [fontSize, setFontSize] = useState(9.5); // Default 9.5px for official 18-column layout
    const [showSettings, setShowSettings] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isEditingPayInfo, setIsEditingPayInfo] = useState(false);
    const [payLevelInput, setPayLevelInput] = useState('');
    const [gradePayInput, setGradePayInput] = useState('');
    const [isSavingPayInfo, setIsSavingPayInfo] = useState(false);

    // Official 18-Column widths and visibility (matching department PDF standard - exact 100% total)
    const defaultColSettings = {
        c1: { w: '5.5%', v: true, label: '1. Departure Station' },
        c2: { w: '7.0%', v: true, label: '2. Departure Date / Time' },
        c3: { w: '5.5%', v: true, label: '3. Arrival Station' },
        c4: { w: '7.0%', v: true, label: '4. Arrival Date / Time' },
        c5: { w: '15.0%', v: true, label: '5. Purpose of Journey' },
        c6: { w: '4.5%', v: true, label: '6. Transfer Description' },
        c7: { w: '3.5%', v: true, label: '7. Transfer Amount (₹)' },
        c8: { w: '5.0%', v: true, label: '8. Class of Travel Undertaken' },
        c9: { w: '3.5%', v: true, label: '9. Distance (KM)' },
        c10: { w: '6.0%', v: true, label: '10. Ticket PNR' },
        c11: { w: '4.5%', v: true, label: '11. Fare Amount (₹)' },
        c12: { w: '3.5%', v: true, label: '12. Journey DA Time (Hrs)' },
        c13: { w: '6.0%', v: true, label: '13. Journey DA Limit' },
        c14: { w: '4.5%', v: true, label: '14. Journey DA Amount (₹)' },
        c15: { w: '3.5%', v: true, label: '15. Stay DA Time (Hrs)' },
        c16: { w: '6.0%', v: true, label: '16. Stay DA Limit' },
        c17: { w: '5.0%', v: true, label: '17. Stay DA Amount (₹)' },
        c18: { w: '4.5%', v: true, label: '18. Transport Expenses (₹)' },
    };

    const [colSettings, setColSettings] = useState(defaultColSettings);

    const resizing = useRef(null);

    const handleMouseDown = (e, key) => {
        e.preventDefault();
        const thEl = e.currentTarget.parentElement;
        const currentPixelWidth = thEl ? thEl.offsetWidth : 60;
        resizing.current = {
            key,
            startX: e.pageX,
            startWidth: currentPixelWidth
        };
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = 'col-resize';
    };

    const handleMouseMove = (e) => {
        if (!resizing.current) return;
        const { key, startX, startWidth } = resizing.current;
        const diff = e.pageX - startX;
        const newWidth = Math.max(20, startWidth + diff);
        setColSettings(prev => ({
            ...prev,
            [key]: { ...prev[key], w: `${newWidth}px` }
        }));
    };

    const handleMouseUp = () => {
        resizing.current = null;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = 'default';
    };

    const fetchBillData = async () => {
        try {
            const res = await apiRequest(`/api/calculate-bill/${id}`);
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                setBillData({ error: errData.error || t.bill.billNotFound });
                setLoading(false);
                return;
            }
            const data = await res.json();
            setBillData(data);
            setLoading(false);
            const searchParams = new URLSearchParams(window.location.search);
            if (searchParams.get('print') === 'true' || searchParams.get('print') === '1') {
                setTimeout(() => {
                    window.print();
                }, 600);
            }
        } catch (err) {
            console.error(err);
            setBillData({ error: t.bill.billNotFound });
            setLoading(false);
        }
    };


    const handleStartEditPayInfo = () => {
        const currentEmp = billData?.employee;
        setPayLevelInput(currentEmp?.pay_level || '');
        setGradePayInput(currentEmp?.grade_pay || '');
        setIsEditingPayInfo(true);
    };

    const handleSavePayInfo = async () => {
        const currentEmp = billData?.employee;
        if (!currentEmp?.id) return;
        setIsSavingPayInfo(true);
        try {
            const res = await apiRequest(`/api/employees/${currentEmp.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: currentEmp.name,
                    name_hi: currentEmp.name_hi,
                    designation: currentEmp.designation,
                    category: currentEmp.category,
                    headquarters: currentEmp.headquarters,
                    basic_pay: currentEmp.basic_pay,
                    pay_level: payLevelInput,
                    grade_pay: gradePayInput
                })
            });
            if (res.ok) {
                setBillData(prev => ({
                    ...prev,
                    employee: {
                        ...prev.employee,
                        pay_level: payLevelInput,
                        grade_pay: gradePayInput
                    }
                }));
                setIsEditingPayInfo(false);
            } else {
                alert(t.messages.failedToUpdate || 'Failed to update');
            }
        } catch (err) {
            console.error(err);
            alert(t.messages.errorUpdating || 'Error updating');
        } finally {
            setIsSavingPayInfo(false);
        }
    };

    useEffect(() => {
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, []);

    useEffect(() => {
        fetchBillData();
    }, [id]);

    const handlePrint = (orientation = printOrientation) => {
        setPrintOrientation(orientation);
        const originalTitle = document.title;
        const dateStr = claim?.start_date || new Date().toISOString().split('T')[0];
        const claimTypeText = claim?.claim_type === 'TRANSFER' ? 'Transfer_TA_Bill' : 'TA_DA_Bill';
        document.title = `${dateStr}_${employee?.name || ''}_${claimTypeText}_${orientation}`;

        setTimeout(() => {
            window.print();
            setTimeout(() => {
                document.title = originalTitle;
            }, 100);
        }, 80);
    };

    const handleExportExcel = async () => {
        if (!billData) return;
        const { claim, employee, billRows, totals } = billData;
        const b = t.bill21;
        const empDisplayName = language === 'hi' && employee.name_hi ? employee.name_hi : (employee?.name || '');
        const billSubTitle = b.subTitleFor ? b.subTitleFor(empDisplayName) : (b.subTitle || '');

        const netAmount = totals.netPayable !== undefined ? totals.netPayable : (totals.grandTotal - (totals.advanceAmount || 0));
        const words = language === 'hi'
            ? (totals.amountInWordsHi || numberToWordsHindi(netAmount))
            : (totals.amountInWords || numberToWordsEnglish(netAmount));

        const defaultDaRate = billRows.find(r => r.da_rate > 0)?.da_rate 
            || billRows.find(r => r.stay_rate > 0)?.stay_rate 
            || employee?.da_rate 
            || null;
        const totalClaimDAFactor = getClaimDAFactor(totals, billRows);
        const claimDALimitText = formatDACount(totalClaimDAFactor, language);

        const wb = new ExcelJS.Workbook();
        wb.creator = 'Madhya Pradesh State Civil Supplies Corporation Limited';
        wb.lastModifiedBy = empDisplayName || 'MPSCSC';
        wb.created = new Date();
        wb.modified = new Date();

        const ws = wb.addWorksheet('TA-DA Bill', {
            views: [{ showGridLines: true }],
            pageSetup: {
                paperSize: 9, // A4
                orientation: 'landscape',
                fitToPage: true,
                fitToWidth: 1, // Scaled to fit all 21 columns on 1 page width
                fitToHeight: 0, // Natural page height flow for multi-page bills
                horizontalCentered: true,
                verticalCentered: false,
                margins: {
                    left: 0.25,
                    right: 0.25,
                    top: 0.35,
                    bottom: 0.35,
                    header: 0.2,
                    footer: 0.2
                },
                printTitlesRow: '7:9' // Repeats the 3-tier table header on every printed page
            }
        });

        // 18 Column Widths tailored to fit A4 Landscape perfectly without any text clipping
        ws.columns = [
            { width: 14 }, // 1. Station (Departure)
            { width: 17 }, // 2. Date / Time (Departure)
            { width: 14 }, // 3. Station (Arrival)
            { width: 17 }, // 4. Date / Time (Arrival)
            { width: 30 }, // 5. Purpose of Journey
            { width: 16 }, // 6. Transfer Description
            { width: 12 }, // 7. Transfer Amount
            { width: 14 }, // 8. Class of Travel Undertaken
            { width: 10 }, // 9. Distance (KM)
            { width: 16 }, // 10. Ticket PNR
            { width: 12 }, // 11. Fare Amount
            { width: 11 }, // 12. Journey DA Time (Hrs)
            { width: 14 }, // 13. Journey DA Limit
            { width: 13 }, // 14. Journey DA Amount
            { width: 11 }, // 15. Stay DA Time (Hrs)
            { width: 14 }, // 16. Stay DA Limit
            { width: 13 }, // 17. Stay DA Amount
            { width: 14 }  // 18. Transport Expenses
        ];

        const fontName = 'Calibri';
        const thinBorder = {
            top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
            left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
            bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
            right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
        };
        const blackThinBorder = {
            top: { style: 'thin', color: { argb: 'FF000000' } },
            left: { style: 'thin', color: { argb: 'FF000000' } },
            bottom: { style: 'thin', color: { argb: 'FF000000' } },
            right: { style: 'thin', color: { argb: 'FF000000' } }
        };
        const doubleBottomBorder = {
            top: { style: 'thin', color: { argb: 'FF000000' } },
            left: { style: 'thin', color: { argb: 'FF000000' } },
            bottom: { style: 'double', color: { argb: 'FF000000' } },
            right: { style: 'thin', color: { argb: 'FF000000' } }
        };

        const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
        const colNumFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
        const totalRowFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
        const summaryBannerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };

        function styleRange(sRow, sCol, eRow, eCol, { font, fill, border, alignment, numFmt }) {
            for (let r = sRow; r <= eRow; r++) {
                const row = ws.getRow(r);
                for (let c = sCol; c <= eCol; c++) {
                    const cell = row.getCell(c);
                    if (font) cell.font = font;
                    if (fill) cell.fill = fill;
                    if (border) cell.border = border;
                    if (alignment) cell.alignment = alignment;
                    if (numFmt) cell.numFmt = numFmt;
                }
            }
        }

        // Row 1: Title
        ws.mergeCells(1, 1, 1, 18);
        ws.getCell(1, 1).value = b.title;
        ws.getRow(1).height = 26;
        styleRange(1, 1, 1, 18, {
            font: { name: fontName, size: 14, bold: true, color: { argb: 'FF000000' } },
            alignment: { horizontal: 'center', vertical: 'middle' }
        });

        // Row 2: Subtitle
        const dateRangeText = language === 'hi'
            ? `${formatDateDMY(employee.start_date || claim.start_date || '_________')} ${b.periodFrom} ${formatDateDMY(employee.end_date || claim.end_date || '_________')} ${b.periodTo}`
            : `${formatDateDMY(employee.start_date || claim.start_date || '_________')} ${b.periodTo} ${formatDateDMY(employee.end_date || claim.end_date || '_________')}`;
        ws.mergeCells(2, 1, 2, 18);
        ws.getCell(2, 1).value = `${billSubTitle} (${b.periodLabel}: ${dateRangeText})`;
        ws.getRow(2).height = 20;
        styleRange(2, 1, 2, 18, {
            font: { name: fontName, size: 11, bold: true, color: { argb: 'FF000000' } },
            alignment: { horizontal: 'center', vertical: 'middle' }
        });

        // Row 3: Spacing
        ws.getRow(3).height = 8;

        // Rows 4 & 5: Top 6-Field Box
        ws.mergeCells(4, 1, 4, 5);
        ws.getCell(4, 1).value = `${b.name}: ${empDisplayName}`;
        ws.mergeCells(4, 6, 4, 11);
        ws.getCell(4, 6).value = `${b.gradePay}: ${formatPayLevelAndGradePay(employee, language)}`;
        ws.mergeCells(4, 12, 4, 18);
        ws.getCell(4, 12).value = `${b.fixedTA} ₹: ${employee.fixed_ta ? employee.fixed_ta : '-'}`;

        ws.mergeCells(5, 1, 5, 5);
        ws.getCell(5, 1).value = `${b.designation}: ${employee.designation || '—'}`;
        ws.mergeCells(5, 6, 5, 11);
        ws.getCell(5, 6).value = `${b.headquarter}: ${employee.headquarters || '—'}`;
        ws.mergeCells(5, 12, 5, 18);
        ws.getCell(5, 12).value = `${b.consolidatedDA}: ${defaultDaRate ? '₹' + defaultDaRate : '-'}`;

        ws.getRow(4).height = 22;
        ws.getRow(5).height = 22;
        styleRange(4, 1, 5, 18, {
            font: { name: fontName, size: 9.5, color: { argb: 'FF000000' } },
            border: blackThinBorder,
            alignment: { horizontal: 'left', vertical: 'middle', wrapText: true }
        });

        // Row 6: Currency indicator
        ws.getCell(6, 18).value = b.amountInRupees;
        ws.getCell(6, 18).font = { name: fontName, size: 8.5, bold: true, italic: true, color: { argb: 'FF333333' } };
        ws.getCell(6, 18).alignment = { horizontal: 'right', vertical: 'middle' };
        ws.getRow(6).height = 16;

        // Row 7: Header Tier 1 (Groups)
        ws.mergeCells(7, 1, 7, 4);
        ws.getCell(7, 1).value = b.journeyAndHaltTitle;
        ws.mergeCells(7, 5, 8, 5);
        ws.getCell(7, 5).value = b.purpose;
        ws.mergeCells(7, 6, 7, 7);
        ws.getCell(7, 6).value = b.transferFamilyTitle;
        ws.mergeCells(7, 8, 7, 11);
        ws.getCell(7, 8).value = b.fareSectionTitle;
        ws.mergeCells(7, 12, 7, 17);
        ws.getCell(7, 12).value = b.allowancesTitle;
        ws.mergeCells(7, 18, 8, 18);
        ws.getCell(7, 18).value = b.transportExp;
        ws.getRow(7).height = 28;

        // Row 8: Header Tier 2 (Sub-headers)
        ws.getCell(8, 1).value = `${b.departure.place}`;
        ws.getCell(8, 2).value = `${b.departure.dateTime}`;
        ws.getCell(8, 3).value = `${b.arrival.place}`;
        ws.getCell(8, 4).value = `${b.arrival.dateTime}`;
        ws.getCell(8, 6).value = b.transferDescription;
        ws.getCell(8, 7).value = b.transferAmount;
        ws.getCell(8, 8).value = b.classOfTravel;
        ws.getCell(8, 9).value = b.distanceKm;
        ws.getCell(8, 10).value = b.ticketCountOrNo;
        ws.getCell(8, 11).value = b.fareAmount;
        ws.getCell(8, 12).value = b.journeyDA.hrs;
        ws.getCell(8, 13).value = b.journeyDA.rate;
        ws.getCell(8, 14).value = b.journeyDA.amount;
        ws.getCell(8, 15).value = b.haltDA.hrs;
        ws.getCell(8, 16).value = b.haltDA.rate;
        ws.getCell(8, 17).value = b.haltDA.amount;
        ws.getRow(8).height = 28;

        styleRange(7, 1, 8, 18, {
            font: { name: fontName, size: 9, bold: true, color: { argb: 'FF000000' } },
            fill: headerFill,
            border: blackThinBorder,
            alignment: { horizontal: 'center', vertical: 'middle', wrapText: true }
        });

        // Row 9: Header Tier 3 (Numbers 1-18)
        ws.getRow(9).height = 18;
        for (let c = 1; c <= 18; c++) {
            const cell = ws.getCell(9, c);
            cell.value = c;
            cell.font = { name: fontName, size: 8, bold: true, color: { argb: 'FF334155' } };
            cell.fill = colNumFill;
            cell.border = blackThinBorder;
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
        }

        // Pre-calculate purpose merges
        const mergeInfo = [];
        let mIdx = 0;
        while (mIdx < billRows.length) {
            if (mIdx === 0 || !billRows[mIdx].merge_purpose) {
                let span = 1;
                while (mIdx + span < billRows.length && billRows[mIdx + span].merge_purpose) {
                    span++;
                }
                mergeInfo[mIdx] = { isChild: false, span };
                for (let s = 1; s < span; s++) {
                    mergeInfo[mIdx + s] = { isChild: true, span: 0 };
                }
                mIdx += span;
            } else {
                mergeInfo[mIdx] = { isChild: false, span: 1 };
                mIdx++;
            }
        }

        // Rows 10+: Data Rows
        let curRow = 10;
        billRows.forEach((r, idx) => {
            const row = ws.getRow(curRow);
            row.height = 24;

            const isTransfer = claim.claim_type === 'TRANSFER';
            const transferDesc = idx === 0 && isTransfer
                ? (((totals.transferGrant > 0 ? `मिश्रित अनुदान: ₹${totals.transferGrant}. ` : '') +
                    (totals.totalTransport > 0 ? `सामग्री परिवहन: ₹${totals.totalTransport}. ` : '') +
                    (claim.family_details ? claim.family_details + ' ' : '') +
                    (claim.baggage_weight ? `(${claim.baggage_weight} कि.ग्रा.)` : '')).trim())
                : '';
            const transferAmt = idx === 0 && isTransfer ? (parseFloat(totals.transferAllowance || totals.totalTransport) || null) : null;
            const jFactor = r.da_rate > 0 ? (parseFloat(r.journey_da) || 0) / r.da_rate : 0;
            const sFactor = r.stay_rate > 0 ? (parseFloat(r.stay_da) || 0) / r.stay_rate : 0;

            row.getCell(1).value = r.departure_station || '';
            row.getCell(1).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };

            row.getCell(2).value = formatDateDMY(r.departure_date) + (r.departure_time ? '\n' + formatTime12Hr(r.departure_time) : '');
            row.getCell(2).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

            row.getCell(3).value = r.arrival_station || '';
            row.getCell(3).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };

            row.getCell(4).value = formatDateDMY(r.arrival_date) + (r.arrival_time ? '\n' + formatTime12Hr(r.arrival_time) : '');
            row.getCell(4).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

            // Purpose cell with vertical merge support
            const mInfo = mergeInfo[idx] || { isChild: false, span: 1 };
            if (!mInfo.isChild) {
                if (mInfo.span > 1) {
                    ws.mergeCells(curRow, 5, curRow + mInfo.span - 1, 5);
                }
                row.getCell(5).value = r.purpose || '—';
            }
            row.getCell(5).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };

            row.getCell(6).value = transferDesc;
            row.getCell(6).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };

            row.getCell(7).value = transferAmt;
            row.getCell(7).numFmt = '#,##0.00';
            row.getCell(7).alignment = { horizontal: 'right', vertical: 'middle' };

            row.getCell(8).value = r.mode + (r.class_of_travel ? ` (${r.class_of_travel})` : '');
            row.getCell(8).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

            row.getCell(9).value = r.distance_km ? parseFloat(r.distance_km) : null;
            row.getCell(9).alignment = { horizontal: 'center', vertical: 'middle' };

            row.getCell(10).value = r.ticket_no || '';
            row.getCell(10).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

            const fareVal = parseFloat(r.ta_approved || r.fare_amount || 0);
            row.getCell(11).value = fareVal > 0 ? fareVal : null;
            row.getCell(11).numFmt = '#,##0.00';
            row.getCell(11).alignment = { horizontal: 'right', vertical: 'middle' };

            row.getCell(12).value = r.travel_hrs !== '0.0' && r.travel_hrs ? parseFloat(r.travel_hrs) : null;
            row.getCell(12).alignment = { horizontal: 'center', vertical: 'middle' };

            row.getCell(13).value = jFactor > 0 ? formatDACount(jFactor, language, true) : '';
            row.getCell(13).alignment = { horizontal: 'center', vertical: 'middle' };

            const jAmt = parseFloat(r.journey_da || 0);
            row.getCell(14).value = jAmt > 0 ? jAmt : null;
            row.getCell(14).numFmt = '#,##0.00';
            row.getCell(14).alignment = { horizontal: 'right', vertical: 'middle' };

            row.getCell(15).value = r.stay_hrs !== '0.0' && r.stay_hrs ? parseFloat(r.stay_hrs) : null;
            row.getCell(15).alignment = { horizontal: 'center', vertical: 'middle' };

            row.getCell(16).value = sFactor > 0 ? formatDACount(sFactor, language, true) : '';
            row.getCell(16).alignment = { horizontal: 'center', vertical: 'middle' };

            const sAmt = parseFloat(r.stay_da || 0);
            row.getCell(17).value = sAmt > 0 ? sAmt : null;
            row.getCell(17).numFmt = '#,##0.00';
            row.getCell(17).alignment = { horizontal: 'right', vertical: 'middle' };

            const locTrans = parseFloat(r.local_transport || 0);
            row.getCell(18).value = locTrans > 0 ? locTrans : null;
            row.getCell(18).numFmt = '#,##0.00';
            row.getCell(18).alignment = { horizontal: 'right', vertical: 'middle' };

            for (let c = 1; c <= 18; c++) {
                const cell = row.getCell(c);
                if (!cell.font) cell.font = { name: fontName, size: 9 };
                cell.border = thinBorder;
            }

            curRow++;
        });

        // Grand Total Row
        ws.mergeCells(curRow, 1, curRow, 5);
        ws.getCell(curRow, 1).value = `${b.grossTotal}:`;
        ws.getCell(curRow, 1).alignment = { horizontal: 'right', vertical: 'middle' };

        ws.getCell(curRow, 7).value = (claim.claim_type === 'TRANSFER' && (totals.transferAllowance || totals.totalTransport)) ? parseFloat(totals.transferAllowance || totals.totalTransport) : null;
        ws.getCell(curRow, 7).numFmt = '#,##0.00';

        ws.getCell(curRow, 11).value = totals.totalFare ? parseFloat(totals.totalFare) : null;
        ws.getCell(curRow, 11).numFmt = '#,##0.00';

        ws.getCell(curRow, 14).value = totals.totalJourneyDA ? parseFloat(totals.totalJourneyDA) : null;
        ws.getCell(curRow, 14).numFmt = '#,##0.00';

        ws.getCell(curRow, 17).value = totals.totalStayDA ? parseFloat(totals.totalStayDA) : null;
        ws.getCell(curRow, 17).numFmt = '#,##0.00';

        ws.getCell(curRow, 18).value = totals.totalLocalTransport > 0 ? parseFloat(totals.totalLocalTransport) : null;
        ws.getCell(curRow, 18).numFmt = '#,##0.00';

        ws.getRow(curRow).height = 22;
        styleRange(curRow, 1, curRow, 18, {
            font: { name: fontName, size: 9, bold: true, color: { argb: 'FF000000' } },
            fill: totalRowFill,
            border: doubleBottomBorder
        });
        curRow++;

        // Summary Row: Consolidated DA Limit
        ws.mergeCells(curRow, 1, curRow, 4);
        ws.getCell(curRow, 1).value = `${b.consolidatedDALimit}: ${claimDALimitText}`;
        ws.getRow(curRow).height = 22;
        styleRange(curRow, 1, curRow, 18, {
            font: { name: fontName, size: 9.5, bold: true, color: { argb: 'FF1E3A8A' } },
            fill: summaryBannerFill,
            border: blackThinBorder,
            alignment: { horizontal: 'left', vertical: 'middle' }
        });
        curRow += 2;

        // Deductions & Net Payable Box (Cols 11 to 18)
        ws.mergeCells(curRow, 11, curRow, 14);
        ws.getCell(curRow, 11).value = `${b.grossTotal}:`;
        ws.mergeCells(curRow, 15, curRow, 18);
        ws.getCell(curRow, 15).value = totals.grandTotal ? parseFloat(totals.grandTotal) : 0;
        ws.getCell(curRow, 15).numFmt = '#,##0.00';
        ws.getRow(curRow).height = 20;
        styleRange(curRow, 11, curRow, 18, {
            font: { name: fontName, size: 9, bold: true },
            border: thinBorder,
            alignment: { horizontal: 'right', vertical: 'middle' }
        });
        curRow++;

        ws.mergeCells(curRow, 11, curRow, 14);
        ws.getCell(curRow, 11).value = `${b.lessAdvance}:`;
        ws.mergeCells(curRow, 15, curRow, 18);
        ws.getCell(curRow, 15).value = totals.advanceAmount ? parseFloat(totals.advanceAmount) : 0;
        ws.getCell(curRow, 15).numFmt = '#,##0.00';
        ws.getRow(curRow).height = 20;
        styleRange(curRow, 11, curRow, 18, {
            font: { name: fontName, size: 9, bold: true },
            border: thinBorder,
            alignment: { horizontal: 'right', vertical: 'middle' }
        });
        curRow++;

        ws.mergeCells(curRow, 11, curRow, 14);
        ws.getCell(curRow, 11).value = `${b.netPayable}:`;
        ws.mergeCells(curRow, 15, curRow, 18);
        ws.getCell(curRow, 15).value = netAmount ? parseFloat(netAmount) : 0;
        ws.getCell(curRow, 15).numFmt = '#,##0.00';
        ws.getRow(curRow).height = 20;
        styleRange(curRow, 11, curRow, 18, {
            font: { name: fontName, size: 9.5, bold: true },
            border: thinBorder,
            alignment: { horizontal: 'right', vertical: 'middle' }
        });
        curRow++;

        ws.mergeCells(curRow, 11, curRow, 18);
        ws.getCell(curRow, 11).value = `${b.amountInWordsLabel}: ${words}`;
        ws.getRow(curRow).height = 24;
        styleRange(curRow, 11, curRow, 18, {
            font: { name: fontName, size: 9, bold: true },
            border: blackThinBorder,
            alignment: { horizontal: 'left', vertical: 'middle', wrapText: true }
        });
        curRow += 2;

        // Official Certificates
        ws.mergeCells(curRow, 1, curRow, 18);
        ws.getCell(curRow, 1).value = b.certificatesTitle;
        ws.getCell(curRow, 1).font = { name: fontName, size: 9.5, bold: true, underline: true };
        ws.getRow(curRow).height = 18;
        curRow++;

        const excelPnrTickets = billRows
            .map(r => (r.ticket_no || '').trim())
            .filter(t => t && (t.length > 2 || isNaN(Number(t))));
        const excelDisplayTickets = excelPnrTickets.length > 0
            ? excelPnrTickets.map((t, idx) => `${idx + 1}. ${t}`).join(' ')
            : (billRows.map(r => r.ticket_no).filter(Boolean).map((t, idx) => `${idx + 1}. ${t}`).join(' ') || '');

        const cert1Text = `${b.cert1} ${excelDisplayTickets}`;
        [cert1Text, b.cert2, b.cert3, b.cert4].forEach(cert => {
            ws.mergeCells(curRow, 1, curRow, 18);
            ws.getCell(curRow, 1).value = cert;
            ws.getCell(curRow, 1).font = { name: fontName, size: 8.5 };
            ws.getCell(curRow, 1).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
            ws.getRow(curRow).height = 18;
            curRow++;
        });
        curRow++;

        // Signatures
        const signRow = curRow;
        ws.mergeCells(signRow, 1, signRow, 7);
        ws.getCell(signRow, 1).value = `${b.place}: ${employee.headquarters || '__________'}`;
        ws.getCell(signRow, 1).font = { name: fontName, size: 9, bold: true };

        ws.mergeCells(signRow, 11, signRow, 18);
        ws.getCell(signRow, 11).value = `${b.claimantSignature}: ${empDisplayName}`;
        ws.getCell(signRow, 11).font = { name: fontName, size: 9, bold: true };
        ws.getCell(signRow, 11).alignment = { horizontal: 'right', vertical: 'middle' };
        ws.getRow(signRow).height = 20;
        curRow++;

        ws.mergeCells(curRow, 1, curRow, 7);
        ws.getCell(curRow, 1).value = `${b.date}: ${formatDateDMY(claim.declaration_date || claim.end_date || '__________')}`;
        ws.getCell(curRow, 1).font = { name: fontName, size: 9, bold: true };
        ws.getRow(curRow).height = 20;

        // Generate binary buffer & trigger direct browser download
        const buffer = await wb.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        const safeEmpName = (employee?.name || 'Employee').replace(/[^\w\p{Script=Devanagari}]/gu, '_');
        anchor.download = `TADA_Bill_${safeEmpName}_${id}.xlsx`;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        window.URL.revokeObjectURL(url);
    };

    const handleSubmit = async () => {
        if (!billData || isSubmitting) return;
        if (!window.confirm(t.common.confirmSubmit)) return;

        setIsSubmitting(true);
        try {
            const res = await apiRequest(`/api/claims/${id}/submit`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ total_amount: billData.totals.grandTotal })
            });
            if (res.ok) {
                alert(t.messages.dataSaved);
                fetchBillData();
            } else {
                alert(t.messages.errorSaving);
            }
        } catch (err) {
            console.error(err);
            alert(t.messages.errorSaving);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) return <div style={{ padding: '2rem' }}>{t.bill.loadingBill}</div>;
    if (!billData || billData.error || !billData.totals) {
        return (
            <div className="card" style={{ margin: '2rem auto', maxWidth: '600px', padding: '2rem', textAlign: 'center' }}>
                <h3 style={{ color: '#dc2626', marginBottom: '1rem' }}>
                    {billData?.error || t.bill.billNotFound}
                </h3>
                <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
                    {language === 'hi'
                        ? 'यह यात्रा देयक उपलब्ध नहीं है अथवा हटा दिया गया है।'
                        : 'This travelling allowance bill could not be found or has been removed.'}
                </p>
                <button onClick={() => navigate('/claims')} className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ArrowLeft size={18} /> {t.common.back}
                </button>
            </div>
        );
    }

    const { claim, employee, billRows, totals } = billData;
    const b = t.bill21;
    const empDisplayName = language === 'hi' && employee?.name_hi ? employee.name_hi : (employee?.name || '');
    const billSubTitle = b.subTitleFor ? b.subTitleFor(empDisplayName) : (b.subTitle || '');

    const netAmount = totals.netPayable !== undefined ? totals.netPayable : (totals.grandTotal - (totals.advanceAmount || 0));
    const words = language === 'hi'
        ? (totals.amountInWordsHi || numberToWordsHindi(netAmount))
        : (totals.amountInWords || numberToWordsEnglish(netAmount));

    const pnrTickets = billRows
        .map(r => (r.ticket_no || '').trim())
        .filter(t => t && (t.length > 2 || isNaN(Number(t))));
    const formattedTicketsList = pnrTickets.length > 0
        ? pnrTickets.map((t, idx) => `${idx + 1}. ${t}`).join(' ')
        : (billRows.map(r => r.ticket_no).filter(Boolean).map((t, idx) => `${idx + 1}. ${t}`).join(' ') || '');
    const pnrList = formattedTicketsList;

    const defaultDaRate = billRows.find(r => r.da_rate > 0)?.da_rate 
        || billRows.find(r => r.stay_rate > 0)?.stay_rate 
        || employee?.da_rate 
        || null;
    const totalClaimDAFactor = getClaimDAFactor(totals, billRows);
    const claimDALimitText = formatDACount(totalClaimDAFactor, language);

    return (
        <div style={{ padding: '1rem' }}>
            {/* Action Bar (No Print) */}
            <div className="no-print" style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <button onClick={() => fromAdminControl ? navigate('/admin/claims') : navigate('/claims')} className="btn btn-secondary">
                    <ArrowLeft size={18} /> {t.common.back}
                </button>
                <button
                    type="button"
                    onClick={() => navigate(`/claims/${id}/tour-diary`)}
                    className="btn btn-outline-primary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                >
                    <FileSpreadsheet size={18} /> {language === 'hi' ? 'दौरा डायरी देखें' : 'View Tour Diary'}
                </button>
                {/* Admin Control Passing Order Indicator & Toggle (Admin Only) */}
                {isAdmin && (
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '7px',
                        padding: '3px 8px',
                        borderRadius: '8px',
                        background: showPassingOrder ? '#eff6ff' : '#f8fafc',
                        border: showPassingOrder ? '1px solid #93c5fd' : '1px solid #cbd5e1',
                        fontSize: '12px'
                    }}>
                        <ShieldCheck size={16} color={showPassingOrder ? '#2563eb' : '#64748b'} />
                        <span style={{ fontWeight: '600', color: showPassingOrder ? '#1e40af' : '#475569' }}>
                            {language === 'hi' ? 'एडमिन कंट्रोल:' : 'Admin Control:'}
                        </span>
                        <button
                            type="button"
                            onClick={() => setAdminPassingOrderOverride(!showPassingOrder)}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '3px 8px',
                                borderRadius: '5px',
                                border: 'none',
                                background: showPassingOrder ? '#2563eb' : '#e2e8f0',
                                color: showPassingOrder ? '#ffffff' : '#334155',
                                cursor: 'pointer',
                                fontSize: '11px',
                                fontWeight: '600',
                                transition: 'all 0.15s ease'
                            }}
                            title={showPassingOrder
                                ? (language === 'hi' ? 'देयक पारित आदेश छिपाएं (कर्मचारी प्रति)' : 'Hide Bill Passing Order (Claimant Copy)')
                                : (language === 'hi' ? 'देयक पारित आदेश दिखाएं (एडमिन कंट्रोल)' : 'Show Bill Passing Order (Admin Control)')
                            }
                        >
                            {showPassingOrder ? <EyeOff size={13} /> : <Eye size={13} />}
                            {showPassingOrder
                                ? (language === 'hi' ? 'पारित आदेश सक्रिय (छिपाएं)' : 'Passing Order Shown (Hide)')
                                : (language === 'hi' ? 'पारित आदेश छिपा है (दिखाएं)' : 'Passing Order Hidden (Show)')
                            }
                        </button>
                    </div>
                )}
                {/* Print Orientation Selector Toggle */}
                <div style={{ display: 'inline-flex', alignItems: 'center', background: '#f1f5f9', padding: '3px', borderRadius: '8px', border: '1px solid #cbd5e1', gap: '3px' }}>
                    <button
                        type="button"
                        onClick={() => setPrintOrientation('landscape')}
                        title={language === 'hi' ? 'A4 लैंडस्केप (एकल पृष्ठ) में प्रिंट करें' : 'Print in A4 Landscape (Single Page)'}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '5px 10px',
                            fontSize: '12.5px',
                            fontWeight: printOrientation === 'landscape' ? '600' : '500',
                            borderRadius: '6px',
                            border: 'none',
                            background: printOrientation === 'landscape' ? '#1e3a8a' : 'transparent',
                            color: printOrientation === 'landscape' ? '#ffffff' : '#475569',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                        }}
                    >
                        <span style={{ display: 'inline-block', width: '13px', height: '9px', border: '1.5px solid currentColor', borderRadius: '1.5px' }}></span>
                        {language === 'hi' ? 'A4 लैंडस्केप' : 'A4 Landscape'}
                        <span style={{ fontSize: '10px', opacity: 0.95, background: printOrientation === 'landscape' ? '#22c55e' : '#e2e8f0', color: printOrientation === 'landscape' ? '#fff' : '#475569', padding: '1px 5px', borderRadius: '4px', fontWeight: 'bold' }}>
                            {language === 'hi' ? 'अनुशंसित (1 पृष्ठ)' : 'Rec. (1 Page)'}
                        </span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setPrintOrientation('portrait')}
                        title={language === 'hi' ? 'फॉर्म 21 देयक A4 पोर्ट्रेट में प्रिंट करें' : 'Print Form 21 Bill in A4 Portrait'}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '5px 10px',
                            fontSize: '12.5px',
                            fontWeight: printOrientation === 'portrait' ? '600' : '500',
                            borderRadius: '6px',
                            border: 'none',
                            background: printOrientation === 'portrait' ? '#1e3a8a' : 'transparent',
                            color: printOrientation === 'portrait' ? '#ffffff' : '#475569',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                        }}
                    >
                        <span style={{ display: 'inline-block', width: '9px', height: '13px', border: '1.5px solid currentColor', borderRadius: '1.5px' }}></span>
                        {language === 'hi' ? 'A4 पोर्ट्रेट' : 'A4 Portrait'}
                    </button>
                </div>
                <button type="button" onClick={() => handlePrint(printOrientation)} className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: '600' }}>
                    <Printer size={18} /> {language === 'hi' ? `प्रिंट (A4 ${printOrientation === 'landscape' ? 'लैंडस्केप' : 'पोर्ट्रेट'})` : `Print (A4 ${printOrientation === 'landscape' ? 'Landscape' : 'Portrait'})`}
                </button>
                <button onClick={handleExportExcel} className="btn btn-success">
                    <FileSpreadsheet size={18} /> {t.common.export} Excel
                </button>
                {claim.status !== 'SUBMITTED' ? (
                    <button onClick={handleSubmit} className="btn btn-primary" disabled={isSubmitting} style={{ background: '#2563eb' }}>
                        {isSubmitting ? t.common.saving : t.common.finalSubmit}
                    </button>
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#dcfce7', color: '#166534', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #bbf7d0', fontWeight: 'bold' }}>
                        <Receipt size={18} /> {t.common.submitted}
                    </div>
                )}
                <div className="glass-control-bar" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '8px' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: '600' }}>{language === 'hi' ? 'फ़ॉन्ट आकार:' : 'Font Size:'}</label>
                    <input
                        type="range"
                        min="7"
                        max="12"
                        step="0.5"
                        value={fontSize}
                        onChange={(e) => setFontSize(parseFloat(e.target.value))}
                        style={{ width: '90px' }}
                    />
                    <span style={{ fontSize: '0.8rem', minWidth: '30px' }}>{fontSize}px</span>
                    <button
                        className="btn btn-sm btn-outline-secondary"
                        style={{ marginLeft: '0.5rem' }}
                        onClick={() => setColSettings(defaultColSettings)}
                    >
                        Reset Widths
                    </button>
                    <button
                        className="btn btn-sm btn-secondary"
                        style={{ marginLeft: '0.5rem' }}
                        onClick={() => setShowSettings(!showSettings)}
                    >
                        {showSettings ? 'Hide Columns' : 'Column Settings'}
                    </button>
                </div>
            </div>

            {/* Column Customizer Panel */}
            {showSettings && (
                <div className="card no-print glass-control-bar" style={{ marginBottom: '1rem', padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <h5 style={{ margin: 0, fontSize: '0.95rem' }}>Column Visibility & Width Settings (Columns 1 to 18)</h5>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                            <MousePointer2 size={13} style={{ verticalAlign: 'middle' }} /> Drag column headers in the table to resize.
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '6px' }}>
                        {Object.keys(colSettings).map(key => (
                            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', border: '1px solid #e2e8f0', padding: '3px 6px', borderRadius: '4px', background: 'white' }}>
                                <input
                                    type="checkbox"
                                    id={`vis-${key}`}
                                    checked={colSettings[key].v}
                                    onChange={(e) => setColSettings({ ...colSettings, [key]: { ...colSettings[key], v: e.target.checked } })}
                                />
                                <label htmlFor={`vis-${key}`} style={{ cursor: 'pointer', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {colSettings[key].label}
                                </label>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Official Treasury Form 21 Container */}
            <div className="bill-print-container" style={{
                background: 'white',
                padding: '16px 20px',
                maxWidth: '1240px',
                margin: '0 auto',
                fontSize: `${fontSize}px`,
                border: 'none',
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.08)',
                borderRadius: '4px',
                fontFamily: "'Inter', 'Noto Sans Devanagari', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif",
                color: 'black',
                boxSizing: 'border-box'
            }}>
                {/* Official Title Line */}
                <div className="bill-title-header" style={{ position: 'relative', textAlign: 'center', marginBottom: '8px', paddingBottom: '4px' }}>
                    <img
                        src={logoIco}
                        alt="MPSCSC Logo"
                        className="print-logo"
                        style={{
                            position: 'absolute',
                            left: '4px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            width: '46px',
                            height: '46px',
                            minWidth: '46px',
                            minHeight: '46px',
                            objectFit: 'contain'
                        }}
                    />
                    <div style={{ padding: '0 52px' }}>
                        <h2 className="bill-main-title" style={{ margin: '0', fontSize: '16px', fontWeight: 'bold', letterSpacing: '0.4px', textTransform: 'uppercase' }}>
                            {b.title}
                        </h2>
                        <div className="bill-sub-title" style={{ margin: '3px 0 0 0', fontSize: '13px', textDecoration: 'underline' }}>
                            <strong>{billSubTitle}</strong> ({b.periodLabel}: {formatDateDMY(claim.start_date || employee.start_date || billRows[0]?.departure_date)} {b.periodTo} {formatDateDMY(claim.end_date || employee.end_date || billRows[billRows.length - 1]?.arrival_date)})
                        </div>
                    </div>
                </div>

                {/* 3-Column Official Metadata Box (Matching PDF Standard) */}
                <div className="form21-meta-box" style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    fontSize: '11px',
                    lineHeight: '1.4',
                    marginBottom: '4px',
                    border: '1px solid black'
                }}>
                    {/* Column 1: Name & Designation */}
                    <div style={{ padding: '4px 8px', borderRight: '1px solid black' }}>
                        <div style={{ marginBottom: '3px' }}>
                            <strong>{b.name}:</strong> {empDisplayName}
                        </div>
                        <div>
                            <strong>{b.designation}:</strong> {employee.designation || '—'}
                        </div>
                    </div>

                    {/* Column 2: Grade Pay / Pay Level & Headquarters */}
                    <div style={{ padding: '4px 8px', borderRight: '1px solid black' }}>
                        <div style={{ marginBottom: '3px', display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                            <strong>{b.gradePay}:</strong>{' '}
                            {isEditingPayInfo ? (
                                <span className="no-print" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                    <input
                                        type="text"
                                        className="form-input"
                                        style={{ width: '80px', height: '20px', fontSize: '10px', padding: '1px 4px' }}
                                        placeholder="e.g. Level 12 / C"
                                        value={payLevelInput}
                                        onChange={(e) => setPayLevelInput(e.target.value)}
                                        title={t.employees.payLevel}
                                    />
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-success"
                                        style={{ padding: '0 4px', height: '20px' }}
                                        onClick={handleSavePayInfo}
                                        disabled={isSavingPayInfo}
                                        title={t.common.save}
                                    >
                                        <Check size={11} />
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-secondary"
                                        style={{ padding: '0 4px', height: '20px' }}
                                        onClick={() => setIsEditingPayInfo(false)}
                                        disabled={isSavingPayInfo}
                                        title={t.common.cancel}
                                    >
                                        <X size={11} />
                                    </button>
                                </span>
                            ) : (
                                <span>
                                    {formatPayLevelAndGradePay(employee, language)}
                                    <button
                                        type="button"
                                        className="btn-text no-print"
                                        onClick={handleStartEditPayInfo}
                                        style={{
                                            marginLeft: '4px',
                                            color: '#2563eb',
                                            cursor: 'pointer',
                                            background: 'none',
                                            border: 'none',
                                            padding: 0,
                                            verticalAlign: 'middle'
                                        }}
                                        title={language === 'hi' ? 'वेतन स्तर और ग्रेड वेतन दर्ज/संपादित करें' : 'Enter/Edit Pay Level & Grade Pay'}
                                    >
                                        <Edit size={11} />
                                    </button>
                                </span>
                            )}
                        </div>
                        <div>
                            <strong>{b.headquarter}:</strong> {employee.headquarters || '—'}
                        </div>
                    </div>

                    {/* Column 3: Fixed TA & Consolidated DA Rate */}
                    <div style={{ padding: '4px 8px' }}>
                        <div style={{ marginBottom: '3px' }}>
                            <strong>{b.fixedTA}:</strong> {employee.fixed_ta ? employee.fixed_ta : ' - '}
                        </div>
                        <div>
                            <strong>{b.consolidatedDA}:</strong> {defaultDaRate ? `₹${defaultDaRate}` : 'Nil'}
                        </div>
                    </div>
                </div>

                {/* Currency Unit Indicator */}
                <div style={{ textAlign: 'right', fontSize: '9.5px', fontWeight: 'bold', marginBottom: '2px' }}>
                    {b.amountInRupees}
                </div>

                {/* The Prescribed 18-Column Table (Matching Official Department Standard) */}
                <div className="table-scroll-wrapper" style={{ width: '100%', overflowX: 'hidden' }}>
                    <table className="bill-21-table">
                        <colgroup>
                            {colSettings.c1.v && <col className="col-c1" style={{ width: colSettings.c1.w }} />}
                            {colSettings.c2.v && <col className="col-c2" style={{ width: colSettings.c2.w }} />}
                            {colSettings.c3.v && <col className="col-c3" style={{ width: colSettings.c3.w }} />}
                            {colSettings.c4.v && <col className="col-c4" style={{ width: colSettings.c4.w }} />}
                            {colSettings.c5.v && <col className="col-c5" style={{ width: colSettings.c5.w }} />}
                            {colSettings.c6.v && <col className="col-c6" style={{ width: colSettings.c6.w }} />}
                            {colSettings.c7.v && <col className="col-c7" style={{ width: colSettings.c7.w }} />}
                            {colSettings.c8.v && <col className="col-c8" style={{ width: colSettings.c8.w }} />}
                            {colSettings.c9.v && <col className="col-c9" style={{ width: colSettings.c9.w }} />}
                            {colSettings.c10.v && <col className="col-c10" style={{ width: colSettings.c10.w }} />}
                            {colSettings.c11.v && <col className="col-c11" style={{ width: colSettings.c11.w }} />}
                            {colSettings.c12.v && <col className="col-c12" style={{ width: colSettings.c12.w }} />}
                            {colSettings.c13.v && <col className="col-c13" style={{ width: colSettings.c13.w }} />}
                            {colSettings.c14.v && <col className="col-c14" style={{ width: colSettings.c14.w }} />}
                            {colSettings.c15.v && <col className="col-c15" style={{ width: colSettings.c15.w }} />}
                            {colSettings.c16.v && <col className="col-c16" style={{ width: colSettings.c16.w }} />}
                            {colSettings.c17.v && <col className="col-c17" style={{ width: colSettings.c17.w }} />}
                            {colSettings.c18.v && <col className="col-c18" style={{ width: colSettings.c18.w }} />}
                        </colgroup>

                        <thead>
                            {/* Header Tier 1 (Section Groups) */}
                            <tr>
                                {(colSettings.c1.v || colSettings.c2.v || colSettings.c3.v || colSettings.c4.v) && (
                                    <th colSpan={(colSettings.c1.v ? 1 : 0) + (colSettings.c2.v ? 1 : 0) + (colSettings.c3.v ? 1 : 0) + (colSettings.c4.v ? 1 : 0)}>
                                        {b.journeyAndHaltTitle}
                                    </th>
                                )}

                                {colSettings.c5.v && (
                                    <th rowSpan="2" style={{ position: 'relative', width: colSettings.c5.w }}>
                                        {b.purpose}
                                        <div className="resizer no-print" onMouseDown={e => handleMouseDown(e, 'c5')}></div>
                                    </th>
                                )}

                                {(colSettings.c6.v || colSettings.c7.v) && (
                                    <th colSpan={(colSettings.c6.v ? 1 : 0) + (colSettings.c7.v ? 1 : 0)} style={{ fontSize: '0.85em' }}>
                                        {b.transferFamilyTitle}
                                    </th>
                                )}

                                {(colSettings.c8.v || colSettings.c9.v || colSettings.c10.v || colSettings.c11.v) && (
                                    <th colSpan={(colSettings.c8.v ? 1 : 0) + (colSettings.c9.v ? 1 : 0) + (colSettings.c10.v ? 1 : 0) + (colSettings.c11.v ? 1 : 0)}>
                                        {b.fareSectionTitle}
                                    </th>
                                )}

                                {(colSettings.c12.v || colSettings.c13.v || colSettings.c14.v || colSettings.c15.v || colSettings.c16.v || colSettings.c17.v) && (
                                    <th colSpan={
                                        (colSettings.c12.v ? 1 : 0) + (colSettings.c13.v ? 1 : 0) + (colSettings.c14.v ? 1 : 0) +
                                        (colSettings.c15.v ? 1 : 0) + (colSettings.c16.v ? 1 : 0) + (colSettings.c17.v ? 1 : 0)
                                    }>
                                        {b.allowancesTitle}
                                    </th>
                                )}

                                {colSettings.c18.v && (
                                    <th rowSpan="2" style={{ position: 'relative', width: colSettings.c18.w }}>
                                        {b.transportExp}
                                        <div className="resizer no-print" onMouseDown={e => handleMouseDown(e, 'c18')}></div>
                                    </th>
                                )}
                            </tr>

                            {/* Header Tier 2 (Specific Columns) */}
                            <tr>
                                {colSettings.c1.v && <th style={{ position: 'relative', width: colSettings.c1.w }}>{b.departure.place} <div className="resizer no-print" onMouseDown={e => handleMouseDown(e, 'c1')}></div></th>}
                                {colSettings.c2.v && <th style={{ position: 'relative', width: colSettings.c2.w }}>{b.departure.dateTime} <div className="resizer no-print" onMouseDown={e => handleMouseDown(e, 'c2')}></div></th>}
                                {colSettings.c3.v && <th style={{ position: 'relative', width: colSettings.c3.w }}>{b.arrival.place} <div className="resizer no-print" onMouseDown={e => handleMouseDown(e, 'c3')}></div></th>}
                                {colSettings.c4.v && <th style={{ position: 'relative', width: colSettings.c4.w }}>{b.arrival.dateTime} <div className="resizer no-print" onMouseDown={e => handleMouseDown(e, 'c4')}></div></th>}

                                {colSettings.c6.v && <th style={{ position: 'relative', width: colSettings.c6.w }}>{b.transferDescription} <div className="resizer no-print" onMouseDown={e => handleMouseDown(e, 'c6')}></div></th>}
                                {colSettings.c7.v && <th style={{ position: 'relative', width: colSettings.c7.w }}>{b.transferAmount} <div className="resizer no-print" onMouseDown={e => handleMouseDown(e, 'c7')}></div></th>}

                                {colSettings.c8.v && <th style={{ position: 'relative', width: colSettings.c8.w }}>{b.classOfTravel} <div className="resizer no-print" onMouseDown={e => handleMouseDown(e, 'c8')}></div></th>}
                                {colSettings.c9.v && <th style={{ position: 'relative', width: colSettings.c9.w }}>{b.distanceKm} <div className="resizer no-print" onMouseDown={e => handleMouseDown(e, 'c9')}></div></th>}
                                {colSettings.c10.v && <th style={{ position: 'relative', width: colSettings.c10.w }}>{b.ticketCountOrNo} <div className="resizer no-print" onMouseDown={e => handleMouseDown(e, 'c10')}></div></th>}
                                {colSettings.c11.v && <th style={{ position: 'relative', width: colSettings.c11.w }}>{b.fareAmount} <div className="resizer no-print" onMouseDown={e => handleMouseDown(e, 'c11')}></div></th>}

                                {colSettings.c12.v && <th style={{ position: 'relative', width: colSettings.c12.w }}>{b.journeyDA.hrs} <div className="resizer no-print" onMouseDown={e => handleMouseDown(e, 'c12')}></div></th>}
                                {colSettings.c13.v && <th style={{ position: 'relative', width: colSettings.c13.w }}>{b.journeyDA.rate} <div className="resizer no-print" onMouseDown={e => handleMouseDown(e, 'c13')}></div></th>}
                                {colSettings.c14.v && <th style={{ position: 'relative', width: colSettings.c14.w }}>{b.journeyDA.amount} <div className="resizer no-print" onMouseDown={e => handleMouseDown(e, 'c14')}></div></th>}

                                {colSettings.c15.v && <th style={{ position: 'relative', width: colSettings.c15.w }}>{b.haltDA.hrs} <div className="resizer no-print" onMouseDown={e => handleMouseDown(e, 'c15')}></div></th>}
                                {colSettings.c16.v && <th style={{ position: 'relative', width: colSettings.c16.w }}>{b.haltDA.rate} <div className="resizer no-print" onMouseDown={e => handleMouseDown(e, 'c16')}></div></th>}
                                {colSettings.c17.v && <th style={{ position: 'relative', width: colSettings.c17.w }}>{b.haltDA.amount} <div className="resizer no-print" onMouseDown={e => handleMouseDown(e, 'c17')}></div></th>}
                            </tr>

                            {/* Header Tier 3: Column Numbers 1 to 18 */}
                            <tr className="col-numbers">
                                {colSettings.c1.v && <td>1</td>}
                                {colSettings.c2.v && <td>2</td>}
                                {colSettings.c3.v && <td>3</td>}
                                {colSettings.c4.v && <td>4</td>}
                                {colSettings.c5.v && <td>5</td>}
                                {colSettings.c6.v && <td>6</td>}
                                {colSettings.c7.v && <td>7</td>}
                                {colSettings.c8.v && <td>8</td>}
                                {colSettings.c9.v && <td>9</td>}
                                {colSettings.c10.v && <td>10</td>}
                                {colSettings.c11.v && <td>11</td>}
                                {colSettings.c12.v && <td>12</td>}
                                {colSettings.c13.v && <td>13</td>}
                                {colSettings.c14.v && <td>14</td>}
                                {colSettings.c15.v && <td>15</td>}
                                {colSettings.c16.v && <td>16</td>}
                                {colSettings.c17.v && <td>17</td>}
                                {colSettings.c18.v && <td>18</td>}
                            </tr>
                        </thead>

                        <tbody>
                            {(() => {
                                const mergeInfo = [];
                                let idx = 0;
                                while (idx < billRows.length) {
                                    if (idx === 0 || !billRows[idx].merge_purpose) {
                                        let span = 1;
                                        while (idx + span < billRows.length && billRows[idx + span].merge_purpose) {
                                            span++;
                                        }
                                        mergeInfo[idx] = { isChild: false, span };
                                        for (let s = 1; s < span; s++) {
                                            mergeInfo[idx + s] = { isChild: true, span: 0 };
                                        }
                                        idx += span;
                                    } else {
                                        mergeInfo[idx] = { isChild: false, span: 1 };
                                        idx++;
                                    }
                                }

                                return billRows.map((r, i) => {
                                    const isTransfer = claim.claim_type === 'TRANSFER';
                                    const transferDesc = (i === 0 && isTransfer)
                                        ? (((totals.transferGrant > 0 ? `मिश्रित अनुदान: ₹${totals.transferGrant}. ` : '') +
                                            (totals.totalTransport > 0 ? `सामग्री परिवहन: ₹${totals.totalTransport}. ` : '') +
                                            (claim.family_details ? claim.family_details + ' ' : '') +
                                            (claim.baggage_weight ? `(${claim.baggage_weight} कि.ग्रा.)` : '')).trim())
                                        : '';
                                    const transferAmt = (i === 0 && isTransfer && (totals.transferAllowance || totals.totalTransport)) ? (totals.transferAllowance || totals.totalTransport) : '';
                                    const mInfo = mergeInfo[i] || { isChild: false, span: 1 };

                                    return (
                                        <tr key={i}>
                                            {colSettings.c1.v && <td className="wrap">{r.departure_station}</td>}
                                            {colSettings.c2.v && (
                                                <td style={{ whiteSpace: 'nowrap', textAlign: 'center' }}>
                                                    {formatDateDMY(r.departure_date)}<br />{formatTime12Hr(r.departure_time)}
                                                </td>
                                            )}
                                            {colSettings.c3.v && <td className="wrap">{r.arrival_station}</td>}
                                            {colSettings.c4.v && (
                                                <td style={{ whiteSpace: 'nowrap', textAlign: 'center' }}>
                                                    {formatDateDMY(r.arrival_date)}<br />{formatTime12Hr(r.arrival_time)}
                                                </td>
                                            )}
                                            {colSettings.c5.v && !mInfo.isChild && (
                                                <td className="wrap" rowSpan={mInfo.span} style={{ verticalAlign: 'middle' }}>
                                                    {r.purpose || '—'}
                                                </td>
                                            )}

                                            {colSettings.c6.v && <td className="wrap" style={{ fontSize: '0.85em' }}>{transferDesc}</td>}
                                            {colSettings.c7.v && <td style={{ textAlign: 'right' }}>{transferAmt}</td>}

                                            {colSettings.c8.v && <td>{r.class_of_travel || r.mode}</td>}
                                            {colSettings.c9.v && <td style={{ textAlign: 'center' }}>{r.distance_km || ''}</td>}
                                            {colSettings.c10.v && <td style={{ wordBreak: 'break-all', textAlign: 'center' }}>{r.ticket_no || ''}</td>}
                                            {colSettings.c11.v && <td style={{ textAlign: 'right' }}>{parseFloat(r.ta_approved || 0) > 0 ? r.ta_approved : (r.fare_amount || '')}</td>}

                                            {colSettings.c12.v && <td style={{ textAlign: 'center' }}>{r.travel_hrs !== '0.0' ? r.travel_hrs : ''}</td>}
                                            {colSettings.c13.v && (
                                                <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                                                    {(() => {
                                                        const jFactor = r.da_rate > 0 ? (parseFloat(r.journey_da) || 0) / r.da_rate : 0;
                                                        return jFactor > 0 ? formatDACount(jFactor, language, true) : '';
                                                    })()}
                                                </td>
                                            )}
                                            {colSettings.c14.v && <td style={{ textAlign: 'right' }}>{parseFloat(r.journey_da || 0) > 0 ? parseFloat(r.journey_da).toFixed(2) : ''}</td>}

                                            {colSettings.c15.v && <td style={{ textAlign: 'center' }}>{r.stay_hrs !== '0.0' ? r.stay_hrs : ''}</td>}
                                            {colSettings.c16.v && (
                                                <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                                                    {(() => {
                                                        const sFactor = r.stay_rate > 0 ? (parseFloat(r.stay_da) || 0) / r.stay_rate : 0;
                                                        return sFactor > 0 ? formatDACount(sFactor, language, true) : '';
                                                    })()}
                                                </td>
                                            )}
                                            {colSettings.c17.v && <td style={{ textAlign: 'right' }}>{parseFloat(r.stay_da || 0) > 0 ? parseFloat(r.stay_da).toFixed(2) : ''}</td>}

                                            {colSettings.c18.v && <td style={{ textAlign: 'right' }}>{parseFloat(r.local_transport || 0) > 0 ? parseFloat(r.local_transport).toFixed(2) : ''}</td>}
                                        </tr>
                                    );
                                });
                            })()}

                            {/* Grand Total Row */}
                            <tr style={{ fontWeight: 'bold' }}>
                                <td
                                    colSpan={(colSettings.c1.v ? 1 : 0) + (colSettings.c2.v ? 1 : 0) + (colSettings.c3.v ? 1 : 0) + (colSettings.c4.v ? 1 : 0)}
                                    style={{ textAlign: 'left', padding: '2px 4px', fontSize: '9px', fontWeight: 'bold' }}
                                >
                                    <span>{b.consolidatedDALimit}: {claimDALimitText}</span>
                                </td>
                                {colSettings.c5.v && <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{b.grossTotal}:</td>}
                                {colSettings.c6.v && <td></td>}
                                {colSettings.c7.v && <td style={{ textAlign: 'right' }}>{claim.claim_type === 'TRANSFER' && (totals.transferAllowance || totals.totalTransport) ? (totals.transferAllowance || totals.totalTransport) : ''}</td>}
                                {colSettings.c8.v && <td></td>}
                                {colSettings.c9.v && <td></td>}
                                {colSettings.c10.v && <td></td>}
                                {colSettings.c11.v && <td style={{ textAlign: 'right' }}>{totals.totalFare}</td>}

                                {colSettings.c12.v && <td></td>}
                                {colSettings.c13.v && <td></td>}
                                {colSettings.c14.v && <td style={{ textAlign: 'right' }}>{(totals.totalJourneyDA || 0).toFixed(2)}</td>}

                                {colSettings.c15.v && <td></td>}
                                {colSettings.c16.v && <td></td>}
                                {colSettings.c17.v && <td style={{ textAlign: 'right' }}>{(totals.totalStayDA || 0).toFixed(2)}</td>}

                                {colSettings.c18.v && <td style={{ textAlign: 'right' }}>{totals.totalLocalTransport > 0 ? totals.totalLocalTransport.toFixed(2) : ''}</td>}
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Bottom Section: Left = Certificates & Place/Date, Right = Summary Box & Signature */}
                <div className="form21-bottom-section" style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 56fr) minmax(0, 44fr)',
                    gap: '16px',
                    marginTop: '10px',
                    alignItems: 'start',
                    width: '100%',
                    boxSizing: 'border-box'
                }}>
                    {/* Left Column: Certificates & Place / Date */}
                    <div className="form21-bottom-left" style={{ fontSize: '9px', lineHeight: '1.38' }}>
                        <div style={{ fontWeight: 'bold', textDecoration: 'underline', marginBottom: '5px', fontSize: '10px' }}>
                            {b.certificatesTitle}
                        </div>
                        <div style={{ marginBottom: '3px' }}>
                            {b.cert1} {pnrList ? <span style={{ fontWeight: 'bold' }}>{pnrList}</span> : <span>({language === 'hi' ? 'लागू नहीं' : 'Nil'})</span>}
                        </div>
                        <div style={{ marginBottom: '3px' }}>
                            {b.cert2}
                        </div>
                        <div style={{ marginBottom: '3px' }}>
                            {b.cert3}
                        </div>
                        <div style={{ marginBottom: '6px' }}>
                            {b.cert4}
                        </div>

                        <div style={{ marginTop: '22px', fontSize: '9.5px' }}>
                            <div style={{ marginBottom: '3px' }}>
                                <strong>{b.place}:</strong> {employee.headquarters || '__________'}
                            </div>
                            <div>
                                <strong>{b.date}:</strong> {formatDateDMY(claim.declaration_date || claim.submission_date || claim.end_date || '__________')}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Calculation Box & Claimant Signature */}
                    <div className="form21-bottom-right" style={{ display: 'flex', flexDirection: 'column' }}>
                        {/* Summary Calculation Box */}
                        <div className="form21-calc-box" style={{
                            border: '1px solid black',
                            fontSize: '9.5px',
                            lineHeight: '1.35',
                            background: '#ffffff'
                        }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <tbody>
                                    <tr>
                                        <td style={{ padding: '3px 8px', fontWeight: 'bold', width: '58%' }}>
                                            {b.grossTotal}:
                                        </td>
                                        <td style={{ padding: '3px 8px', textAlign: 'right', fontWeight: 'bold' }}>
                                            ₹{totals.grandTotal.toFixed(2)}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style={{ padding: '3px 8px', fontWeight: 'bold' }}>
                                            {b.lessAdvance}:
                                        </td>
                                        <td style={{ padding: '3px 8px', textAlign: 'right' }}>
                                            ₹{(totals.advanceAmount || 0).toFixed(2)}
                                        </td>
                                    </tr>
                                    <tr style={{ borderTop: '1px solid black', borderBottom: '1px solid black' }}>
                                        <td style={{ padding: '4px 8px', fontWeight: 'bold' }}>
                                            {b.netPayable}:
                                        </td>
                                        <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 'bold' }}>
                                            ₹{netAmount.toFixed(2)}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td colSpan="2" style={{ padding: '4px 8px', fontSize: '8.5px', fontStyle: 'italic', lineHeight: '1.25' }}>
                                            <strong>{b.amountInWordsLabel}:</strong> {words}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Claimant Signature */}
                        <div className="form21-signature-block" style={{
                            marginTop: '22px',
                            textAlign: 'center',
                            alignSelf: 'center',
                            width: '100%'
                        }}>
                            <div style={{ borderTop: '1px solid black', width: '230px', margin: '0 auto 4px auto' }}></div>
                            <div style={{ fontWeight: 'bold', fontSize: '9.5px' }}>{b.claimantSignature}</div>
                            <div style={{ fontSize: '9px', marginTop: '1px' }}>({empDisplayName})</div>
                            <div style={{ fontSize: '8.5px', color: '#1e293b' }}>{employee.designation || '—'}</div>
                        </div>
                    </div>
                </div>

                {/* Admin Controlling Officer Passing Order (Admin Control Only) */}
                {showPassingOrder && (
                    <div className="form21-passing-box" style={{
                        marginTop: '12px',
                        border: '1px solid black',
                        padding: '6px 8px',
                        fontSize: '8pt',
                        background: '#fafafa'
                    }}>
                        <div style={{ fontWeight: 'bold', fontSize: '8.5pt', borderBottom: '1px solid black', paddingBottom: '2px', marginBottom: '4px' }}>
                            {language === 'hi' ? 'नियंत्रण अधिकारी का प्रमाण-पत्र एवं देयक पारित आदेश' : 'Controlling Officer Certificate & Bill Passing Order'}
                        </div>
                        <p style={{ margin: '2px 0', fontSize: '7.8pt' }}>
                            {language === 'hi'
                                ? 'प्रमाणित किया जाता है कि कर्मचारी द्वारा प्रस्तुत दौरा डायरी एवं देयक का सत्यापन कर लिया गया है तथा यात्राएं शासकीय कार्य संपादन हेतु की गई हैं एवं नियमानुसार देय हैं।'
                                : 'Certified that the tour diary and submitted claim have been verified. Journeys were undertaken in official interest and are admissible as per rules.'}
                        </p>
                        <div style={{ marginTop: '4px', padding: '3px 6px', border: '1px dashed #64748b', background: 'white', fontSize: '8pt' }}>
                            <strong>{language === 'hi' ? 'देयक पारित / स्वीकृति आदेश:' : 'Order Passed for Payment:'} </strong>
                            {language === 'hi'
                                ? `देयक परीक्षणोपरांत शुद्ध राशि ₹ ${netAmount.toFixed(2)} (अक्षरी: ${words}) का भुगतान पारित / स्वीकृत किया जाता है।`
                                : `After due audit and verification, net amount of ₹ ${netAmount.toFixed(2)} (${words}) is hereby passed for payment.`}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '14px', padding: '0 8px' }}>
                            <div style={{ textAlign: 'center', minWidth: '130px' }}>
                                <div style={{ borderBottom: '1px dotted black', width: '110px', margin: '0 auto 2px auto' }}></div>
                                <div style={{ fontWeight: '600', fontSize: '7.8pt' }}>{language === 'hi' ? 'लेखापाल' : 'Accountant'}</div>
                                <div style={{ fontSize: '7pt', color: '#64748b' }}>MPSCSC</div>
                            </div>
                            <div style={{ textAlign: 'center', minWidth: '160px' }}>
                                <div style={{ borderBottom: '1px dotted black', width: '140px', margin: '0 auto 2px auto' }}></div>
                                <div style={{ fontWeight: 'bold', fontSize: '8.2pt' }}>{language === 'hi' ? 'नियंत्रण अधिकारी / जिला प्रबंधक' : 'Controlling Officer / District Manager'}</div>
                                <div style={{ fontSize: '7pt', color: '#64748b' }}>{language === 'hi' ? 'म.प्र. स्टेट सिविल सप्लाइज कॉर्पोरेशन लि.' : 'MPSCSC Ltd.'}</div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Official Treasury Form 21 A4 Landscape Print Styles */}
            <style>{`
                .table-scroll-wrapper {
                    width: 100%;
                    overflow-x: hidden;
                }
                .bill-21-table {
                    border-collapse: collapse;
                    width: 100%;
                    border: 1px solid black;
                    table-layout: fixed;
                    margin-bottom: 6px;
                    box-sizing: border-box;
                }
                .resizer {
                    position: absolute;
                    right: 0;
                    top: 0;
                    bottom: 0;
                    width: 5px;
                    cursor: col-resize;
                    z-index: 10;
                }
                .resizer:hover {
                    background: rgba(0, 0, 0, 0.2);
                }
                .bill-21-table th, .bill-21-table td {
                    border: 1px solid black;
                    padding: 2px 3px;
                    vertical-align: middle;
                    overflow-wrap: break-word;
                    white-space: normal;
                    text-align: left;
                    line-height: 1.15;
                    word-break: normal;
                }
                .bill-21-table td.wrap, .bill-21-table th.wrap {
                    white-space: normal;
                    overflow-wrap: break-word;
                    word-break: normal;
                }
                .bill-21-table th {
                    background: #f1f5f9;
                    text-align: center;
                    font-size: 0.82em;
                    font-weight: bold;
                    word-break: normal;
                    overflow-wrap: normal;
                    hyphens: none;
                }
                .col-numbers td {
                    text-align: center;
                    font-size: 8px;
                    background: #e2e8f0;
                    font-weight: bold;
                    padding: 1px;
                }

                /* Proportional widths on screen (Exact 100% distribution matching print) */
                .bill-21-table col.col-c1  { width: 5.5%; }
                .bill-21-table col.col-c2  { width: 7.0%; }
                .bill-21-table col.col-c3  { width: 5.5%; }
                .bill-21-table col.col-c4  { width: 7.0%; }
                .bill-21-table col.col-c5  { width: 15.0%; }
                .bill-21-table col.col-c6  { width: 4.5%; }
                .bill-21-table col.col-c7  { width: 3.5%; }
                .bill-21-table col.col-c8  { width: 5.0%; }
                .bill-21-table col.col-c9  { width: 3.5%; }
                .bill-21-table col.col-c10 { width: 6.0%; }
                .bill-21-table col.col-c11 { width: 4.5%; }
                .bill-21-table col.col-c12 { width: 3.5%; }
                .bill-21-table col.col-c13 { width: 6.0%; }
                .bill-21-table col.col-c14 { width: 4.5%; }
                .bill-21-table col.col-c15 { width: 3.5%; }
                .bill-21-table col.col-c16 { width: 6.0%; }
                .bill-21-table col.col-c17 { width: 5.0%; }
                .bill-21-table col.col-c18 { width: 4.5%; }
                @media (max-width: 850px) {
                    .form21-bottom-section {
                        grid-template-columns: 1fr !important;
                    }
                }
                @media print {
                    @page {
                        size: A4 ${printOrientation};
                        margin: ${printOrientation === 'landscape' ? '3.5mm 5mm 3.5mm 5mm' : '5mm 5mm 6mm 5mm'};
                    }
                    html, body {
                        width: 100% !important;
                        height: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: white !important;
                        overflow: hidden !important;
                    }
                    .no-print { display: none !important; }
                    .print-only { display: block !important; }
                    * {
                        color: black !important;
                        border-color: black !important;
                        background: transparent !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    body {
                        font-family: 'Inter', 'Noto Sans Devanagari', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif !important;
                    }
                    .bill-print-container { 
                        width: 100% !important; 
                        max-width: 100% !important;
                        border: none !important; 
                        padding: 0 !important;
                        margin: 0 !important;
                        box-shadow: none !important;
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                    }
                    .bill-title-header {
                        margin-bottom: 1.2mm !important;
                        padding-bottom: 1mm !important;
                    }
                    .print-logo {
                        width: 32px !important;
                        height: 32px !important;
                        min-width: 32px !important;
                        min-height: 32px !important;
                    }
                    .bill-main-title {
                        font-size: 10.5pt !important;
                        line-height: 1.15 !important;
                        letter-spacing: 0.2px !important;
                        margin: 0 !important;
                    }
                    .bill-sub-title {
                        font-size: 7.8pt !important;
                        line-height: 1.15 !important;
                        margin: 1.5px 0 0 0 !important;
                    }
                    .form21-meta-box {
                        display: grid !important;
                        grid-template-columns: 1fr 1fr 1fr !important;
                        font-size: 6.8pt !important;
                        line-height: 1.2 !important;
                        padding: 0 !important;
                        margin-bottom: 1.2mm !important;
                        border: 1px solid black !important;
                    }
                    .form21-meta-box > div {
                        padding: 1.5px 4px !important;
                    }
                    .table-scroll-wrapper {
                        overflow: visible !important;
                        width: 100% !important;
                    }
                    .bill-21-table {
                        width: 100% !important;
                        table-layout: fixed !important;
                        border-collapse: collapse !important;
                        margin-bottom: 1.5mm !important;
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                    }

                    /* A4 Landscape 18-Column Proportions (Exact 100% distribution) */
                    .bill-21-table col.col-c1  { width: 5.5% !important; }
                    .bill-21-table col.col-c2  { width: 7.0% !important; }
                    .bill-21-table col.col-c3  { width: 5.5% !important; }
                    .bill-21-table col.col-c4  { width: 7.0% !important; }
                    .bill-21-table col.col-c5  { width: 15.0% !important; }
                    .bill-21-table col.col-c6  { width: 4.5% !important; }
                    .bill-21-table col.col-c7  { width: 3.5% !important; }
                    .bill-21-table col.col-c8  { width: 5.0% !important; }
                    .bill-21-table col.col-c9  { width: 3.5% !important; }
                    .bill-21-table col.col-c10 { width: 6.0% !important; }
                    .bill-21-table col.col-c11 { width: 4.5% !important; }
                    .bill-21-table col.col-c12 { width: 3.5% !important; }
                    .bill-21-table col.col-c13 { width: 6.0% !important; }
                    .bill-21-table col.col-c14 { width: 4.5% !important; }
                    .bill-21-table col.col-c15 { width: 3.5% !important; }
                    .bill-21-table col.col-c16 { width: 6.0% !important; }
                    .bill-21-table col.col-c17 { width: 5.0% !important; }
                    .bill-21-table col.col-c18 { width: 4.5% !important; }

                    .bill-21-table th, .bill-21-table td {
                        border: 1px solid black !important;
                        padding: 1px 1.5px !important;
                        line-height: 1.12 !important;
                        font-size: ${printOrientation === 'landscape' ? '6.0pt' : '6.2pt'} !important;
                        vertical-align: middle !important;
                        word-break: break-word !important;
                        overflow-wrap: break-word !important;
                        white-space: normal !important;
                        overflow: visible !important;
                    }
                    .bill-21-table th {
                        background: #f8fafc !important;
                        font-size: ${printOrientation === 'landscape' ? '5.6pt' : '5.8pt'} !important;
                        font-weight: bold !important;
                        text-align: center !important;
                        padding: 1px 1px !important;
                        letter-spacing: -0.15px !important;
                    }
                    .col-numbers td {
                        background: #f1f5f9 !important;
                        font-size: ${printOrientation === 'landscape' ? '4.8pt' : '5.0pt'} !important;
                        padding: 0.5px !important;
                        text-align: center !important;
                        font-weight: bold !important;
                    }
                    .bill-21-table tr {
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                    }

                    /* Bottom Section: 2 Columns Matching PDF */
                    .form21-bottom-section {
                        display: grid !important;
                        grid-template-columns: ${printOrientation === 'landscape' ? 'minmax(0, 56fr) minmax(0, 44fr)' : '1fr'} !important;
                        gap: 4mm !important;
                        margin-top: 1.5mm !important;
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                        width: 100% !important;
                    }
                    .form21-bottom-left {
                        font-size: 5.8pt !important;
                        line-height: 1.2 !important;
                    }
                    .form21-bottom-left div {
                        margin-bottom: 0.8mm !important;
                    }
                    .form21-bottom-right {
                        display: flex !important;
                        flex-direction: column !important;
                    }
                    .form21-calc-box {
                        border: 1px solid black !important;
                        font-size: 6.0pt !important;
                        line-height: 1.22 !important;
                    }
                    .form21-calc-box table td {
                        padding: 1px 3px !important;
                        font-size: 6.0pt !important;
                    }
                    .form21-signature-block {
                        margin-top: 3.5mm !important;
                        font-size: 6.0pt !important;
                        line-height: 1.15 !important;
                    }
                    .form21-signature-block div {
                        font-size: inherit !important;
                    }
                    .form21-passing-box {
                        font-size: 5.8pt !important;
                        padding: 1.5px 4px !important;
                        margin-top: 1.5mm !important;
                        border: 1px solid black !important;
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                    }
                    .form21-passing-box p {
                        margin: 1px 0 !important;
                        font-size: 5.6pt !important;
                    }
                }
            `}</style>
        </div>
    );
}
