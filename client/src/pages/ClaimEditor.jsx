import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Save, Plus, Trash, Printer, ArrowLeft, FileSpreadsheet, Send, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { getTranslations } from '../utils/translations';
import { getDistrictKeys, getDistrictName } from '../utils/mp_districts_bilingual';

const ClaimEditor = () => {
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
    const [totals, setTotals] = useState({ fare: 0, da: 0, total: 0 });
    const [isDirty, setIsDirty] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);


    // Transfer details
    const [familyMembers, setFamilyMembers] = useState('');
    const [baggageWeight, setBaggageWeight] = useState('');
    const [packingCharges, setPackingCharges] = useState(0);
    const [goodsTransportCharges, setGoodsTransportCharges] = useState(0);

    // Hotel/Stay details & Advance
    const [hotelStayType, setHotelStayType] = useState('None');
    const [hotelAmount, setHotelAmount] = useState(0);
    const [advanceAmount, setAdvanceAmount] = useState(0);

    // Fetch authoritative totals from server
    const fetchLiveTotals = async () => {
        try {
            const res = await fetch(`http://localhost:5000/api/calculate-bill/${id}`);
            if (!res.ok) return;
            const data = await res.json();
            const liveTotals = data.totals || {};
            setTotals({
                fare:  liveTotals.totalFare  || 0,
                da:    liveTotals.totalDA    || 0,
                total: liveTotals.grandTotal || 0,
            });
        } catch (err) {
            console.error('fetchLiveTotals error:', err);
        }
    };

    const fetchData = async () => {
        try {
            const res = await fetch(`http://localhost:5000/api/claim-details/${id}`);
            const data = await res.json();
            setClaim(data.claim);
            setJourneys(data.journeys || []);
            setFamilyMembers(data.claim.family_details || '');
            setBaggageWeight(data.claim.baggage_weight || '');
            setPackingCharges(data.claim.packing_charges || 0);
            setGoodsTransportCharges(data.claim.goods_transport_charges || 0);
            setHotelStayType(data.claim.hotel_stay_type || 'None');
            setHotelAmount(data.claim.hotel_amount || 0);
            setAdvanceAmount(data.claim.advance_amount || 0);

            const empRes = await fetch('http://localhost:5000/api/employees');
            const emps = await empRes.json();
            const emp = emps.find(e => e.id === data.claim.employee_id);
            setEmployee(emp);
            setLoading(false);
            setIsDirty(false);
            await fetchLiveTotals();
        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [id]);

    const getEmpCat = () => {
        const match = (employee?.category || '').match(/[ABCDE]/i);
        return match ? match[0].toUpperCase() : 'E';
    };

    const handleJourneyChange = (index, field, value) => {
        const updated = [...journeys];
        updated[index][field] = value;
        setJourneys(updated);
    };

    const handleAddJourney = () => {
        setJourneys([...journeys, {
            claim_id: id,
            departure_date: '', departure_time: '', departure_station: '',
            arrival_date: '', arrival_time: '', arrival_station: '',
            mode: 'Rail', class_of_travel: '', ticket_no: '',
            fare_amount: 0, distance_km: 0, purpose: ''
        }]);
    };

    const saveClaims = async () => {
        if (claim?.status === 'SUBMITTED') {
            alert("Cannot edit submitted claim.");
            return;
        }
        try {
            const res = await fetch('http://localhost:5000/api/journey-details-bulk', {
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
                fetchData();
            } else {
                alert(t.messages.errorSaving);
            }
        } catch {
            alert(t.common.error);
        }
    };

    useEffect(() => {
        if (!loading) setIsDirty(true);
    }, [hotelStayType, hotelAmount, advanceAmount, packingCharges, goodsTransportCharges, journeys]);

    const [availableJourneys, setAvailableJourneys] = useState([]);
    const [showImportModal, setShowImportModal] = useState(false);
    const [selectedJourneyIds, setSelectedJourneyIds] = useState([]);

    const fetchAvailable = async () => {
        if (!claim?.employee_id) return;
        const res = await fetch(`http://localhost:5000/api/employee-journeys/${claim.employee_id}`);
        const data = await res.json();
        setAvailableJourneys(data.filter(j => j.claim_id !== parseInt(id)));
        setShowImportModal(true);
    };

    const handleImport = async () => {
        const selected = availableJourneys.filter(j => selectedJourneyIds.includes(j.id));
        try {
            const res = await fetch('http://localhost:5000/api/journey-details-bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    claim_id: id,
                    journeys: [...journeys, ...selected.map(j => ({ ...j, claim_id: id }))],
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
                setShowImportModal(false);
                fetchData();
            }
        } catch (err) {
            console.error(err);
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
            const res = await fetch(`http://localhost:5000/api/claims/${id}`, {
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
            // Save journeys & claim details first
            await fetch('http://localhost:5000/api/journey-details-bulk', {
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
            const res = await fetch(`http://localhost:5000/api/claims/${id}/submit`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ total_amount: totals.total })
            });

            if (res.ok) {
                alert(language === 'hi' ? 'दावा सफलतापूर्वक स्वीकृति हेतु प्रस्तुत किया गया!' : 'Claim successfully submitted for approval!');
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
                    <button className="btn btn-secondary" onClick={() => navigate(`/tour-diaries`)}>
                        <FileSpreadsheet size={18} /> {t.nav.tourDiaries}
                    </button>
                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => navigate(`/claims/${id}/bill`)}
                        title={language === 'hi' ? 'शासकीय प्रारूप में यात्रा देयक (फॉर्म 21) देखें / प्रिंट करें' : 'View / Print Form 21 Bill'}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                    >
                        <Printer size={18} /> {language === 'hi' ? 'यात्रा देयक प्रिंट (फॉर्म 21)' : 'Print Form 21 Bill'}
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


            <div className="print-only">
                <center><h3>M.P. State Civil Supplies Corporation Limited</h3></center>
                <center><h4>Travelling Allowance Bill</h4></center>
            </div>

            <div className="card" style={{ padding: '1rem', position: 'relative' }}>
                <h4 style={{ marginBottom: '1rem' }}>{t.claims.employee} & {t.claims.title} Info</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div><strong>{t.employees.name}:</strong> {empName}</div>
                    <div><strong>{t.employees.designation}:</strong> {employee?.designation}</div>
                    <div><strong>{t.employees.category}:</strong> {employee?.category}</div>
                    <div><strong>{t.employees.headquarter}:</strong> {employee?.headquarters}</div>
                </div>

                <div style={{ borderTop: '1px solid #eee', paddingTop: '1rem', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
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
                    <div className="form-group">
                        <label className="form-label">{t.bill21.remarks}</label>
                        <input className="form-input" value={claim?.remarks || ''} onChange={e => setClaim({ ...claim, remarks: e.target.value })} placeholder="Add remarks..." disabled={isReadOnly} />
                    </div>
                </div>
            </div>

            {/* TA/DA Specific Inputs: Hotel/Fare & Advance */}
            {claim?.claim_type === 'TA_DA' && (
                <div className="card" style={{ padding: '1.5rem', marginTop: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h4>Travel & Stay Expenses</h4>
                        <div className="badge badge-outline" style={{ fontSize: '0.9rem' }}>
                            Category {employee?.category} Entitlement Group
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1.5fr', gap: '1rem', marginTop: '1rem' }}>
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
                        <div className="form-group">
                            <label className="form-label">{language === 'hi' ? 'अग्रिम राशि (₹)' : 'Advance Amount (₹)'}</label>
                            <input type="number" className="form-input" value={advanceAmount} onChange={e => setAdvanceAmount(e.target.value)} disabled={isReadOnly} placeholder="0.00" />
                        </div>
                        <div className="form-group" style={{ display: 'flex', alignItems: 'center', background: 'rgba(240, 253, 244, 0.65)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', padding: '0.75rem', borderRadius: '8px', border: '1px dashed #4ade80' }}>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: '#166534' }}>
                                <strong>Guidance:</strong><br />
                                {hotelStayType === 'Friends' ? (
                                    `Fixed Entitlement: ₹${{ A: 750, B: 660, C: 550, D: 450, E: 370 }[getEmpCat()]} / day`
                                ) : hotelStayType === 'Hotel' ? (
                                    `Max Entitlement: ₹${{ A: 7400, B: 5500, C: 3700, D: 2000, E: 1000 }[getEmpCat()]} (Metros)`
                                ) : 'Select stay type to see rates.'}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {claim?.claim_type === 'TRANSFER' && (
                <div style={{ marginBottom: '2rem', padding: '1rem', borderTop: '1px solid #eee' }}>
                    <h4 style={{ marginBottom: '1rem' }}>{t.bill21.transferDetails}</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '1rem' }}>
                        <div className="form-group">
                            <label className="form-label">{t.bill21.transferDetails}</label>
                            <input className="form-input" value={familyMembers} onChange={(e) => setFamilyMembers(e.target.value)} placeholder="Family Members Details" disabled={isReadOnly} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">{t.bill21.distance} (Kg)</label>
                            <input type="number" className="form-input" value={baggageWeight} onChange={(e) => setBaggageWeight(e.target.value)} disabled={isReadOnly} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">{t.bill21.transport}</label>
                            <input type="number" className="form-input" value={goodsTransportCharges} onChange={(e) => setGoodsTransportCharges(e.target.value)} disabled={isReadOnly} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">{t.bill21.packing}</label>
                            <input type="number" className="form-input" value={packingCharges} onChange={(e) => setPackingCharges(e.target.value)} disabled={isReadOnly} />
                        </div>
                    </div>
                </div>
            )}

            <div className="card table-container" style={{ marginTop: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h4 style={{ margin: 0 }}>{t.tourDiary.title}</h4>
                    {!isReadOnly && (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button className="btn btn-outline-primary btn-sm no-print" onClick={handleAddJourney}>
                                <Plus size={16} /> {language === 'hi' ? 'यात्रा जोड़ें' : 'Add Journey'}
                            </button>
                            <button className="btn btn-success btn-sm no-print" onClick={fetchAvailable}>
                                <Plus size={16} /> Import from Tour Diary
                            </button>
                        </div>
                    )}
                </div>

                <table className="data-table">
                    <thead>
                        <tr>
                            <th>{t.tourDiary.departure}</th>
                            <th>{t.tourDiary.arrival}</th>
                            <th>{t.tourDiary.mode} / Class</th>
                            <th>Ticket / PNR No.</th>
                            <th>{t.tourDiary.purpose}</th>
                            <th>Actual Fare (₹)</th>
                            {!isReadOnly && <th className="no-print">{t.tourDiary.action}</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {journeys.map((j, i) => (
                            <tr key={i}>
                                <td>
                                    <input
                                        type="date"
                                        className="form-input form-input-sm"
                                        value={j.departure_date || ''}
                                        onChange={(e) => handleJourneyChange(i, 'departure_date', e.target.value)}
                                        disabled={isReadOnly}
                                    />
                                    <input
                                        type="time"
                                        className="form-input form-input-sm"
                                        style={{ marginTop: '4px' }}
                                        value={j.departure_time || ''}
                                        onChange={(e) => handleJourneyChange(i, 'departure_time', e.target.value)}
                                        disabled={isReadOnly}
                                    />
                                    <input
                                        type="text"
                                        list="districts"
                                        className="form-input form-input-sm"
                                        style={{ marginTop: '4px' }}
                                        value={j.departure_station || ''}
                                        onChange={(e) => handleJourneyChange(i, 'departure_station', e.target.value)}
                                        placeholder="Station"
                                        disabled={isReadOnly}
                                    />
                                </td>
                                <td>
                                    <input
                                        type="date"
                                        className="form-input form-input-sm"
                                        value={j.arrival_date || ''}
                                        onChange={(e) => handleJourneyChange(i, 'arrival_date', e.target.value)}
                                        disabled={isReadOnly}
                                    />
                                    <input
                                        type="time"
                                        className="form-input form-input-sm"
                                        style={{ marginTop: '4px' }}
                                        value={j.arrival_time || ''}
                                        onChange={(e) => handleJourneyChange(i, 'arrival_time', e.target.value)}
                                        disabled={isReadOnly}
                                    />
                                    <input
                                        type="text"
                                        list="districts"
                                        className="form-input form-input-sm"
                                        style={{ marginTop: '4px' }}
                                        value={j.arrival_station || ''}
                                        onChange={(e) => handleJourneyChange(i, 'arrival_station', e.target.value)}
                                        placeholder="Station"
                                        disabled={isReadOnly}
                                    />
                                </td>
                                <td>
                                    <select
                                        className="form-select form-select-sm"
                                        value={j.mode || 'Rail'}
                                        onChange={(e) => handleJourneyChange(i, 'mode', e.target.value)}
                                        disabled={isReadOnly}
                                    >
                                        <option value="Rail">Rail</option>
                                        <option value="Bus">Bus</option>
                                        <option value="Air">Air</option>
                                        <option value="Own Car">Own Car</option>
                                        <option value="Own Bike">Own Bike</option>
                                        <option value="Taxi">Taxi</option>
                                        <option value="Auto">Auto</option>
                                    </select>
                                    <input
                                        type="text"
                                        className="form-input form-input-sm"
                                        style={{ marginTop: '4px' }}
                                        value={j.class_of_travel || ''}
                                        onChange={(e) => handleJourneyChange(i, 'class_of_travel', e.target.value)}
                                        placeholder="Class"
                                        disabled={isReadOnly}
                                    />
                                </td>
                                <td>
                                    <input
                                        type="text"
                                        className="form-input form-input-sm"
                                        value={j.ticket_no || ''}
                                        onChange={(e) => handleJourneyChange(i, 'ticket_no', e.target.value)}
                                        placeholder="Ticket/PNR"
                                    />
                                </td>
                                <td>
                                    <input
                                        type="text"
                                        className="form-input form-input-sm"
                                        value={j.purpose || ''}
                                        onChange={(e) => handleJourneyChange(i, 'purpose', e.target.value)}
                                        placeholder="Purpose of visit"
                                        disabled={isReadOnly}
                                    />
                                </td>
                                <td>
                                    <input
                                        type="number"
                                        className="form-input form-input-sm"
                                        style={{ width: '100px' }}
                                        value={j.fare_amount || 0}
                                        onChange={(e) => handleJourneyChange(i, 'fare_amount', e.target.value)}
                                        disabled={isReadOnly}
                                    />
                                </td>
                                {!isReadOnly && (
                                    <td className="no-print">
                                        <button className="btn btn-sm btn-outline-danger" onClick={() => removeJourney(i)}>{t.common.delete}</button>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
                {journeys.length === 0 && <p style={{ textAlign: 'center', padding: '1rem' }}>No journeys linked. Click "Import from Tour Diary" or "Add Journey" to add.</p>}
            </div>

            {/* Import Modal */}
            {showImportModal && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '800px', width: '90%' }}>
                        <h3>{language === 'hi' ? 'आयात करने के लिए यात्राएं चुनें' : 'Select Journeys to Import'}</h3>
                        <p>Showing recorded journeys for {empName}</p>
                        <div style={{ maxHeight: '400px', overflowY: 'auto', marginBottom: '1rem' }}>
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Select</th>
                                        <th>Date</th>
                                        <th>From - To</th>
                                        <th>Purpose</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {availableJourneys.map(j => (
                                        <tr key={j.id}>
                                            <td>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedJourneyIds.includes(j.id)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) setSelectedJourneyIds([...selectedJourneyIds, j.id]);
                                                        else setSelectedJourneyIds(selectedJourneyIds.filter(id => id !== j.id));
                                                    }}
                                                />
                                            </td>
                                            <td>{j.departure_date}</td>
                                            <td>{j.departure_station} to {j.arrival_station}</td>
                                            <td>{j.purpose}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {availableJourneys.length === 0 && <p>No other journeys found for this employee.</p>}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                            <button className="btn btn-secondary" onClick={() => setShowImportModal(false)}>{t.common.cancel}</button>
                            <button className="btn btn-primary" onClick={handleImport} disabled={selectedJourneyIds.length === 0}>Import Selected</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Unsaved-changes banner */}
            {isDirty && (
                <div style={{
                    background: '#fffbeb', border: '1px solid #f59e0b', borderRadius: '8px',
                    padding: '0.6rem 1rem', marginBottom: '0.5rem',
                    display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#92400e'
                }}>
                    <span>⚠️</span>
                    <span>You have unsaved changes. The totals below reflect the <strong>last saved</strong> state. Click <strong>Save</strong> to update.</span>
                </div>
            )}

            <div className="card">
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '2rem', fontWeight: 'bold', fontSize: '1.2rem' }}>
                    <div>{t.bill.actualFare}: ₹{totals.fare}</div>
                    <div style={{ color: 'var(--primary-color)' }}>{t.bill.totalAmount}: ₹{totals.total}</div>
                </div>
            </div>

            <datalist id="districts">
                {getDistrictKeys().map((key, k) => (
                    <option key={k} value={getDistrictName(key, language)} />
                ))}
            </datalist>
        </div>
    );
};

export default ClaimEditor;
