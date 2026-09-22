import api, { apiRequest } from '../utils/api';
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Save, Plus, Trash, Printer, ArrowLeft, Send, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { getTranslations } from '../utils/translations';

const TransferClaim = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { search } = useLocation();
    const isReadOnly = new URLSearchParams(search).get('view') === 'true';
    const { language } = useLanguage();
    const t = getTranslations(language);

    const [claim, setClaim] = useState(null);
    const [employee, setEmployee] = useState(null);
    const [journeys, setJourneys] = useState([]);
    const [loading, setLoading] = useState(true);
    const [totals, setTotals] = useState({ fare: 0, totalDA: 0, totalStayAllowance: 0, totalTransport: 0, totalPacking: 0, totalLocalTransport: 0, transferGrant: 0, grandTotal: 0 });
    const [isDirty, setIsDirty] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);


    // Transfer specific details
    const [familyMembers, setFamilyMembers] = useState('');
    const [baggageWeight, setBaggageWeight] = useState('');
    const [packingCharges, setPackingCharges] = useState(0);
    const [goodsTransportCharges, setGoodsTransportCharges] = useState(0);

    // Hotel/Stay details
    const [hotelStayType, setHotelStayType] = useState('None');
    const [hotelAmount, setHotelAmount] = useState(0);
    const [advanceAmount, setAdvanceAmount] = useState(0);

    // Fetch the authoritative totals from the server (same engine used when saving).
    // This ensures the preview ALWAYS matches what is stored in claims.total_amount.
    const fetchLiveTotals = async () => {
        try {
            const res = await apiRequest(`/api/calculate-bill/${id}`);
            if (!res.ok) return;
            const data = await res.json();
            const t = data.totals || {};
            setTotals({
                fare:               t.totalFare          || 0,
                totalDA:            t.totalDA            || 0,
                totalStayAllowance: t.totalStayAllowance || 0,
                totalTransport:     t.totalTransport     || 0,
                totalPacking:       t.totalPacking       || 0,
                totalLocalTransport: t.totalLocalTransport || 0,
                transferGrant:       t.transferGrant       || 0,
                grandTotal:         t.grandTotal         || 0,
            });
        } catch (err) {
            console.error('fetchLiveTotals error:', err);
        }
    };

    const fetchData = async () => {
        try {
            const res = await apiRequest(`/api/claim-details/${id}`);
            const data = await res.json();
            setClaim(data.claim);
            setJourneys(data.journeys);
            setFamilyMembers(data.claim.family_details || '');
            setBaggageWeight(data.claim.baggage_weight || '');
            setPackingCharges(data.claim.packing_charges || 0);
            setGoodsTransportCharges(data.claim.goods_transport_charges || 0);
            setHotelStayType(data.claim.hotel_stay_type || 'None');
            setHotelAmount(data.claim.hotel_amount || 0);
            setAdvanceAmount(data.claim.advance_amount || 0);

            const empRes = await apiRequest('/api/employees');
            const emps = await empRes.json();
            const emp = emps.find(e => e.id === data.claim.employee_id);
            setEmployee(emp);
            setLoading(false);
            setIsDirty(false);
            // Pull authoritative totals from server after state is populated
            await fetchLiveTotals();
        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [id]);

    // Mark as dirty whenever the user changes any field that affects the total,
    // so we can show the "unsaved changes" banner.
    useEffect(() => {
        if (!loading) setIsDirty(true);
    }, [hotelStayType, hotelAmount, advanceAmount, packingCharges, goodsTransportCharges, journeys]);

    const [availableJourneys, setAvailableJourneys] = useState([]);
    const [showImportModal, setShowImportModal] = useState(false);

    const fetchAvailable = async () => {
        if (!claim?.employee_id) return;
        const res = await apiRequest(`/api/claims/${claim.employee_id}`);
        const data = await res.json();
        setAvailableJourneys(data.filter(c => c.id !== parseInt(id)));
        setShowImportModal(true);
    };

    const handleImportFromClaim = async (sourceClaimId) => {
        try {
            const res = await apiRequest(`/api/claim-details/${sourceClaimId}`);
            const data = await res.json();
            // Import journeys from the source claim
            setJourneys([...journeys, ...data.journeys.map(j => ({ ...j, id: undefined, claim_id: id }))]);
            setShowImportModal(false);
        } catch (err) {
            console.error(err);
        }
    };

    const saveClaims = async () => {
        if (claim?.status === 'SUBMITTED') {
            alert("Cannot edit submitted claim.");
            return;
        }
        try {
            const res = await apiRequest('/api/journey-details-bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    claim_id: id,
                    journeys: journeys,
                    family_details: familyMembers,
                    baggage_weight: baggageWeight,
                    packing_charges: packingCharges,
                    goods_transport_charges: goodsTransportCharges,
                    hotel_stay_type: hotelStayType,
                    hotel_amount: parseFloat(hotelAmount) || 0,
                    advance_amount: parseFloat(advanceAmount) || 0,
                    month: claim.month,
                    year: claim.year,
                    declaration_date: claim.declaration_date,
                    remarks: claim.remarks,
                    status: 'Draft'
                })
            });

            if (res.ok) {
                alert(t.messages.dataSaved);
                // fetchData re-fetches from server and calls fetchLiveTotals(),
                // so the displayed total will exactly match claims.total_amount.
                await fetchData();
            } else {
                alert(t.messages.errorSaving);
            }
        } catch {
            alert(t.common.error);
        }
    };

    const removeJourney = (indexToRemove) => {
        if (!window.confirm(t.tourDiariesList.deleteConfirm)) return;
        const updated = journeys.filter((_, i) => i !== indexToRemove);
        setJourneys(updated);
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

    const handleSubmit = async () => {
        if (!window.confirm(t.common.confirmSubmit)) return;
        setIsSubmitting(true);
        try {
            // Save current changes first
            await apiRequest('/api/journey-details-bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    claim_id: id,
                    journeys: journeys,
                    family_details: familyMembers,
                    baggage_weight: baggageWeight,
                    packing_charges: packingCharges,
                    goods_transport_charges: goodsTransportCharges,
                    hotel_stay_type: hotelStayType,
                    hotel_amount: parseFloat(hotelAmount) || 0,
                    advance_amount: parseFloat(advanceAmount) || 0,
                    month: claim.month,
                    year: claim.year,
                    declaration_date: claim.declaration_date,
                    remarks: claim.remarks,
                    status: 'Draft'
                })
            });

            // Submit claim
            const res = await apiRequest(`/api/claims/${id}/submit`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ total_amount: totals.grandTotal })
            });

            if (res.ok) {
                alert(language === 'hi' ? 'à¤¸à¥à¤¥à¤¾à¤¨à¤¾à¤‚à¤¤à¤°à¤£ à¤¦à¤¾à¤µà¤¾ à¤¸à¤«à¤²à¤¤à¤¾à¤ªà¥‚à¤°à¥à¤µà¤• à¤¸à¥à¤µà¥€à¤•à¥ƒà¤¤à¤¿ à¤¹à¥‡à¤¤à¥ à¤ªà¥à¤°à¤¸à¥à¤¤à¥à¤¤ à¤•à¤¿à¤¯à¤¾ à¤—à¤¯à¤¾!' : 'Transfer claim successfully submitted for approval!');
                setClaim(prev => ({ ...prev, status: 'SUBMITTED' }));
                fetchData();
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

    if (loading) return <div>{t.common.loading}</div>;

    const empName = language === 'hi' && employee?.name_hi ? employee.name_hi : employee?.name;
    const isSubmitted = claim?.status === 'SUBMITTED' || claim?.status === 'APPROVED';

    return (
        <div className="page-transition">
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <button className="btn btn-secondary" onClick={() => navigate(-1)}>
                    <ArrowLeft size={18} /> {t.common.back}
                </button>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => navigate(`/claims/${id}/bill`)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                        title={language === 'hi' ? 'à¤¶à¤¾à¤¸à¤•à¥€à¤¯ à¤ªà¥à¤°à¤¾à¤°à¥‚à¤ª à¤®à¥‡à¤‚ à¤¸à¥à¤¥à¤¾à¤¨à¤¾à¤‚à¤¤à¤°à¤£ à¤¦à¥‡à¤¯à¤• (à¤«à¥‰à¤°à¥à¤® 21) à¤¦à¥‡à¤–à¥‡à¤‚ / à¤ªà¥à¤°à¤¿à¤‚à¤Ÿ à¤•à¤°à¥‡à¤‚' : 'View / Print Transfer Form 21 Bill'}
                    >
                        <Printer size={18} /> {language === 'hi' ? 'à¤¸à¥à¤¥à¤¾à¤¨à¤¾à¤‚à¤¤à¤°à¤£ à¤¦à¥‡à¤¯à¤• à¤ªà¥à¤°à¤¿à¤‚à¤Ÿ (à¤«à¥‰à¤°à¥à¤® 21)' : 'Print Transfer Bill (Form 21)'}
                    </button>
                    {!isReadOnly && !isSubmitted && (
                        <button className="btn btn-primary" onClick={saveClaims}>
                            <Save size={18} /> {t.common.save}
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
                        <Trash size={18} /> {t.common.delete}
                    </button>
                </div>
            </div>


            <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem', position: 'relative' }}>
                <h2 style={{ marginBottom: '1.5rem', color: 'var(--primary-color)' }}>{t.claims.transfer} {t.claims.title}</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '1.5rem' }}>
                    <div><strong>{t.employees.name}:</strong> {empName}</div>
                    <div><strong>{t.employees.designation}:</strong> {employee?.designation}</div>
                    <div><strong>{t.employees.category}:</strong> {employee?.category}</div>
                    <div><strong>{t.employees.headquarter}:</strong> {employee?.headquarters}</div>
                </div>

                <div style={{ borderTop: '1px solid #eee', paddingTop: '1rem', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                    <div className="form-group">
                        <label className="form-label">{t.tourDiary.forMonth}</label>
                        <select className="form-select" value={claim?.month || ''} onChange={e => setClaim({ ...claim, month: e.target.value })} disabled={isReadOnly}>
                            {t.tourDiary.months.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">{t.tourDiary.forYear}</label>
                        <select className="form-select" value={claim?.year || ''} onChange={e => setClaim({ ...claim, year: e.target.value })} disabled={isReadOnly}>
                            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y.toString()}>{y}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">{t.tourDiary.declarationDate}</label>
                        <input type="date" className="form-input" value={claim?.declaration_date || ''} onChange={e => setClaim({ ...claim, declaration_date: e.target.value })} disabled={isReadOnly} />
                    </div>
                </div>
                <div style={{ borderTop: '1px solid #eee', paddingTop: '1.5rem', marginTop: '1.5rem' }}>
                    <h4 style={{ marginBottom: '1rem' }}>{t.bill21.transferDetails}</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                        <div className="form-group">
                            <label className="form-label">{t.transfer.familyDetails}</label>
                            <textarea className="form-input" rows="3" value={familyMembers} onChange={(e) => setFamilyMembers(e.target.value)} placeholder="e.g. Wife (35), Son (10), Daughter (8)" disabled={isReadOnly} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">{t.bill21.remarks}</label>
                            <textarea className="form-input" rows="3" placeholder="Any other details..." value={claim?.remarks || ''} onChange={(e) => setClaim({ ...claim, remarks: e.target.value })} disabled={isReadOnly} />
                        </div>
                    </div>

                    <div className="glass-control-bar" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', padding: '1rem', borderRadius: '10px', marginBottom: '1.5rem' }}>
                        <div className="form-group">
                            <label className="form-label">{t.tourDiary.stayType || 'Stay Type'}</label>
                            <select className="form-select" value={hotelStayType} onChange={e => setHotelStayType(e.target.value)} disabled={isReadOnly}>
                                <option value="None">None (N/A)</option>
                                <option value="Hotel">Hotel / Guest House</option>
                                <option value="Friends">Stay with Friends / Relatives</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">{t.tourDiary.stayAmount || 'Hotel/Stay Amount'} (â‚¹)</label>
                            <input type="number" className="form-input" value={hotelAmount} onChange={e => setHotelAmount(e.target.value)} disabled={hotelStayType === 'None' || isReadOnly} />
                        </div>
                        <div className="form-group" style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', background: 'rgba(240, 253, 244, 0.65)', backdropFilter: 'blur(8px)', padding: '0.75rem', borderRadius: '8px', border: '1px dashed #4ade80' }}>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: '#166534' }}>
                                <strong>Guidance:</strong><br />
                                {hotelStayType === 'Friends' ? (
                                    `Fixed Entitlement: â‚¹${{ A: 750, B: 660, C: 550, D: 450, E: 370 }[(employee?.category?.match(/[ABCDE]/i)?.[0] || 'E').toUpperCase()]} / day`
                                ) : hotelStayType === 'Hotel' ? (
                                    `Max Entitlement: â‚¹${{ A: 7400, B: 5500, C: 3700, D: 2000, E: 1000 }[(employee?.category?.match(/[ABCDE]/i)?.[0] || 'E').toUpperCase()]} (Metros)`
                                ) : 'Select stay type to see rates.'}
                            </p>
                        </div>
                    </div>

                    <div className="glass-control-bar" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', padding: '1rem', borderRadius: '10px' }}>
                        <div className="form-group">
                            <label className="form-label">{t.transfer.personalEffects}</label>
                            <input type="number" className="form-input" value={baggageWeight} onChange={(e) => setBaggageWeight(e.target.value)} placeholder="Weight in Kg" disabled={isReadOnly} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">{t.transfer.transportGoods}</label>
                            <input type="number" className="form-input" value={goodsTransportCharges} onChange={(e) => setGoodsTransportCharges(e.target.value)} placeholder="â‚¹ Amount" disabled={isReadOnly} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">{t.transfer.packingLoading}</label>
                            <input type="number" className="form-input" value={packingCharges} onChange={(e) => setPackingCharges(e.target.value)} placeholder="â‚¹ Amount" disabled={isReadOnly} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">{language === 'hi' ? 'à¤…à¤—à¥à¤°à¤¿à¤® à¤°à¤¾à¤¶à¤¿ (â‚¹)' : 'Advance Amount (â‚¹)'}</label>
                            <input type="number" className="form-input" value={advanceAmount} onChange={(e) => setAdvanceAmount(e.target.value)} placeholder="â‚¹ Amount" disabled={isReadOnly} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="card table-container">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h4>{t.transfer.linkedJourneys}</h4>
                    {!isReadOnly && (
                        <button className="btn btn-success btn-sm no-print" onClick={fetchAvailable}>
                            <Plus size={16} /> {t.transfer.importTA}
                        </button>
                    )}
                </div>

                <table className="data-table">
                    <thead>
                        <tr>
                            <th>{t.tourDiary.departure}</th>
                            <th>{t.tourDiary.arrival}</th>
                            <th>{t.tourDiary.mode}</th>
                            <th>{t.tourDiary.purpose}</th>
                            <th>{t.bill.actualFare}</th>
                            {!isReadOnly && <th>{t.tourDiary.action}</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {journeys.map((j, i) => (
                            <tr key={i}>
                                <td>{j.departure_date} {j.departure_time} - {j.departure_station}</td>
                                <td>{j.arrival_date} {j.arrival_time} - {j.arrival_station}</td>
                                <td>{j.mode} ({j.class_of_travel})</td>
                                <td>{j.purpose}</td>
                                <td>â‚¹{j.fare_amount}</td>
                                {!isReadOnly && (
                                    <td>
                                        <button className="btn btn-sm btn-outline-danger" onClick={() => removeJourney(i)}>{t.common.delete}</button>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
                {journeys.length === 0 && <p style={{ textAlign: 'center', padding: '1rem' }}>{t.transfer.noJourneys}</p>}
            </div>

            {/* Unsaved-changes banner */}
            {isDirty && (
                <div style={{
                    background: '#fffbeb', border: '1px solid #f59e0b', borderRadius: '8px',
                    padding: '0.6rem 1rem', marginBottom: '0.5rem',
                    display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#92400e'
                }}>
                    <span>âš ï¸</span>
                    <span>You have unsaved changes. The totals below reflect the <strong>last saved</strong> state. Click <strong>Save</strong> to update.</span>
                </div>
            )}

            <div className="card">
                <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem', marginBottom: '0.75rem' }}>
                    <h4 style={{ margin: 0, color: 'var(--primary-color)', fontSize: '1rem' }}>Bill Summary (Saved)</h4>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '1rem', textAlign: 'center', marginBottom: '0.75rem' }}>
                    <div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>{t.bill.actualFare}</div>
                        <div style={{ fontWeight: 600 }}>â‚¹{totals.fare.toLocaleString('en-IN')}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Daily Allowance</div>
                        <div style={{ fontWeight: 600 }}>â‚¹{totals.totalDA.toLocaleString('en-IN')}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Stay Allowance</div>
                        <div style={{ fontWeight: 600 }}>â‚¹{totals.totalStayAllowance.toLocaleString('en-IN')}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Packing</div>
                        <div style={{ fontWeight: 600 }}>â‚¹{totals.totalPacking.toLocaleString('en-IN')}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Transport</div>
                        <div style={{ fontWeight: 600 }}>â‚¹{totals.totalTransport.toLocaleString('en-IN')}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Local Transport</div>
                        <div style={{ fontWeight: 600 }}>â‚¹{totals.totalLocalTransport.toLocaleString('en-IN')}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Transfer Grant</div>
                        <div style={{ fontWeight: 600 }}>â‚¹{totals.transferGrant.toLocaleString('en-IN')}</div>
                    </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '2px solid var(--primary-color)', paddingTop: '0.75rem' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '1.3rem', color: 'var(--primary-color)' }}>
                        {t.bill.totalAmount}: â‚¹{totals.grandTotal.toLocaleString('en-IN')}
                    </div>
                </div>
            </div>

            {showImportModal && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '800px', width: '90%' }}>
                        <h3>{t.transfer.importModalTitle}</h3>
                        <p>{t.transfer.importFor} {empName}</p>
                        <div style={{ maxHeight: '400px', overflowY: 'auto', marginBottom: '1rem' }}>
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>{t.common.search}</th>
                                        <th>{t.claims.period}</th>
                                        <th>{t.reports.table.claimId} / TD No</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {availableJourneys.filter(c => c.claim_type === 'TA_DA').map(c => (
                                        <tr key={c.id}>
                                            <td>
                                                <button className="btn btn-sm btn-primary" onClick={() => handleImportFromClaim(c.id)}>{language === 'hi' ? 'à¤†à¤¯à¤¾à¤¤ à¤•à¤°à¥‡à¤‚' : 'Import'}</button>
                                            </td>
                                            <td>{c.start_date} to {c.end_date}</td>
                                            <td>{c.rendered_claim_id || `#${c.id}`} {c.td_no ? `(TD: ${c.td_no})` : ''}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {availableJourneys.filter(c => c.claim_type === 'TA_DA').length === 0 && <p>{t.transfer.noTadaFound}</p>}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                            <button className="btn btn-secondary" onClick={() => setShowImportModal(false)}>{t.common.cancel}</button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`.text-danger { color: #dc3545; border: none; background: transparent; cursor: pointer; }`}</style>
        </div>
    );
};

export default TransferClaim;
