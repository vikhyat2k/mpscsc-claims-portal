import api, { apiRequest } from '../utils/api';
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { PlusCircle, ArrowLeft } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { getTranslations } from '../utils/translations';

const TADAClaims = () => {
    const { language } = useLanguage();
    const t = getTranslations(language);
    const navigate = useNavigate();

    const [employees, setEmployees] = useState([]);
    const [selectedEmp, setSelectedEmp] = useState('all');
    const [claims, setClaims] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);

    const fetchClaims = (empId) => {
        setLoading(true);
        const url = empId && empId !== 'all'
            ? `/api/claims/${empId}`
            : `/api/claims`;
        apiRequest(url)
            .then(res => res.json())
            .then(data => {
                setClaims(data.filter(c => c.claim_type === 'TA_DA'));
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    };

    useEffect(() => {
        apiRequest('/api/employees')
            .then(res => res.json())
            .then(data => {
                setEmployees(data);
            })
            .catch(err => console.error(err));
        fetchClaims('all');
    }, []);

    useEffect(() => {
        if (selectedEmp) {
            fetchClaims(selectedEmp);
        }
    }, [selectedEmp]);

    const [newMonth, setNewMonth] = useState(new Date().getMonth() + 1);
    const [newYear, setNewYear] = useState(new Date().getFullYear());

    const months = t.tourDiary.months;

    const handleCreate = async () => {
        if (isCreating) return;
        if (selectedEmp === 'all' || !selectedEmp) {
            alert(language === 'hi' ? 'कृपया नया दावा बनाने के लिए सूची से एक कर्मचारी चुनें।' : 'Please select a specific employee from the dropdown to create a claim.');
            return;
        }

        setIsCreating(true);
        try {
            const res = await apiRequest('/api/claims', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    employee_id: selectedEmp,
                    claim_type: 'TA_DA',
                    month: months[newMonth - 1],
                    year: newYear.toString(),
                    start_date: `${newYear}-${newMonth.toString().padStart(2, '0')}-01`,
                    end_date: `${newYear}-${newMonth.toString().padStart(2, '0')}-01`,
                    status: 'Draft'
                })
            });
            const data = await res.json();
            navigate(`/claims/${data.id}`);
        } catch (err) {
            console.error(err);
            setIsCreating(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm(t.tourDiariesList.deleteConfirm)) return;
        try {
            const res = await apiRequest(`/api/claims/${id}`, {
                method: 'DELETE'
            });
            if (res.ok) fetchClaims(selectedEmp);
        } catch (err) {
            console.error(err);
        }
    };

    const handleSubmitClaim = async (claim) => {
        if (!window.confirm(t.common.confirmSubmit)) return;
        try {
            const res = await apiRequest(`/api/claims/${claim.id}/submit`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ total_amount: claim.total_amount || 0 })
            });
            if (res.ok) {
                alert(language === 'hi' ? 'दावा सफलतापूर्वक स्वीकृति हेतु प्रस्तुत किया गया!' : 'Claim successfully submitted for approval!');
                fetchClaims(selectedEmp);
            } else {
                alert(t.messages.errorSaving);
            }
        } catch (err) {
            console.error(err);
            alert(t.messages.errorSaving);
        }
    };


    const getEmployeeName = (id) => {
        const emp = employees.find(e => e.id === Number(id));
        if (!emp) return '';
        return language === 'hi' && emp.name_hi ? emp.name_hi : emp.name;
    };

    if (loading && employees.length === 0) return <div>{t.common.loading}</div>;

    return (
        <div className="page-transition">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => navigate('/')}>
                        <ArrowLeft size={16} />
                    </button>
                    <h1>{t.nav.tadaClaims}</h1>
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <select className="form-select" style={{ width: '250px' }}
                        value={selectedEmp} onChange={e => setSelectedEmp(e.target.value)}>
                        <option value="all">{language === 'hi' ? 'सभी कर्मचारी (All Employees)' : 'All Employees'}</option>
                        {employees.map(e => (
                            <option key={e.id} value={e.id}>
                                {language === 'hi' && e.name_hi ? e.name_hi : e.name}
                            </option>
                        ))}
                    </select>

                    <div className="glass-control-bar" style={{ padding: '0.65rem 0.85rem', borderRadius: '10px', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <select className="form-select" style={{ width: '130px' }} value={newMonth} onChange={e => setNewMonth(parseInt(e.target.value))}>
                            {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                        </select>
                        <select className="form-select" style={{ width: '90px' }} value={newYear} onChange={e => setNewYear(parseInt(e.target.value))}>
                            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                        <button className="btn btn-primary" onClick={handleCreate} disabled={!selectedEmp || isCreating}>
                            <PlusCircle size={18} /> {isCreating ? t.common.saving : t.claims.newClaim}
                        </button>
                    </div>
                </div>
            </div>

            <div className="card table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>{t.reports.table.claimId}</th>
                            <th>TD Ref</th>
                            <th>{t.claims.employee}</th>
                            <th>{t.tourDiary.forMonth}</th>
                            <th>Status</th>
                            <th>{t.common.actions}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {claims.map(c => (
                            <tr key={c.id}>
                                <td style={{ fontWeight: 'bold' }}>{c.rendered_claim_id || `#${c.id}`}</td>
                                <td>{c.td_no || '-'}</td>
                                <td>{language === 'hi' && c.employee_name_hi ? c.employee_name_hi : (c.employee_name || getEmployeeName(c.employee_id) || `- (#${c.employee_id})`)}</td>
                                <td>
                                    {c.month && c.year ? `${c.month} ${c.year}` : (c.start_date ? `${months[new Date(c.start_date).getMonth()]} ${new Date(c.start_date).getFullYear()}` : '-')}
                                </td>
                                <td>
                                    <span className={`badge ${c.status === 'SUBMITTED' ? 'badge-success' : ''}`}>
                                        {c.status === 'SUBMITTED' ? t.common.submitted : (c.status === 'Draft' || c.status === 'DRAFT' ? 'Draft' : c.status)}
                                    </span>
                                </td>
                                <td>
                                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                        {(c.status === 'Draft' || c.status === 'DRAFT') && (
                                            <button
                                                className="btn btn-sm btn-primary"
                                                onClick={() => handleSubmitClaim(c)}
                                                style={{ background: '#2563eb' }}
                                                title={language === 'hi' ? 'स्वीकृति हेतु प्रस्तुत करें' : 'Submit for approval'}
                                            >
                                                {language === 'hi' ? 'सबमिट' : 'Submit'}
                                            </button>
                                        )}
                                        <button
                                            className="btn btn-sm btn-outline-info"
                                            onClick={() => navigate(`/claims/${c.id}/tour-diary`)}
                                        >
                                            {language === 'hi' ? 'दौरा डायरी' : 'Tour Diary'}
                                        </button>
                                        <button
                                            className="btn btn-sm btn-outline-primary"
                                            onClick={() => navigate(`/claims/${c.id}`)}
                                        >
                                            {t.common.edit}
                                        </button>
                                        <button
                                            className="btn btn-sm btn-outline-success"
                                            onClick={() => navigate(`/claims/${c.id}/bill`)}
                                            title={language === 'hi' ? 'शासकीय प्रारूप में देयक देखें / प्रिंट करें (फॉर्म 21)' : 'View / Print Form 21 Bill'}
                                        >
                                            {language === 'hi' ? 'देयक प्रिंट (फॉर्म 21)' : 'Print Bill (Form 21)'}
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
                    </tbody>
                </table>
                {!loading && claims.length === 0 && <p style={{ padding: '1rem', textAlign: 'center' }}>{t.claims.noClaims}</p>}
            </div>
        </div>
    );
};

export default TADAClaims;
