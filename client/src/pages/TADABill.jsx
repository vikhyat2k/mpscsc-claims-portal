import api, { apiRequest } from '../utils/api';
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Printer, ArrowLeft, FileSpreadsheet, MousePointer2, Receipt, Edit, Check, X } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
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

function formatDACount(factor, lang, compact = false) {
    const f = parseFloat(factor) || 0;
    if (f <= 0) return lang === 'hi' ? 'निरंक' : 'Nil';

    const fullCount = Math.floor(f);
    const hasHalf = (f - fullCount) >= 0.4;

    if (compact) {
        if (fullCount === 0 && hasHalf) return 'Half';
        if (fullCount === 1 && !hasHalf) return 'Full';
        if (fullCount === 1 && hasHalf) return '1 Full 1 Half';
        if (fullCount > 1 && !hasHalf) return `${fullCount} Full`;
        if (fullCount > 1 && hasHalf) return `${fullCount} Full 1 Half`;
        return `${f}`;
    }

    if (fullCount === 0 && hasHalf) {
        return lang === 'hi' ? 'Half (आधा)' : 'Half';
    }
    if (fullCount === 1 && !hasHalf) {
        return lang === 'hi' ? 'Full (पूर्ण)' : 'Full';
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
    const { language } = useLanguage();
    const t = getTranslations(language);

    const [loading, setLoading] = useState(true);
    const [billData, setBillData] = useState(null);
    const [fontSize, setFontSize] = useState(9); // Default 9px for 21-column official layout
    const [showSettings, setShowSettings] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isEditingPayInfo, setIsEditingPayInfo] = useState(false);
    const [payLevelInput, setPayLevelInput] = useState('');
    const [gradePayInput, setGradePayInput] = useState('');
    const [isSavingPayInfo, setIsSavingPayInfo] = useState(false);

    // Official 21-Column widths and visibility
    const defaultColSettings = {
        c1: { w: 65, v: true, label: '1. प्रस्थान स्थान' },
        c2: { w: 75, v: true, label: '2. प्रस्थान तारीख/समय' },
        c3: { w: 65, v: true, label: '3. आगमन स्थान' },
        c4: { w: 75, v: true, label: '4. आगमन तारीख/समय' },
        c5: { w: 90, v: true, label: '5. यात्रा का प्रयोजन' },
        c6: { w: 85, v: true, label: '6. स्थानांतरण ब्यौरा' },
        c7: { w: 50, v: true, label: '7. स्थानांतरण राशि' },
        c8: { w: 65, v: true, label: '8. दर्जा/साधन' },
        c9: { w: 40, v: true, label: '9. किलोमीटर' },
        c10: { w: 65, v: true, label: '10. टिकट/PNR' },
        c11: { w: 55, v: true, label: '11. किराया राशि' },
        c12: { w: 40, v: true, label: '12. यात्रा समय (घंटे)' },
        c13: { w: 55, v: true, label: '13. यात्रा भत्ता सीमा (DA Limit)' },
        c14: { w: 55, v: true, label: '14. यात्रा भत्ता राशि' },
        c15: { w: 40, v: true, label: '15. मुकाम समय (घंटे)' },
        c16: { w: 55, v: true, label: '16. मुकाम भत्ता सीमा (DA Limit)' },
        c17: { w: 55, v: true, label: '17. मुकाम भत्ता राशि' },
        c18: { w: 50, v: true, label: '18. परिवहन व्यय' },
        c19: { w: 55, v: true, label: '19. होटल व्यय' },
        c20: { w: 65, v: true, label: '20. पंक्ति योग' },
        c21: { w: 80, v: true, label: '21. अभियुक्ति' },
    };

    const [colSettings, setColSettings] = useState(defaultColSettings);

    const resizing = useRef(null);

    const handleMouseDown = (e, key) => {
        e.preventDefault();
        resizing.current = {
            key,
            startX: e.pageX,
            startWidth: colSettings[key].w
        };
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = 'col-resize';
    };

    const handleMouseMove = (e) => {
        if (!resizing.current) return;
        const { key, startX, startWidth } = resizing.current;
        const diff = e.pageX - startX;
        const newWidth = Math.max(10, startWidth + diff);
        setColSettings(prev => ({
            ...prev,
            [key]: { ...prev[key], w: newWidth }
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

    const handlePrint = () => {
        const originalTitle = document.title;
        const dateStr = claim?.start_date || new Date().toISOString().split('T')[0];
        const claimTypeText = claim?.claim_type === 'TRANSFER' ? 'Transfer_TA_Bill' : 'TA_DA_Bill';
        document.title = `${dateStr}_${employee?.name || ''}_${claimTypeText}`;

        window.print();

        setTimeout(() => {
            document.title = originalTitle;
        }, 100);
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

        // 21 Column Widths tailored to fit A4 Landscape perfectly without any text clipping
        ws.columns = [
            { width: 14 }, // 1. Departure Station
            { width: 15 }, // 2. Departure Date/Time
            { width: 14 }, // 3. Arrival Station
            { width: 15 }, // 4. Arrival Date/Time
            { width: 30 }, // 5. Purpose of Journey
            { width: 16 }, // 6. Transfer Description
            { width: 12 }, // 7. Transfer Amount
            { width: 14 }, // 8. Mode / Class
            { width: 10 }, // 9. Distance (KM)
            { width: 14 }, // 10. Ticket / PNR
            { width: 12 }, // 11. Fare Amount
            { width: 10 }, // 12. Travel Time (Hrs)
            { width: 13 }, // 13. Journey DA Limit
            { width: 13 }, // 14. Journey DA Amount
            { width: 10 }, // 15. Stay Time (Hrs)
            { width: 13 }, // 16. Halt DA Limit
            { width: 13 }, // 17. Stay DA Amount
            { width: 12 }, // 18. Transport Exp
            { width: 12 }, // 19. Hotel Exp
            { width: 13 }, // 20. Row Total
            { width: 15 }  // 21. Remarks
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
        ws.mergeCells(1, 1, 1, 21);
        ws.getCell(1, 1).value = b.title;
        ws.getRow(1).height = 26;
        styleRange(1, 1, 1, 21, {
            font: { name: fontName, size: 14, bold: true, color: { argb: 'FF000000' } },
            alignment: { horizontal: 'center', vertical: 'middle' }
        });

        // Row 2: Subtitle
        const dateRangeText = language === 'hi'
            ? `${employee.start_date || claim.start_date || '_________'} ${b.periodFrom} ${employee.end_date || claim.end_date || '_________'} ${b.periodTo}`
            : `${employee.start_date || claim.start_date || '_________'} ${b.periodTo} ${employee.end_date || claim.end_date || '_________'}`;
        ws.mergeCells(2, 1, 2, 21);
        ws.getCell(2, 1).value = `${billSubTitle} (${b.periodLabel}: ${dateRangeText})`;
        ws.getRow(2).height = 20;
        styleRange(2, 1, 2, 21, {
            font: { name: fontName, size: 11, bold: true, color: { argb: 'FF000000' } },
            alignment: { horizontal: 'center', vertical: 'middle' }
        });

        // Row 3: Spacing
        ws.getRow(3).height = 8;

        // Rows 4 & 5: Top 6-Field Box
        ws.mergeCells(4, 1, 4, 5);
        ws.getCell(4, 1).value = `${b.name}: ${empDisplayName}`;
        ws.mergeCells(4, 6, 4, 12);
        ws.getCell(4, 6).value = `${b.gradePay}: ${formatPayLevelAndGradePay(employee, language)}`;
        ws.mergeCells(4, 13, 4, 21);
        ws.getCell(4, 13).value = `${b.fixedTA}: —`;

        ws.mergeCells(5, 1, 5, 5);
        ws.getCell(5, 1).value = `${b.designation}: ${employee.designation || '—'}`;
        ws.mergeCells(5, 6, 5, 12);
        ws.getCell(5, 6).value = `${b.headquarter}: ${employee.headquarters || '—'}`;
        ws.mergeCells(5, 13, 5, 21);
        ws.getCell(5, 13).value = `${b.consolidatedDA}: ${defaultDaRate ? '₹' + defaultDaRate : '—'}`;

        ws.getRow(4).height = 22;
        ws.getRow(5).height = 22;
        styleRange(4, 1, 5, 21, {
            font: { name: fontName, size: 9.5, color: { argb: 'FF000000' } },
            border: blackThinBorder,
            alignment: { horizontal: 'left', vertical: 'middle', wrapText: true }
        });

        // Row 6: Currency indicator
        ws.getCell(6, 21).value = b.amountInRupees;
        ws.getCell(6, 21).font = { name: fontName, size: 8.5, bold: true, italic: true, color: { argb: 'FF333333' } };
        ws.getCell(6, 21).alignment = { horizontal: 'right', vertical: 'middle' };
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
        ws.mergeCells(7, 12, 7, 14);
        ws.getCell(7, 12).value = b.journeyDA.title;
        ws.mergeCells(7, 15, 7, 17);
        ws.getCell(7, 15).value = b.haltDA.title;
        ws.mergeCells(7, 18, 8, 18);
        ws.getCell(7, 18).value = b.transportExp;
        ws.mergeCells(7, 19, 8, 19);
        ws.getCell(7, 19).value = b.hotelExp;
        ws.mergeCells(7, 20, 8, 20);
        ws.getCell(7, 20).value = b.rowTotal;
        ws.mergeCells(7, 21, 8, 21);
        ws.getCell(7, 21).value = b.remarks;
        ws.getRow(7).height = 28;

        // Row 8: Header Tier 2 (Sub-headers)
        ws.getCell(8, 1).value = `${b.departure.title}\n${b.departure.place}`;
        ws.getCell(8, 2).value = `${b.departure.title}\n${b.departure.dateTime}`;
        ws.getCell(8, 3).value = `${b.arrival.title}\n${b.arrival.place}`;
        ws.getCell(8, 4).value = `${b.arrival.title}\n${b.arrival.dateTime}`;
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

        styleRange(7, 1, 8, 21, {
            font: { name: fontName, size: 9, bold: true, color: { argb: 'FF000000' } },
            fill: headerFill,
            border: blackThinBorder,
            alignment: { horizontal: 'center', vertical: 'middle', wrapText: true }
        });

        // Row 9: Header Tier 3 (Numbers 1-21)
        ws.getRow(9).height = 18;
        for (let c = 1; c <= 21; c++) {
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

            row.getCell(2).value = (r.departure_date || '') + (r.departure_time ? '\n' + r.departure_time : '');
            row.getCell(2).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

            row.getCell(3).value = r.arrival_station || '';
            row.getCell(3).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };

            row.getCell(4).value = (r.arrival_date || '') + (r.arrival_time ? '\n' + r.arrival_time : '');
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

            const stayAllw = parseFloat(r.stay_allowance || 0);
            row.getCell(19).value = stayAllw > 0 ? stayAllw : null;
            row.getCell(19).numFmt = '#,##0.00';
            row.getCell(19).alignment = { horizontal: 'right', vertical: 'middle' };

            const rowTotalVal = parseFloat(r.total_amount || 0);
            row.getCell(20).value = rowTotalVal > 0 ? rowTotalVal : null;
            row.getCell(20).numFmt = '#,##0.00';
            row.getCell(20).alignment = { horizontal: 'right', vertical: 'middle' };
            row.getCell(20).font = { name: fontName, size: 9, bold: true };

            row.getCell(21).value = r.remarks || '';
            row.getCell(21).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };

            for (let c = 1; c <= 21; c++) {
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

        // Columns 13 & 16: Kept completely BLANK (no half+half math)
        ws.getCell(curRow, 13).value = null;
        ws.getCell(curRow, 14).value = totals.totalJourneyDA ? parseFloat(totals.totalJourneyDA) : null;
        ws.getCell(curRow, 14).numFmt = '#,##0.00';

        ws.getCell(curRow, 16).value = null;
        ws.getCell(curRow, 17).value = totals.totalStayDA ? parseFloat(totals.totalStayDA) : null;
        ws.getCell(curRow, 17).numFmt = '#,##0.00';

        ws.getCell(curRow, 18).value = totals.totalLocalTransport > 0 ? parseFloat(totals.totalLocalTransport) : null;
        ws.getCell(curRow, 18).numFmt = '#,##0.00';

        ws.getCell(curRow, 19).value = totals.totalStayAllowance > 0 ? parseFloat(totals.totalStayAllowance) : null;
        ws.getCell(curRow, 19).numFmt = '#,##0.00';

        ws.getCell(curRow, 20).value = totals.grandTotal ? parseFloat(totals.grandTotal) : null;
        ws.getCell(curRow, 20).numFmt = '#,##0.00';

        ws.getRow(curRow).height = 22;
        styleRange(curRow, 1, curRow, 21, {
            font: { name: fontName, size: 9, bold: true, color: { argb: 'FF000000' } },
            fill: totalRowFill,
            border: doubleBottomBorder
        });
        curRow++;

        // Summary Row: Consolidated DA Limit
        ws.mergeCells(curRow, 1, curRow, 21);
        ws.getCell(curRow, 1).value = `${b.consolidatedDALimit}: ${claimDALimitText}`;
        ws.getRow(curRow).height = 22;
        styleRange(curRow, 1, curRow, 21, {
            font: { name: fontName, size: 9.5, bold: true, color: { argb: 'FF1E3A8A' } },
            fill: summaryBannerFill,
            border: blackThinBorder,
            alignment: { horizontal: 'left', vertical: 'middle' }
        });
        curRow += 2;

        // Deductions & Net Payable Box (Cols 13 to 21)
        ws.mergeCells(curRow, 13, curRow, 17);
        ws.getCell(curRow, 13).value = `${b.grossTotal}:`;
        ws.mergeCells(curRow, 18, curRow, 21);
        ws.getCell(curRow, 18).value = totals.grandTotal ? parseFloat(totals.grandTotal) : 0;
        ws.getCell(curRow, 18).numFmt = '#,##0.00';
        ws.getRow(curRow).height = 20;
        styleRange(curRow, 13, curRow, 21, {
            font: { name: fontName, size: 9, bold: true },
            border: thinBorder,
            alignment: { horizontal: 'right', vertical: 'middle' }
        });
        curRow++;

        ws.mergeCells(curRow, 13, curRow, 17);
        ws.getCell(curRow, 13).value = `${b.lessAdvance}:`;
        ws.mergeCells(curRow, 18, curRow, 21);
        ws.getCell(curRow, 18).value = totals.advanceAmount ? parseFloat(totals.advanceAmount) : 0;
        ws.getCell(curRow, 18).numFmt = '#,##0.00';
        ws.getRow(curRow).height = 20;
        styleRange(curRow, 13, curRow, 21, {
            font: { name: fontName, size: 9, bold: true },
            border: thinBorder,
            alignment: { horizontal: 'right', vertical: 'middle' }
        });
        curRow++;

        ws.mergeCells(curRow, 13, curRow, 17);
        ws.getCell(curRow, 13).value = `${b.netPayable}:`;
        ws.mergeCells(curRow, 18, curRow, 21);
        ws.getCell(curRow, 18).value = netAmount ? parseFloat(netAmount) : 0;
        ws.getCell(curRow, 18).numFmt = '#,##0.00';
        ws.getRow(curRow).height = 20;
        styleRange(curRow, 13, curRow, 21, {
            font: { name: fontName, size: 9.5, bold: true },
            border: thinBorder,
            alignment: { horizontal: 'right', vertical: 'middle' }
        });
        curRow++;

        ws.mergeCells(curRow, 13, curRow, 21);
        ws.getCell(curRow, 13).value = `${b.amountInWordsLabel}: ${words}`;
        ws.getRow(curRow).height = 24;
        styleRange(curRow, 13, curRow, 21, {
            font: { name: fontName, size: 9, bold: true },
            border: blackThinBorder,
            alignment: { horizontal: 'left', vertical: 'middle', wrapText: true }
        });
        curRow += 2;

        // Official Certificates
        ws.mergeCells(curRow, 1, curRow, 21);
        ws.getCell(curRow, 1).value = b.certificatesTitle;
        ws.getCell(curRow, 1).font = { name: fontName, size: 9.5, bold: true, underline: true };
        ws.getRow(curRow).height = 18;
        curRow++;

        [b.cert1, b.cert2, b.cert3, b.cert4].forEach(cert => {
            ws.mergeCells(curRow, 1, curRow, 21);
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

        ws.mergeCells(signRow, 13, signRow, 21);
        ws.getCell(signRow, 13).value = `${b.claimantSignature}: ${empDisplayName}`;
        ws.getCell(signRow, 13).font = { name: fontName, size: 9, bold: true };
        ws.getCell(signRow, 13).alignment = { horizontal: 'right', vertical: 'middle' };
        ws.getRow(signRow).height = 20;
        curRow++;

        ws.mergeCells(curRow, 1, curRow, 7);
        ws.getCell(curRow, 1).value = `${b.date}: ${claim.declaration_date || '__________'}`;
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

    const pnrList = billRows.map(r => r.ticket_no).filter(Boolean).join(', ');

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
                <button onClick={() => navigate(`/claims`)} className="btn btn-secondary">
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
                <button type="button" onClick={handlePrint} className="btn btn-primary">
                    <Printer size={18} /> {t.bill.printBill}
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
                        <h5 style={{ margin: 0, fontSize: '0.95rem' }}>Column Visibility & Width Settings (Columns 1 to 21)</h5>
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
                padding: '15px',
                maxWidth: '1280px',
                margin: '0 auto',
                fontSize: `${fontSize}px`,
                border: '1px solid black',
                fontFamily: "'Inter', 'Noto Sans Devanagari', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif",
                color: 'black'
            }}>
                {/* Official Title Line */}
                <div style={{ textAlign: 'center', marginBottom: '12px', borderBottom: '1px solid black', paddingBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
                        <img
                            src={logoIco}
                            alt="MPSCSC Logo"
                            className="print-logo"
                            style={{
                                width: '64px',
                                height: '64px',
                                minWidth: '64px',
                                minHeight: '64px',
                                maxWidth: '64px',
                                maxHeight: '64px',
                                flexShrink: 0,
                                objectFit: 'contain',
                                aspectRatio: '1 / 1',
                                display: 'block'
                            }}
                        />
                        <div>
                            <h2 style={{ margin: '0', fontSize: '18px', fontWeight: 'bold', textDecoration: 'underline', letterSpacing: '0.5px' }}>
                                {b.title}
                            </h2>
                            <h3 style={{ margin: '4px 0 0 0', fontSize: '14px', fontWeight: 'normal' }}>
                                <strong>{billSubTitle}</strong> ({b.periodLabel}: {language === 'hi' 
                                    ? `${employee.start_date || claim.start_date || '_________'} ${b.periodFrom} ${employee.end_date || claim.end_date || '_________'} ${b.periodTo}`
                                    : `${employee.start_date || claim.start_date || '_________'} ${b.periodTo} ${employee.end_date || claim.end_date || '_________'}`})
                            </h3>
                        </div>
                    </div>
                </div>

                {/* 6-Field Official Metadata Grid (Matching Image Top Box) */}
                <div className="form21-meta-box" style={{
                    display: 'grid',
                    gridTemplateColumns: '1.2fr 1fr 1.2fr',
                    gap: '4px 20px',
                    fontSize: '11px',
                    marginBottom: '8px',
                    padding: '6px 8px',
                    border: '1px solid black'
                }}>
                    <div>
                        <strong>{b.name}:</strong> {language === 'hi' && employee.name_hi ? employee.name_hi : employee.name}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                        <strong>{b.gradePay}:</strong>{' '}
                        {isEditingPayInfo ? (
                            <span className="no-print" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <input
                                    type="text"
                                    className="form-input"
                                    style={{ width: '85px', height: '22px', fontSize: '11px', padding: '1px 5px' }}
                                    placeholder="e.g. Level 12"
                                    value={payLevelInput}
                                    onChange={(e) => setPayLevelInput(e.target.value)}
                                    title={t.employees.payLevel}
                                />
                                <span style={{ fontSize: '10px', color: '#64748b' }}>/ GP:</span>
                                <input
                                    type="text"
                                    className="form-input"
                                    style={{ width: '75px', height: '22px', fontSize: '11px', padding: '1px 5px' }}
                                    placeholder="e.g. 5400"
                                    value={gradePayInput}
                                    onChange={(e) => setGradePayInput(e.target.value)}
                                    title={t.employees.gradePay}
                                />
                                <button
                                    type="button"
                                    className="btn btn-sm btn-success"
                                    style={{ padding: '0 4px', height: '22px' }}
                                    onClick={handleSavePayInfo}
                                    disabled={isSavingPayInfo}
                                    title={t.common.save}
                                >
                                    <Check size={12} />
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-sm btn-secondary"
                                    style={{ padding: '0 4px', height: '22px' }}
                                    onClick={() => setIsEditingPayInfo(false)}
                                    disabled={isSavingPayInfo}
                                    title={t.common.cancel}
                                >
                                    <X size={12} />
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
                                        marginLeft: '6px',
                                        color: '#2563eb',
                                        cursor: 'pointer',
                                        background: 'none',
                                        border: 'none',
                                        padding: '0 2px',
                                        display: 'inline-flex',
                                        alignItems: 'center'
                                    }}
                                    title={language === 'hi' ? 'वेतन स्तर और ग्रेड वेतन दर्ज/संपादित करें' : 'Enter/Edit Pay Level & Grade Pay'}
                                >
                                    <Edit size={12} />
                                </button>
                            </span>
                        )}
                    </div>
                    <div>
                        <strong>{b.fixedTA}:</strong> {employee.fixed_ta ? `₹${employee.fixed_ta}` : 'Nil'}
                    </div>

                    <div>
                        <strong>{b.designation}:</strong> {employee.designation || '—'}
                    </div>
                    <div>
                        <strong>{b.headquarter}:</strong> {employee.headquarters || '—'}
                    </div>
                    <div>
                        <strong>{b.consolidatedDA}:</strong> {defaultDaRate ? `₹${defaultDaRate}` : 'Nil'}
                    </div>
                </div>

                {/* Currency Unit Indicator */}
                <div style={{ textAlign: 'right', fontSize: '10px', fontWeight: 'bold', marginBottom: '3px' }}>
                    {b.amountInRupees}
                </div>

                {/* The Prescribed 21-Column Table */}
                <div className="table-scroll-wrapper" style={{ overflowX: 'auto' }}>
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
                            {colSettings.c19.v && <col className="col-c19" style={{ width: colSettings.c19.w }} />}
                            {colSettings.c20.v && <col className="col-c20" style={{ width: colSettings.c20.w }} />}
                            {colSettings.c21.v && <col className="col-c21" style={{ width: colSettings.c21.w }} />}
                        </colgroup>

                        <thead>
                            {/* Header Level 1 */}
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

                                {colSettings.c19.v && (
                                    <th rowSpan="2" style={{ position: 'relative', width: colSettings.c19.w }}>
                                        {b.hotelExp}
                                        <div className="resizer no-print" onMouseDown={e => handleMouseDown(e, 'c19')}></div>
                                    </th>
                                )}

                                {colSettings.c20.v && (
                                    <th rowSpan="2" style={{ position: 'relative', width: colSettings.c20.w }}>
                                        {b.rowTotal}
                                        <div className="resizer no-print" onMouseDown={e => handleMouseDown(e, 'c20')}></div>
                                    </th>
                                )}

                                {colSettings.c21.v && (
                                    <th rowSpan="2" style={{ position: 'relative', width: colSettings.c21.w }}>
                                        {b.remarks}
                                        <div className="resizer no-print" onMouseDown={e => handleMouseDown(e, 'c21')}></div>
                                    </th>
                                )}
                            </tr>

                            {/* Header Level 2 */}
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

                            {/* Header Level 3: Column Numbers 1 to 21 */}
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
                                {colSettings.c19.v && <td>19</td>}
                                {colSettings.c20.v && <td>20</td>}
                                {colSettings.c21.v && <td>21</td>}
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
                                            {colSettings.c2.v && <td style={{ whiteSpace: 'nowrap' }}>{r.departure_date}<br />{r.departure_time}</td>}
                                            {colSettings.c3.v && <td className="wrap">{r.arrival_station}</td>}
                                            {colSettings.c4.v && <td style={{ whiteSpace: 'nowrap' }}>{r.arrival_date}<br />{r.arrival_time}</td>}
                                            {colSettings.c5.v && !mInfo.isChild && (
                                                <td className="wrap" rowSpan={mInfo.span} style={{ verticalAlign: 'middle' }}>
                                                    {r.purpose || '—'}
                                                </td>
                                            )}

                                        {colSettings.c6.v && <td className="wrap" style={{ fontSize: '0.85em' }}>{transferDesc}</td>}
                                        {colSettings.c7.v && <td style={{ textAlign: 'right' }}>{transferAmt}</td>}

                                        {colSettings.c8.v && <td>{r.mode + (r.class_of_travel ? ` (${r.class_of_travel})` : '')}</td>}
                                        {colSettings.c9.v && <td style={{ textAlign: 'center' }}>{r.distance_km || ''}</td>}
                                        {colSettings.c10.v && <td style={{ wordBreak: 'break-all' }}>{r.ticket_no || ''}</td>}
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
                                        {colSettings.c14.v && <td style={{ textAlign: 'right' }}>{parseFloat(r.journey_da || 0) > 0 ? r.journey_da : ''}</td>}

                                        {colSettings.c15.v && <td style={{ textAlign: 'center' }}>{r.stay_hrs !== '0.0' ? r.stay_hrs : ''}</td>}
                                        {colSettings.c16.v && (
                                            <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                                                {(() => {
                                                    const sFactor = r.stay_rate > 0 ? (parseFloat(r.stay_da) || 0) / r.stay_rate : 0;
                                                    return sFactor > 0 ? formatDACount(sFactor, language, true) : '';
                                                })()}
                                            </td>
                                        )}
                                        {colSettings.c17.v && <td style={{ textAlign: 'right' }}>{parseFloat(r.stay_da || 0) > 0 ? r.stay_da : ''}</td>}

                                        {colSettings.c18.v && <td style={{ textAlign: 'right' }}>{parseFloat(r.local_transport || 0) > 0 ? r.local_transport : ''}</td>}
                                        {colSettings.c19.v && <td style={{ textAlign: 'right' }}>{parseFloat(r.stay_allowance || 0) > 0 ? r.stay_allowance.toFixed(2) : ''}</td>}
                                        {colSettings.c20.v && <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{r.total_amount}</td>}
                                        {colSettings.c21.v && <td className="wrap" style={{ fontSize: '0.85em' }}>{r.remarks || ''}</td>}
                                    </tr>
                                );
                            });
                        })()}

                            {/* Grand Total Row */}
                            <tr style={{ fontWeight: 'bold', background: '#f8fafc' }}>
                                <td colSpan={
                                    (colSettings.c1.v ? 1 : 0) + (colSettings.c2.v ? 1 : 0) + (colSettings.c3.v ? 1 : 0) +
                                    (colSettings.c4.v ? 1 : 0) + (colSettings.c5.v ? 1 : 0)
                                } style={{ textAlign: 'right', paddingRight: '8px' }}>
                                    <span>{b.grossTotal}:</span>
                                </td>
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
                                {colSettings.c19.v && <td style={{ textAlign: 'right' }}>{totals.totalStayAllowance > 0 ? totals.totalStayAllowance.toFixed(2) : ''}</td>}
                                {colSettings.c20.v && <td style={{ textAlign: 'right', fontSize: '11px' }}>{totals.grandTotal.toFixed(2)}</td>}
                                {colSettings.c21.v && <td></td>}
                            </tr>

                            {/* Consolidated DA Limit Summary Row */}
                            <tr style={{ background: '#f1f5f9', fontWeight: 'bold', fontSize: '10px' }}>
                                <td
                                    colSpan={Object.keys(colSettings).reduce((sum, key) => sum + (colSettings[key].v ? 1 : 0), 0)}
                                    style={{ textAlign: 'left', padding: '4px 8px' }}
                                >
                                    <span>{b.consolidatedDALimit}: </span>
                                    <span style={{ color: '#1e3a8a', marginLeft: '4px' }}>{claimDALimitText}</span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Page 1 Turnover / Continuation Notice (Print Only) */}
                <div className="print-only form21-page1-notice" style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: '6px',
                    paddingTop: '4px',
                    borderTop: '1px solid #94a3b8',
                    fontSize: '7.8pt',
                    color: '#334155'
                }}>
                    <span><strong>{language === 'hi' ? 'फॉर्म क्रमांक 21 (पृष्ठ 1 / 2) — यात्रा विवरण' : 'Form 21 (Page 1 of 2) — Journey Details'}</strong></span>
                    <span style={{ fontStyle: 'italic', fontWeight: 'bold' }}>
                        {language === 'hi' ? '>> कृपया पृष्ठ पलटें: भाग-2 (देयक समायोजन, प्रमाण-पत्र एवं पारित आदेश)' : '>> Please Turn Over: Part II (Adjustments, Certificates & Passing Order)'}
                    </span>
                </div>

                {/* Visual Separator between Page 1 and Page 2 (Screen Only) */}
                <div className="no-print form21-page-separator" style={{
                    margin: '28px 0 20px 0',
                    borderTop: '2px dashed #2563eb',
                    textAlign: 'center',
                    position: 'relative'
                }}>
                    <span style={{
                        position: 'relative',
                        top: '-12px',
                        background: '#eff6ff',
                        color: '#1d4ed8',
                        padding: '3px 16px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: '700',
                        border: '1px solid #bfdbfe'
                    }}>
                        📄 {language === 'hi' ? 'फॉर्म 21 - पृष्ठ 2 (भाग 2: प्रमाण-पत्र, कटौती एवं पारित आदेश)' : 'Form 21 - Page 2 (Part II: Certificates, Deductions & Passing Order)'}
                    </span>
                </div>

                {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
                    PAGE 2: PART II (Certificates, Net Adjustments & Sanction)
                   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
                <div className="form21-page2-container" style={{
                    marginTop: '16px',
                    paddingTop: '8px',
                    borderTop: '1px solid #e2e8f0'
                }}>
                    {/* Page 2 Running Header */}
                    <div className="form21-page2-header" style={{
                        borderBottom: '1.5px solid black',
                        paddingBottom: '6px',
                        marginBottom: '12px'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '13pt', fontWeight: 'bold' }}>
                                    {language === 'hi' ? 'मध्य प्रदेश स्टेट सिविल सप्लाइज कॉर्पोरेशन लिमिटेड' : 'M.P. State Civil Supplies Corporation Limited'}
                                </h3>
                                <h4 style={{ margin: '2px 0 0 0', fontSize: '10.5pt', fontWeight: 'bold', color: '#1e3a8a' }}>
                                    {language === 'hi' ? 'फॉर्म क्रमांक 21 — भाग 2 (देयक समायोजन, प्रमाण-पत्र एवं पारित आदेश)' : 'Form 21 — Part II (Adjustments, Certificates & Passing Order)'}
                                </h4>
                            </div>
                            <div style={{ textAlign: 'right', fontSize: '8.8pt', lineHeight: '1.35' }}>
                                <div><strong>{language === 'hi' ? 'कर्मचारी' : 'Employee'}:</strong> {empDisplayName} ({employee.designation || '—'})</div>
                                <div><strong>{language === 'hi' ? 'मुख्यालय' : 'HQ'}:</strong> {employee.headquarters || '—'}</div>
                            </div>
                        </div>
                    </div>

                    {/* Section 1: Bill Calculation & Net Payable Details */}
                    <div style={{
                        border: '1.5px solid black',
                        padding: '10px 14px',
                        marginBottom: '14px',
                        background: '#fafafa'
                    }} className="form21-calc-box">
                        <div style={{
                            fontWeight: 'bold',
                            fontSize: '10pt',
                            borderBottom: '1px solid black',
                            paddingBottom: '4px',
                            marginBottom: '6px'
                        }}>
                            {language === 'hi' ? '1. देयक राशि गणना एवं शुद्ध भुगतान विवरण' : '1. Bill Calculation & Net Payable Details'}
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt', lineHeight: '1.6' }}>
                            <tbody>
                                <tr>
                                    <td style={{ width: '65%', padding: '2px 0' }}>
                                        <strong>{language === 'hi' ? '(क) कुल सकल देयक राशि (Gross Approved Amount):' : '(A) Total Gross Approved Amount:'}</strong>
                                    </td>
                                    <td style={{ textAlign: 'right', fontWeight: 'bold' }}>₹{totals.grandTotal.toFixed(2)}</td>
                                </tr>
                                <tr>
                                    <td style={{ padding: '2px 0' }}>
                                        <strong>{language === 'hi' ? '(ख) घटाइये: यात्रा अग्रिम राशि (Less Advance Drawn):' : '(B) Less: Travel Advance Drawn:'}</strong>
                                    </td>
                                    <td style={{ textAlign: 'right', color: totals.advanceAmount > 0 ? '#b91c1c' : 'inherit' }}>
                                        ₹{(totals.advanceAmount || 0).toFixed(2)}
                                    </td>
                                </tr>
                                <tr style={{ borderTop: '1px solid black', borderBottom: '1.5px solid black', fontSize: '10pt' }}>
                                    <td style={{ padding: '4px 0' }}>
                                        <strong>{language === 'hi' ? '(ग) शुद्ध देय राशि (Net Payable Amount):' : '(C) Net Payable Amount:'}</strong>
                                    </td>
                                    <td style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '10.5pt' }}>₹{netAmount.toFixed(2)}</td>
                                </tr>
                                <tr>
                                    <td colSpan="2" style={{ paddingTop: '5px', fontStyle: 'italic', fontSize: '8.8pt' }}>
                                        <strong>{b.amountInWordsLabel}:</strong> {words}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Section 2: Four Statutory Certificates */}
                    <div style={{
                        border: '1px solid black',
                        padding: '10px 14px',
                        marginBottom: '14px',
                        fontSize: '8.5pt',
                        lineHeight: '1.45'
                    }} className="form21-cert-box">
                        <div style={{ fontWeight: 'bold', textDecoration: 'underline', marginBottom: '5px', fontSize: '9pt' }}>
                            {b.certificatesTitle} (Mandatory Certificates under MP Travelling Allowance Rules)
                        </div>
                        <p style={{ margin: '3px 0' }}>
                            {b.cert1} {pnrList ? <span style={{ fontWeight: 'bold', textDecoration: 'underline' }}>{pnrList}</span> : <span>({language === 'hi' ? 'संलग्न / लागू नहीं' : 'Attached / Nil'})</span>}
                        </p>
                        <p style={{ margin: '3px 0' }}>{b.cert2}</p>
                        <p style={{ margin: '3px 0' }}>{b.cert3}</p>
                        <p style={{ margin: '3px 0' }}>{b.cert4}</p>
                    </div>

                    {/* Section 3: Place, Date and Claimant Signature */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-end',
                        marginBottom: '18px',
                        padding: '0 8px',
                        fontSize: '9pt'
                    }} className="form21-claimant-sig-box">
                        <div>
                            <div style={{ marginBottom: '4px' }}>
                                <strong>{b.place}:</strong> {employee.headquarters || '__________'}
                            </div>
                            <div>
                                <strong>{b.date}:</strong> {claim.declaration_date ? claim.declaration_date.split('-').reverse().join('/') : '__________'}
                            </div>
                        </div>

                        <div style={{ textAlign: 'center', minWidth: '220px' }}>
                            <div style={{ height: '24px' }}></div>
                            <div style={{ borderBottom: '1px dotted black', width: '180px', margin: '0 auto 4px auto' }}></div>
                            <div style={{ fontWeight: 'bold' }}>{b.claimantSignature}</div>
                            <div>({empDisplayName})</div>
                            <div style={{ fontSize: '8pt', color: '#475569' }}>{employee.designation}</div>
                        </div>
                    </div>

                    {/* Section 4: Controlling Officer Certificate & Bill Sanction Order */}
                    <div style={{
                        border: '1.5px solid black',
                        padding: '10px 14px',
                        fontSize: '8.8pt',
                        lineHeight: '1.45',
                        background: '#fafafa'
                    }} className="form21-passing-box">
                        <div style={{
                            fontWeight: 'bold',
                            fontSize: '9.5pt',
                            borderBottom: '1px solid black',
                            paddingBottom: '3px',
                            marginBottom: '6px'
                        }}>
                            {language === 'hi' ? '2. नियंत्रण अधिकारी का प्रमाण-पत्र एवं देयक पारित आदेश' : '2. Controlling Officer Certificate & Bill Passing Order'}
                        </div>
                        <p style={{ margin: '3px 0', fontSize: '8.3pt' }}>
                            {language === 'hi'
                                ? 'प्रमाणित किया जाता है कि कर्मचारी द्वारा प्रस्तुत दौरा डायरी एवं देयक का सत्यापन कर लिया गया है तथा यात्राएं शासकीय कार्य संपादन हेतु की गई हैं एवं नियमानुसार देय हैं।'
                                : 'Certified that the tour diary and submitted claim have been verified. Journeys were undertaken in official interest and are admissible as per rules.'}
                        </p>

                        <div style={{
                            marginTop: '8px',
                            padding: '6px 10px',
                            border: '1px dashed #64748b',
                            background: 'white',
                            fontSize: '8.8pt'
                        }}>
                            <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>
                                {language === 'hi' ? 'देयक पारित / स्वीकृति आदेश (Order Passed for Payment):' : 'Order Passed for Payment:'}
                            </div>
                            <div>
                                {language === 'hi'
                                    ? `देयक परीक्षणोपरांत शुद्ध राशि ₹ ${netAmount.toFixed(2)} (अक्षरी: ${words}) का भुगतान पारित / स्वीकृत किया जाता है।`
                                    : `After due audit and verification, net amount of ₹ ${netAmount.toFixed(2)} (${words}) is hereby passed for payment.`}
                            </div>
                        </div>

                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-end',
                            marginTop: '32px',
                            padding: '0 8px'
                        }}>
                            <div style={{ textAlign: 'center', minWidth: '160px' }}>
                                <div style={{ borderBottom: '1px dotted black', width: '140px', margin: '0 auto 4px auto' }}></div>
                                <div style={{ fontWeight: '600', fontSize: '8.5pt' }}>
                                    {language === 'hi' ? 'लेखापाल / सहायक लेखाधिकारी' : 'Accountant / AAO'}
                                </div>
                                <div style={{ fontSize: '7.8pt', color: '#64748b' }}>MPSCSC</div>
                            </div>

                            <div style={{ textAlign: 'center', minWidth: '200px' }}>
                                <div style={{ borderBottom: '1px dotted black', width: '170px', margin: '0 auto 4px auto' }}></div>
                                <div style={{ fontWeight: 'bold', fontSize: '9pt' }}>
                                    {language === 'hi' ? 'नियंत्रण अधिकारी / जिला प्रबंधक' : 'Controlling Officer / District Manager'}
                                </div>
                                <div style={{ fontSize: '7.8pt', color: '#64748b' }}>
                                    {language === 'hi' ? 'म.प्र. स्टेट सिविल सप्लाइज कॉर्पोरेशन लि.' : 'MPSCSC Ltd.'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Treasury Form 21 A4 Portrait Print Styles */}
            <style>{`
                .bill-21-table {
                    border-collapse: collapse;
                    width: 100%;
                    border: 1px solid black;
                    table-layout: fixed;
                    margin-bottom: 8px;
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
                    hyphens: manual;
                }
                .bill-21-table td.wrap, .bill-21-table th.wrap {
                    white-space: normal;
                    overflow-wrap: break-word;
                    word-break: normal;
                }
                .bill-21-table th {
                    background: #f1f5f9;
                    text-align: center;
                    font-size: 0.88em;
                    font-weight: bold;
                }
                .col-numbers td {
                    text-align: center;
                    font-size: 8px;
                    background: #e2e8f0;
                    font-weight: bold;
                    padding: 1px;
                }
                @media print {
                    @page {
                        size: A4 portrait;
                        margin: 5mm 5mm 6mm 5mm;
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
                        background: white !important;
                        font-family: 'Inter', 'Noto Sans Devanagari', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                    .print-logo {
                        width: 42px !important;
                        height: 42px !important;
                        min-width: 42px !important;
                        min-height: 42px !important;
                    }
                    .bill-print-container { 
                        width: 100% !important; 
                        max-width: 100% !important;
                        border: none !important; 
                        padding: 0 !important;
                        margin: 0 !important;
                        box-shadow: none !important;
                    }
                    .form21-meta-box {
                        font-size: 7.2pt !important;
                        padding: 3px 6px !important;
                        margin-bottom: 4px !important;
                        gap: 2px 14px !important;
                    }
                    .table-scroll-wrapper {
                        overflow: visible !important;
                        width: 100% !important;
                    }
                    .bill-21-table {
                        width: 100% !important;
                        table-layout: fixed !important;
                        border-collapse: collapse !important;
                        margin-bottom: 2px !important;
                        page-break-inside: auto;
                    }

                    /* Balanced A4 Portrait Column Proportions */
                    .bill-21-table col.col-c1 { width: 5.6% !important; }
                    .bill-21-table col.col-c2 { width: 6.8% !important; }
                    .bill-21-table col.col-c3 { width: 5.6% !important; }
                    .bill-21-table col.col-c4 { width: 6.8% !important; }
                    .bill-21-table col.col-c5 { width: 8.5% !important; }
                    .bill-21-table col.col-c6 { width: 5.4% !important; }
                    .bill-21-table col.col-c7 { width: 4.4% !important; }
                    .bill-21-table col.col-c8 { width: 5.2% !important; }
                    .bill-21-table col.col-c9 { width: 3.4% !important; }
                    .bill-21-table col.col-c10 { width: 4.8% !important; }
                    .bill-21-table col.col-c11 { width: 4.5% !important; }
                    .bill-21-table col.col-c12 { width: 3.2% !important; }
                    .bill-21-table col.col-c13 { width: 4.4% !important; }
                    .bill-21-table col.col-c14 { width: 4.5% !important; }
                    .bill-21-table col.col-c15 { width: 3.2% !important; }
                    .bill-21-table col.col-c16 { width: 4.4% !important; }
                    .bill-21-table col.col-c17 { width: 4.5% !important; }
                    .bill-21-table col.col-c18 { width: 4.2% !important; }
                    .bill-21-table col.col-c19 { width: 4.4% !important; }
                    .bill-21-table col.col-c20 { width: 5.8% !important; }
                    .bill-21-table col.col-c21 { width: 5.2% !important; }

                    .bill-21-table th, .bill-21-table td {
                        border: 1px solid black !important;
                        padding: 1.5px 1.5px !important;
                        line-height: 1.12 !important;
                        font-size: 6.0pt !important;
                        vertical-align: middle !important;
                        word-break: normal !important;
                        overflow-wrap: break-word !important;
                        hyphens: manual !important;
                    }
                    .bill-21-table th {
                        background: #f8fafc !important;
                        font-size: 5.6pt !important;
                        font-weight: bold !important;
                        text-align: center !important;
                        letter-spacing: -0.15px !important;
                    }
                    .col-numbers td {
                        background: #f1f5f9 !important;
                        font-size: 5.4pt !important;
                        padding: 0.5px !important;
                        text-align: center !important;
                        font-weight: bold !important;
                    }
                    .bill-21-table tr {
                        page-break-inside: avoid;
                        page-break-after: auto;
                    }
                    .bill-21-table thead {
                        display: table-header-group;
                    }

                    /* Form 21 Page 1 Footer */
                    .form21-page1-notice {
                        display: flex !important;
                        font-size: 7.2pt !important;
                    }

                    /* Form 21 Page 2: Part II Container */
                    .form21-page2-container {
                        page-break-before: always !important;
                        break-before: page !important;
                        padding-top: 4mm !important;
                        display: block !important;
                        border-top: none !important;
                        margin-top: 0 !important;
                    }
                    .form21-page2-header {
                        display: block !important;
                        margin-bottom: 8px !important;
                    }
                    .form21-calc-box {
                        font-size: 8.5pt !important;
                        padding: 6px 10px !important;
                        margin-bottom: 10px !important;
                    }
                    .form21-cert-box {
                        font-size: 8.0pt !important;
                        padding: 6px 10px !important;
                        margin-bottom: 10px !important;
                        line-height: 1.4 !important;
                    }
                    .form21-claimant-sig-box {
                        font-size: 8.5pt !important;
                        margin-bottom: 12px !important;
                    }
                    .form21-passing-box {
                        font-size: 8.2pt !important;
                        padding: 6px 10px !important;
                        page-break-inside: avoid !important;
                    }
                }
            `}</style>
        </div>
    );
}
