import api, { apiRequest } from '../utils/api';
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PlusCircle } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { getTranslations } from '../utils/translations';

const Claims = () => {
    const { language } = useLanguage();
    const t = getTranslations(language);

    const [employees, setEmployees] = useState([]);
    const [selectedEmp, setSelectedEmp] = useState('all');
    const [claims, setClaims] = useState([]);
    const [isCreating, setIsCreating] = useState(false);
    const [isEditingRemarks, setIsEditingRemarks] = useState(false);
    const [editingClaim, setEditingClaim] = useState(null);
    const [tempRemarks, setTempRemarks] = useState('');
    const navigate = useNavigate();

    const fetchClaims = (empId) => {
        const url = empId && empId !== 'all'
            ? `/api/claims/${empId}?t=${Date.now()}`
            : `/api/claims?t=${Date.now()}`;
        apiRequest(url)
            .then(res => res.json())
            .then(data => setClaims(data))
            .catch(err => console.error(err));
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

    const handleCreate = async () => {
        if (isCreating) return;
        if (selectedEmp === 'all' || !selectedEmp) {
            alert(language === 'hi' ? 'कृपया नया दावा बनाने के लिए सूची से एक कर्मचारी चुनें।' : 'Please select a specific employee from the dropdown to create a claim.');
            return;
        }

        setIsCreating(true);
        try {
            const now = new Date();
            const months = [
                "January", "February", "March", "April", "May", "June",
                "July", "August", "September", "October", "November", "December"
            ];

            const res = await apiRequest('/api/claims', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    employee_id: selectedEmp,
                    claim_type: 'TA_DA',
                    month: months[now.getMonth()],
                    year: now.getFullYear().toString(),
                    start_date: now.toISOString().split('T')[0],
                    end_date: now.toISOString().split('T')[0],
                    status: 'Draft'
                })
            });
            const data = await res.json();
            if (data.claim_type === 'TRANSFER') {
                navigate(`/claims/transfer/${data.id}`);
            } else {
                navigate(`/claims/${data.id}`);
            }
        } catch (err) {
            console.error(err);
            setIsCreating(false);
        }
    };

    const handleUpdateRemarks = async () => {
        if (!editingClaim) return;
        try {
            const res = await apiRequest(`/api/claims/${editingClaim.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...editingClaim,
                    remarks: tempRemarks
                })
            });
            if (res.ok) {
                fetchClaims(selectedEmp);
                setIsEditingRemarks(false);
            } else {
                alert(t.messages.failedToUpdate);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm(t.tourDiariesList.deleteConfirm)) return;
        try {
            const res = await apiRequest(`/api/claims/${id}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                fetchClaims(selectedEmp);
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


    return (
        <div className="page-transition">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1>{t.claims.title}</h1>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <select className="form-select" style={{ width: '300px' }}
                        value={selectedEmp} onChange={e => setSelectedEmp(e.target.value)}>
                        <option value="all">{language === 'hi' ? 'सभी कर्मचारी (All Employees)' : 'All Employees'}</option>
                        {employees.map(e => (
                            <option key={e.id} value={e.id}>
                                {language === 'hi' && e.name_hi ? e.name_hi : e.name} ({e.designation})
                            </option>
                        ))}
                    </select>
                    <button className="btn btn-primary" onClick={handleCreate} disabled={!selectedEmp || isCreating}>
                        <PlusCircle size={18} /> {isCreating ? t.common.saving : t.claims.newClaim}
                    </button>
                </div>
            </div>

            <div className="card table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Ref ID</th>
                            <th>{t.claims.type}</th>
                            <th>{t.tourDiary.date}</th>
                            <th>{t.claims.period}</th>
                            <th>{t.bill21.remarks}</th>
                            <th>Status</th>
                            <th>{t.common.actions}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {claims.map(c => (
                            <tr key={c.id}>
                                <td style={{ fontWeight: 'bold' }}>{c.rendered_claim_id || `#${c.id}`}</td>
                                <td>{c.claim_type === 'TA_DA' ? (language === 'hi' ? 'टीए/डीए दावा' : 'TA/DA Claim') : (c.claim_type === 'TRANSFER' ? t.claims.transfer : (c.claim_type === 'MEDICAL' ? t.claims.medical : c.claim_type))}</td>
                                <td>{new Date(c.created_at).toLocaleDateString(language === 'hi' ? 'hi-IN' : 'en-US')}</td>
                                <td>{c.start_date} {t.bill.to} {c.end_date}</td>
                                <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    <span
                                        style={{ cursor: 'pointer', color: 'var(--primary-color)', textDecoration: 'underline' }}
                                        onClick={() => {
                                            setEditingClaim(c);
                                            setTempRemarks(c.remarks || '');
                                            setIsEditingRemarks(true);
                                        }}
                                    >
                                        {c.remarks || 'Add Remark'}
                                    </span>
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
                                            className="btn btn-sm btn-outline-primary"
                                            onClick={() => {
                                                if (c.claim_type === 'TRANSFER') navigate(`/claims/transfer/${c.id}`);
                                                else if (c.claim_type === 'MEDICAL') navigate(`/medical-claims/${c.id}`);
                                                else if (c.is_diary === 1) navigate(`/claims/${c.id}/tour-diary`);
                                                else navigate(`/claims/${c.id}`);
                                            }}
                                        >
                                            {t.common.edit}
                                        </button>
                                        {(c.claim_type === 'TA_DA' || c.claim_type === 'TRANSFER') && (
                                            <button
                                                className="btn btn-sm btn-outline-info"
                                                onClick={() => navigate(`/claims/${c.id}/tour-diary`)}
                                            >
                                                {language === 'hi' ? 'दौरा डायरी' : 'Tour Diary'}
                                            </button>
                                        )}
                                        {c.claim_type !== 'MEDICAL' ? (
                                            <button
                                                className="btn btn-sm btn-outline-success"
                                                onClick={() => navigate(`/claims/${c.id}/bill`)}
                                                title={language === 'hi' ? 'शासकीय प्रारूप में देयक देखें / प्रिंट करें (फॉर्म 21)' : 'View / Print Form 21 Bill'}
                                            >
                                                {language === 'hi' ? 'देयक प्रिंट (फॉर्म 21)' : 'Print Bill (Form 21)'}
                                            </button>
                                        ) : (
                                            <button
                                                className="btn btn-sm btn-outline-success"
                                                onClick={() => navigate(`/medical-claims/${c.id}?print=1`)}
                                                title={language === 'hi' ? 'शासकीय प्रारूप में आवेदन पत्र / देयक प्रिंट करें' : 'Print Application Form / Bill in Govt Prescribed Format'}
                                            >
                                                {language === 'hi' ? 'आवेदन एवं देयक प्रिंट' : 'Print Form & Bill'}
                                            </button>
                                        )}
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
                {claims.length === 0 && <p style={{ padding: '1rem', textAlign: 'center' }}>{t.claims.noClaims}</p>}
                {isEditingRemarks && (
                    <div className="modal-overlay">
                        <div className="modal-content" style={{ maxWidth: '500px' }}>
                            <h3>{language === 'hi' ? 'विशेष अपडेट करें' : 'Update Remarks'}</h3>
                            <div className="form-group">
                                <label className="form-label">{t.bill21.remarks}</label>
                                <textarea
                                    className="form-input"
                                    rows="4"
                                    value={tempRemarks}
                                    onChange={e => setTempRemarks(e.target.value)}
                                    placeholder="Enter claim remarks..."
                                />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                                <button className="btn btn-secondary" onClick={() => setIsEditingRemarks(false)}>{t.common.cancel}</button>
                                <button className="btn btn-primary" onClick={handleUpdateRemarks}>{t.common.save}</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Claims;
