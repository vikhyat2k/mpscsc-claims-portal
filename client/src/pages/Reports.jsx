import api, { apiRequest } from '../utils/api';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    FileSpreadsheet,
    Printer,
    Search,
    Filter,
    ArrowUpDown
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { getTranslations } from '../utils/translations';
import * as XLSX from 'xlsx';
import logoIco from '../assets/logo.ico';

const Reports = () => {
    const navigate = useNavigate();
    const { language } = useLanguage();
    const t = getTranslations(language);
    const rt = t.reports;

    const [loading, setLoading] = useState(true);
    const [printOrientation, setPrintOrientation] = useState(() => {
        const p = new URLSearchParams(window.location.search).get('orientation');
        return p === 'portrait' ? 'portrait' : 'landscape';
    });
    const [claims, setClaims] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [filteredClaims, setFilteredClaims] = useState([]);

    // Filters
    const [filters, setFilters] = useState({
        employeeId: 'all',
        claimType: 'all',
        status: 'all',
        category: 'all',
        headquarter: 'all',
        startDate: '',
        endDate: '',
        searchTerm: ''
    });

    // Sorting
    const [sortConfig, setSortConfig] = useState({ key: 'id', direction: 'desc' });

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [claimsRes, employeesRes] = await Promise.all([
                    apiRequest(`/api/claims?t=${Date.now()}`),
                    apiRequest(`/api/employees?t=${Date.now()}`)
                ]);
                const claimsData = await claimsRes.json();
                const employeesData = await employeesRes.json();

                setClaims(claimsData);
                setEmployees(employeesData);
                setFilteredClaims(claimsData);
                setLoading(false);
            } catch (err) {
                console.error(err);
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleDelete = async (id) => {
        if (!window.confirm(t.tourDiariesList.deleteConfirm)) return;
        try {
            const res = await apiRequest(`/api/claims/${id}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                setClaims(prev => prev.filter(c => c.id !== id));
            } else {
                alert(t.messages.failedToDelete);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const applyFilters = () => {
        let result = [...claims];

        if (filters.employeeId !== 'all') {
            result = result.filter(c => c.employee_id === parseInt(filters.employeeId));
        }

        if (filters.claimType !== 'all') {
            result = result.filter(c => c.claim_type === filters.claimType);
        }

        if (filters.status !== 'all') {
            result = result.filter(c => c.status === filters.status);
        }

        if (filters.category !== 'all') {
            result = result.filter(c => c.category === filters.category);
        }

        if (filters.headquarter !== 'all') {
            result = result.filter(c => c.headquarters === filters.headquarter);
        }

        if (filters.startDate) {
            result = result.filter(c => new Date(c.start_date) >= new Date(filters.startDate));
        }

        if (filters.endDate) {
            result = result.filter(c => new Date(c.end_date) <= new Date(filters.endDate));
        }

        if (filters.searchTerm) {
            const term = filters.searchTerm.toLowerCase();
            result = result.filter(c =>
                (c.employee_name || '').toLowerCase().includes(term) ||
                (c.rendered_claim_id && c.rendered_claim_id.toLowerCase().includes(term))
            );
        }

        setFilteredClaims(result);
    };

    useEffect(() => {
        applyFilters();
    }, [filters, claims]);

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });

        const sorted = [...filteredClaims].sort((a, b) => {
            if (a[key] < b[key]) return direction === 'asc' ? -1 : 1;
            if (a[key] > b[key]) return direction === 'asc' ? 1 : -1;
            return 0;
        });
        setFilteredClaims(sorted);
    };

    const exportToExcel = () => {
        const data = filteredClaims.map(c => ({
            [rt.table.claimId]: c.rendered_claim_id || c.id,
            [rt.table.employee]: c.employee_name,
            [rt.table.headquarter]: c.headquarters,
            [rt.table.category]: c.category,
            [rt.table.type]: c.claim_type,
            [rt.table.period]: `${c.start_date} - ${c.end_date}`,
            [rt.table.amount]: c.total_amount,
            [rt.table.status]: c.status,
            [rt.table.submissionDate]: c.created_at
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Reports");
        XLSX.writeFile(wb, `Claims_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const stats = {
        totalClaims: filteredClaims.length,
        totalAmount: filteredClaims.reduce((sum, c) => sum + (c.total_amount || 0), 0),
        draft: filteredClaims.filter(c => c.status === 'DRAFT').length,
        submitted: filteredClaims.filter(c => c.status === 'SUBMITTED').length
    };

    const handlePrint = (orientation = printOrientation) => {
        setPrintOrientation(orientation);
        const originalTitle = document.title;
        const dateStr = new Date().toISOString().split('T')[0];
        document.title = `${dateStr}_Claims_Report_${orientation}`;

        setTimeout(() => {
            window.print();
            setTimeout(() => {
                document.title = originalTitle;
            }, 100);
        }, 80);
    };

    if (loading) return <div style={{ padding: '2rem' }}>{t.common.loading}</div>;

    return (
        <div className="page-transition">
            {/* Print Header */}
            <div className="print-only-header" style={{ display: 'none', alignItems: 'center', justifyContent: 'center', gap: '15px', marginBottom: '15px', textAlign: 'center', borderBottom: '1px solid black', paddingBottom: '8px' }}>
                <img
                    src={logoIco}
                    alt="MPSCSC Logo"
                    style={{
                        width: '50px',
                        height: '50px',
                        minWidth: '50px',
                        minHeight: '50px',
                        maxWidth: '50px',
                        maxHeight: '50px',
                        flexShrink: 0,
                        objectFit: 'contain',
                        aspectRatio: '1 / 1',
                        display: 'block'
                    }}
                />
                <div>
                    <h2 style={{ margin: 0, fontSize: '15px', textTransform: 'uppercase' }}>
                        {language === 'hi' ? 'मध्य प्रदेश स्टेट सिविल सप्लाइज कॉर्पोरेशन लिमिटेड' : 'M.P. State Civil Supplies Corporation Limited'}
                    </h2>
                    <h3 style={{ margin: '3px 0 0 0', fontSize: '13px', fontWeight: 'bold' }}>
                        {rt.title}
                    </h3>
                </div>
            </div>

            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h1 style={{ margin: 0 }}>{rt.title}</h1>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* Print Orientation Selector Toggle */}
                    <div style={{ display: 'inline-flex', alignItems: 'center', background: '#f1f5f9', padding: '3px', borderRadius: '8px', border: '1px solid #cbd5e1', gap: '3px' }}>
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
                    </div>
                    <button type="button" onClick={() => handlePrint(printOrientation)} className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: '600' }}>
                        <Printer size={18} /> {language === 'hi' ? `प्रिंट (A4 ${printOrientation === 'landscape' ? 'लैंडस्केप' : 'पोर्ट्रेट'})` : `Print (A4 ${printOrientation === 'landscape' ? 'Landscape' : 'Portrait'})`}
                    </button>
                    <button onClick={exportToExcel} className="btn btn-success">
                        <FileSpreadsheet size={18} /> {t.common.export}
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #3b82f6' }}>
                    <div style={{ color: '#64748b', fontSize: '0.875rem' }}>{rt.totalClaims}</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.totalClaims}</div>
                </div>
                <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #10b981' }}>
                    <div style={{ color: '#64748b', fontSize: '0.875rem' }}>{rt.totalAmount}</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>₹{stats.totalAmount.toLocaleString()}</div>
                </div>
                <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #f59e0b' }}>
                    <div style={{ color: '#64748b', fontSize: '0.875rem' }}>{rt.draftClaims}</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.draft}</div>
                </div>
                <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #10b981' }}>
                    <div style={{ color: '#64748b', fontSize: '0.875rem' }}>{rt.submittedClaims}</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.submitted}</div>
                </div>
            </div>

            {/* Filters */}
            <div className="card no-print" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: '#1e293b' }}>
                    <Filter size={18} />
                    <h5 style={{ margin: 0 }}>{rt.filters}</h5>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    <div className="form-group">
                        <label className="form-label">{rt.table.employee}</label>
                        <select className="form-select" value={filters.employeeId} onChange={e => setFilters({ ...filters, employeeId: e.target.value })}>
                            <option value="all">{rt.allEmployees}</option>
                            {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">{rt.table.type}</label>
                        <select className="form-select" value={filters.claimType} onChange={e => setFilters({ ...filters, claimType: e.target.value })}>
                            <option value="all">{rt.allTypes}</option>
                            <option value="TA_DA">{t.claims.tourDiary}</option>
                            <option value="TRANSFER">{t.claims.transfer}</option>
                            <option value="MEDICAL">{t.claims.medical}</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">{rt.table.status}</label>
                        <select className="form-select" value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })}>
                            <option value="all">{rt.allStatus}</option>
                            <option value="Draft">Draft</option>
                            <option value="SUBMITTED">{t.common.submitted}</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">{rt.table.category}</label>
                        <select className="form-select" value={filters.category} onChange={e => setFilters({ ...filters, category: e.target.value })}>
                            <option value="all">{rt.allCategories}</option>
                            <option value="A">{language === 'hi' ? 'श्रेणी A' : 'Category A'}</option>
                            <option value="B">{language === 'hi' ? 'श्रेणी B' : 'Category B'}</option>
                            <option value="C">{language === 'hi' ? 'श्रेणी C' : 'Category C'}</option>
                            <option value="D">{language === 'hi' ? 'श्रेणी D' : 'Category D'}</option>
                            <option value="E">{language === 'hi' ? 'श्रेणी E' : 'Category E'}</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">{rt.table.headquarter}</label>
                        <select className="form-select" value={filters.headquarter} onChange={e => setFilters({ ...filters, headquarter: e.target.value })}>
                            <option value="all">{language === 'hi' ? 'सभी मुख्यालय' : 'All Headquarters'}</option>
                            {[...new Set(employees.map(emp => emp.headquarters))].filter(Boolean).sort().map(hq => (
                                <option key={hq} value={hq}>{hq}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">{rt.startDate}</label>
                        <input type="date" className="form-input" value={filters.startDate} onChange={e => setFilters({ ...filters, startDate: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">{rt.endDate}</label>
                        <input type="date" className="form-input" value={filters.endDate} onChange={e => setFilters({ ...filters, endDate: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">{t.common.search}</label>
                        <div style={{ position: 'relative' }}>
                            <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                            <input
                                type="text"
                                className="form-input"
                                style={{ paddingLeft: '2.25rem' }}
                                placeholder={rt.searchEmployee}
                                value={filters.searchTerm}
                                onChange={e => setFilters({ ...filters, searchTerm: e.target.value })}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Results Table */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table className="data-table" style={{ margin: 0 }}>
                        <thead style={{ background: '#f8fafc' }}>
                            <tr>
                                <th onClick={() => handleSort('id')} style={{ cursor: 'pointer' }}>
                                    {rt.table.claimId} <ArrowUpDown size={12} style={{ marginLeft: '4px' }} />
                                </th>
                                <th onClick={() => handleSort('employee_name')} style={{ cursor: 'pointer' }}>
                                    {rt.table.employee} <ArrowUpDown size={12} style={{ marginLeft: '4px' }} />
                                </th>
                                <th>{rt.table.headquarter}</th>
                                <th>{rt.table.type}</th>
                                <th>{rt.table.period}</th>
                                <th onClick={() => handleSort('total_amount')} style={{ cursor: 'pointer', textAlign: 'right' }}>
                                    {rt.table.amount} <ArrowUpDown size={12} style={{ marginLeft: '4px' }} />
                                </th>
                                <th>{rt.table.status}</th>
                                <th className="no-print">{t.common.actions}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredClaims.map((c) => (
                                <tr key={c.id}>
                                    <td style={{ fontWeight: '600' }}>{c.rendered_claim_id || `#${c.id}`}</td>
                                    <td>
                                        <div style={{ fontWeight: '500' }}>{c.employee_name}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{c.designation}</div>
                                    </td>
                                    <td>{c.headquarters}</td>
                                    <td>
                                        <span className={`badge badge-${c.claim_type.toLowerCase()}`} style={{ fontSize: '0.7rem' }}>
                                            {c.claim_type}
                                        </span>
                                    </td>
                                    <td style={{ fontSize: '0.85rem' }}>
                                        {c.start_date || '-'}<br />{c.end_date || '-'}
                                    </td>
                                    <td style={{ textAlign: 'right', fontWeight: '600' }}>
                                        ₹{(c.total_amount || 0).toLocaleString()}
                                    </td>
                                    <td>
                                        <span className={`status-pill ${c.status === 'SUBMITTED' ? 'status-submitted' : 'status-draft'}`}>
                                            {c.status === 'SUBMITTED' ? t.common.submitted : (c.status === 'DRAFT' || c.status === 'Draft' ? 'Draft' : c.status)}
                                        </span>
                                    </td>
                                    <td className="no-print">
                                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                            <button
                                                className="btn btn-sm btn-outline-primary"
                                                onClick={() => {
                                                    if (c.claim_type === 'TRANSFER') navigate(`/claims/transfer/${c.id}?view=true`);
                                                    else if (c.claim_type === 'MEDICAL') navigate(`/medical-claims/${c.id}?view=true`);
                                                    else navigate(`/claims/${c.id}?view=true`);
                                                }}
                                            >
                                                {t.common.view}
                                            </button>
                                            <button
                                                className="btn btn-sm btn-outline-primary"
                                                onClick={() => {
                                                    if (c.claim_type === 'TRANSFER') navigate(`/claims/transfer/${c.id}`);
                                                    else if (c.claim_type === 'MEDICAL') navigate(`/medical-claims/${c.id}`);
                                                    else navigate(`/claims/${c.id}`);
                                                }}
                                            >
                                                {t.common.edit}
                                            </button>
                                            <button
                                                className="btn btn-sm btn-outline-danger"
                                                onClick={() => handleDelete(c.id)}
                                            >
                                                {t.common.delete}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredClaims.length === 0 && (
                                <tr>
                                    <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                                        {language === 'hi' ? 'कोई मिलान दावा नहीं मिला।' : 'No matching claims found.'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <style>{`
                .status-pill {
                    padding: 4px 10px;
                    border-radius: 999px;
                    font-size: 0.75rem;
                    font-weight: 600;
                    text-transform: uppercase;
                }
                .status-draft {
                    background: #fef3c7;
                    color: #92400e;
                }
                .status-submitted {
                    background: #dcfce7;
                    color: #166534;
                }
                .badge-ta_da { background: #e0f2fe; color: #0369a1; padding: 2px 6px; border-radius: 4px; }
                .badge-transfer { background: #fef3c7; color: #92400e; padding: 2px 6px; border-radius: 4px; }
                .badge-medical { background: #fce7f3; color: #9d174d; padding: 2px 6px; border-radius: 4px; }

                @media print {
                    @page { size: A4 ${printOrientation}; margin: ${printOrientation === 'landscape' ? '8mm 10mm' : '8mm 8mm'}; }
                    .no-print { display: none !important; }
                    .print-only-header { display: flex !important; }
                    .card { border: none !important; box-shadow: none !important; padding: 0 !important; }
                    .data-table { width: 100% !important; border-collapse: collapse !important; }
                    .data-table th, .data-table td { 
                        border: 1px solid black !important; 
                        color: black !important; 
                        padding: 4px !important;
                        font-size: 10px !important;
                    }
                    .data-table th { background: #eee !important; }
                    body { color: black !important; background: white !important; }
                }
            `}</style>
        </div>
    );
};

export default Reports;
