import api, { apiRequest } from '../utils/api';
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Save, Printer, ArrowLeft, Plus, Trash2, Send, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { getTranslations } from '../utils/translations';
import { numberToWordsEnglish, numberToWordsHindi } from '../utils/numberToWords';
import logoIco from '../assets/logo.ico';

const formatPrintDate = (d) => {
    if (!d) return '—';
    const parts = d.split('-');
    if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return d;
};

const formatRupees = (val) => {
    const num = parseFloat(val) || 0;
    return '₹ ' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const MedicalClaim = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { search } = useLocation();
    const isReadOnly = new URLSearchParams(search).get('view') === 'true';
    const { language } = useLanguage();
    const t = getTranslations(language);

    const [claim, setClaim] = useState(null);
    const [employee, setEmployee] = useState(null);
    const [bills, setBills] = useState({
        CONSULTATION: [],
        MEDICINE: [],
        TEST: [],
        OTHER: []
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [familyMembers, setFamilyMembers] = useState([]);
    const [printOrientation, setPrintOrientation] = useState(() => {
        const p = new URLSearchParams(window.location.search).get('orientation');
        return p === 'landscape' ? 'landscape' : 'portrait';
    });

    const popularIllnesses = [
        "Viral Fever (विषाणु ज्वर)", "Typhoid (टाइफाइड)", "Malaria (मलेरिया)", "Dengue (डेंगू)",
        "Kidney Stones (गुर्दे की पथरी)", "Diabetes (मधुमेह)", "Hypertension (उच्च रक्तचाप)",
        "Heart Disease (हृदय रोग)", "Cancer (कैंसर)", "Arthritis (गठिया)", "Asthma (अस्थमा)",
        "Tuberculosis (तपेदिक/टीबी)", "Eye Treatment (नेत्र उपचार)", "COVID-19",
        "Jaundice (पीलिया)", "Pneumonia (निमोनिया)", "Gastroenteritis (जठरांत्र शोथ)",
        "Skin Disease (चर्म रोग)", "Fracture (अस्थि भंग)", "Dental Treatment (दंत चिकित्सा)",
        "Gynecological Problem (स्त्री रोग संबंधी समस्या)", "Neurological Disorder (तंत्रिका संबंधी विकार)",
        "ENT Problem (नाक, कान, गला समस्या)", "Surgery (Minor/Major)", "Health Checkup",
        "Pregnancy (गर्भावस्था)", "Maternity (प्रसूति / मातृत्व)"
    ];

    const popularTests = [
        "Blood Test - CBC", "Blood Sugar (Fast/PP)", "Urine Routine/Microscopy",
        "X-Ray Chest", "ECG", "MRI Scan", "CT Scan (Brain/Chest/Abdomen)",
        "USG (Ultrasound Abdomen)", "Lipid Profile", "Thyroid Profile (T3/T4/TSH)",
        "Liver Function Test (LFT)", "Kidney Function Test (KFT)",
        "Blood Urea / Serum Creatinine", "Widal Test", "Malaria Parasite (MP)",
        "Serum Bilirubin", "HBA1C", "Stool Test", "Biopsy", "ECCHO", "TMT",
        "Bone Density Test", "Vitamin D / B12", "Allergy Test"
    ];

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const res = await apiRequest(`/api/medical-claims/${id}`);
                const data = await res.json();
                setClaim(data.claim);

                // Group bills by category
                const grouped = {
                    CONSULTATION: data.bills.filter(b => b.bill_category === 'CONSULTATION'),
                    MEDICINE: data.bills.filter(b => b.bill_category === 'MEDICINE'),
                    TEST: data.bills.filter(b => b.bill_category === 'TEST'),
                    OTHER: data.bills.filter(b => b.bill_category === 'OTHER')
                };
                setBills(grouped);

                const empRes = await apiRequest(`/api/employees`);
                const emps = await empRes.json();
                const emp = emps.find(e => e.id === data.claim.employee_id);
                setEmployee(emp);

                const familyRes = await apiRequest(`/api/employees/${data.claim.employee_id}/family`);
                const familyData = await familyRes.json();
                setFamilyMembers(familyData);

                setLoading(false);

                const searchParams = new URLSearchParams(window.location.search);
                if (searchParams.get('print') === 'true' || searchParams.get('print') === '1') {
                    setTimeout(() => {
                        window.print();
                    }, 600);
                }
            } catch (err) {
                console.error(err);
                setLoading(false);
            }
        };
        fetchAll();
    }, [id]);

    const handleClaimChange = (e) => {
        const { name, value } = e.target;
        setClaim(prev => ({ ...prev, [name]: value }));
    };

    const addBillRow = (category) => {
        const newRow = {
            bill_category: category,
            description: '',
            lab_name: '',
            receipt_no: '',
            receipt_date: '',
            amount: ''
        };
        setBills(prev => ({
            ...prev,
            [category]: [...prev[category], newRow]
        }));
    };

    const updateBillRow = (category, index, field, value) => {
        const updated = [...bills[category]];
        updated[index] = { ...updated[index], [field]: value };
        setBills(prev => ({ ...prev, [category]: updated }));
    };

    const removeBillRow = (category, index) => {
        const updated = bills[category].filter((_, i) => i !== index);
        setBills(prev => ({ ...prev, [category]: updated }));
    };

    const calculateCategoryTotal = (category) => {
        return bills[category].reduce((sum, b) => sum + (parseFloat(b.amount) || 0), 0);
    };

    const calculateGrandTotal = () => {
        return Object.keys(bills).reduce((sum, cat) => sum + calculateCategoryTotal(cat), 0);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // Flatten bills array
            const allBills = Object.values(bills).flat();

            const res = await apiRequest(`/api/medical-claims/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    claim,
                    bills: allBills
                })
            });

            if (res.ok) {
                alert(t.messages.dataSaved);
            } else {
                alert(t.messages.errorSaving);
            }
        } catch (err) {
            console.error(err);
            alert(t.messages.errorSaving);
        } finally {
            setSaving(false);
        }
    };

    const handleSubmit = async () => {
        if (!window.confirm(t.common.confirmSubmit)) return;
        setIsSubmitting(true);
        try {
            // Save bills & claim details first
            const allBills = Object.values(bills).flat();
            await apiRequest(`/api/medical-claims/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    claim,
                    bills: allBills
                })
            });

            // Submit claim
            const grandTotal = calculateGrandTotal();
            const res = await apiRequest(`/api/claims/${id}/submit`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ total_amount: grandTotal })
            });

            if (res.ok) {
                alert(language === 'hi' ? 'चिकित्सा दावा सफलतापूर्वक स्वीकृति हेतु प्रस्तुत किया गया!' : 'Medical claim successfully submitted for approval!');
                setClaim(prev => ({ ...prev, status: 'SUBMITTED' }));
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

    const handleDelete = async () => {
        if (!window.confirm(t.tourDiariesList.deleteConfirm)) return;
        try {
            const res = await apiRequest(`/api/claims/${id}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                navigate(-1);
            } else {
                alert(t.messages.failedToDelete);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handlePrint = (orientation = printOrientation) => {
        setPrintOrientation(orientation);
        const originalTitle = document.title;
        const dateStr = claim?.start_date || new Date().toISOString().split('T')[0];
        document.title = `${dateStr}_Medical_Claim_${orientation}`;

        setTimeout(() => {
            window.print();
            setTimeout(() => {
                document.title = originalTitle;
            }, 100);
        }, 80);
    };

    if (loading) return <div>Loading...</div>;
    if (!claim || !employee) return <div>Claim not found.</div>;

    const isSubmitted = claim?.status === 'SUBMITTED' || claim?.status === 'APPROVED';

    return (
        <div className="page-transition">
            {/* Toolbar */}
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => navigate('/medical')}>
                        <ArrowLeft size={16} />
                    </button>
                    <h1>{t.nav.medicalClaims}</h1>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    {/* Print Orientation Selector Toggle */}
                    <div style={{ display: 'inline-flex', alignItems: 'center', background: '#f1f5f9', padding: '3px', borderRadius: '8px', border: '1px solid #cbd5e1', gap: '3px' }}>
                        <button
                            type="button"
                            onClick={() => setPrintOrientation('portrait')}
                            title={language === 'hi' ? 'A4 पोर्ट्रेट में प्रिंट करें' : 'Print in A4 Portrait'}
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
                        <button
                            type="button"
                            onClick={() => setPrintOrientation('landscape')}
                            title={language === 'hi' ? 'A4 लैंडस्केप में प्रिंट करें (अनुशंसित)' : 'Print in A4 Landscape (Recommended)'}
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
                            <span style={{ fontSize: '10px', opacity: 0.9, background: printOrientation === 'landscape' ? '#3b82f6' : '#e2e8f0', color: printOrientation === 'landscape' ? '#fff' : '#475569', padding: '1px 5px', borderRadius: '4px' }}>
                                {language === 'hi' ? 'अनुशंसित' : 'Rec.'}
                            </span>
                        </button>
                    </div>
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => handlePrint(printOrientation)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: '600' }}
                        title={language === 'hi' ? 'शासकीय प्रारूप में आवेदन पत्र / देयक प्रिंट करें' : 'Print Application Form / Bill in Govt Prescribed Format'}
                    >
                        <Printer size={18} /> {language === 'hi' ? `प्रिंट (A4 ${printOrientation === 'landscape' ? 'लैंडस्केप' : 'पोर्ट्रेट'})` : `Print (A4 ${printOrientation === 'landscape' ? 'Landscape' : 'Portrait'})`}
                    </button>
                    {!isReadOnly && !isSubmitted && (
                        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                            <Save size={18} /> {saving ? t.common.saving : t.common.save}
                        </button>
                    )}
                    {!isSubmitted ? (
                        <button
                            className="btn btn-primary"
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            style={{ background: '#2563eb', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                        >
                            <Send size={18} /> {isSubmitting ? t.common.saving : t.common.finalSubmit}
                        </button>
                    ) : (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: '#dcfce7', color: '#166534', padding: '0.4rem 0.8rem', borderRadius: '6px', border: '1px solid #bbf7d0', fontWeight: 'bold' }}>
                            <CheckCircle2 size={16} /> {t.common.submitted}
                        </div>
                    )}
                    <button className="btn btn-outline-danger" onClick={handleDelete}>
                        <Trash2 size={18} /> {t.common.delete}
                    </button>
                </div>
            </div>

            {/* Datalists for popular choices */}
            <datalist id="illness-list">
                {popularIllnesses.map(i => <option key={i} value={i} />)}
            </datalist>
            <datalist id="test-list">
                {popularTests.map(t => <option key={t} value={t} />)}
            </datalist>
            <datalist id="relationship-list">
                <option value="Self" />
                <option value="Husband" />
                <option value="Wife" />
                <option value="Son" />
                <option value="Daughter" />
                <option value="Father" />
                <option value="Mother" />
                <option value="Brother" />
                <option value="Sister" />
            </datalist>

            <div className="card medical-main-card">
                {/* PAGE 1: Application Form & Reimbursement Details */}
                <div className="medical-print-page medical-page-1">
                    {/* Official Medical Bill Header */}
                    <div className="medical-header">
                        <img
                            src={logoIco}
                            alt="MPSCSC Logo"
                            className="medical-logo"
                        />
                        <div style={{ textAlign: 'center' }}>
                            <h2 className="medical-header-title">
                                {language === 'hi' ? 'मध्य प्रदेश स्टेट सिविल सप्लाइज कॉर्पोरेशन लिमिटेड, भोपाल' : 'M.P. STATE CIVIL SUPPLIES CORPORATION LIMITED, BHOPAL'}
                            </h2>
                            <h3 className="medical-header-subtitle">
                                {language === 'hi' ? '(चिकित्सा व्यय प्रतिपूर्ति हेतु आवेदन पत्र)' : '(APPLICATION FOR MEDICAL EXPENDITURE REIMBURSEMENT)'}
                            </h3>
                        </div>
                    </div>

                    {/* Section 1: Screen Editor (when editable) OR Official Bordered Tables (when view mode / print) */}
                    {!isReadOnly ? (
                        <div className="no-print">
                            <div className="medical-form-grid">
                                <div className="form-group">
                                    <label className="form-label">01. {t.medical.doctorName.includes('Doctor') ? 'Name of employee & designation' : 'कर्मचारी का नाम और पदनाम'}</label>
                                    <input className="form-input" value={`${language === 'hi' && employee.name_hi ? employee.name_hi : employee.name} (${employee.designation})`} disabled />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">02. {t.employees.headquarter}</label>
                                    <input className="form-input" value={employee.headquarters || ''} disabled />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">02a. {t.medical.isRegular}</label>
                                    <div className="medical-inline-inputs">
                                        <select className="form-select" name="is_regular" value={claim.is_regular || ''} onChange={handleClaimChange}>
                                            <option value="Regular">Regular</option>
                                            <option value="Probation">Probation</option>
                                            <option value="Contract">Contract</option>
                                        </select>
                                        <input className="form-input" name="pay_scale" value={claim.pay_scale || ''} onChange={handleClaimChange} placeholder={language === 'hi' ? "वेतन स्तर / ग्रेड वेतन (उदा. Level 14 / GP 7600)" : "Pay Level / Grade Pay (e.g. Level 14 / GP 7600)"} />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">03. {t.medical.patientName}</label>
                                    <select className="form-select" name="patient_name" value={claim.patient_name || ''}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            let rel = '';
                                            if (val === employee.name) {
                                                rel = 'Self';
                                            } else {
                                                const member = familyMembers.find(f => f.name === val);
                                                rel = member ? member.relationship : '';
                                            }
                                            setClaim(prev => ({
                                                ...prev,
                                                patient_name: val,
                                                relationship: rel
                                            }));
                                        }}>
                                        <option value="">{t.claims.selectEmployee}</option>
                                        <option value={employee.name}>{employee.name}</option>
                                        {familyMembers.map(f => <option key={f.id} value={f.name}>{f.name} ({f.relationship})</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">04. {t.medical.relationship}</label>
                                    <input className="form-input" list="relationship-list" name="relationship" value={claim.relationship || ''} onChange={handleClaimChange} placeholder="e.g. Self, Wife, Son" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">05. {language === 'hi' ? 'बच्चे का क्र.सं. / जन्म तिथि' : 'Sl. No. of child / Date of birth'}</label>
                                    <input className="form-input" name="child_sl_no_dob" value={claim.child_sl_no_dob || ''} onChange={handleClaimChange} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">06. {t.medical.illnessDuration}</label>
                                    <div className="medical-illness-row">
                                        <div style={{ flex: 1 }}>
                                            <input className="form-input" list="illness-list" name="illness_name" placeholder={t.medical.illnessPlaceholder}
                                                value={claim.illness_name || ''} onChange={handleClaimChange} />
                                        </div>
                                        <div className="medical-duration-box">
                                            <input className="form-input" name="illness_duration" placeholder={t.medical.durationPlaceholder}
                                                value={claim.illness_duration || ''} onChange={handleClaimChange} />
                                        </div>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">09. {t.medical.enclosures}</label>
                                    <input className="form-input" name="total_enclosures" value={claim.total_enclosures || ''} onChange={handleClaimChange} />
                                </div>
                            </div>

                            <h3 className="expenditure-summary-title">07. {t.medical.expenditureDetails}</h3>
                            <div className="expenditure-summary-grid">
                                <div className="form-group">
                                    <label className="form-label">A. {t.medical.consultation}</label>
                                    <input className="form-input readonly-input" value={formatRupees(calculateCategoryTotal('CONSULTATION'))} disabled />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">B. {t.medical.medicine}</label>
                                    <input className="form-input readonly-input" value={formatRupees(calculateCategoryTotal('MEDICINE'))} disabled />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">C. {t.medical.tests}</label>
                                    <input className="form-input readonly-input" value={formatRupees(calculateCategoryTotal('TEST'))} disabled />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">D. {t.medical.other}</label>
                                    <input className="form-input readonly-input" value={formatRupees(calculateCategoryTotal('OTHER'))} disabled />
                                </div>
                            </div>

                            <div className="medical-total-row">
                                <h2 className="medical-total-text">08. {t.medical.totalClaimed}: {formatRupees(calculateGrandTotal())}</h2>
                            </div>
                        </div>
                    ) : null}

                    {/* Section 1: Official Bordered Tables (Always in Print; and on Screen when Read-Only) */}
                    <div className={`page1-tables-wrap ${!isReadOnly ? 'print-only' : ''}`}>
                        {/* Table 1: Employee & Patient Details */}
                        <table className="med-border-table">
                            <tbody>
                                <tr>
                                    <td style={{ width: '50%' }}>
                                        <div className="table-field-label">01. {language === 'hi' ? 'कर्मचारी का नाम एवं पदनाम' : 'Name of Employee & Designation'}:</div>
                                        <div className="table-field-value text-wrap">
                                            {language === 'hi' && employee.name_hi ? employee.name_hi : employee.name} ({employee.designation})
                                        </div>
                                    </td>
                                    <td style={{ width: '50%' }}>
                                        <div className="table-field-label">02. {language === 'hi' ? 'मुख्यालय' : 'Headquarter'}:</div>
                                        <div className="table-field-value text-wrap">{employee.headquarters || '—'}</div>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <div className="table-field-label">02a. {language === 'hi' ? 'क्या पद नियमित है / वेतन स्तर' : 'Whether Regular or Not / Pay Scale'}:</div>
                                        <div className="table-field-value text-wrap">
                                            {claim.is_regular || 'Regular'} {claim.pay_scale ? `— ${claim.pay_scale}` : ''}
                                        </div>
                                    </td>
                                    <td>
                                        <div className="table-field-label">03. {language === 'hi' ? 'रोगी का नाम' : 'Patient Name'}:</div>
                                        <div className="table-field-value text-wrap">{claim.patient_name || '—'}</div>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <div className="table-field-label">04. {language === 'hi' ? 'कर्मचारी से संबंध' : 'Relationship with Employee'}:</div>
                                        <div className="table-field-value text-wrap">{claim.relationship || '—'}</div>
                                    </td>
                                    <td>
                                        <div className="table-field-label">05. {language === 'hi' ? 'बच्चे का क्र.सं. / जन्म तिथि' : 'Sl. No. of Child / Date of Birth'}:</div>
                                        <div className="table-field-value text-wrap">{claim.child_sl_no_dob || '—'}</div>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <div className="table-field-label">06. {language === 'hi' ? 'बीमारी का नाम एवं उपचार अवधि' : 'Name of Illness & Duration'}:</div>
                                        <div className="table-field-value text-wrap">
                                            {claim.illness_name || '—'} {claim.illness_duration ? `(${claim.illness_duration})` : ''}
                                        </div>
                                    </td>
                                    <td>
                                        <div className="table-field-label">09. {language === 'hi' ? 'संलग्नकों की कुल संख्या' : 'Total Number of Enclosures'}:</div>
                                        <div className="table-field-value text-wrap">{claim.total_enclosures || '—'}</div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>

                        {/* Table 2: Details of Expenditure Incurred / Claimed */}
                        <table className="med-border-table" style={{ marginTop: '4px' }}>
                            <thead>
                                <tr style={{ background: '#f1f5f9' }}>
                                    <th style={{ width: '10%', textAlign: 'center' }}>{language === 'hi' ? 'मद' : 'Item'}</th>
                                    <th style={{ width: '65%', textAlign: 'left' }}>07. {language === 'hi' ? 'व्यय का शीर्ष / मद का विवरण' : 'DETAILS OF EXPENDITURE INCURRED / CLAIMED'}</th>
                                    <th style={{ width: '25%', textAlign: 'right' }}>{language === 'hi' ? 'दावा राशि (₹)' : 'Amount Claimed (₹)'}</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td style={{ textAlign: 'center' }}>A.</td>
                                    <td>{language === 'hi' ? 'चिकित्सक परामर्श शुल्क (Consultation Charges)' : 'Consultation Charges'}</td>
                                    <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{formatRupees(calculateCategoryTotal('CONSULTATION'))}</td>
                                </tr>
                                <tr>
                                    <td style={{ textAlign: 'center' }}>B.</td>
                                    <td>{language === 'hi' ? 'दवाइयों का क्रय मूल्य (Cost of Medicines)' : 'Cost of Medicines'}</td>
                                    <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{formatRupees(calculateCategoryTotal('MEDICINE'))}</td>
                                </tr>
                                <tr>
                                    <td style={{ textAlign: 'center' }}>C.</td>
                                    <td>{language === 'hi' ? 'जांच एवं परीक्षण शुल्क (Tests & Investigations)' : 'Test/and investigations'}</td>
                                    <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{formatRupees(calculateCategoryTotal('TEST'))}</td>
                                </tr>
                                <tr>
                                    <td style={{ textAlign: 'center' }}>D.</td>
                                    <td>{language === 'hi' ? 'अन्य अनुषंगिक व्यय (Other Charges)' : 'Other charges'}</td>
                                    <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{formatRupees(calculateCategoryTotal('OTHER'))}</td>
                                </tr>
                                <tr style={{ background: '#f8fafc', fontWeight: 'bold' }}>
                                    <td colSpan={2} style={{ textAlign: 'right' }}>
                                        08. {language === 'hi' ? 'कुल दावाकृत राशि (TOTAL AMOUNT CLAIMED):' : 'TOTAL AMOUNT CLAIMED:'}
                                    </td>
                                    <td style={{ textAlign: 'right', fontSize: '8.8pt', fontWeight: 'bold' }}>
                                        {formatRupees(calculateGrandTotal())}
                                    </td>
                                </tr>
                                <tr style={{ background: '#fff' }}>
                                    <td colSpan={3} style={{ fontSize: '7.2pt' }}>
                                        <strong>{language === 'hi' ? 'राशि अक्षरी:' : 'Amount in Words:'}</strong> {language === 'hi' ? numberToWordsHindi(calculateGrandTotal()) : numberToWordsEnglish(calculateGrandTotal())}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Section 10 Declaration & Section 11 Doctor Certification */}
                    <div className="medical-cert-section">
                        <div className="medical-cert-box">
                            <p className="cert-p">
                                <strong>10. {language === 'hi' ? 'घोषणा / DECLARATION' : 'DECLARATION'}:</strong> {t.medical.declaration}
                            </p>
                            <div className="sig-container">
                                <div className="sig-block">
                                    <div className="sig-space" style={{ height: '24px' }}></div>
                                    <div className="sig-rule" style={{ width: '200px', borderTop: '1.5px solid #000', margin: '0 auto 4px auto' }}></div>
                                    <strong className="sig-label">{t.medical.applicantSignature}</strong>
                                    <span className="sig-emp-name" style={{ fontSize: '8pt', fontWeight: 'bold', color: '#000', display: 'block', marginTop: '1px' }}>
                                        ({language === 'hi' && employee?.name_hi ? employee.name_hi : employee?.name})
                                    </span>
                                </div>
                            </div>

                            <div className="cert-divider"></div>

                            <p className="cert-p cert-doctor-heading">
                                <strong>11. {language === 'hi' ? 'चिकित्सक द्वारा प्रमाण-पत्र / CERTIFICATION BY DOCTOR' : 'CERTIFICATION BY DOCTOR'}:</strong>
                            </p>
                            <p className="cert-p">
                                {language === 'hi'
                                    ? `प्रमाणित किया जाता है कि उपर्युक्त विवरण में दावा किए गए प्रभार मेरे द्वारा दिए गए परामर्श व पर्चे पर आधारित हैं तथा दवाइयां/जांचें उक्त रोगी के उपचार हेतु नितांत आवश्यक थीं, जो कि रोगी को ${claim.illness_name || 'उपचार'} हेतु विहित की गई थीं।`
                                    : `Certified that the charges claimed in aforesaid statement are based upon the prescription given by me and such medicines/tests/investigations/other charges were absolutely essential for the treatment of the said patient, which have been prescribed for ${claim.illness_name || '________________'} during the period of treatment.`}
                            </p>
                            <div className="doctor-sig-row">
                                <div className="doctor-meta">
                                    <div>{language === 'hi' ? 'दिनांक / Date' : 'Date'}: __________________</div>
                                    <div>{language === 'hi' ? 'स्थान / Place' : 'Place'}: __________________</div>
                                    <div>{language === 'hi' ? 'पंजीयन क्र. / Reg. No.' : 'Reg. No.'}: ______________</div>
                                </div>
                                <div className="sig-block">
                                    <div className="sig-space" style={{ height: '24px' }}></div>
                                    <div className="sig-rule" style={{ width: '200px', borderTop: '1.5px solid #000', margin: '0 auto 4px auto' }}></div>
                                    <strong className="sig-label">{t.medical.doctorSignature}</strong>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Visual Separator between Page 1 and Page 2 (Screen Only) */}
                <div className="no-print" style={{
                    margin: '32px 0 24px 0',
                    borderTop: '2px dashed #2563eb',
                    textAlign: 'center',
                    position: 'relative'
                }}>
                    <span style={{
                        position: 'relative',
                        top: '-13px',
                        background: '#eff6ff',
                        color: '#1d4ed8',
                        padding: '4px 18px',
                        borderRadius: '14px',
                        fontSize: '11px',
                        fontWeight: '700',
                        border: '1px solid #bfdbfe',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}>
                        📄 {language === 'hi' ? 'चिकित्सा देयक — पृष्ठ 2 (भाग - 2 : खर्चों का विस्तृत विवरण)' : 'Medical Claim — Page 2 (Part - II : Itemized Details of Charges)'}
                    </span>
                </div>

                {/* PAGE 2: Itemized Details of Charges */}
                <div className="medical-print-page medical-page-2">
                    <div className="details-charges-header">
                        <h3 className="details-charges-title">
                            {language === 'hi' ? 'भाग - 2 : खर्चों का विस्तृत विवरण' : 'PART - II : ITEMIZED DETAILS OF CHARGES'}
                        </h3>
                        <div className="details-charges-sub">
                            <span><strong>{language === 'hi' ? 'कर्मचारी' : 'Employee'}:</strong> {employee.name} ({employee.designation})</span>
                            <span><strong>{language === 'hi' ? 'रोगी' : 'Patient'}:</strong> {claim.patient_name || '—'} ({claim.relationship || 'Self'})</span>
                        </div>
                    </div>

                    {/* Container for all Page 2 itemized tables — 2-column in landscape */}
                    <div className="page2-tables-container">
                        {/* LEFT COLUMN: Consultation + Medicines */}
                        <div className="p2-col p2-col-left">
                        {/* 01. Consultation Charges */}
                        <div className="table-section">
                            <div className="table-section-header">
                                <h4 className="table-section-title">
                                    01. {language === 'hi' ? 'परामर्श शुल्क' : 'CONSULTATION CHARGES'}
                                </h4>
                                {!isReadOnly && (
                                    <button className="btn btn-sm btn-outline-primary no-print" onClick={() => addBillRow('CONSULTATION')}>
                                        <Plus size={14} /> {t.medical.addDoctor}
                                    </button>
                                )}
                            </div>
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: '7%', textAlign: 'center', whiteSpace: 'nowrap' }}>{language === 'hi' ? 'क्र.' : 'S.No.'}</th>
                                        <th style={{ width: '43%' }}>{language === 'hi' ? 'चिकित्सक का नाम एवं पद' : 'Name of Doctor'}</th>
                                        <th style={{ width: '16%', textAlign: 'right' }}>{language === 'hi' ? 'परामर्श शुल्क (₹)' : 'Fee Paid (₹)'}</th>
                                        <th style={{ width: '17%', textAlign: 'center' }}>{language === 'hi' ? 'भुगतान दिनांक' : 'Payment Date'}</th>
                                        <th style={{ width: '17%', textAlign: 'center' }}>{language === 'hi' ? 'रसीद क्र.' : 'Receipt No.'}</th>
                                        {!isReadOnly && <th className="no-print" style={{ width: '70px' }}>{t.common.actions}</th>}
                                    </tr>
                                </thead>
                            <tbody>
                                {bills.CONSULTATION.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} style={{ textAlign: 'center', fontStyle: 'italic', color: '#666' }}>{language === 'hi' ? 'कोई विवरण नहीं' : 'No bills entered'}</td>
                                        {!isReadOnly && <td className="no-print"></td>}
                                    </tr>
                                ) : (
                                    bills.CONSULTATION.map((b, i) => (
                                        <tr key={i}>
                                            <td style={{ textAlign: 'center' }}>{i + 1}</td>
                                            <td>
                                                {isReadOnly ? (
                                                    <div className="text-wrap">{b.description || '—'}</div>
                                                ) : (
                                                    <>
                                                        <input className="form-input small no-print" value={b.description} onChange={(e) => updateBillRow('CONSULTATION', i, 'description', e.target.value)} placeholder="Doctor Name" />
                                                        <div className="print-only text-wrap">{b.description || '—'}</div>
                                                    </>
                                                )}
                                            </td>
                                            <td>
                                                {isReadOnly ? (
                                                    <div className="text-wrap" style={{ textAlign: 'right', fontWeight: 'bold' }}>{parseFloat(b.amount || 0).toFixed(2)}</div>
                                                ) : (
                                                    <>
                                                        <input type="number" className="form-input small no-print" value={b.amount} onChange={(e) => updateBillRow('CONSULTATION', i, 'amount', e.target.value)} />
                                                        <div className="print-only text-wrap" style={{ textAlign: 'right', fontWeight: 'bold' }}>{parseFloat(b.amount || 0).toFixed(2)}</div>
                                                    </>
                                                )}
                                            </td>
                                            <td>
                                                {isReadOnly ? (
                                                    <div className="text-wrap" style={{ textAlign: 'center' }}>{formatPrintDate(b.receipt_date)}</div>
                                                ) : (
                                                    <>
                                                        <input type="date" className="form-input small no-print" value={b.receipt_date || ''} onChange={(e) => updateBillRow('CONSULTATION', i, 'receipt_date', e.target.value)} />
                                                        <div className="print-only text-wrap" style={{ textAlign: 'center' }}>{formatPrintDate(b.receipt_date)}</div>
                                                    </>
                                                )}
                                            </td>
                                            <td>
                                                {isReadOnly ? (
                                                    <div className="text-wrap" style={{ textAlign: 'center' }}>{b.receipt_no || '—'}</div>
                                                ) : (
                                                    <>
                                                        <input className="form-input small no-print" value={b.receipt_no || ''} onChange={(e) => updateBillRow('CONSULTATION', i, 'receipt_no', e.target.value)} />
                                                        <div className="print-only text-wrap" style={{ textAlign: 'center' }}>{b.receipt_no || '—'}</div>
                                                    </>
                                                )}
                                            </td>
                                            {!isReadOnly && <td className="no-print"><button className="btn btn-sm btn-outline-danger" onClick={() => removeBillRow('CONSULTATION', i)}>{t.common.delete}</button></td>}
                                        </tr>
                                    ))
                                )}
                                <tr className="subtotal-row">
                                    <td colSpan={2} style={{ textAlign: 'right', fontWeight: 'bold' }}>
                                        {language === 'hi' ? 'उप-योग (A) परामर्श शुल्क:' : 'Sub-Total (A) Consultation:'}
                                    </td>
                                    <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                                        {formatRupees(calculateCategoryTotal('CONSULTATION'))}
                                    </td>
                                    <td colSpan={2}></td>
                                    {!isReadOnly && <td className="no-print"></td>}
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* 02. Cost of Medicines */}
                    <div className="table-section">
                        <div className="table-section-header">
                            <h4 className="table-section-title">
                                02. {language === 'hi' ? 'दवाइयों का क्रय मूल्य' : 'COST OF MEDICINES'}
                            </h4>
                            {!isReadOnly && (
                                <button className="btn btn-sm btn-outline-primary no-print" onClick={() => addBillRow('MEDICINE')}>
                                    <Plus size={14} /> {t.medical.addMedicine}
                                </button>
                            )}
                        </div>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '7%', textAlign: 'center', whiteSpace: 'nowrap' }}>{language === 'hi' ? 'क्र.' : 'S.No.'}</th>
                                    <th style={{ width: '43%' }}>{language === 'hi' ? 'दुकान / दवाइयों का विवरण' : 'Name of Shop / Medicines'}</th>
                                    <th style={{ width: '18%', textAlign: 'center' }}>{language === 'hi' ? 'कैश मेमो क्र.' : 'Cash Memo No.'}</th>
                                    <th style={{ width: '16%', textAlign: 'center' }}>{language === 'hi' ? 'दिनांक' : 'Date'}</th>
                                    <th style={{ width: '16%', textAlign: 'right' }}>{language === 'hi' ? 'राशि (₹)' : 'Amount (₹)'}</th>
                                    {!isReadOnly && <th className="no-print" style={{ width: '70px' }}>{t.common.actions}</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {bills.MEDICINE.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} style={{ textAlign: 'center', fontStyle: 'italic', color: '#666' }}>{language === 'hi' ? 'कोई विवरण नहीं' : 'No bills entered'}</td>
                                        {!isReadOnly && <td className="no-print"></td>}
                                    </tr>
                                ) : (
                                    bills.MEDICINE.map((b, i) => (
                                        <tr key={i}>
                                            <td style={{ textAlign: 'center' }}>{i + 1}</td>
                                            <td>
                                                {isReadOnly ? (
                                                    <div className="text-wrap">{b.description || '—'}</div>
                                                ) : (
                                                    <>
                                                        <input className="form-input small no-print" value={b.description} onChange={(e) => updateBillRow('MEDICINE', i, 'description', e.target.value)} />
                                                        <div className="print-only text-wrap">{b.description || '—'}</div>
                                                    </>
                                                )}
                                            </td>
                                            <td>
                                                {isReadOnly ? (
                                                    <div className="text-wrap" style={{ textAlign: 'center' }}>{b.receipt_no || '—'}</div>
                                                ) : (
                                                    <>
                                                        <input className="form-input small no-print" value={b.receipt_no || ''} onChange={(e) => updateBillRow('MEDICINE', i, 'receipt_no', e.target.value)} />
                                                        <div className="print-only text-wrap" style={{ textAlign: 'center' }}>{b.receipt_no || '—'}</div>
                                                    </>
                                                )}
                                            </td>
                                            <td>
                                                {isReadOnly ? (
                                                    <div className="text-wrap" style={{ textAlign: 'center' }}>{formatPrintDate(b.receipt_date)}</div>
                                                ) : (
                                                    <>
                                                        <input type="date" className="form-input small no-print" value={b.receipt_date || ''} onChange={(e) => updateBillRow('MEDICINE', i, 'receipt_date', e.target.value)} />
                                                        <div className="print-only text-wrap" style={{ textAlign: 'center' }}>{formatPrintDate(b.receipt_date)}</div>
                                                    </>
                                                )}
                                            </td>
                                            <td>
                                                {isReadOnly ? (
                                                    <div className="text-wrap" style={{ textAlign: 'right', fontWeight: 'bold' }}>{parseFloat(b.amount || 0).toFixed(2)}</div>
                                                ) : (
                                                    <>
                                                        <input type="number" className="form-input small no-print" value={b.amount} onChange={(e) => updateBillRow('MEDICINE', i, 'amount', e.target.value)} />
                                                        <div className="print-only text-wrap" style={{ textAlign: 'right', fontWeight: 'bold' }}>{parseFloat(b.amount || 0).toFixed(2)}</div>
                                                    </>
                                                )}
                                            </td>
                                            {!isReadOnly && <td className="no-print"><button className="btn btn-sm btn-outline-danger" onClick={() => removeBillRow('MEDICINE', i)}>{t.common.delete}</button></td>}
                                        </tr>
                                    ))
                                )}
                                <tr className="subtotal-row">
                                    <td colSpan={4} style={{ textAlign: 'right', fontWeight: 'bold' }}>
                                        {language === 'hi' ? 'उप-योग (B) दवाइयों का व्यय:' : 'Sub-Total (B) Medicines:'}
                                    </td>
                                    <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                                        {formatRupees(calculateCategoryTotal('MEDICINE'))}
                                    </td>
                                    {!isReadOnly && <td className="no-print"></td>}
                                </tr>
                            </tbody>
                        </table>
                    </div>
                        </div>{/* /p2-col-left */}

                        {/* RIGHT COLUMN: Tests + Other */}
                        <div className="p2-col p2-col-right">
                    <div className="table-section">
                        <div className="table-section-header">
                            <h4 className="table-section-title">
                                03. {language === 'hi' ? 'जांच एवं परीक्षण शुल्क' : 'TESTS & INVESTIGATIONS'}
                            </h4>
                            {!isReadOnly && (
                                <button className="btn btn-sm btn-outline-primary no-print" onClick={() => addBillRow('TEST')}>
                                    <Plus size={14} /> {t.medical.addTest}
                                </button>
                            )}
                        </div>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '7%', textAlign: 'center', whiteSpace: 'nowrap' }}>{language === 'hi' ? 'क्र.' : 'S.No.'}</th>
                                    <th style={{ width: '33%' }}>{language === 'hi' ? 'जांच का नाम' : 'Name of Test'}</th>
                                    <th style={{ width: '27%' }}>{language === 'hi' ? 'पैथोलॉजी / प्रयोगशाला' : 'Pathology / Lab Name'}</th>
                                    <th style={{ width: '12%', textAlign: 'center' }}>{language === 'hi' ? 'रसीद क्र.' : 'Receipt No.'}</th>
                                    <th style={{ width: '10%', textAlign: 'center' }}>{language === 'hi' ? 'दिनांक' : 'Date'}</th>
                                    <th style={{ width: '11%', textAlign: 'right' }}>{language === 'hi' ? 'राशि (₹)' : 'Amount (₹)'}</th>
                                    {!isReadOnly && <th className="no-print" style={{ width: '70px' }}>{t.common.actions}</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {bills.TEST.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} style={{ textAlign: 'center', fontStyle: 'italic', color: '#666' }}>{language === 'hi' ? 'कोई विवरण नहीं' : 'No bills entered'}</td>
                                        {!isReadOnly && <td className="no-print"></td>}
                                    </tr>
                                ) : (
                                    bills.TEST.map((b, i) => (
                                        <tr key={i}>
                                            <td style={{ textAlign: 'center' }}>{i + 1}</td>
                                            <td>
                                                {isReadOnly ? (
                                                    <div className="text-wrap">{b.description || '—'}</div>
                                                ) : (
                                                    <>
                                                        <input className="form-input small no-print" list="test-list" value={b.description || ''} onChange={(e) => {
                                                            updateBillRow('TEST', i, 'description', e.target.value);
                                                        }} />
                                                        <div className="print-only text-wrap">{b.description || '—'}</div>
                                                    </>
                                                )}
                                            </td>
                                            <td>
                                                {isReadOnly ? (
                                                    <div className="text-wrap">{b.lab_name || '—'}</div>
                                                ) : (
                                                    <>
                                                        <input className="form-input small no-print" placeholder="Lab Name" value={b.lab_name || ''} onChange={(e) => {
                                                            updateBillRow('TEST', i, 'lab_name', e.target.value);
                                                        }} />
                                                        <div className="print-only text-wrap">{b.lab_name || '—'}</div>
                                                    </>
                                                )}
                                            </td>
                                            <td>
                                                {isReadOnly ? (
                                                    <div className="text-wrap" style={{ textAlign: 'center' }}>{b.receipt_no || '—'}</div>
                                                ) : (
                                                    <>
                                                        <input className="form-input small no-print" value={b.receipt_no || ''} onChange={(e) => updateBillRow('TEST', i, 'receipt_no', e.target.value)} />
                                                        <div className="print-only text-wrap" style={{ textAlign: 'center' }}>{b.receipt_no || '—'}</div>
                                                    </>
                                                )}
                                            </td>
                                            <td>
                                                {isReadOnly ? (
                                                    <div className="text-wrap" style={{ textAlign: 'center' }}>{formatPrintDate(b.receipt_date)}</div>
                                                ) : (
                                                    <>
                                                        <input type="date" className="form-input small no-print" value={b.receipt_date || ''} onChange={(e) => updateBillRow('TEST', i, 'receipt_date', e.target.value)} />
                                                        <div className="print-only text-wrap" style={{ textAlign: 'center' }}>{formatPrintDate(b.receipt_date)}</div>
                                                    </>
                                                )}
                                            </td>
                                            <td>
                                                {isReadOnly ? (
                                                    <div className="text-wrap" style={{ textAlign: 'right', fontWeight: 'bold' }}>{parseFloat(b.amount || 0).toFixed(2)}</div>
                                                ) : (
                                                    <>
                                                        <input type="number" className="form-input small no-print" value={b.amount} onChange={(e) => updateBillRow('TEST', i, 'amount', e.target.value)} />
                                                        <div className="print-only text-wrap" style={{ textAlign: 'right', fontWeight: 'bold' }}>{parseFloat(b.amount || 0).toFixed(2)}</div>
                                                    </>
                                                )}
                                            </td>
                                            {!isReadOnly && <td className="no-print"><button className="btn btn-sm btn-outline-danger" onClick={() => removeBillRow('TEST', i)}>{t.common.delete}</button></td>}
                                        </tr>
                                    ))
                                )}
                                <tr className="subtotal-row">
                                    <td colSpan={5} style={{ textAlign: 'right', fontWeight: 'bold' }}>
                                        {language === 'hi' ? 'उप-योग (C) जांच एवं परीक्षण शुल्क:' : 'Sub-Total (C) Tests:'}
                                    </td>
                                    <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                                        {formatRupees(calculateCategoryTotal('TEST'))}
                                    </td>
                                    {!isReadOnly && <td className="no-print"></td>}
                                </tr>
                            </tbody>
                        </table>
                    </div>
                        </div>{/* /p2-col-right */}

                        {/* 04. Other Charges */}
                        <div className="p2-col-other">
                    <div className="table-section">
                        <div className="table-section-header">
                            <h4 className="table-section-title">
                                04. {language === 'hi' ? 'अन्य अनुषंगिक व्यय' : 'OTHER CHARGES'}
                            </h4>
                            {!isReadOnly && (
                                <button className="btn btn-sm btn-outline-primary no-print" onClick={() => addBillRow('OTHER')}>
                                    <Plus size={14} /> {t.medical.addCharge}
                                </button>
                            )}
                        </div>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '7%', textAlign: 'center', whiteSpace: 'nowrap' }}>{language === 'hi' ? 'क्र.' : 'S.No.'}</th>
                                    <th style={{ width: '43%' }}>{language === 'hi' ? 'शुल्क का विवरण' : 'Details of Charge'}</th>
                                    <th style={{ width: '18%', textAlign: 'center' }}>{language === 'hi' ? 'रसीद क्र.' : 'Receipt No.'}</th>
                                    <th style={{ width: '16%', textAlign: 'center' }}>{language === 'hi' ? 'दिनांक' : 'Date'}</th>
                                    <th style={{ width: '16%', textAlign: 'right' }}>{language === 'hi' ? 'राशि (₹)' : 'Amount (₹)'}</th>
                                    {!isReadOnly && <th className="no-print" style={{ width: '70px' }}>{t.common.actions}</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {bills.OTHER.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} style={{ textAlign: 'center', fontStyle: 'italic', color: '#666' }}>{language === 'hi' ? 'कोई विवरण नहीं' : 'No bills entered'}</td>
                                        {!isReadOnly && <td className="no-print"></td>}
                                    </tr>
                                ) : (
                                    bills.OTHER.map((b, i) => (
                                        <tr key={i}>
                                            <td style={{ textAlign: 'center' }}>{i + 1}</td>
                                            <td>
                                                {isReadOnly ? (
                                                    <div className="text-wrap">{b.description || '—'}</div>
                                                ) : (
                                                    <>
                                                        <input className="form-input small no-print" value={b.description} onChange={(e) => updateBillRow('OTHER', i, 'description', e.target.value)} />
                                                        <div className="print-only text-wrap">{b.description || '—'}</div>
                                                    </>
                                                )}
                                            </td>
                                            <td>
                                                {isReadOnly ? (
                                                    <div className="text-wrap" style={{ textAlign: 'center' }}>{b.receipt_no || '—'}</div>
                                                ) : (
                                                    <>
                                                        <input className="form-input small no-print" value={b.receipt_no || ''} onChange={(e) => updateBillRow('OTHER', i, 'receipt_no', e.target.value)} />
                                                        <div className="print-only text-wrap" style={{ textAlign: 'center' }}>{b.receipt_no || '—'}</div>
                                                    </>
                                                )}
                                            </td>
                                            <td>
                                                {isReadOnly ? (
                                                    <div className="text-wrap" style={{ textAlign: 'center' }}>{formatPrintDate(b.receipt_date)}</div>
                                                ) : (
                                                    <>
                                                        <input type="date" className="form-input small no-print" value={b.receipt_date || ''} onChange={(e) => updateBillRow('OTHER', i, 'receipt_date', e.target.value)} />
                                                        <div className="print-only text-wrap" style={{ textAlign: 'center' }}>{formatPrintDate(b.receipt_date)}</div>
                                                    </>
                                                )}
                                            </td>
                                            <td>
                                                {isReadOnly ? (
                                                    <div className="text-wrap" style={{ textAlign: 'right', fontWeight: 'bold' }}>{parseFloat(b.amount || 0).toFixed(2)}</div>
                                                ) : (
                                                    <>
                                                        <input type="number" className="form-input small no-print" value={b.amount} onChange={(e) => updateBillRow('OTHER', i, 'amount', e.target.value)} />
                                                        <div className="print-only text-wrap" style={{ textAlign: 'right', fontWeight: 'bold' }}>{parseFloat(b.amount || 0).toFixed(2)}</div>
                                                    </>
                                                )}
                                            </td>
                                            {!isReadOnly && <td className="no-print"><button className="btn btn-sm btn-outline-danger" onClick={() => removeBillRow('OTHER', i)}>{t.common.delete}</button></td>}
                                        </tr>
                                    ))
                                )}
                                <tr className="subtotal-row">
                                    <td colSpan={4} style={{ textAlign: 'right', fontWeight: 'bold' }}>
                                        {language === 'hi' ? 'उप-योग (D) अन्य व्यय:' : 'Sub-Total (D) Other:'}
                                    </td>
                                    <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                                        {formatRupees(calculateCategoryTotal('OTHER'))}
                                    </td>
                                    {!isReadOnly && <td className="no-print"></td>}
                                </tr>
                            </tbody>
                        </table>
                    </div>{/* /table-section OTHER */}
                        </div>{/* /p2-col-other */}
                    </div>{/* /page2-tables-container */}

                    {/* Page 2 Bottom Grand Total Summary & Signatures Box */}
                    <div className="page2-summary-box">
                        <table className="med-border-table" style={{ width: '100%', marginBottom: '8px' }}>
                            <tbody>
                                <tr style={{ background: '#f8fafc', fontWeight: 'bold' }}>
                                    <td style={{ width: '72%', textAlign: 'right', fontSize: '8.5pt', padding: '5px 8px' }}>
                                        {language === 'hi' ? 'समस्त शीर्षों का कुल योग (GRAND TOTAL CLAIMED - A + B + C + D):' : 'GRAND TOTAL CLAIMED (A + B + C + D):'}
                                    </td>
                                    <td style={{ width: '28%', textAlign: 'right', fontSize: '9pt', fontWeight: 'bold', padding: '5px 8px' }}>
                                        {formatRupees(calculateGrandTotal())}
                                    </td>
                                </tr>
                                <tr style={{ background: '#fff' }}>
                                    <td colSpan={2} style={{ fontSize: '7.8pt', padding: '4px 8px' }}>
                                        <strong>{language === 'hi' ? 'राशि अक्षरी / Amount in Words:' : 'Amount in Words:'}</strong> {language === 'hi' ? numberToWordsHindi(calculateGrandTotal()) : numberToWordsEnglish(calculateGrandTotal())}
                                    </td>
                                </tr>
                            </tbody>
                        </table>

                        <div className="page2-signatures">
                            <div className="sig-date-place">
                                <div><strong>{language === 'hi' ? 'दिनांक / Date' : 'Date'}:</strong> {formatPrintDate(claim?.start_date || claim?.created_at?.split('T')[0] || new Date().toISOString().split('T')[0])}</div>
                                <div><strong>{language === 'hi' ? 'स्थान / Place' : 'Place'}:</strong> {employee?.headquarter || '—'}</div>
                            </div>
                            <div className="sig-side">
                                <div className="sig-space" style={{ height: '36px' }}></div>
                                <div className="sig-rule" style={{ width: '240px', borderTop: '1.5px solid #000', margin: '0 auto 6px auto' }}></div>
                                <strong className="sig-title" style={{ fontSize: '9.5pt', fontWeight: 'bold', color: '#000', display: 'block', textTransform: 'uppercase' }}>
                                    {language === 'hi' ? 'आवेदक / कर्मचारी के हस्ताक्षर' : 'Signature of Applicant / Employee'}
                                </strong>
                                <span className="sig-emp-name" style={{ fontSize: '8.8pt', fontWeight: 'bold', color: '#000', display: 'block', marginTop: '2px' }}>
                                    ({language === 'hi' && employee?.name_hi ? employee.name_hi : employee?.name}{employee?.designation ? ', ' + employee.designation : ''})
                                </span>
                            </div>
                        </div>
                    </div>{/* /page2-tables-container */}
                </div>
            </div>

            <style>{`
                .medical-main-card {
                    padding: 2rem;
                    position: relative;
                    background: transparent;
                    border: none;
                    box-shadow: none;
                }
                .medical-print-page {
                    border: 1.5px solid #000;
                    padding: 1.75rem 2rem;
                    background: white;
                    margin-bottom: 2rem;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.06);
                    border-radius: 4px;
                }
                .medical-header {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 16px;
                    margin-bottom: 16px;
                    text-align: center;
                    border-bottom: 1.5px solid #000;
                    padding-bottom: 10px;
                }
                .medical-logo {
                    width: 52px;
                    height: 52px;
                    min-width: 52px;
                    min-height: 52px;
                    max-width: 52px;
                    max-height: 52px;
                    flex-shrink: 0;
                    object-fit: contain;
                    aspect-ratio: 1 / 1;
                    display: block;
                }
                .medical-header-title {
                    margin: 0;
                    font-size: 1.2rem;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .medical-header-subtitle {
                    margin: 3px 0 0 0;
                    font-size: 0.95rem;
                    font-weight: 600;
                    color: #334155;
                }
                .medical-form-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 1.25rem;
                }
                .medical-inline-inputs {
                    display: flex;
                    gap: 1rem;
                }
                .medical-illness-row {
                    display: flex;
                    gap: 0.5rem;
                }
                .medical-duration-box {
                    width: 120px;
                }
                .expenditure-summary-title {
                    margin-top: 1.5rem;
                    border-bottom: 2px solid #eee;
                    padding-bottom: 0.5rem;
                }
                .expenditure-summary-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 1rem;
                    margin-top: 0.75rem;
                }
                .readonly-input {
                    background: #f8fafc;
                    font-weight: bold;
                }
                .medical-total-row {
                    margin-top: 1rem;
                    text-align: right;
                }
                .medical-total-text {
                    color: var(--primary-color);
                    font-size: 1.2rem;
                    margin: 0;
                }
                .med-border-table {
                    width: 100%;
                    border-collapse: collapse;
                    border: 1.5px solid #000;
                    table-layout: fixed;
                    margin-bottom: 12px;
                }
                .med-border-table th, .med-border-table td {
                    border: 1px solid #000;
                    padding: 6px 10px;
                    font-size: 0.9rem;
                    line-height: 1.35;
                    vertical-align: middle;
                    word-break: break-word;
                    overflow-wrap: break-word;
                    white-space: normal;
                }
                .med-border-table th {
                    background: #f1f5f9;
                    font-weight: bold;
                }
                .table-field-label {
                    font-size: 0.8rem;
                    font-weight: bold;
                    color: #475569;
                    margin-bottom: 2px;
                    line-height: 1.2;
                }
                .table-field-value {
                    font-size: 0.92rem;
                    font-weight: 600;
                    color: #0f172a;
                    line-height: 1.3;
                }
                .medical-cert-section {
                    margin-top: 1.25rem;
                }
                .medical-cert-box {
                    border: 1.5px solid #000;
                    padding: 12px 16px;
                    background: #fafafa;
                    font-size: 0.88rem;
                    line-height: 1.45;
                }
                .cert-p {
                    margin: 4px 0;
                    line-height: 1.4;
                }
                .cert-divider {
                    border-top: 1px solid #cbd5e1;
                    margin: 8px 0;
                }
                .cert-doctor-heading {
                    margin-top: 6px;
                    font-weight: bold;
                }
                .doctor-sig-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-end;
                    margin-top: 10px;
                }
                .doctor-meta {
                    font-size: 0.85rem;
                    line-height: 1.6;
                }
                .sig-container {
                    display: flex;
                    justify-content: flex-end;
                    margin-top: 8px;
                }
                .sig-block {
                    display: inline-flex;
                    flex-direction: column;
                    align-items: center;
                    text-align: center;
                }
                .sig-line {
                    display: block;
                    font-size: 0.85rem;
                    margin-bottom: 4px;
                }
                .sig-label {
                    display: block;
                    font-size: 0.85rem;
                    font-weight: bold;
                    text-transform: uppercase;
                }
                .details-charges-header {
                    margin-bottom: 1rem;
                    border-bottom: 1.5px solid #000;
                    padding-bottom: 0.5rem;
                }
                .details-charges-title {
                    margin: 0 0 4px 0;
                    font-size: 1.1rem;
                }
                .details-charges-sub {
                    display: flex;
                    gap: 2rem;
                    font-size: 0.88rem;
                    color: #475569;
                }
                .table-section {
                    margin-top: 1.5rem;
                }
                .table-section-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 0.5rem;
                }
                .table-section-title {
                    margin: 0;
                }
                .data-table {
                    width: 100%;
                    border-collapse: collapse;
                    border: 1px solid #000;
                    table-layout: fixed;
                }
                .data-table th, .data-table td {
                    padding: 8px 10px;
                    border: 1px solid #000;
                    font-size: 0.9rem;
                    word-break: break-word;
                    overflow-wrap: break-word;
                    white-space: normal;
                }
                .data-table th {
                    background: #f8fafc;
                    font-weight: 600;
                    text-align: left;
                }
                .subtotal-row td {
                    background: #f8fafc;
                    font-weight: 600;
                }
                .page2-summary-box {
                    margin-top: 1.5rem;
                    border-top: 1.5px solid #000;
                    padding-top: 1rem;
                }
                .page2-signatures {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-end;
                    margin-top: 1.5rem;
                    padding: 0 0.5rem;
                }
                .sig-date-place {
                    font-size: 0.9rem;
                    line-height: 1.6;
                    color: #334155;
                }
                .sig-side {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    text-align: center;
                    min-width: 250px;
                    gap: 2px;
                }
                .form-input.small {
                    padding: 5px 8px;
                    height: auto;
                    font-size: 0.88rem;
                    width: 100%;
                    box-sizing: border-box;
                }
                .text-wrap {
                    word-break: break-word !important;
                    overflow-wrap: break-word !important;
                    white-space: normal !important;
                    line-height: 1.35;
                }
                .print-only {
                    display: none;
                }

                /* ===================================================
                   GOVERNMENT PRESCRIBED BORDERED A4 PRINT STYLES
                   =================================================== */
                @media print {
                    @page {
                        size: A4 ${printOrientation};
                        margin: ${printOrientation === 'landscape' ? '5mm 8mm 6mm 8mm' : '6mm 8mm 8mm 8mm'};
                    }
                    * {
                        color: black !important;
                        border-color: black !important;
                        background: transparent !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        box-sizing: border-box !important;
                    }
                    body {
                        background: white !important;
                        font-size: 8pt !important;
                        font-family: 'Times New Roman', Times, serif !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                    .no-print {
                        display: none !important;
                    }
                    .print-only {
                        display: block !important;
                    }

                    .medical-main-card {
                        border: none !important;
                        box-shadow: none !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        background: transparent !important;
                    }

                    /* Dedicated Page Containers with Outer Border */
                    .medical-print-page {
                        border: 1.5px solid black !important;
                        padding: ${printOrientation === 'landscape' ? '4mm 5mm' : '5mm 6mm'} !important;
                        box-sizing: border-box !important;
                        width: 100% !important;
                        background: white !important;
                        margin-bottom: 0 !important;
                        box-shadow: none !important;
                        border-radius: 0 !important;
                    }

                    /* Page 1: Points 1-11 — STRICT 1 page, break after */
                    .medical-page-1 {
                        /* NO break-inside:avoid — it fights overflow and causes page 1
                           content to spill onto page 2. Let break-after do all the work. */
                        page-break-after: always !important;
                        break-after: page !important;
                        display: flex !important;
                        flex-direction: column !important;
                        justify-content: flex-start !important;
                        margin-bottom: 0 !important;
                        padding-bottom: 4mm !important;
                        box-sizing: border-box !important;
                        overflow: hidden !important;
                    }

                    /* Page 1 Header — compact for landscape */
                    .medical-header {
                        display: flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                        gap: ${printOrientation === 'landscape' ? '8px' : '12px'} !important;
                        margin-bottom: ${printOrientation === 'landscape' ? '4px' : '6px'} !important;
                        padding-bottom: ${printOrientation === 'landscape' ? '3px' : '4px'} !important;
                        border-bottom: 1.5px solid black !important;
                    }
                    .medical-logo {
                        width: ${printOrientation === 'landscape' ? '36px' : '44px'} !important;
                        height: ${printOrientation === 'landscape' ? '36px' : '44px'} !important;
                        min-width: ${printOrientation === 'landscape' ? '36px' : '44px'} !important;
                        min-height: ${printOrientation === 'landscape' ? '36px' : '44px'} !important;
                        max-width: ${printOrientation === 'landscape' ? '36px' : '44px'} !important;
                        max-height: ${printOrientation === 'landscape' ? '36px' : '44px'} !important;
                        object-fit: contain !important;
                    }
                    .medical-header-title {
                        font-size: ${printOrientation === 'landscape' ? '9.5pt' : '10.5pt'} !important;
                        letter-spacing: 0 !important;
                        line-height: 1.15 !important;
                        font-weight: bold !important;
                    }
                    .medical-header-subtitle {
                        font-size: ${printOrientation === 'landscape' ? '8pt' : '8.8pt'} !important;
                        margin-top: 1px !important;
                        color: black !important;
                        font-weight: bold !important;
                    }

                    /* Page 1 Tables Wrap */
                    .page1-tables-wrap {
                        display: flex !important;
                        flex-direction: column !important;
                        gap: ${printOrientation === 'landscape' ? '3px' : '5px'} !important;
                    }

                    /* Bordered Tables (Page 1) */
                    .med-border-table {
                        width: 100% !important;
                        border-collapse: collapse !important;
                        border: 1px solid black !important;
                        table-layout: fixed !important;
                        margin-bottom: 0 !important;
                    }
                    .med-border-table th, .med-border-table td {
                        border: 1px solid black !important;
                        padding: ${printOrientation === 'landscape' ? '3px 5px' : '5px 7px'} !important;
                        font-size: ${printOrientation === 'landscape' ? '7.3pt' : '7.8pt'} !important;
                        line-height: 1.18 !important;
                        vertical-align: middle !important;
                        word-break: break-word !important;
                        overflow-wrap: break-word !important;
                        white-space: normal !important;
                    }
                    .med-border-table th {
                        background: #f1f5f9 !important;
                        font-weight: bold !important;
                        text-align: center !important;
                    }
                    .table-field-label {
                        font-size: ${printOrientation === 'landscape' ? '6.8pt' : '7.3pt'} !important;
                        font-weight: bold !important;
                        color: black !important;
                        margin-bottom: 1px !important;
                        line-height: 1.1 !important;
                    }
                    .table-field-value {
                        font-size: ${printOrientation === 'landscape' ? '7.8pt' : '8.5pt'} !important;
                        font-weight: bold !important;
                        color: black !important;
                        line-height: 1.15 !important;
                    }

                    /* Page 1 Certification Section (10-Declaration + 11-Doctor Cert) */
                    .medical-cert-section {
                        margin-top: ${printOrientation === 'landscape' ? '4px' : '6px'} !important;
                        padding-top: 0 !important;
                        flex: 1 !important;
                        display: flex !important;
                        flex-direction: column !important;
                    }
                    .medical-cert-box {
                        border: 1px solid black !important;
                        padding: ${printOrientation === 'landscape' ? '5px 8px' : '8px 10px'} !important;
                        border-radius: 0 !important;
                        background: white !important;
                        display: flex !important;
                        flex-direction: column !important;
                        justify-content: flex-start !important;
                    }
                    .cert-p {
                        margin: 1px 0 !important;
                        font-size: ${printOrientation === 'landscape' ? '7.2pt' : '7.8pt'} !important;
                        line-height: ${printOrientation === 'landscape' ? '1.25' : '1.35'} !important;
                    }
                    .cert-divider {
                        border-top: 1px solid black !important;
                        margin: ${printOrientation === 'landscape' ? '4px 0' : '6px 0'} !important;
                    }
                    .cert-doctor-heading {
                        margin-top: 1px !important;
                        font-size: ${printOrientation === 'landscape' ? '7.5pt' : '8.2pt'} !important;
                        font-weight: bold !important;
                    }
                    .doctor-sig-row {
                        display: flex !important;
                        justify-content: space-between !important;
                        align-items: flex-end !important;
                        margin-top: ${printOrientation === 'landscape' ? '6px' : '10px'} !important;
                    }
                    .doctor-meta {
                        font-size: ${printOrientation === 'landscape' ? '7.2pt' : '7.6pt'} !important;
                        line-height: 1.45 !important;
                    }
                    .sig-container {
                        display: flex !important;
                        justify-content: flex-end !important;
                        margin-top: ${printOrientation === 'landscape' ? '5px' : '8px'} !important;
                    }
                    .sig-block {
                        display: inline-flex !important;
                        flex-direction: column !important;
                        align-items: center !important;
                        text-align: center !important;
                        min-width: 180px !important;
                    }
                    /* sig-space (blank space above rule) — shrink in landscape */
                    .sig-space {
                        height: ${printOrientation === 'landscape' ? '16px' : '24px'} !important;
                        display: block !important;
                    }
                    .sig-label {
                        display: block !important;
                        font-size: ${printOrientation === 'landscape' ? '7.8pt' : '8.5pt'} !important;
                        line-height: 1.2 !important;
                        font-weight: bold !important;
                        text-transform: uppercase !important;
                        color: black !important;
                    }
                    .sig-emp-name {
                        display: block !important;
                        font-size: ${printOrientation === 'landscape' ? '7.2pt' : '7.8pt'} !important;
                        font-weight: bold !important;
                        color: black !important;
                        margin-top: 1px !important;
                    }
                    .sig-rule {
                        border-top: 1.5px solid black !important;
                        display: block !important;
                        margin-bottom: 3px !important;
                    }
                    .sig-line {
                        display: none !important;
                    }

                    /* ================= PAGE 2 ================= */
                    /* PART II: Itemized Details — always starts on a fresh page */
                    .medical-page-2 {
                        page-break-before: always !important;
                        break-before: page !important;
                        display: flex !important;
                        flex-direction: column !important;
                        justify-content: flex-start !important;
                        margin-top: 0 !important;
                        padding-bottom: 6mm !important;
                        box-sizing: border-box !important;
                    }

                    /* Page 2 Detailed Charges Header */
                    .details-charges-header {
                        margin-bottom: 4px !important;
                        border-bottom: 1.5px solid black !important;
                        padding-bottom: 3px !important;
                    }
                    .details-charges-title {
                        margin: 0 !important;
                        font-size: 10pt !important;
                        font-weight: bold !important;
                        text-align: center !important;
                        letter-spacing: 0.3px !important;
                    }
                    .details-charges-sub {
                        display: flex !important;
                        justify-content: space-between !important;
                        font-size: 7.8pt !important;
                        font-weight: bold !important;
                        margin-top: 2px !important;
                        color: black !important;
                    }

                    /* Page 2 Tables Container — 2-column layout in landscape */
                    .page2-tables-container {
                        display: ${printOrientation === 'landscape' ? 'grid' : 'flex'} !important;
                        grid-template-columns: ${printOrientation === 'landscape' ? '1fr 1fr' : 'unset'} !important;
                        grid-template-rows: ${printOrientation === 'landscape' ? 'auto' : 'unset'} !important;
                        flex-direction: ${printOrientation === 'landscape' ? 'unset' : 'column'} !important;
                        gap: ${printOrientation === 'landscape' ? '0 8px' : '6px'} !important;
                        align-items: start !important;
                        flex: 1 !important;
                        margin: 4px 0 !important;
                    }
                    .p2-col {
                        display: flex !important;
                        flex-direction: column !important;
                        gap: 6px !important;
                    }
                    .p2-col-other {
                        grid-column: ${printOrientation === 'landscape' ? '2' : 'unset'} !important;
                        grid-row: ${printOrientation === 'landscape' ? '2' : 'unset'} !important;
                    }

                    /* Page 2 Data Tables */
                    .table-section {
                        margin-top: 0 !important;
                        break-inside: avoid !important;
                        page-break-inside: avoid !important;
                    }
                    .table-section-header {
                        margin-bottom: 2px !important;
                    }
                    .table-section-title {
                        margin: 0 0 2px 0 !important;
                        font-size: 8.2pt !important;
                        font-weight: bold !important;
                        text-transform: uppercase !important;
                    }
                    .data-table {
                        width: 100% !important;
                        border-collapse: collapse !important;
                        border: 1px solid black !important;
                        table-layout: fixed !important;
                        font-size: ${printOrientation === 'landscape' ? '7.2pt' : '7.8pt'} !important;
                        margin-bottom: 0 !important;
                    }
                    .data-table th, .data-table td {
                        border: 1px solid black !important;
                        padding: ${printOrientation === 'landscape' ? '3px 4px' : '4.5px 6px'} !important;
                        line-height: 1.25 !important;
                        font-size: ${printOrientation === 'landscape' ? '7.2pt' : '7.8pt'} !important;
                        vertical-align: middle !important;
                        word-break: break-word !important;
                        overflow-wrap: break-word !important;
                        white-space: normal !important;
                    }
                    .data-table th {
                        background: #f1f5f9 !important;
                        font-weight: bold !important;
                        text-align: center !important;
                        padding: ${printOrientation === 'landscape' ? '3px 4px' : '4px 6px'} !important;
                        font-size: ${printOrientation === 'landscape' ? '7.2pt' : '7.8pt'} !important;
                    }
                    .subtotal-row td {
                        background: #f8fafc !important;
                        font-weight: bold !important;
                        font-size: ${printOrientation === 'landscape' ? '7.2pt' : '7.8pt'} !important;
                        padding: ${printOrientation === 'landscape' ? '3px 4px' : '4px 6px'} !important;
                    }

                    /* Text Wrapping in Table Cells */
                    .text-wrap {
                        word-break: break-word !important;
                        overflow-wrap: break-word !important;
                        white-space: normal !important;
                        line-height: 1.2 !important;
                        font-size: 7.2pt !important;
                    }

                    /* Page 2 Signatures and Summary */
                    .page2-summary-box {
                        border-top: 1.5px solid black !important;
                        padding-top: 6px !important;
                        margin-top: 8px !important;
                        break-inside: avoid !important;
                        page-break-inside: avoid !important;
                    }
                    .page2-signatures {
                        display: flex !important;
                        justify-content: space-between !important;
                        align-items: flex-end !important;
                        margin-top: 24px !important;
                        padding: 0 8px 4px 8px !important;
                        break-inside: avoid !important;
                        page-break-inside: avoid !important;
                    }
                    .sig-date-place {
                        font-size: 8.5pt !important;
                        line-height: 1.5 !important;
                        color: black !important;
                        text-align: left !important;
                    }
                    .sig-side {
                        font-size: 9.5pt !important;
                        line-height: 1.35 !important;
                        display: flex !important;
                        flex-direction: column !important;
                        align-items: center !important;
                        text-align: center !important;
                        min-width: 250px !important;
                    }
                    .sig-side .sig-rule, .sig-block .sig-rule {
                        width: 240px !important;
                        border-top: 1.5px solid black !important;
                        margin-bottom: 5px !important;
                        display: block !important;
                    }
                    .sig-side strong, .sig-side .sig-title {
                        display: block !important;
                        font-size: 9.5pt !important;
                        font-weight: bold !important;
                        color: black !important;
                        text-transform: uppercase !important;
                        line-height: 1.25 !important;
                        text-align: center !important;
                    }
                    .sig-side .sig-emp-name {
                        display: block !important;
                        font-size: 8.8pt !important;
                        font-weight: bold !important;
                        color: black !important;
                        margin-top: 2px !important;
                        text-align: center !important;
                    }
                }
            `}</style>
        </div>
    );
};

export default MedicalClaim;
