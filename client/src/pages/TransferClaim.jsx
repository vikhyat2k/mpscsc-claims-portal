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
                alert(language === 'hi' ? 'स्थानांतरण दावा सफलतापूर्वक स्वीकृति हेतु प्रस्तुत किया गया!' : 'Transfer claim successfully submitted for approval!');
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
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* Print Orientation Toggle */}
                    <div style={{ display: 'inline-flex', alignItems: 'center', background: '#f1f5f9', padding: '3px', borderRadius: '8px', border: '1px solid #cbd5e1', gap: '3px' }}>
                        <button
                            type="button"
                            onClick={() => setPrintOrientation('portrait')}
                            title={language === 'hi' ? 'A4 पोर्ट्रेट' : 'A4 Portrait'}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 10px', fontSize: '12.5px', fontWeight: printOrientation === 'portrait' ? '600' : '500', borderRadius: '6px', border: 'none', background: printOrientation === 'portrait' ? '#1e3a8a' : 'transparent', color: printOrientation === 'portrait' ? '#ffffff' : '#475569', cursor: 'pointer', transition: 'all 0.15s ease' }}
                        >
                            <span style={{ display: 'inline-block', width: '9px', height: '13px', border: '1.5px solid currentColor', borderRadius: '1.5px' }}></span>
                            {language === 'hi' ? 'A4 पोर्ट्रेट' : 'A4 Portrait'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setPrintOrientation('landscape')}
                            title={language === 'hi' ? 'A4 लैंडस्केप (अनुशंसित)' : 'A4 Landscape (Recommended)'}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 10px', fontSize: '12.5px', fontWeight: printOrientation === 'landscape' ? '600' : '500', borderRadius: '6px', border: 'none', background: printOrientation === 'landscape' ? '#1e3a8a' : 'transparent', color: printOrientation === 'landscape' ? '#ffffff' : '#475569', cursor: 'pointer', transition: 'all 0.15s ease' }}
                        >
                            <span style={{ display: 'inline-block', width: '13px', height: '9px', border: '1.5px solid currentColor', borderRadius: '1.5px' }}></span>
                            {language === 'hi' ? 'A4 लैंडस्केप' : 'A4 Landscape'}
                            <span style={{ fontSize: '10px', background: printOrientation === 'landscape' ? '#3b82f6' : '#e2e8f0', color: printOrientation === 'landscape' ? '#fff' : '#475569', padding: '1px 5px', borderRadius: '4px' }}>{language === 'hi' ? 'अनु' : 'Rec.'}</span>
                        </button>
                    </div>
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handlePrint}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: '600' }}
                        title={language === 'hi' ? 'स्थानांतरण भत्ता बिल प्रिंट करें' : 'Print Transfer Allowance Bill'}
                    >
                        <Printer size={18} /> {language === 'hi' ? `प्रिंट (A4 ${printOrientation === 'landscape' ? 'लैंडस्केप' : 'पोर्ट्रेट'})` : `Print (A4 ${printOrientation === 'landscape' ? 'Landscape' : 'Portrait'})`}
                    </button>
                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => navigate(`/claims/${id}/bill`)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                        title={language === 'hi' ? 'शासकीय प्रारूप में स्थानांतरण देयक (फॉर्म 21) देखें / प्रिंट करें' : 'View / Print Transfer Form 21 Bill'}
                    >
                        <Printer size={18} /> {language === 'hi' ? 'स्थानांतरण देयक प्रिंट (फॉर्म 21)' : 'Print Transfer Bill (Form 21)'}
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
                            <label className="form-label">{t.tourDiary.stayAmount || 'Hotel/Stay Amount'} (₹)</label>
                            <input type="number" className="form-input" value={hotelAmount} onChange={e => setHotelAmount(e.target.value)} disabled={hotelStayType === 'None' || isReadOnly} />
                        </div>
                        <div className="form-group" style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', background: 'rgba(240, 253, 244, 0.65)', backdropFilter: 'blur(8px)', padding: '0.75rem', borderRadius: '8px', border: '1px dashed #4ade80' }}>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: '#166534' }}>
                                <strong>Guidance:</strong><br />
                                {hotelStayType === 'Friends' ? (
                                    `Fixed Entitlement: ₹${{ A: 750, B: 660, C: 550, D: 450, E: 370 }[(employee?.category?.match(/[ABCDE]/i)?.[0] || 'E').toUpperCase()]} / day`
                                ) : hotelStayType === 'Hotel' ? (
                                    `Max Entitlement: ₹${{ A: 7400, B: 5500, C: 3700, D: 2000, E: 1000 }[(employee?.category?.match(/[ABCDE]/i)?.[0] || 'E').toUpperCase()]} (Metros)`
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
                            <input type="number" className="form-input" value={goodsTransportCharges} onChange={(e) => setGoodsTransportCharges(e.target.value)} placeholder="₹ Amount" disabled={isReadOnly} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">{t.transfer.packingLoading}</label>
                            <input type="number" className="form-input" value={packingCharges} onChange={(e) => setPackingCharges(e.target.value)} placeholder="₹ Amount" disabled={isReadOnly} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">{language === 'hi' ? 'अग्रिम राशि (₹)' : 'Advance Amount (₹)'}</label>
                            <input type="number" className="form-input" value={advanceAmount} onChange={(e) => setAdvanceAmount(e.target.value)} placeholder="₹ Amount" disabled={isReadOnly} />
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
                                <td>₹{j.fare_amount}</td>
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
                        <div style={{ fontWeight: 600 }}>₹{totals.fare.toLocaleString('en-IN')}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Daily Allowance</div>
                        <div style={{ fontWeight: 600 }}>₹{totals.totalDA.toLocaleString('en-IN')}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Stay Allowance</div>
                        <div style={{ fontWeight: 600 }}>₹{totals.totalStayAllowance.toLocaleString('en-IN')}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Packing</div>
                        <div style={{ fontWeight: 600 }}>₹{totals.totalPacking.toLocaleString('en-IN')}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Transport</div>
                        <div style={{ fontWeight: 600 }}>₹{totals.totalTransport.toLocaleString('en-IN')}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Local Transport</div>
                        <div style={{ fontWeight: 600 }}>₹{totals.totalLocalTransport.toLocaleString('en-IN')}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Transfer Grant</div>
                        <div style={{ fontWeight: 600 }}>₹{totals.transferGrant.toLocaleString('en-IN')}</div>
                    </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '2px solid var(--primary-color)', paddingTop: '0.75rem' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '1.3rem', color: 'var(--primary-color)' }}>
                        {t.bill.totalAmount}: ₹{totals.grandTotal.toLocaleString('en-IN')}
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
                                                <button className="btn btn-sm btn-primary" onClick={() => handleImportFromClaim(c.id)}>{language === 'hi' ? 'आयात करें' : 'Import'}</button>
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

            {/* ===== PRINT-ONLY FORMAL BILL SECTION ===== */}
            <div className="transfer-print-bill" style={{ display: 'none' }}>

                {/* MPSCSC Header */}
                <div className="tpb-header">
                    <div className="tpb-header-text">
                        <div className="tpb-org">{language === 'hi' ? 'मध्यप्रदेश स्टेट सिविल सप्लाइज कॉर्पोरेशन लिमिटेड' : 'M.P. STATE CIVIL SUPPLIES CORPORATION LIMITED'}</div>
                        <div className="tpb-title">{language === 'hi' ? 'स्थानांतरण भत्ता बिल' : 'TRANSFER ALLOWANCE BILL'}</div>
                        <div className="tpb-subtitle">{language === 'hi' ? '(म.प्र. सरकारी सेवक यात्रा भत्ता नियम के अंतर्गत)' : '(Under M.P. Government Servant Travelling Allowance Rules)'}</div>
                    </div>
                </div>

                {/* Employee Info Strip */}
                <table className="tpb-info-table">
                    <tbody>
                        <tr>
                            <td className="tpb-label">{language === 'hi' ? 'नाम' : 'Name'}:</td>
                            <td className="tpb-value">{empName}</td>
                            <td className="tpb-label">{language === 'hi' ? 'पदनाम' : 'Designation'}:</td>
                            <td className="tpb-value">{employee?.designation}</td>
                            <td className="tpb-label">{language === 'hi' ? 'श्रेणी' : 'Category'}:</td>
                            <td className="tpb-value">{employee?.category}</td>
                            <td className="tpb-label">{language === 'hi' ? 'मुख्यालय' : 'HQ'}:</td>
                            <td className="tpb-value">{employee?.headquarters}</td>
                        </tr>
                        <tr>
                            <td className="tpb-label">{language === 'hi' ? 'पूर्व स्थल' : 'Transfer From'}:</td>
                            <td className="tpb-value" colSpan={3}>{employee?.headquarters || '—'}</td>
                            <td className="tpb-label">{language === 'hi' ? 'नव पदस्थापन' : 'Transfer To'}:</td>
                            <td className="tpb-value" colSpan={3}>{claim?.transfer_to || journeys[journeys.length - 1]?.arrival_station || '—'}</td>
                        </tr>
                        <tr>
                            <td className="tpb-label">{language === 'hi' ? 'माह' : 'Month/Year'}:</td>
                            <td className="tpb-value" colSpan={3}>{claim?.month} {claim?.year}</td>
                            <td className="tpb-label">{language === 'hi' ? 'स्थानांतरण आदेश दिनांक' : 'Transfer Order Date'}:</td>
                            <td className="tpb-value" colSpan={3}>{claim?.declaration_date || '—'}</td>
                        </tr>
                    </tbody>
                </table>

                {/* Transfer Details */}
                <table className="tpb-info-table" style={{ marginTop: '4px' }}>
                    <tbody>
                        <tr>
                            <td className="tpb-label">{language === 'hi' ? 'परिवार विवरण' : 'Family Details'}:</td>
                            <td className="tpb-value" colSpan={3}>{familyMembers || 'N/A'}</td>
                            <td className="tpb-label">{language === 'hi' ? 'सामान भार' : 'Baggage (Kg)'}:</td>
                            <td className="tpb-value">{baggageWeight || 'N/A'}</td>
                            <td className="tpb-label">{language === 'hi' ? 'आवास प्रकार' : 'Stay Type'}:</td>
                            <td className="tpb-value">{hotelStayType}</td>
                        </tr>
                    </tbody>
                </table>

                {/* Journey Table */}
                <div className="tpb-section-title" style={{ marginTop: '6px' }}>
                    {language === 'hi' ? 'यात्रा विवरण' : 'JOURNEY DETAILS'}
                </div>
                <table className="tpb-journey-table">
                    <thead>
                        <tr>
                            <th style={{ width: '5%' }}>{language === 'hi' ? 'क्र.' : 'S.'}</th>
                            <th style={{ width: '14%' }}>{language === 'hi' ? 'रवानगी दिनांक/समय' : 'Depart Date/Time'}</th>
                            <th style={{ width: '14%' }}>{language === 'hi' ? 'रवानगी स्थान' : 'Depart Station'}</th>
                            <th style={{ width: '14%' }}>{language === 'hi' ? 'आगमन दिनांक/समय' : 'Arrive Date/Time'}</th>
                            <th style={{ width: '14%' }}>{language === 'hi' ? 'आगमन स्थान' : 'Arrive Station'}</th>
                            <th style={{ width: '12%' }}>{language === 'hi' ? 'यात्रा का विवरण' : 'Purpose'}</th>
                            <th style={{ width: '10%' }}>{language === 'hi' ? 'वाहन / श्रेणी' : 'Mode/Class'}</th>
                            <th style={{ width: '8%', textAlign: 'right' }}>{language === 'hi' ? 'भाड़ा (₹)' : 'Fare (₹)'}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {journeys.length === 0 ? (
                            <tr><td colSpan={8} style={{ textAlign: 'center', fontStyle: 'italic' }}>No journeys recorded</td></tr>
                        ) : journeys.map((j, i) => (
                            <tr key={i}>
                                <td style={{ textAlign: 'center' }}>{i + 1}</td>
                                <td>{j.departure_date} {j.departure_time}</td>
                                <td>{j.departure_station}</td>
                                <td>{j.arrival_date} {j.arrival_time}</td>
                                <td>{j.arrival_station}</td>
                                <td>{j.purpose}</td>
                                <td>{j.mode} {j.class_of_travel ? `(${j.class_of_travel})` : ''}</td>
                                <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{parseFloat(j.fare_amount || 0).toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Financial Summary */}
                <div className="tpb-summary-grid">
                    <div className="tpb-summary-left">
                        <div className="tpb-section-title">{language === 'hi' ? 'वित्तीय विवरण' : 'FINANCIAL SUMMARY'}</div>
                        <table className="tpb-fin-table">
                            <tbody>
                                <tr><td>{language === 'hi' ? 'यात्रा भाड़ा' : 'Travel Fare'}:</td><td style={{ textAlign: 'right' }}>₹{totals.fare.toFixed(2)}</td></tr>
                                <tr><td>{language === 'hi' ? 'दैनिक भत्ता (D.A.)' : 'Daily Allowance (D.A.)'}:</td><td style={{ textAlign: 'right' }}>₹{totals.totalDA.toFixed(2)}</td></tr>
                                <tr><td>{language === 'hi' ? 'ठहराव भत्ता' : 'Stay Allowance'}:</td><td style={{ textAlign: 'right' }}>₹{totals.totalStayAllowance.toFixed(2)}</td></tr>
                                <tr><td>{language === 'hi' ? 'पैकिंग / लोडिंग' : 'Packing / Loading'}:</td><td style={{ textAlign: 'right' }}>₹{totals.totalPacking.toFixed(2)}</td></tr>
                                <tr><td>{language === 'hi' ? 'सामान ढुलाई' : 'Goods Transport'}:</td><td style={{ textAlign: 'right' }}>₹{totals.totalTransport.toFixed(2)}</td></tr>
                                <tr><td>{language === 'hi' ? 'स्थानीय अनुवहन' : 'Local Transport'}:</td><td style={{ textAlign: 'right' }}>₹{totals.totalLocalTransport.toFixed(2)}</td></tr>
                                <tr><td>{language === 'hi' ? 'स्थानांतरण अनुदान' : 'Transfer Grant'}:</td><td style={{ textAlign: 'right' }}>₹{totals.transferGrant.toFixed(2)}</td></tr>
                                <tr className="tpb-grand-row"><td><strong>{language === 'hi' ? 'कुल योग' : 'GRAND TOTAL'}:</strong></td><td style={{ textAlign: 'right' }}><strong>₹{totals.grandTotal.toFixed(2)}</strong></td></tr>
                                {(parseFloat(advanceAmount) > 0) && (
                                    <tr><td>{language === 'hi' ? 'घटाइए: अग्रिम' : 'Less: Advance'}:</td><td style={{ textAlign: 'right', color: 'darkred' }}>- ₹{parseFloat(advanceAmount).toFixed(2)}</td></tr>
                                )}
                                {(parseFloat(advanceAmount) > 0) && (
                                    <tr className="tpb-grand-row"><td><strong>{language === 'hi' ? 'शुद्ध देय राशि' : 'Net Payable'}:</strong></td><td style={{ textAlign: 'right' }}><strong>₹{(totals.grandTotal - parseFloat(advanceAmount)).toFixed(2)}</strong></td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="tpb-summary-right">
                        <div className="tpb-section-title">{language === 'hi' ? 'प्रमाण-पत्र' : 'CERTIFICATES'}</div>
                        <div className="tpb-cert-text">
                            <p>1. {language === 'hi' ? 'प्रमाणित किया जाता है कि उपर्युक्त विवरण में दिए गए यात्रा विवरण सत्य एवं सही हैं।' : 'Certified that the journeys detailed above were actually performed as stated.'}</p>
                            <p>2. {language === 'hi' ? 'मैंने स्थानांतरण भत्ता किसी अन्य स्रोत से प्राप्त नहीं किया है।' : 'Transfer allowance has not been claimed from any other source.'}</p>
                            <p>3. {language === 'hi' ? 'परिवार के सदस्य मेरे साथ रहते हैं एवं वे मेरे साथ स्थानांतरित हुए।' : 'Family members mentioned above actually accompanied me to the new place of posting.'}</p>
                        </div>
                        <div className="tpb-sig-area">
                            <div className="tpb-date-place">
                                <div><strong>{language === 'hi' ? 'स्थान' : 'Place'}:</strong> {employee?.headquarters || '—'}</div>
                                <div><strong>{language === 'hi' ? 'दिनांक' : 'Date'}:</strong> {claim?.declaration_date || '—'}</div>
                            </div>
                            <div className="tpb-sig-block">
                                <div style={{ height: '32px' }}></div>
                                <div className="tpb-sig-rule"></div>
                                <strong>{language === 'hi' ? 'आवेदक / कर्मचारी के हस्ताक्षर' : 'Signature of Applicant / Employee'}</strong>
                                <div style={{ fontSize: '7.8pt', marginTop: '2px' }}>({empName}{employee?.designation ? ', ' + employee.designation : ''})</div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>{/* /transfer-print-bill */}

            <style>{`
                .transfer-print-bill {
                    display: none;
                }
                @media print {
                    @page {
                        size: A4 ${printOrientation};
                        margin: ${printOrientation === 'landscape' ? '5mm 8mm 6mm 8mm' : '8mm 8mm 10mm 8mm'};
                    }
                    * { color: black !important; background: transparent !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; box-sizing: border-box !important; }
                    body { background: white !important; font-size: 8pt !important; font-family: 'Times New Roman', Times, serif !important; margin: 0 !important; padding: 0 !important; }
                    .no-print { display: none !important; }
                    .page-transition { padding: 0 !important; }
                    .card { display: none !important; }
                    .modal-overlay { display: none !important; }
                    .transfer-print-bill { display: block !important; width: 100% !important; }

                    /* Header */
                    .tpb-header { border-bottom: 2px solid black; padding-bottom: 5px; margin-bottom: 5px; text-align: center; }
                    .tpb-org { font-size: 11pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.4px; }
                    .tpb-title { font-size: 9.5pt; font-weight: bold; margin-top: 2px; text-transform: uppercase; }
                    .tpb-subtitle { font-size: 7.8pt; color: black; margin-top: 2px; }

                    /* Info Table */
                    .tpb-info-table { width: 100%; border-collapse: collapse; border: 1px solid black; font-size: 7.8pt; }
                    .tpb-info-table td { border: 1px solid black; padding: 2px 5px; vertical-align: middle; }
                    .tpb-label { font-weight: bold; width: 10%; white-space: nowrap; background: #f8fafc; }
                    .tpb-value { width: 15%; }

                    /* Section Title */
                    .tpb-section-title { font-size: 8.2pt; font-weight: bold; text-transform: uppercase; border-bottom: 1px solid black; padding-bottom: 2px; margin-bottom: 3px; }

                    /* Journey Table */
                    .tpb-journey-table { width: 100%; border-collapse: collapse; border: 1px solid black; font-size: 7.5pt; table-layout: fixed; }
                    .tpb-journey-table th, .tpb-journey-table td { border: 1px solid black; padding: 2px 4px; vertical-align: middle; word-break: break-word; overflow-wrap: break-word; }
                    .tpb-journey-table th { background: #f1f5f9; font-weight: bold; text-align: center; }

                    /* Summary Grid */
                    .tpb-summary-grid { display: grid; grid-template-columns: 1fr 1.2fr; gap: 8px; margin-top: 6px; }
                    .tpb-fin-table { width: 100%; border-collapse: collapse; border: 1px solid black; font-size: 7.8pt; }
                    .tpb-fin-table td { border: 1px solid black; padding: 2px 5px; }
                    .tpb-grand-row td { background: #f1f5f9; font-weight: bold; border-top: 1.5px solid black; }

                    /* Certificates & Signature */
                    .tpb-cert-text { font-size: 7.5pt; line-height: 1.4; border: 1px solid black; padding: 5px 8px; }
                    .tpb-cert-text p { margin: 2px 0; }
                    .tpb-sig-area { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 12px; }
                    .tpb-date-place { font-size: 8pt; line-height: 1.5; }
                    .tpb-sig-block { text-align: center; font-size: 8.5pt; font-weight: bold; min-width: 200px; }
                    .tpb-sig-rule { border-top: 1.5px solid black; width: 200px; margin: 0 auto 4px auto; }
                }
            `}</style>

            <style>{`.text-danger { color: #dc3545; border: none; background: transparent; cursor: pointer; }`}</style>
        </div>
    );
};

export default TransferClaim;
