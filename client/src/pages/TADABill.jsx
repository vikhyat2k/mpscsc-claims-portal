import api, { apiRequest } from '../utils/api';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Printer, ArrowLeft, FileSpreadsheet, MousePointer2, Receipt, Edit, Check, X, ShieldCheck, Eye, EyeOff, Sparkles, RotateCcw } from 'lucide-react';
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

    // Base proportional weights for all 21 Form 21 statutory columns (sum = 100.0)
    const baseColWeights = {
        c1: 5.2,
        c2: 6.4,
        c3: 5.2,
        c4: 6.4,
        c5: 9.2,
        c6: 4.8,
        c7: 3.8,
        c8: 4.8,
        c9: 3.0,
        c10: 4.6,
        c11: 4.4,
        c12: 2.8,
        c13: 4.2,
        c14: 4.2,
        c15: 2.8,
        c16: 4.2,
        c17: 4.2,
        c18: 4.0,
        c19: 4.2,
        c20: 5.5,
        c21: 6.1
    };

    const colKeys = Object.keys(baseColWeights);

    // Statutory 21-Column widths and visibility (matching Treasury Form 21 standard - exact 100% total)
    const defaultColSettings = {
        c1: { w: '5.2%', v: true, label: 'Departure Station' },
        c2: { w: '6.4%', v: true, label: 'Departure Date / Time' },
        c3: { w: '5.2%', v: true, label: 'Arrival Station' },
        c4: { w: '6.4%', v: true, label: 'Arrival Date / Time' },
        c5: { w: '9.2%', v: true, label: 'Purpose of Journey' },
        c6: { w: '4.8%', v: true, label: 'Transfer Description' },
        c7: { w: '3.8%', v: true, label: 'Transfer Amount (₹)' },
        c8: { w: '4.8%', v: true, label: 'Class of Travel Undertaken' },
        c9: { w: '3.0%', v: true, label: 'Distance (KM)' },
        c10: { w: '4.6%', v: true, label: 'Ticket PNR' },
        c11: { w: '4.4%', v: true, label: 'Fare Amount (₹)' },
        c12: { w: '2.8%', v: true, label: 'Journey DA Time (Hrs)' },
        c13: { w: '4.2%', v: true, label: 'Journey DA Limit' },
        c14: { w: '4.2%', v: true, label: 'Journey DA Amount (₹)' },
        c15: { w: '2.8%', v: true, label: 'Stay DA Time (Hrs)' },
        c16: { w: '4.2%', v: true, label: 'Stay DA Limit' },
        c17: { w: '4.2%', v: true, label: 'Stay DA Amount (₹)' },
        c18: { w: '4.0%', v: true, label: 'Transport Expenses (₹)' },
        c19: { w: '4.2%', v: true, label: 'Hotel Expenses (₹)' },
        c20: { w: '5.5%', v: true, label: 'Row Total (₹)' },
        c21: { w: '6.1%', v: true, label: 'Remarks' },
    };

    const [colSettings, setColSettings] = useState(defaultColSettings);
    const [isHidingBlank, setIsHidingBlank] = useState(false);

    // Dynamic sequential column numbering (1 to N) for only visible columns
    const colNumbers = useMemo(() => {
        const map = {};
        let seq = 1;
        colKeys.forEach(k => {
            if (colSettings[k]?.v) {
                map[k] = seq++;
            }
        });
        return map;
    }, [colSettings]);

    const visibleColCount = useMemo(() => {
        return colKeys.filter(k => colSettings[k]?.v).length;
    }, [colSettings]);

    // Proportional column width dynamically scaling visible columns to exactly 100%
    const getColWidth = (key) => {
        if (colSettings[key]?.w && typeof colSettings[key].w === 'string' && colSettings[key].w.endsWith('px')) {
            return colSettings[key].w;
        }
        const visibleWeightSum = colKeys.reduce((sum, k) => {
            return sum + (colSettings[k]?.v ? baseColWeights[k] : 0);
        }, 0) || 100;
        const pct = ((baseColWeights[key] / visibleWeightSum) * 100).toFixed(2);
        return `${pct}%`;
    };

    // Detect which columns are empty / unnecessary in the current bill
    const detectBlankColumns = (data) => {
        if (!data) return {};
        const { claim = {}, billRows = [], totals = {} } = data;
        const isTransfer = claim?.claim_type === 'TRANSFER';

        return {
            c1: false, // Departure Station
            c2: false, // Departure Date/Time
            c3: false, // Arrival Station
            c4: false, // Arrival Date/Time
            c5: false, // Purpose of Journey
            c6: !isTransfer || !billRows.some((r, idx) => idx === 0 && (totals.transferGrant > 0 || totals.totalTransport > 0 || claim?.family_details || claim?.baggage_weight)),
            c7: !isTransfer || !(parseFloat(totals.transferAllowance || totals.totalTransport || 0) > 0),
            c8: !billRows.some(r => (r.class_of_travel || r.mode || '').trim().length > 0),
            c9: !billRows.some(r => parseFloat(r.distance_km || 0) > 0),
            c10: !billRows.some(r => (r.ticket_no || '').trim().length > 0),
            c11: !billRows.some(r => parseFloat(r.ta_approved || r.fare_amount || 0) > 0),
            c12: !billRows.some(r => parseFloat(r.travel_hrs || 0) > 0 || parseFloat(r.journey_da || 0) > 0),
            c13: !billRows.some(r => parseFloat(r.travel_hrs || 0) > 0 || parseFloat(r.journey_da || 0) > 0),
            c14: !billRows.some(r => parseFloat(r.journey_da || 0) > 0),
            c15: !billRows.some(r => parseFloat(r.stay_hrs || 0) > 0 || parseFloat(r.stay_da || 0) > 0),
            c16: !billRows.some(r => parseFloat(r.stay_hrs || 0) > 0 || parseFloat(r.stay_da || 0) > 0),
            c17: !billRows.some(r => parseFloat(r.stay_da || 0) > 0),
            c18: !billRows.some(r => parseFloat(r.local_transport || 0) > 0) && !(totals.totalLocalTransport > 0),
            c19: !billRows.some(r => parseFloat(r.stay_allowance || 0) > 0) && !(totals.totalStayAllowance > 0),
            c20: false, // Row total
            c21: !billRows.some(r => (r.remarks || '').trim().length > 0)
        };
    };

    const blankMap = useMemo(() => {
        return detectBlankColumns(billData);
    }, [billData]);

    const handleToggleBlankColumns = () => {
        if (!billData) return;
        if (isHidingBlank) {
            // Restore all 21 columns
            setColSettings(prev => {
                const next = { ...prev };
                colKeys.forEach(k => {
                    next[k] = { ...next[k], v: true };
                });
                return next;
            });
            setIsHidingBlank(false);
        } else {
            // Hide blank columns
            setColSettings(prev => {
                const next = { ...prev };
                colKeys.forEach(k => {
                    if (blankMap[k]) {
                        next[k] = { ...next[k], v: false };
                    }
                });
                return next;
            });
            setIsHidingBlank(true);
        }
    };

    const handleShowAllColumns = () => {
        setColSettings(prev => {
            const next = { ...prev };
            colKeys.forEach(k => {
                next[k] = { ...next[k], v: true };
            });
            return next;
        });
        setIsHidingBlank(false);
    };

    const handleResetColSettings = () => {
        setColSettings(defaultColSettings);
        setIsHidingBlank(false);
    };

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

        const visibleKeys = colKeys.filter(k => colSettings[k]?.v);
        const totalCols = visibleKeys.length;

        const colExcelWidths = {
            c1: 14, c2: 16, c3: 14, c4: 16, c5: 28, c6: 16, c7: 12, c8: 14,
            c9: 10, c10: 15, c11: 12, c12: 11, c13: 14, c14: 13, c15: 11,
            c16: 14, c17: 13, c18: 14, c19: 13, c20: 14, c21: 16
        };

        ws.columns = visibleKeys.map(k => ({ width: colExcelWidths[k] || 14 }));

        const excelColMap = {};
        visibleKeys.forEach((k, idx) => {
            excelColMap[k] = idx + 1; // 1-based index in Excel
        });

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
        ws.mergeCells(1, 1, 1, totalCols);
        ws.getCell(1, 1).value = b.title;
        ws.getRow(1).height = 26;
        styleRange(1, 1, 1, totalCols, {
            font: { name: fontName, size: 14, bold: true, color: { argb: 'FF000000' } },
            alignment: { horizontal: 'center', vertical: 'middle' }
        });

        // Row 2: Subtitle
        const dateRangeText = language === 'hi'
            ? `${formatDateDMY(employee.start_date || claim.start_date || '_________')} ${b.periodFrom} ${formatDateDMY(employee.end_date || claim.end_date || '_________')} ${b.periodTo}`
            : `${formatDateDMY(employee.start_date || claim.start_date || '_________')} ${b.periodTo} ${formatDateDMY(employee.end_date || claim.end_date || '_________')}`;
        ws.mergeCells(2, 1, 2, totalCols);
        ws.getCell(2, 1).value = `${billSubTitle} (${b.periodLabel}: ${dateRangeText})`;
        ws.getRow(2).height = 20;
        styleRange(2, 1, 2, totalCols, {
            font: { name: fontName, size: 11, bold: true, color: { argb: 'FF000000' } },
            alignment: { horizontal: 'center', vertical: 'middle' }
        });

        // Row 3: Spacing
        ws.getRow(3).height = 8;

        // Rows 4 & 5: Top 6-Field Box
        const cPart1 = Math.max(1, Math.floor(totalCols / 3));
        const cPart2 = Math.max(cPart1 + 1, Math.floor((totalCols * 2) / 3));

        ws.mergeCells(4, 1, 4, cPart1);
        ws.getCell(4, 1).value = `${b.name}: ${empDisplayName}`;
        ws.mergeCells(4, cPart1 + 1, 4, cPart2);
        ws.getCell(4, cPart1 + 1).value = `${b.gradePay}: ${formatPayLevelAndGradePay(employee, language)}`;
        ws.mergeCells(4, cPart2 + 1, 4, totalCols);
        ws.getCell(4, cPart2 + 1).value = `${b.fixedTA} ₹: ${employee.fixed_ta ? employee.fixed_ta : '-'}`;

        ws.mergeCells(5, 1, 5, cPart1);
        ws.getCell(5, 1).value = `${b.designation}: ${employee.designation || '—'}`;
        ws.mergeCells(5, cPart1 + 1, 5, cPart2);
        ws.getCell(5, cPart1 + 1).value = `${b.headquarter}: ${employee.headquarters || '—'}`;
        ws.mergeCells(5, cPart2 + 1, 5, totalCols);
        ws.getCell(5, cPart2 + 1).value = `${b.consolidatedDA}: ${defaultDaRate ? '₹' + defaultDaRate : '-'}`;

        ws.getRow(4).height = 22;
        ws.getRow(5).height = 22;
        styleRange(4, 1, 5, totalCols, {
            font: { name: fontName, size: 9.5, color: { argb: 'FF000000' } },
            border: blackThinBorder,
            alignment: { horizontal: 'left', vertical: 'middle', wrapText: true }
        });

        // Row 6: Currency indicator
        ws.getCell(6, totalCols).value = b.amountInRupees;
        ws.getCell(6, totalCols).font = { name: fontName, size: 8.5, bold: true, italic: true, color: { argb: 'FF333333' } };
        ws.getCell(6, totalCols).alignment = { horizontal: 'right', vertical: 'middle' };
        ws.getRow(6).height = 16;

        // Row 7: Header Tier 1 (Groups)
        const jhCols = [excelColMap.c1, excelColMap.c2, excelColMap.c3, excelColMap.c4].filter(Boolean);
        if (jhCols.length > 0) {
            const jStart = Math.min(...jhCols);
            const jEnd = Math.max(...jhCols);
            if (jStart < jEnd) ws.mergeCells(7, jStart, 7, jEnd);
            ws.getCell(7, jStart).value = b.journeyAndHaltTitle;
        }

        if (excelColMap.c5) {
            ws.mergeCells(7, excelColMap.c5, 8, excelColMap.c5);
            ws.getCell(7, excelColMap.c5).value = b.purpose;
        }

        const trCols = [excelColMap.c6, excelColMap.c7].filter(Boolean);
        if (trCols.length > 0) {
            const tStart = Math.min(...trCols);
            const tEnd = Math.max(...trCols);
            if (tStart < tEnd) ws.mergeCells(7, tStart, 7, tEnd);
            ws.getCell(7, tStart).value = b.transferFamilyTitle;
        }

        const fareCols = [excelColMap.c8, excelColMap.c9, excelColMap.c10, excelColMap.c11].filter(Boolean);
        if (fareCols.length > 0) {
            const fStart = Math.min(...fareCols);
            const fEnd = Math.max(...fareCols);
            if (fStart < fEnd) ws.mergeCells(7, fStart, 7, fEnd);
            ws.getCell(7, fStart).value = b.fareSectionTitle;
        }

        const allowCols = [excelColMap.c12, excelColMap.c13, excelColMap.c14, excelColMap.c15, excelColMap.c16, excelColMap.c17].filter(Boolean);
        if (allowCols.length > 0) {
            const aStart = Math.min(...allowCols);
            const aEnd = Math.max(...allowCols);
            if (aStart < aEnd) ws.mergeCells(7, aStart, 7, aEnd);
            ws.getCell(7, aStart).value = b.allowancesTitle;
        }

        if (excelColMap.c18) {
            ws.mergeCells(7, excelColMap.c18, 8, excelColMap.c18);
            ws.getCell(7, excelColMap.c18).value = b.transportExp;
        }
        if (excelColMap.c19) {
            ws.mergeCells(7, excelColMap.c19, 8, excelColMap.c19);
            ws.getCell(7, excelColMap.c19).value = b.hotelExp;
        }
        if (excelColMap.c20) {
            ws.mergeCells(7, excelColMap.c20, 8, excelColMap.c20);
            ws.getCell(7, excelColMap.c20).value = b.rowTotal;
        }
        if (excelColMap.c21) {
            ws.mergeCells(7, excelColMap.c21, 8, excelColMap.c21);
            ws.getCell(7, excelColMap.c21).value = b.remarks;
        }
        ws.getRow(7).height = 28;

        // Row 8: Header Tier 2 (Sub-headers)
        if (excelColMap.c1) ws.getCell(8, excelColMap.c1).value = `${b.departure.place}`;
        if (excelColMap.c2) ws.getCell(8, excelColMap.c2).value = `${b.departure.dateTime}`;
        if (excelColMap.c3) ws.getCell(8, excelColMap.c3).value = `${b.arrival.place}`;
        if (excelColMap.c4) ws.getCell(8, excelColMap.c4).value = `${b.arrival.dateTime}`;
        if (excelColMap.c6) ws.getCell(8, excelColMap.c6).value = b.transferDescription;
        if (excelColMap.c7) ws.getCell(8, excelColMap.c7).value = b.transferAmount;
        if (excelColMap.c8) ws.getCell(8, excelColMap.c8).value = b.classOfTravel;
        if (excelColMap.c9) ws.getCell(8, excelColMap.c9).value = b.distanceKm;
        if (excelColMap.c10) ws.getCell(8, excelColMap.c10).value = b.ticketCountOrNo;
        if (excelColMap.c11) ws.getCell(8, excelColMap.c11).value = b.fareAmount;
        if (excelColMap.c12) ws.getCell(8, excelColMap.c12).value = b.journeyDA.hrs;
        if (excelColMap.c13) ws.getCell(8, excelColMap.c13).value = b.journeyDA.rate;
        if (excelColMap.c14) ws.getCell(8, excelColMap.c14).value = b.journeyDA.amount;
        if (excelColMap.c15) ws.getCell(8, excelColMap.c15).value = b.haltDA.hrs;
        if (excelColMap.c16) ws.getCell(8, excelColMap.c16).value = b.haltDA.rate;
        if (excelColMap.c17) ws.getCell(8, excelColMap.c17).value = b.haltDA.amount;
        ws.getRow(8).height = 28;

        styleRange(7, 1, 8, totalCols, {
            font: { name: fontName, size: 9, bold: true, color: { argb: 'FF000000' } },
            fill: headerFill,
            border: blackThinBorder,
            alignment: { horizontal: 'center', vertical: 'middle', wrapText: true }
        });

        // Row 9: Header Tier 3 (Sequential Numbers 1 to N matching visible columns)
        ws.getRow(9).height = 18;
        for (let c = 1; c <= totalCols; c++) {
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

            if (excelColMap.c1) {
                row.getCell(excelColMap.c1).value = r.departure_station || '';
                row.getCell(excelColMap.c1).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
            }
            if (excelColMap.c2) {
                row.getCell(excelColMap.c2).value = formatDateDMY(r.departure_date) + (r.departure_time ? '\n' + formatTime12Hr(r.departure_time) : '');
                row.getCell(excelColMap.c2).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
            }
            if (excelColMap.c3) {
                row.getCell(excelColMap.c3).value = r.arrival_station || '';
                row.getCell(excelColMap.c3).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
            }
            if (excelColMap.c4) {
                row.getCell(excelColMap.c4).value = formatDateDMY(r.arrival_date) + (r.arrival_time ? '\n' + formatTime12Hr(r.arrival_time) : '');
                row.getCell(excelColMap.c4).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
            }
            if (excelColMap.c5) {
                const mInfo = mergeInfo[idx] || { isChild: false, span: 1 };
                if (!mInfo.isChild) {
                    if (mInfo.span > 1) {
                        ws.mergeCells(curRow, excelColMap.c5, curRow + mInfo.span - 1, excelColMap.c5);
                    }
                    row.getCell(excelColMap.c5).value = r.purpose || '—';
                }
                row.getCell(excelColMap.c5).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
            }
            if (excelColMap.c6) {
                row.getCell(excelColMap.c6).value = transferDesc;
                row.getCell(excelColMap.c6).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
            }
            if (excelColMap.c7) {
                row.getCell(excelColMap.c7).value = transferAmt;
                row.getCell(excelColMap.c7).numFmt = '#,##0.00';
                row.getCell(excelColMap.c7).alignment = { horizontal: 'right', vertical: 'middle' };
            }
            if (excelColMap.c8) {
                row.getCell(excelColMap.c8).value = r.mode + (r.class_of_travel ? ` (${r.class_of_travel})` : '');
                row.getCell(excelColMap.c8).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
            }
            if (excelColMap.c9) {
                row.getCell(excelColMap.c9).value = r.distance_km ? parseFloat(r.distance_km) : null;
                row.getCell(excelColMap.c9).alignment = { horizontal: 'center', vertical: 'middle' };
            }
            if (excelColMap.c10) {
                row.getCell(excelColMap.c10).value = r.ticket_no || '';
                row.getCell(excelColMap.c10).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
            }
            if (excelColMap.c11) {
                const fareVal = parseFloat(r.ta_approved || r.fare_amount || 0);
                row.getCell(excelColMap.c11).value = fareVal > 0 ? fareVal : null;
                row.getCell(excelColMap.c11).numFmt = '#,##0.00';
                row.getCell(excelColMap.c11).alignment = { horizontal: 'right', vertical: 'middle' };
            }
            if (excelColMap.c12) {
                row.getCell(excelColMap.c12).value = r.travel_hrs !== '0.0' && r.travel_hrs ? parseFloat(r.travel_hrs) : null;
                row.getCell(excelColMap.c12).alignment = { horizontal: 'center', vertical: 'middle' };
            }
            if (excelColMap.c13) {
                row.getCell(excelColMap.c13).value = jFactor > 0 ? formatDACount(jFactor, language, true) : '';
                row.getCell(excelColMap.c13).alignment = { horizontal: 'center', vertical: 'middle' };
            }
            if (excelColMap.c14) {
                const jAmt = parseFloat(r.journey_da || 0);
                row.getCell(excelColMap.c14).value = jAmt > 0 ? jAmt : null;
                row.getCell(excelColMap.c14).numFmt = '#,##0.00';
                row.getCell(excelColMap.c14).alignment = { horizontal: 'right', vertical: 'middle' };
            }
            if (excelColMap.c15) {
                row.getCell(excelColMap.c15).value = r.stay_hrs !== '0.0' && r.stay_hrs ? parseFloat(r.stay_hrs) : null;
                row.getCell(excelColMap.c15).alignment = { horizontal: 'center', vertical: 'middle' };
            }
            if (excelColMap.c16) {
                row.getCell(excelColMap.c16).value = sFactor > 0 ? formatDACount(sFactor, language, true) : '';
                row.getCell(excelColMap.c16).alignment = { horizontal: 'center', vertical: 'middle' };
            }
            if (excelColMap.c17) {
                const sAmt = parseFloat(r.stay_da || 0);
                row.getCell(excelColMap.c17).value = sAmt > 0 ? sAmt : null;
                row.getCell(excelColMap.c17).numFmt = '#,##0.00';
                row.getCell(excelColMap.c17).alignment = { horizontal: 'right', vertical: 'middle' };
            }
            if (excelColMap.c18) {
                const locTrans = parseFloat(r.local_transport || 0);
                row.getCell(excelColMap.c18).value = locTrans > 0 ? locTrans : null;
                row.getCell(excelColMap.c18).numFmt = '#,##0.00';
                row.getCell(excelColMap.c18).alignment = { horizontal: 'right', vertical: 'middle' };
            }
            if (excelColMap.c19) {
                const stayAll = parseFloat(r.stay_allowance || 0);
                row.getCell(excelColMap.c19).value = stayAll > 0 ? stayAll : null;
                row.getCell(excelColMap.c19).numFmt = '#,##0.00';
                row.getCell(excelColMap.c19).alignment = { horizontal: 'right', vertical: 'middle' };
            }
            if (excelColMap.c20) {
                const rTotal = parseFloat(r.total_amount || 0);
                row.getCell(excelColMap.c20).value = rTotal > 0 ? rTotal : null;
                row.getCell(excelColMap.c20).numFmt = '#,##0.00';
                row.getCell(excelColMap.c20).alignment = { horizontal: 'right', vertical: 'middle' };
            }
            if (excelColMap.c21) {
                row.getCell(excelColMap.c21).value = r.remarks || '';
                row.getCell(excelColMap.c21).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
            }

            for (let c = 1; c <= totalCols; c++) {
                const cell = row.getCell(c);
                if (!cell.font) cell.font = { name: fontName, size: 9 };
                cell.border = thinBorder;
            }

            curRow++;
        });

        // Grand Total Row
        const labelEndCol = excelColMap.c5 ? excelColMap.c5 : Math.min(4, totalCols);
        ws.mergeCells(curRow, 1, curRow, labelEndCol);
        ws.getCell(curRow, 1).value = `${b.grossTotal}:`;
        ws.getCell(curRow, 1).alignment = { horizontal: 'right', vertical: 'middle' };

        if (excelColMap.c7) {
            ws.getCell(curRow, excelColMap.c7).value = (claim.claim_type === 'TRANSFER' && (totals.transferAllowance || totals.totalTransport)) ? parseFloat(totals.transferAllowance || totals.totalTransport) : null;
            ws.getCell(curRow, excelColMap.c7).numFmt = '#,##0.00';
        }
        if (excelColMap.c11) {
            ws.getCell(curRow, excelColMap.c11).value = totals.totalFare ? parseFloat(totals.totalFare) : null;
            ws.getCell(curRow, excelColMap.c11).numFmt = '#,##0.00';
        }
        if (excelColMap.c14) {
            ws.getCell(curRow, excelColMap.c14).value = totals.totalJourneyDA ? parseFloat(totals.totalJourneyDA) : null;
            ws.getCell(curRow, excelColMap.c14).numFmt = '#,##0.00';
        }
        if (excelColMap.c17) {
            ws.getCell(curRow, excelColMap.c17).value = totals.totalStayDA ? parseFloat(totals.totalStayDA) : null;
            ws.getCell(curRow, excelColMap.c17).numFmt = '#,##0.00';
        }
        if (excelColMap.c18) {
            ws.getCell(curRow, excelColMap.c18).value = totals.totalLocalTransport > 0 ? parseFloat(totals.totalLocalTransport) : null;
            ws.getCell(curRow, excelColMap.c18).numFmt = '#,##0.00';
        }
        if (excelColMap.c19) {
            ws.getCell(curRow, excelColMap.c19).value = totals.totalStayAllowance > 0 ? parseFloat(totals.totalStayAllowance) : null;
            ws.getCell(curRow, excelColMap.c19).numFmt = '#,##0.00';
        }
        if (excelColMap.c20) {
            ws.getCell(curRow, excelColMap.c20).value = totals.grandTotal ? parseFloat(totals.grandTotal) : null;
            ws.getCell(curRow, excelColMap.c20).numFmt = '#,##0.00';
        }

        ws.getRow(curRow).height = 22;
        styleRange(curRow, 1, curRow, totalCols, {
            font: { name: fontName, size: 9, bold: true, color: { argb: 'FF000000' } },
            fill: totalRowFill,
            border: doubleBottomBorder
        });
        curRow++;

        // Summary Row: Consolidated DA Limit
        const bannerEnd = Math.min(labelEndCol, totalCols);
        ws.mergeCells(curRow, 1, curRow, bannerEnd);
        ws.getCell(curRow, 1).value = `${b.consolidatedDALimit}: ${claimDALimitText}`;
        ws.getRow(curRow).height = 22;
        styleRange(curRow, 1, curRow, totalCols, {
            font: { name: fontName, size: 9.5, bold: true, color: { argb: 'FF1E3A8A' } },
            fill: summaryBannerFill,
            border: blackThinBorder,
            alignment: { horizontal: 'left', vertical: 'middle' }
        });
        curRow += 2;

        // Deductions & Net Payable Box (Aligned to right edge of visible columns)
        const dBoxCols = Math.min(8, totalCols);
        const dLabelStart = Math.max(1, totalCols - dBoxCols + 1);
        const dLabelEnd = Math.max(dLabelStart, totalCols - Math.floor(dBoxCols / 2));
        const dValStart = dLabelEnd + 1;
        const dValEnd = totalCols;

        ws.mergeCells(curRow, dLabelStart, curRow, dLabelEnd);
        ws.getCell(curRow, dLabelStart).value = `${b.grossTotal}:`;
        ws.mergeCells(curRow, dValStart, curRow, dValEnd);
        ws.getCell(curRow, dValStart).value = totals.grandTotal ? parseFloat(totals.grandTotal) : 0;
        ws.getCell(curRow, dValStart).numFmt = '#,##0.00';
        ws.getRow(curRow).height = 20;
        styleRange(curRow, dLabelStart, curRow, totalCols, {
            font: { name: fontName, size: 9, bold: true },
            border: thinBorder,
            alignment: { horizontal: 'right', vertical: 'middle' }
        });
        curRow++;

        ws.mergeCells(curRow, dLabelStart, curRow, dLabelEnd);
        ws.getCell(curRow, dLabelStart).value = `${b.lessAdvance}:`;
        ws.mergeCells(curRow, dValStart, curRow, dValEnd);
        ws.getCell(curRow, dValStart).value = totals.advanceAmount ? parseFloat(totals.advanceAmount) : 0;
        ws.getCell(curRow, dValStart).numFmt = '#,##0.00';
        ws.getRow(curRow).height = 20;
        styleRange(curRow, dLabelStart, curRow, totalCols, {
            font: { name: fontName, size: 9, bold: true },
            border: thinBorder,
            alignment: { horizontal: 'right', vertical: 'middle' }
        });
        curRow++;

        ws.mergeCells(curRow, dLabelStart, curRow, dLabelEnd);
        ws.getCell(curRow, dLabelStart).value = `${b.netPayable}:`;
        ws.mergeCells(curRow, dValStart, curRow, dValEnd);
        ws.getCell(curRow, dValStart).value = netAmount ? parseFloat(netAmount) : 0;
        ws.getCell(curRow, dValStart).numFmt = '#,##0.00';
        ws.getRow(curRow).height = 20;
        styleRange(curRow, dLabelStart, curRow, totalCols, {
            font: { name: fontName, size: 9.5, bold: true },
            border: thinBorder,
            alignment: { horizontal: 'right', vertical: 'middle' }
        });
        curRow++;

        ws.mergeCells(curRow, dLabelStart, curRow, totalCols);
        ws.getCell(curRow, dLabelStart).value = `${b.amountInWordsLabel}: ${words}`;
        ws.getRow(curRow).height = 24;
        styleRange(curRow, dLabelStart, curRow, totalCols, {
            font: { name: fontName, size: 9, bold: true },
            border: blackThinBorder,
            alignment: { horizontal: 'left', vertical: 'middle', wrapText: true }
        });
        curRow += 2;

        // Official Certificates
        ws.mergeCells(curRow, 1, curRow, totalCols);
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
            ws.mergeCells(curRow, 1, curRow, totalCols);
            ws.getCell(curRow, 1).value = cert;
            ws.getCell(curRow, 1).font = { name: fontName, size: 8.5 };
            ws.getCell(curRow, 1).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
            ws.getRow(curRow).height = 18;
            curRow++;
        });
        curRow++;

        // Signatures
        const signRow = curRow;
        const sigHalf = Math.floor(totalCols / 2);
        ws.mergeCells(signRow, 1, signRow, sigHalf);
        ws.getCell(signRow, 1).value = `${b.place}: ${employee.headquarters || '__________'}`;
        ws.getCell(signRow, 1).font = { name: fontName, size: 9, bold: true };

        ws.mergeCells(signRow, sigHalf + 1, signRow, totalCols);
        ws.getCell(signRow, sigHalf + 1).value = `${b.claimantSignature}: ${empDisplayName}`;
        ws.getCell(signRow, sigHalf + 1).font = { name: fontName, size: 9, bold: true };
        ws.getCell(signRow, sigHalf + 1).alignment = { horizontal: 'right', vertical: 'middle' };
        ws.getRow(signRow).height = 20;
        curRow++;

        ws.mergeCells(curRow, 1, curRow, sigHalf);
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
                <button
                    type="button"
                    onClick={handleToggleBlankColumns}
                    className={isHidingBlank ? "btn btn-outline-primary" : "btn btn-outline-secondary"}
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        fontWeight: '600',
                        background: isHidingBlank ? '#eff6ff' : '#ffffff',
                        borderColor: isHidingBlank ? '#2563eb' : '#cbd5e1',
                        color: isHidingBlank ? '#1d4ed8' : '#334155'
                    }}
                    title={isHidingBlank
                        ? (language === 'hi' ? 'सभी 21 कॉलम पुनः दिखाएं' : 'Show All 21 Statutory Columns')
                        : (language === 'hi' ? 'अनावश्यक / रिक्त कॉलम छिपाएं और क्रम संख्या (1..N) स्वतः समायोजित करें' : 'Hide Unnecessary / Blank Columns & Re-number')}
                >
                    {isHidingBlank ? <RotateCcw size={17} /> : <Sparkles size={17} color="#d97706" />}
                    {isHidingBlank
                        ? (language === 'hi' ? 'सभी 21 कॉलम दिखाएं' : 'Show All 21 Columns')
                        : (language === 'hi' ? 'रिक्त कॉलम छिपाएं' : 'Hide Blank Columns')}
                    <span style={{
                        fontSize: '11px',
                        padding: '1px 7px',
                        borderRadius: '10px',
                        background: isHidingBlank ? '#2563eb' : '#e2e8f0',
                        color: isHidingBlank ? '#ffffff' : '#475569',
                        fontWeight: 'bold',
                        marginLeft: '2px'
                    }}>
                        {visibleColCount}/21
                    </span>
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
                        onClick={handleResetColSettings}
                        title={language === 'hi' ? 'सभी कॉलम चौड़ाई और दृश्यता डिफ़ॉल्ट पर रीसेट करें' : 'Reset all column widths and visibility to default'}
                    >
                        {language === 'hi' ? 'चौड़ाई रीसेट' : 'Reset Widths'}
                    </button>
                    <button
                        className="btn btn-sm btn-secondary"
                        style={{ marginLeft: '0.5rem' }}
                        onClick={() => setShowSettings(!showSettings)}
                    >
                        {showSettings ? (language === 'hi' ? 'कॉलम बंद करें' : 'Hide Settings') : (language === 'hi' ? 'कॉलम सेटिंग' : 'Column Settings')}
                    </button>
                </div>
            </div>

            {/* Column Customizer Panel */}
            {showSettings && (
                <div className="card no-print glass-control-bar" style={{ marginBottom: '1rem', padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                        <div>
                            <h5 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 'bold' }}>
                                {language === 'hi' ? 'कॉलम दृश्यता एवं चौड़ाई नियंत्रण' : 'Column Visibility & Width Settings'}
                                <span style={{ marginLeft: '8px', fontSize: '12px', fontWeight: 'normal', color: '#64748b' }}>
                                    ({language === 'hi' ? `सक्रिय: ${visibleColCount}/21 कॉलम` : `Active: ${visibleColCount}/21 columns`})
                                </span>
                            </h5>
                            <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                                <MousePointer2 size={13} style={{ verticalAlign: 'middle' }} /> {language === 'hi' ? 'कॉलम क्रमांक (1..N) स्वतः पुनः क्रमित होंगे।' : 'Visible columns are automatically re-numbered sequentially (1 to N). Drag table header edges to resize.'}
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <button
                                type="button"
                                className="btn btn-sm btn-outline-primary"
                                onClick={handleToggleBlankColumns}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11.5px', fontWeight: '600' }}
                            >
                                {isHidingBlank ? <RotateCcw size={13} /> : <Sparkles size={13} />}
                                {isHidingBlank ? (language === 'hi' ? 'सभी 21 दिखाएं' : 'Show All 21') : (language === 'hi' ? 'रिक्त छिपाएं' : 'Hide Blank')}
                            </button>
                            <button
                                type="button"
                                className="btn btn-sm btn-outline-secondary"
                                onClick={handleShowAllColumns}
                                style={{ fontSize: '11.5px' }}
                            >
                                {language === 'hi' ? 'सभी 21 कॉलम' : 'All 21 Cols'}
                            </button>
                            <button
                                type="button"
                                className="btn btn-sm btn-outline-secondary"
                                onClick={handleResetColSettings}
                                style={{ fontSize: '11.5px' }}
                            >
                                {language === 'hi' ? 'डिफ़ॉल्ट रीसेट' : 'Reset All'}
                            </button>
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '6px' }}>
                        {colKeys.map(key => {
                            const isBlank = blankMap[key];
                            const isVis = colSettings[key]?.v;
                            const seqNum = colNumbers[key];
                            return (
                                <div key={key} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    fontSize: '0.75rem',
                                    border: isVis ? '1px solid #cbd5e1' : '1px dashed #cbd5e1',
                                    padding: '4px 7px',
                                    borderRadius: '5px',
                                    background: isVis ? '#ffffff' : '#f8fafc',
                                    opacity: isVis ? 1 : 0.65
                                }}>
                                    <input
                                        type="checkbox"
                                        id={`vis-${key}`}
                                        checked={isVis}
                                        onChange={(e) => {
                                            const updated = { ...colSettings, [key]: { ...colSettings[key], v: e.target.checked } };
                                            setColSettings(updated);
                                            // If user manually changed a blank column, update hiding state
                                            const anyBlankVisible = colKeys.some(k => blankMap[k] && updated[k]?.v);
                                            setIsHidingBlank(!anyBlankVisible);
                                        }}
                                    />
                                    <label htmlFor={`vis-${key}`} style={{ cursor: 'pointer', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {isVis && <span style={{ fontWeight: 'bold', color: '#1e40af', marginRight: '4px' }}>#{seqNum}</span>}
                                        {colSettings[key]?.label}
                                    </label>
                                    {isBlank && (
                                        <span style={{ fontSize: '9.5px', color: '#dc2626', background: '#fee2e2', padding: '1px 5px', borderRadius: '3px', fontWeight: 'bold' }} title="No data in this bill">
                                            {language === 'hi' ? 'रिक्त' : 'Blank'}
                                        </span>
                                    )}
                                </div>
                            );
                        })}
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

                {/* The Statutory 21-Column Table (Treasury Form 21 Standard) */}
                <div className="table-scroll-wrapper" style={{ width: '100%', overflowX: 'hidden' }}>
                    <table className="bill-21-table">
                        <colgroup>
                            {colSettings.c1.v && <col className="col-c1" style={{ width: getColWidth('c1') }} />}
                            {colSettings.c2.v && <col className="col-c2" style={{ width: getColWidth('c2') }} />}
                            {colSettings.c3.v && <col className="col-c3" style={{ width: getColWidth('c3') }} />}
                            {colSettings.c4.v && <col className="col-c4" style={{ width: getColWidth('c4') }} />}
                            {colSettings.c5.v && <col className="col-c5" style={{ width: getColWidth('c5') }} />}
                            {colSettings.c6.v && <col className="col-c6" style={{ width: getColWidth('c6') }} />}
                            {colSettings.c7.v && <col className="col-c7" style={{ width: getColWidth('c7') }} />}
                            {colSettings.c8.v && <col className="col-c8" style={{ width: getColWidth('c8') }} />}
                            {colSettings.c9.v && <col className="col-c9" style={{ width: getColWidth('c9') }} />}
                            {colSettings.c10.v && <col className="col-c10" style={{ width: getColWidth('c10') }} />}
                            {colSettings.c11.v && <col className="col-c11" style={{ width: getColWidth('c11') }} />}
                            {colSettings.c12.v && <col className="col-c12" style={{ width: getColWidth('c12') }} />}
                            {colSettings.c13.v && <col className="col-c13" style={{ width: getColWidth('c13') }} />}
                            {colSettings.c14.v && <col className="col-c14" style={{ width: getColWidth('c14') }} />}
                            {colSettings.c15.v && <col className="col-c15" style={{ width: getColWidth('c15') }} />}
                            {colSettings.c16.v && <col className="col-c16" style={{ width: getColWidth('c16') }} />}
                            {colSettings.c17.v && <col className="col-c17" style={{ width: getColWidth('c17') }} />}
                            {colSettings.c18.v && <col className="col-c18" style={{ width: getColWidth('c18') }} />}
                            {colSettings.c19.v && <col className="col-c19" style={{ width: getColWidth('c19') }} />}
                            {colSettings.c20.v && <col className="col-c20" style={{ width: getColWidth('c20') }} />}
                            {colSettings.c21.v && <col className="col-c21" style={{ width: getColWidth('c21') }} />}
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
                                    <th rowSpan="2" style={{ position: 'relative', width: getColWidth('c5') }}>
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
                                    <th rowSpan="2" style={{ position: 'relative', width: getColWidth('c18') }}>
                                        {b.transportExp}
                                        <div className="resizer no-print" onMouseDown={e => handleMouseDown(e, 'c18')}></div>
                                    </th>
                                )}

                                {colSettings.c19.v && (
                                    <th rowSpan="2" style={{ position: 'relative', width: getColWidth('c19') }}>
                                        {b.hotelExp}
                                        <div className="resizer no-print" onMouseDown={e => handleMouseDown(e, 'c19')}></div>
                                    </th>
                                )}

                                {colSettings.c20.v && (
                                    <th rowSpan="2" style={{ position: 'relative', width: getColWidth('c20') }}>
                                        {b.rowTotal}
                                        <div className="resizer no-print" onMouseDown={e => handleMouseDown(e, 'c20')}></div>
                                    </th>
                                )}

                                {colSettings.c21.v && (
                                    <th rowSpan="2" style={{ position: 'relative', width: getColWidth('c21') }}>
                                        {b.remarks}
                                        <div className="resizer no-print" onMouseDown={e => handleMouseDown(e, 'c21')}></div>
                                    </th>
                                )}
                            </tr>

                            {/* Header Tier 2 (Specific Columns) */}
                            <tr>
                                {colSettings.c1.v && <th style={{ position: 'relative', width: getColWidth('c1') }}>{b.departure.place} <div className="resizer no-print" onMouseDown={e => handleMouseDown(e, 'c1')}></div></th>}
                                {colSettings.c2.v && <th style={{ position: 'relative', width: getColWidth('c2') }}>{b.departure.dateTime} <div className="resizer no-print" onMouseDown={e => handleMouseDown(e, 'c2')}></div></th>}
                                {colSettings.c3.v && <th style={{ position: 'relative', width: getColWidth('c3') }}>{b.arrival.place} <div className="resizer no-print" onMouseDown={e => handleMouseDown(e, 'c3')}></div></th>}
                                {colSettings.c4.v && <th style={{ position: 'relative', width: getColWidth('c4') }}>{b.arrival.dateTime} <div className="resizer no-print" onMouseDown={e => handleMouseDown(e, 'c4')}></div></th>}

                                {colSettings.c6.v && <th style={{ position: 'relative', width: getColWidth('c6') }}>{b.transferDescription} <div className="resizer no-print" onMouseDown={e => handleMouseDown(e, 'c6')}></div></th>}
                                {colSettings.c7.v && <th style={{ position: 'relative', width: getColWidth('c7') }}>{b.transferAmount} <div className="resizer no-print" onMouseDown={e => handleMouseDown(e, 'c7')}></div></th>}

                                {colSettings.c8.v && <th style={{ position: 'relative', width: getColWidth('c8') }}>{b.classOfTravel} <div className="resizer no-print" onMouseDown={e => handleMouseDown(e, 'c8')}></div></th>}
                                {colSettings.c9.v && <th style={{ position: 'relative', width: getColWidth('c9') }}>{b.distanceKm} <div className="resizer no-print" onMouseDown={e => handleMouseDown(e, 'c9')}></div></th>}
                                {colSettings.c10.v && <th style={{ position: 'relative', width: getColWidth('c10') }}>{b.ticketCountOrNo} <div className="resizer no-print" onMouseDown={e => handleMouseDown(e, 'c10')}></div></th>}
                                {colSettings.c11.v && <th style={{ position: 'relative', width: getColWidth('c11') }}>{b.fareAmount} <div className="resizer no-print" onMouseDown={e => handleMouseDown(e, 'c11')}></div></th>}

                                {colSettings.c12.v && <th style={{ position: 'relative', width: getColWidth('c12') }}>{b.journeyDA.hrs} <div className="resizer no-print" onMouseDown={e => handleMouseDown(e, 'c12')}></div></th>}
                                {colSettings.c13.v && <th style={{ position: 'relative', width: getColWidth('c13') }}>{b.journeyDA.rate} <div className="resizer no-print" onMouseDown={e => handleMouseDown(e, 'c13')}></div></th>}
                                {colSettings.c14.v && <th style={{ position: 'relative', width: getColWidth('c14') }}>{b.journeyDA.amount} <div className="resizer no-print" onMouseDown={e => handleMouseDown(e, 'c14')}></div></th>}

                                {colSettings.c15.v && <th style={{ position: 'relative', width: getColWidth('c15') }}>{b.haltDA.hrs} <div className="resizer no-print" onMouseDown={e => handleMouseDown(e, 'c15')}></div></th>}
                                {colSettings.c16.v && <th style={{ position: 'relative', width: getColWidth('c16') }}>{b.haltDA.rate} <div className="resizer no-print" onMouseDown={e => handleMouseDown(e, 'c16')}></div></th>}
                                {colSettings.c17.v && <th style={{ position: 'relative', width: getColWidth('c17') }}>{b.haltDA.amount} <div className="resizer no-print" onMouseDown={e => handleMouseDown(e, 'c17')}></div></th>}
                            </tr>

                            {/* Header Tier 3: Dynamic Sequential Column Numbers (1 to N) */}
                            <tr className="col-numbers">
                                {colSettings.c1.v && <td>{colNumbers.c1}</td>}
                                {colSettings.c2.v && <td>{colNumbers.c2}</td>}
                                {colSettings.c3.v && <td>{colNumbers.c3}</td>}
                                {colSettings.c4.v && <td>{colNumbers.c4}</td>}
                                {colSettings.c5.v && <td>{colNumbers.c5}</td>}
                                {colSettings.c6.v && <td>{colNumbers.c6}</td>}
                                {colSettings.c7.v && <td>{colNumbers.c7}</td>}
                                {colSettings.c8.v && <td>{colNumbers.c8}</td>}
                                {colSettings.c9.v && <td>{colNumbers.c9}</td>}
                                {colSettings.c10.v && <td>{colNumbers.c10}</td>}
                                {colSettings.c11.v && <td>{colNumbers.c11}</td>}
                                {colSettings.c12.v && <td>{colNumbers.c12}</td>}
                                {colSettings.c13.v && <td>{colNumbers.c13}</td>}
                                {colSettings.c14.v && <td>{colNumbers.c14}</td>}
                                {colSettings.c15.v && <td>{colNumbers.c15}</td>}
                                {colSettings.c16.v && <td>{colNumbers.c16}</td>}
                                {colSettings.c17.v && <td>{colNumbers.c17}</td>}
                                {colSettings.c18.v && <td>{colNumbers.c18}</td>}
                                {colSettings.c19.v && <td>{colNumbers.c19}</td>}
                                {colSettings.c20.v && <td>{colNumbers.c20}</td>}
                                {colSettings.c21.v && <td>{colNumbers.c21}</td>}
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
                                            {colSettings.c19.v && <td style={{ textAlign: 'right' }}>{parseFloat(r.stay_allowance || 0) > 0 ? parseFloat(r.stay_allowance).toFixed(2) : ''}</td>}
                                            {colSettings.c20.v && <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{parseFloat(r.total_amount || 0) > 0 ? parseFloat(r.total_amount).toFixed(2) : ''}</td>}
                                            {colSettings.c21.v && <td className="wrap" style={{ fontSize: '0.85em' }}>{r.remarks || ''}</td>}
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
                                {colSettings.c19.v && <td style={{ textAlign: 'right' }}>{totals.totalStayAllowance > 0 ? totals.totalStayAllowance.toFixed(2) : ''}</td>}
                                {colSettings.c20.v && <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{(totals.grandTotal || 0).toFixed(2)}</td>}
                                {colSettings.c21.v && <td></td>}
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

                        <div className="form21-place-date" style={{ marginTop: '38px', fontSize: '9.5px' }}>
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

                        {/* Claimant Signature with Physical Signing Room */}
                        <div className="form21-signature-block" style={{
                            marginTop: '56px',
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

                /* Proportional widths are controlled dynamically via inline col style={{ width: getColWidth(k) }} */

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



                    .bill-21-table th, .bill-21-table td {
                        border: 1px solid black !important;
                        padding: 1px 1.5px !important;
                        line-height: 1.12 !important;
                        font-size: ${printOrientation === 'landscape' ? '5.7pt' : '6.0pt'} !important;
                        vertical-align: middle !important;
                        word-break: break-word !important;
                        overflow-wrap: break-word !important;
                        white-space: normal !important;
                        overflow: visible !important;
                    }
                    .bill-21-table th {
                        background: #f8fafc !important;
                        font-size: ${printOrientation === 'landscape' ? '5.3pt' : '5.6pt'} !important;
                        font-weight: bold !important;
                        text-align: center !important;
                        padding: 1px 1px !important;
                        letter-spacing: -0.15px !important;
                    }
                    .col-numbers td {
                        background: #f1f5f9 !important;
                        font-size: ${printOrientation === 'landscape' ? '4.6pt' : '4.8pt'} !important;
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
                        margin-top: 15mm !important;
                        font-size: 6.0pt !important;
                        line-height: 1.15 !important;
                    }
                    .form21-place-date {
                        margin-top: 10mm !important;
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
