import api, { apiRequest } from '../utils/api';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileSpreadsheet, Plus } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { getTranslations } from '../utils/translations';

const TourDiaries = () => {
    const navigate = useNavigate();
    const { language } = useLanguage();
    const t = getTranslations(language);

    const [employees, setEmployees] = useState([]);
    const [selectedEmp, setSelectedEmp] = useState('');
    const [claims, setClaims] = useState([]);
    const [filteredClaims, setFilteredClaims] = useState([]);
    const [monthFilter] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    const fetchAllClaims = async () => {
        try {
            const res = await apiRequest('/api/claims');
            const data = await res.json();
            const diaryClaims = data.filter(c => c.td_no);
            setClaims(diaryClaims);
            setFilteredClaims(diaryClaims);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchClaims = (empId) => {
        apiRequest(`/api/claims/${empId}`)
            .then(res => res.json())
            .then(data => {
                const diaryClaims = data.filter(c => c.td_no);
                setClaims(diaryClaims);
                setFilteredClaims(diaryClaims);
            });
    };

    useEffect(() => {
        apiRequest('/api/employees')
            .then(res => res.json())
            .then(data => {
                setEmployees(data);
            });
    }, []);

    useEffect(() => {
        if (selectedEmp) {
            fetchClaims(selectedEmp);
        } else {
            fetchAllClaims();
        }
    }, [selectedEmp]);

    useEffect(() => {
        let result = claims;
        if (monthFilter) {
            result = result.filter(c => (c.start_date && c.start_date.includes(monthFilter)) || (c.end_date && c.end_date.includes(monthFilter)));
        }
        setFilteredClaims(result);
    }, [monthFilter, claims]);

    const [newMonth, setNewMonth] = useState(new Date().getMonth() + 1);
    const [newYear, setNewYear] = useState(new Date().getFullYear());

    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const handleCreate = async () => {
        if (!selectedEmp) return alert(t.tourDiariesList.selectEmployee);
        if (isCreating) return;

        setIsCreating(true);
        try {
            const res = await apiRequest('/api/claims', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    employee_id: selectedEmp,
                    claim_type: 'TA_DA',
                    is_diary: true,
                    month: months[newMonth - 1],
                    year: newYear.toString(),
                    start_date: `${newYear}-${newMonth.toString().padStart(2, '0')}-01`,
                    end_date: `${newYear}-${newMonth.toString().padStart(2, '0')}-01`,
                    status: 'Draft'
                })
            });
            const data = await res.json();
            navigate(`/claims/${data.id}/tour-diary`);
        } catch (err) {
            console.error(err);
            alert(t.messages.errorSaving);
            setIsCreating(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm(t.tourDiariesList.deleteConfirm)) return;
        try {
            const res = await apiRequest(`/api/claims/${id}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                if (selectedEmp) fetchClaims(selectedEmp);
                else fetchAllClaims();
            } else {
                alert(t.messages.failedToDelete);
            }
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
                alert(language === 'hi' ? 'दौरा डायरी दावा सफलतापूर्वक प्रस्तुत किया गया!' : 'Tour diary claim successfully submitted for approval!');
                if (selectedEmp) fetchClaims(selectedEmp);
                else fetchAllClaims();
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

    return (
        <div className="page-transition">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1>{t.tourDiariesList.title}</h1>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <select
                        className="form-select"
                        style={{ width: '250px' }}
                        value={selectedEmp}
                        onChange={(e) => setSelectedEmp(e.target.value)}
                    >
                        <option value="">{t.tourDiariesList.selectEmployee}...</option>
                        {employees.map(emp => (
                            <option key={emp.id} value={emp.id}>
                                {language === 'hi' && emp.name_hi ? emp.name_hi : emp.name}
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
                        <button className="btn btn-primary btn-sm" onClick={handleCreate} disabled={isCreating}>
                            <Plus size={16} /> {isCreating ? t.common.saving : t.tourDiariesList.newDiary}
                        </button>
                    </div>
                </div>
            </div>

            <div className="card table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>TD No.</th>
                            <th>{t.claims.employee}</th>
                            <th>{t.tourDiary.forMonth}</th>
                            <th>{t.claims.period}</th>
                            <th>Status</th>
                            <th>{t.common.actions}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredClaims.map(c => (
                            <tr key={c.id}>
                                <td style={{ fontWeight: 'bold' }}>{c.td_no || `#${c.id}`}</td>
                                <td>{language === 'hi' && c.employee_name_hi ? c.employee_name_hi : (c.employee_name || getEmployeeName(c.employee_id) || `- (#${c.employee_id})`)}</td>
                                <td>
                                    {c.month && c.year ? `${c.month} ${c.year}` : (c.start_date ? `${months[new Date(c.start_date).getMonth()]} ${new Date(c.start_date).getFullYear()}` : '-')}
                                </td>
                                <td>{c.start_date} {t.bill.to} {c.end_date}</td>
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
                                            className="btn btn-sm btn-outline-success"
                                            onClick={() => navigate(`/claims/${c.id}/bill`)}
                                            title={language === 'hi' ? 'शासकीय प्रारूप में यात्रा देयक देखें / प्रिंट करें (फॉर्म 21)' : 'View / Print Form 21 Bill'}
                                        >
                                            {language === 'hi' ? 'देयक प्रिंट (फॉर्म 21)' : 'Print Bill (Form 21)'}
                                        </button>
                                        <button
                                            className="btn btn-sm btn-outline-primary"
                                            onClick={() => navigate(`/claims/${c.id}/tour-diary`)}
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
                    </tbody>
                </table>
                {filteredClaims.length === 0 && <p style={{ padding: '1rem', textAlign: 'center' }}>{t.tourDiariesList.noDiaries}</p>}
            </div>
        </div>
    );
};

export default TourDiaries;
