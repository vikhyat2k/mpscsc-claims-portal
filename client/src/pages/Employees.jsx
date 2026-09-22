import React, { useState, useEffect } from 'react';
import { UserPlus, Save } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { getTranslations } from '../utils/translations';
import { MP_DISTRICTS_BILINGUAL } from '../utils/mp_districts_bilingual';

const Employees = () => {
    const { language } = useLanguage();
    const t = getTranslations(language);

    const [employees, setEmployees] = useState([]);
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        name_hi: '',
        designation: '',
        category: 'C',
        pay_level: '',
        grade_pay: '',
        basic_pay: '',
        headquarters: ''
    });

    const fetchEmployees = async () => {
        try {
            const res = await fetch(`http://localhost:5000/api/employees?t=${Date.now()}`);
            const data = await res.json();
            setEmployees(data);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchEmployees();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await fetch('http://localhost:5000/api/employees', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            setFormData({ name: '', name_hi: '', designation: '', category: 'C', pay_level: '', grade_pay: '', headquarters: '', basic_pay: '' });
            setIsAdding(false);
            fetchEmployees();
        } catch {
            alert(t.messages.errorSaving);
        }
    };

    const startEdit = (emp) => {
        setEditingId(emp.id);
        setFormData({
            name: emp.name,
            name_hi: emp.name_hi || '',
            designation: emp.designation,
            category: emp.category,
            pay_level: emp.pay_level,
            grade_pay: emp.grade_pay || '',
            basic_pay: emp.basic_pay,
            headquarters: emp.headquarters
        });
    };

    const handleUpdate = async () => {
        try {
            const res = await fetch(`http://localhost:5000/api/employees/${editingId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                setEditingId(null);
                setFormData({ name: '', name_hi: '', designation: '', category: 'C', pay_level: '', grade_pay: '', headquarters: '', basic_pay: '' });
                fetchEmployees();
            } else {
                alert(t.messages.failedToUpdate);
            }
        } catch {
            alert(t.messages.errorUpdating);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm(t.employees.deleteConfirm)) {
            return;
        }
        try {
            const res = await fetch(`http://localhost:5000/api/employees/${id}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                fetchEmployees();
            } else {
                alert(t.messages.failedToDelete);
            }
        } catch {
            alert(t.common.error);
        }
    };

    return (
        <div className="page-transition">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1>{t.employees.title}</h1>
                <button className="btn btn-primary" onClick={() => setIsAdding(!isAdding)}>
                    <UserPlus size={18} /> {isAdding ? t.common.cancel : t.employees.addEmployee}
                </button>
            </div>

            {isAdding && (
                <div className="card">
                    <h3>{t.employees.newEmployee}</h3>
                    <form onSubmit={handleSubmit}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div className="form-group">
                                <label className="form-label">{t.employees.fullName}</label>
                                <input className="form-input" required
                                    value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">{t.employees.fullNameHi}</label>
                                <input className="form-input"
                                    value={formData.name_hi} onChange={e => setFormData({ ...formData, name_hi: e.target.value })} />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div className="form-group">
                                <label className="form-label">{t.employees.designation}</label>
                                <input className="form-input" required
                                    value={formData.designation} onChange={e => setFormData({ ...formData, designation: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">{t.employees.headquarter}</label>
                                <input className="form-input" required list="district-list"
                                    value={formData.headquarters} onChange={e => setFormData({ ...formData, headquarters: e.target.value })} />
                                <datalist id="district-list">
                                    {Object.values(MP_DISTRICTS_BILINGUAL).map(d => (
                                        <option key={d.en} value={language === 'hi' ? d.hi : d.en} />
                                    ))}
                                </datalist>
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">{t.employees.category}</label>
                            <select className="form-select" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                                <option value="A">{t.employees.categoryA}</option>
                                <option value="B">{t.employees.categoryB}</option>
                                <option value="C">{t.employees.categoryC}</option>
                                <option value="D">{t.employees.categoryD}</option>
                                <option value="E">{t.employees.categoryE}</option>
                            </select>
                            <small style={{ color: 'var(--text-secondary)' }}>
                                {t.employees.selectCategory} <strong>{t.employees.categoryDesc[formData.category]}</strong>.
                                {t.employees.determinesTA}
                            </small>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                            <div className="form-group">
                                <label className="form-label">{t.employees.payLevel}</label>
                                <input className="form-input" placeholder="e.g. Level 12" required
                                    value={formData.pay_level} onChange={e => setFormData({ ...formData, pay_level: e.target.value })} />
                            </div>

                            <div className="form-group">
                                <label className="form-label">{t.employees.gradePay}</label>
                                <input className="form-input" placeholder="e.g. 5400"
                                    value={formData.grade_pay} onChange={e => setFormData({ ...formData, grade_pay: e.target.value })} />
                            </div>

                            <div className="form-group">
                                <label className="form-label">{t.employees.basicPay}</label>
                                <input type="number" className="form-input" placeholder="e.g. 56100"
                                    value={formData.basic_pay} onChange={e => setFormData({ ...formData, basic_pay: e.target.value })} />
                            </div>
                        </div>

                        <button className="btn btn-primary" type="submit"><Save size={18} /> {t.common.save}</button>
                    </form>
                </div>
            )}

            <div className="card table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>{t.employees.name}</th>
                            <th>{t.employees.designation}</th>
                            <th>{t.employees.category}</th>
                            <th>{t.employees.payLevelShort}</th>
                            <th>{t.employees.gradePayShort}</th>
                            <th>{t.employees.basicPayShort}</th>
                            <th>{t.employees.headquarter}</th>
                            <th>{t.common.actions}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {employees.map(emp => (
                            <tr key={emp.id}>
                                {editingId === emp.id ? (
                                    // Edit Mode
                                    <>
                                        <td>
                                            <input className="form-input" style={{ width: '100%', marginBottom: '4px' }} placeholder="English" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                                            <input className="form-input" style={{ width: '100%' }} placeholder="Hindi" value={formData.name_hi} onChange={e => setFormData({ ...formData, name_hi: e.target.value })} />
                                        </td>
                                        <td><input className="form-input" style={{ width: '100%' }} value={formData.designation} onChange={e => setFormData({ ...formData, designation: e.target.value })} /></td>
                                        <td>
                                            <select className="form-select" style={{ width: '100%' }} value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                                                <option value="A">A</option>
                                                <option value="B">B</option>
                                                <option value="C">C</option>
                                                <option value="D">D</option>
                                                <option value="E">E</option>
                                            </select>
                                        </td>
                                        <td><input className="form-input" style={{ width: '100%' }} value={formData.pay_level} onChange={e => setFormData({ ...formData, pay_level: e.target.value })} /></td>
                                        <td><input className="form-input" style={{ width: '100%' }} placeholder="e.g. 5400" value={formData.grade_pay} onChange={e => setFormData({ ...formData, grade_pay: e.target.value })} /></td>
                                        <td><input type="number" className="form-input" style={{ width: '100%' }} value={formData.basic_pay} onChange={e => setFormData({ ...formData, basic_pay: e.target.value })} /></td>
                                        <td>
                                            <input className="form-input" style={{ width: '100%' }} list="district-list"
                                                value={formData.headquarters} onChange={e => setFormData({ ...formData, headquarters: e.target.value })} />
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                                <button className="btn btn-sm btn-primary" onClick={handleUpdate}>{t.common.save}</button>
                                                <button className="btn btn-sm btn-secondary" onClick={() => setEditingId(null)}>{t.common.cancel}</button>
                                            </div>
                                        </td>
                                    </>
                                ) : (
                                    // View Mode
                                    <>
                                        <td>
                                            <div style={{ fontWeight: '600' }}>{emp.name}</div>
                                            {emp.name_hi && <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{emp.name_hi}</div>}
                                        </td>
                                        <td>{emp.designation}</td>
                                        <td><span style={{ fontWeight: 'bold', color: 'var(--primary-color)' }}>{emp.category}</span></td>
                                        <td>{emp.pay_level}</td>
                                        <td>{emp.grade_pay || '—'}</td>
                                        <td>{emp.basic_pay}</td>
                                        <td>{emp.headquarters}</td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                                <button className="btn btn-sm btn-outline-primary" onClick={() => startEdit(emp)}>{t.common.edit}</button>
                                                <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(emp.id)}>{t.common.delete}</button>
                                            </div>
                                        </td>
                                    </>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
                {employees.length === 0 && <p style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{t.employees.noEmployees}</p>}
            </div>
        </div>
    );
};

export default Employees;
