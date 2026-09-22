import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, ArrowLeft } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { getTranslations } from '../utils/translations';

const MedicalClaims = () => {
    const { language } = useLanguage();
    const t = getTranslations(language);
    const navigate = useNavigate();

    const [employees, setEmployees] = useState([]);
    const [selectedEmp, setSelectedEmp] = useState('all');
    const [claims, setClaims] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);

    // Family Master State
    const [showFamily, setShowFamily] = useState(false);
    const [family, setFamily] = useState([]);
    const [newMember, setNewMember] = useState({ name: '', relationship: '', dob: '' });
    const [familyLoading, setFamilyLoading] = useState(false);

    const fetchFamily = (empId) => {
        if (!empId || empId === 'all') {
            setFamily([]);
            return;
        }
        setFamilyLoading(true);
        fetch(`http://localhost:5000/api/employees/${empId}/family`)
            .then(res => res.json())
            .then(data => setFamily(data))
            .finally(() => setFamilyLoading(false));
    };

    const handleAddFamily = async () => {
        if (!newMember.name || !selectedEmp || selectedEmp === 'all') return;
        try {
            await fetch('http://localhost:5000/api/family', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...newMember, employee_id: selectedEmp })
            });
            setNewMember({ name: '', relationship: '', dob: '' });
            fetchFamily(selectedEmp);
        } catch (err) { console.error(err); }
    };

    const handleDeleteFamily = async (id) => {
        if (!window.confirm(t.medical.removeMember || "Remove family member?")) return;
        try {
            await fetch(`http://localhost:5000/api/family/${id}`, { method: 'DELETE' });
            fetchFamily(selectedEmp);
        } catch (err) { console.error(err); }
    };

    const fetchClaims = (empId) => {
        setLoading(true);
        const url = empId && empId !== 'all'
            ? `http://localhost:5000/api/claims/${empId}`
            : `http://localhost:5000/api/claims`;
        fetch(url)
            .then(res => res.json())
            .then(data => {
                setClaims(data.filter(c => c.claim_type === 'MEDICAL'));
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    };

    useEffect(() => {
        fetch('http://localhost:5000/api/employees')
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
            if (showFamily) fetchFamily(selectedEmp);
        }
    }, [selectedEmp, showFamily]);

    const handleCreate = async () => {
        if (isCreating) return;
        if (selectedEmp === 'all' || !selectedEmp) {
            alert(language === 'hi' ? 'कृपया नया दावा बनाने के लिए सूची से एक कर्मचारी चुनें।' : 'Please select a specific employee from the dropdown to create a claim.');
            return;
        }

        setIsCreating(true);
        try {
            const now = new Date();
            const emp = employees.find(e => e.id === parseInt(selectedEmp));
            let initialPayScale = '';
            if (emp) {
                if (emp.pay_level && emp.grade_pay) initialPayScale = `${emp.pay_level} / GP ${emp.grade_pay}`;
                else if (emp.pay_level) initialPayScale = emp.pay_level;
                else if (emp.grade_pay) initialPayScale = `GP ${emp.grade_pay}`;
            }

            const res = await fetch('http://localhost:5000/api/medical-claims', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    employee_id: selectedEmp,
                    patient_name: '',
                    relationship: '',
                    is_regular: 'Regular',
                    pay_scale: initialPayScale,
                    child_sl_no_dob: '',
                    illness_duration: '',
                    total_enclosures: '',
                    bills: [],
                    start_date: now.toISOString().split('T')[0],
                    end_date: now.toISOString().split('T')[0],
                    remarks: '',
                    status: 'Draft'
                })
            });
            const data = await res.json();
            if (data.id) {
                navigate(`/medical-claims/${data.id}`);
            }
        } catch (err) {
            console.error(err);
            setIsCreating(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm(t.tourDiariesList.deleteConfirm)) return;
        try {
            const res = await fetch(`http://localhost:5000/api/claims/${id}`, {
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
            const res = await fetch(`http://localhost:5000/api/claims/${claim.id}/submit`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ total_amount: claim.total_amount || 0 })
            });
            if (res.ok) {
                alert(language === 'hi' ? 'चिकित्सा दावा सफलतापूर्वक स्वीकृति हेतु प्रस्तुत किया गया!' : 'Medical claim successfully submitted for approval!');
                fetchClaims(selectedEmp);
            } else {
                alert(t.messages.errorSaving);
            }
        } catch (err) {
            console.error(err);
            alert(t.messages.errorSaving);
        }
    };


    if (loading && employees.length === 0) return <div>{t.common.loading}</div>;

    return (
        <div className="page-transition">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => navigate('/')}>
                        <ArrowLeft size={16} />
                    </button>
                    <h1>{t.nav.medicalClaims}</h1>
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
                    <button
                        className={`btn ${showFamily ? 'btn-secondary' : 'btn-outline-primary'}`}
                        disabled={selectedEmp === 'all'}
                        title={selectedEmp === 'all' ? (language === 'hi' ? 'परिवार सूची के लिए एक कर्मचारी चुनें' : 'Select an employee to manage family') : ''}
                        onClick={() => setShowFamily(!showFamily)}
                    >
                        {t.medical.familyMaster}
                    </button>
                    <button className="btn btn-primary" onClick={handleCreate} disabled={isCreating}>
                        <PlusCircle size={18} /> {isCreating ? t.common.saving : t.medical.newClaim}
                    </button>
                </div>
            </div>

            <datalist id="rel-list">
                <option value="Wife" />
                <option value="Husband" />
                <option value="Son" />
                <option value="Daughter" />
                <option value="Father" />
                <option value="Mother" />
            </datalist>

            {showFamily && (
                <div className="card" style={{ marginBottom: '2rem', padding: '1.5rem', border: '2px solid var(--primary-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h3>{t.medical.manageFamily}</h3>
                        <button className="btn btn-sm btn-outline-secondary" onClick={() => setShowFamily(false)}>{t.common.close}</button>
                    </div>
                    {familyLoading ? <p>{t.common.loading}</p> : (
                        <table className="data-table" style={{ marginBottom: '1.5rem' }}>
                            <thead>
                                <tr>
                                    <th>{t.employees.name}</th>
                                    <th>{t.medical.relationship}</th>
                                    <th>{t.medical.dob}</th>
                                    <th>{t.common.actions}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {family.map(f => (
                                    <tr key={f.id}>
                                        <td>{f.name}</td>
                                        <td>{f.relationship}</td>
                                        <td>{f.dob}</td>
                                        <td>
                                            <button className="btn btn-sm btn-outline-danger" onClick={() => handleDeleteFamily(f.id)}>
                                                {t.common.delete}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                <tr>
                                    <td><input className="form-input small" placeholder={t.employees.name} value={newMember.name} onChange={e => setNewMember({ ...newMember, name: e.target.value })} /></td>
                                    <td><input className="form-input small" list="rel-list" placeholder={t.medical.relationship} value={newMember.relationship} onChange={e => setNewMember({ ...newMember, relationship: e.target.value })} /></td>
                                    <td><input type="date" className="form-input small" value={newMember.dob} onChange={e => setNewMember({ ...newMember, dob: e.target.value })} /></td>
                                    <td>
                                        <button className="btn btn-sm btn-primary" onClick={handleAddFamily}>
                                            <PlusCircle size={14} /> {t.common.add}
                                        </button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            <div className="card table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>{t.reports.table.claimId}</th>
                            <th>{t.reports.table.employee}</th>
                            <th>{t.medical.patientName}</th>
                            <th>{t.tourDiary.date}</th>
                            <th>{t.reports.table.status}</th>
                            <th>{t.common.actions}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {claims.map(c => (
                            <tr key={c.id}>
                                <td style={{ fontWeight: 'bold' }}>{c.rendered_claim_id || `#${c.id}`}</td>
                                <td>{language === 'hi' && c.employee_name_hi ? c.employee_name_hi : c.employee_name}</td>
                                <td>{c.patient_name || '-'}</td>
                                <td>{new Date(c.created_at).toLocaleDateString()}</td>
                                <td>
                                    <span className={`badge ${c.status === 'SUBMITTED' ? 'badge-success' : ''}`}>
                                        {c.status === 'SUBMITTED' ? t.common.submitted : (c.status === 'Draft' ? 'Draft' : c.status)}
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
                                            onClick={() => navigate(`/medical-claims/${c.id}`)}
                                        >
                                            {t.common.edit}
                                        </button>
                                        <button
                                            className="btn btn-sm btn-outline-success"
                                            onClick={() => navigate(`/medical-claims/${c.id}?print=1`)}
                                            title={language === 'hi' ? 'शासकीय प्रारूप में आवेदन पत्र / देयक प्रिंट करें' : 'Print Application Form / Bill in Govt Prescribed Format'}
                                        >
                                            {language === 'hi' ? 'आवेदन एवं देयक प्रिंट' : 'Print Form & Bill'}
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

export default MedicalClaims;
