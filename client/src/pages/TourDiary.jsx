import api, { apiRequest } from '../utils/api';
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Printer, FileSpreadsheet, ArrowLeft, Save, Plus, Trash, Receipt, Send, CheckCircle2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { getDistrictKeys, getDistrictName } from '../utils/mp_districts_bilingual';
import { useLanguage } from '../contexts/LanguageContext';
import { getTranslations } from '../utils/translations';
import logoIco from '../assets/logo.ico';

const TourDiary = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { language } = useLanguage();
    const t = getTranslations(language);

    const [claim, setClaim] = useState(null);
    const [employee, setEmployee] = useState(null);
    const [journeys, setJourneys] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);


    // Separate state for Month and Year
    const [diaryMonth, setDiaryMonth] = useState('January');
    const [diaryYear, setDiaryYear] = useState('2026');
    const [declarationDate, setDeclarationDate] = useState(new Date().toISOString().split('T')[0]);

    const monthsEng = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const years = ["2024", "2025", "2026", "2027"];

    const getMergeInfo = (list) => {
        const info = [];
        let i = 0;
        while (i < list.length) {
            if (i === 0 || !list[i].merge_purpose) {
                let span = 1;
                const mergedIndices = [];
                while (i + span < list.length && list[i + span].merge_purpose) {
                    mergedIndices.push(i + span);
                    span++;
                }
                info[i] = { isMergedChild: false, rowSpan: span, mergedIndices };
                for (let k = 1; k < span; k++) {
                    info[i + k] = { isMergedChild: true, rowSpan: 0, mergedIndices: [] };
                }
                i += span;
            } else {
                info[i] = { isMergedChild: false, rowSpan: 1, mergedIndices: [] };
                i++;
            }
        }
        return info;
    };

    const fetchData = async () => {
        try {
            const res = await apiRequest(`/api/claim-details/${id}`);
            const data = await res.json();
            setClaim(data.claim);

            const rawJourneys = (data.journeys || []).map((j, idx) => ({
                ...j,
                merge_purpose: idx === 0 ? false : !!j.merge_purpose
            }));
            // Backfill purpose for merged legs if blank
            for (let k = 1; k < rawJourneys.length; k++) {
                if (rawJourneys[k].merge_purpose && !rawJourneys[k].purpose) {
                    rawJourneys[k].purpose = rawJourneys[k - 1].purpose;
                }
            }
            setJourneys(rawJourneys);

            // Sync with backend values
            if (data.claim) {
                if (data.claim.month) setDiaryMonth(data.claim.month);
                if (data.claim.year) setDiaryYear(data.claim.year);
                if (data.claim.declaration_date) {
                    setDeclarationDate(data.claim.declaration_date);
                }
            }

            const empRes = await apiRequest('/api/employees');
            const emps = await empRes.json();
            const empId = data.claim?.employee_id;
            const emp = emps.find(e => e.id === empId);
            setEmployee(emp);
            setLoading(false);
            const searchParams = new URLSearchParams(window.location.search);
            if (searchParams.get('print') === 'true' || searchParams.get('print') === '1') {
                setTimeout(() => {
                    handlePrint();
                }, 600);
            }
        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [id]);

    const handleJourneyChange = (index, field, value) => {
        const updated = [...journeys];
        updated[index][field] = value;
        setJourneys(updated);
    };

    const handlePurposeChange = (headIndex, span, value) => {
        const updated = [...journeys];
        for (let k = 0; k < span; k++) {
            if (headIndex + k < updated.length) {
                updated[headIndex + k] = { ...updated[headIndex + k], purpose: value };
            }
        }
        setJourneys(updated);
    };

    const handleMergeToggle = (index, checked) => {
        if (index === 0) return;
        const updated = [...journeys];
        updated[index] = { ...updated[index], merge_purpose: checked };
        if (checked) {
            // Inherit purpose from preceding row
            const parentPurpose = updated[index - 1]?.purpose || '';
            updated[index].purpose = parentPurpose;
        }
        setJourneys(updated);
    };

    const handleAddRow = () => {
        setJourneys([...journeys, {
            claim_id: id,
            departure_date: '', departure_time: '', departure_station: '',
            arrival_date: '', arrival_time: '', arrival_station: '',
            mode: 'Rail', class_of_travel: '', ticket_no: '',
            fare_amount: 0, distance_km: 0, purpose: '', merge_purpose: false
        }]);
    };

    const handleRemoveRow = (index) => {
        const updated = [...journeys];
        updated.splice(index, 1);
        if (updated.length > 0) {
            updated[0].merge_purpose = false;
        }
        setJourneys(updated);
    };

    const handleSave = async () => {
        if (claim?.status === 'SUBMITTED') {
            alert("Cannot edit submitted claim.");
            return;
        }
        setIsSaving(true);
        try {
            const res = await apiRequest(`/api/tour-diaries/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    journeys,
                    month: diaryMonth,
                    year: diaryYear,
                    declaration_date: declarationDate,
                    status: 'Draft'
                })
            });
            if (res.ok) {
                alert(t.messages.dataSaved);
                fetchData();
            } else {
                alert(t.messages.errorSaving);
            }
        } catch (err) {
            console.error(err);
            alert(t.messages.errorSaving);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSubmit = async () => {
        if (!window.confirm(t.common.confirmSubmit)) return;
        setIsSubmitting(true);
        try {
            // First save journeys
            await apiRequest(`/api/tour-diaries/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    journeys,
                    month: diaryMonth,
                    year: diaryYear,
                    declaration_date: declarationDate,
                    status: 'Draft'
                })
            });

            // Submit claim
            const res = await apiRequest(`/api/claims/${id}/submit`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ total_amount: claim?.total_amount || 0 })
            });

            if (res.ok) {
                alert(language === 'hi' ? 'दौरा डायरी / दावा सफलतापूर्वक प्रस्तुत किया गया!' : 'Tour diary claim successfully submitted for approval!');
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

    const exportToExcel = () => {
        const rows = journeys.map((j, idx) => ({
            "S.No": idx + 1,
            "Dep. Date": j.departure_date,
            "Dep. Time": j.departure_time,
            "From": j.departure_station,
            "Arr. Date": j.arrival_date,
            "Arr. Time": j.arrival_time,
            "To": j.arrival_station,
            "Mode": j.mode,
            "Distance (KM)": j.distance_km,
            "Purpose of Journey": j.purpose
        }));

        const ws = XLSX.utils.json_to_sheet(rows);
        ws['!merges'] = ws['!merges'] || [];

        // Excel export merges
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Tour Diary");
        XLSX.writeFile(wb, `Tour_Diary_${employee?.name || 'Employee'}_${claim?.id || 'Claim'}.xlsx`);
    };

    const handlePrint = () => {
        // Set document title for PDF filename
        const originalTitle = document.title;
        const dateStr = claim?.start_date || new Date().toISOString().split('T')[0];
        document.title = `${dateStr}_Tour Diary`;

        window.print();

        // Restore original title after a short delay
        setTimeout(() => {
            document.title = originalTitle;
        }, 100);
    };

    const handleDelete = async () => {
        if (!window.confirm(t.tourDiariesList.deleteConfirm)) return;
        try {
            const res = await apiRequest(`/api/claims/${id}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                navigate('/tour-diaries');
            } else {
                alert(t.messages.failedToDelete);
            }
        } catch (err) {
            console.error(err);
        }
    };

    if (loading) return <div>{t.common.loading}</div>;

    const empName = language === 'hi' && employee?.name_hi ? employee.name_hi : employee?.name;
    const isSubmitted = claim?.status === 'SUBMITTED' || claim?.status === 'APPROVED';

    return (
        <div className="page-transition">
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <button className="btn btn-secondary" onClick={() => navigate(`/tour-diaries`)}>
                    <ArrowLeft size={18} /> {t.tourDiary.backToList}
                </button>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    {!isSubmitted && (
                        <button className="btn btn-primary" onClick={handleSave} disabled={isSaving}>
                            <Save size={18} /> {isSaving ? t.common.saving : t.common.save}
                        </button>
                    )}
                    <button
                        className="btn btn-secondary"
                        onClick={() => navigate(`/claims/${id}/bill`)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                        title={language === 'hi' ? 'शासकीय प्रारूप में यात्रा देयक (फॉर्म 21) देखें / प्रिंट करें' : 'View / Print Form 21 Bill'}
                    >
                        <Printer size={18} /> {language === 'hi' ? 'यात्रा देयक प्रिंट (फॉर्म 21)' : 'Print Form 21 Bill'}
                    </button>
                    <button className="btn btn-primary" style={{ backgroundColor: '#217346' }} onClick={exportToExcel}>
                        <FileSpreadsheet size={18} /> {t.tourDiary.exportExcel}
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={handlePrint}>
                        <Printer size={18} /> {t.tourDiary.printPDF}
                    </button>
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

            <div className="tour-diary-container" style={{ background: 'white', padding: '2rem', minHeight: '100vh', position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginBottom: '1.5rem', borderBottom: '1px solid #000', paddingBottom: '0.75rem' }}>
                    <img
                        src={logoIco}
                        alt="MPSCSC Logo"
                        style={{
                            width: '56px',
                            height: '56px',
                            minWidth: '56px',
                            minHeight: '56px',
                            maxWidth: '56px',
                            maxHeight: '56px',
                            flexShrink: 0,
                            objectFit: 'contain',
                            aspectRatio: '1 / 1',
                            display: 'block'
                        }}
                    />
                    <div style={{ textAlign: 'center' }}>
                        <h2 style={{ margin: 0, fontSize: '1.2rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            {language === 'hi' ? 'मध्य प्रदेश स्टेट सिविल सप्लाइज कॉर्पोरेशन लिमिटेड' : 'M.P. State Civil Supplies Corporation Limited'}
                        </h2>
                        <h3 style={{ margin: '3px 0 0 0', fontSize: '1rem', textTransform: 'uppercase', color: '#1e293b' }}>
                            {t.tourDiary.title} {empName}
                        </h3>
                    </div>
                </div>
                <div style={{ textAlign: 'center', marginBottom: '1.5rem', lineHeight: '1.6' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', maxWidth: '800px', margin: '0 auto', alignItems: 'center' }}>
                        <span>
                            <strong>{t.tourDiary.district}</strong> {employee?.headquarters}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <strong>{t.tourDiary.forMonth}</strong>
                            <select
                                className="print-input"
                                style={{ width: '130px', fontWeight: 'bold' }}
                                value={diaryMonth}
                                onChange={e => setDiaryMonth(e.target.value)}
                            >
                                {monthsEng.map((m, idx) => (
                                    <option key={m} value={m}>{t.tourDiary.months[idx]}</option>
                                ))}
                            </select>
                            <select
                                className="print-input"
                                style={{ width: '80px', fontWeight: 'bold' }}
                                value={diaryYear}
                                onChange={e => setDiaryYear(e.target.value)}
                            >
                                {years.map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </span>
                    </div>
                </div>

                <table className="print-table" style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid black' }}>
                    <thead>
                        <tr>
                            <th rowSpan="2" style={{ border: '1px solid black' }}>{t.tourDiary.srNo}</th>
                            <th colSpan="3" style={{ border: '1px solid black' }}>{t.tourDiary.departure}</th>
                            <th colSpan="3" style={{ border: '1px solid black' }}>{t.tourDiary.arrival}</th>
                            <th rowSpan="2" style={{ border: '1px solid black' }}>{t.tourDiary.mode}</th>
                            <th rowSpan="2" style={{ border: '1px solid black' }}>{t.tourDiary.distance}</th>
                            <th rowSpan="2" style={{ border: '1px solid black' }}>{t.tourDiary.purpose}</th>
                            <th className="no-print" rowSpan="2" style={{ border: '1px solid black' }}>{t.tourDiary.action}</th>
                        </tr>
                        <tr>
                            <th style={{ border: '1px solid black' }}>{t.tourDiary.station}</th>
                            <th style={{ border: '1px solid black' }}>{t.tourDiary.date}</th>
                            <th style={{ border: '1px solid black' }}>{t.tourDiary.time}</th>
                            <th style={{ border: '1px solid black' }}>{t.tourDiary.station}</th>
                            <th style={{ border: '1px solid black' }}>{t.tourDiary.date}</th>
                            <th style={{ border: '1px solid black' }}>{t.tourDiary.time}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(() => {
                            const mergeInfo = getMergeInfo(journeys);
                            return journeys.map((j, i) => {
                                const info = mergeInfo[i];
                                return (
                                    <tr key={i} style={{ height: '35px' }}>
                                        <td style={{ border: '1px solid black', textAlign: 'center' }}>{i + 1}</td>

                                        {/* Departure */}
                                        <td style={{ border: '1px solid black', padding: '0' }}>
                                            <input type="text" list="districts" className="print-input"
                                                value={j.departure_station}
                                                onChange={e => handleJourneyChange(i, 'departure_station', e.target.value)}
                                            />
                                        </td>
                                        <td style={{ border: '1px solid black', padding: '0' }}>
                                            <input type="date" className="print-input"
                                                value={j.departure_date}
                                                onChange={e => handleJourneyChange(i, 'departure_date', e.target.value)}
                                                style={{ width: '98%', fontSize: '0.9rem' }}
                                            />
                                        </td>
                                        <td style={{ border: '1px solid black', padding: '0' }}>
                                            <input type="time" className="print-input"
                                                value={j.departure_time}
                                                onChange={e => handleJourneyChange(i, 'departure_time', e.target.value)}
                                                style={{ width: '98%', fontSize: '0.9rem' }}
                                            />
                                        </td>

                                        {/* Arrival */}
                                        <td style={{ border: '1px solid black', padding: '0' }}>
                                            <input type="text" list="districts" className="print-input"
                                                value={j.arrival_station}
                                                onChange={e => handleJourneyChange(i, 'arrival_station', e.target.value)}
                                            />
                                        </td>
                                        <td style={{ border: '1px solid black', padding: '0' }}>
                                            <input type="date" className="print-input"
                                                value={j.arrival_date}
                                                onChange={e => handleJourneyChange(i, 'arrival_date', e.target.value)}
                                                style={{ width: '98%', fontSize: '0.9rem' }}
                                            />
                                        </td>
                                        <td style={{ border: '1px solid black', padding: '0' }}>
                                            <input type="time" className="print-input"
                                                value={j.arrival_time}
                                                onChange={e => handleJourneyChange(i, 'arrival_time', e.target.value)}
                                                style={{ width: '98%', fontSize: '0.9rem' }}
                                            />
                                        </td>

                                        {/* Mode */}
                                        <td style={{ border: '1px solid black', padding: '0' }}>
                                            <select className="print-input" value={j.mode} onChange={e => handleJourneyChange(i, 'mode', e.target.value)}>
                                                <option value="Rail">{t.tourDiary.modeOptions.rail}</option>
                                                <option value="Bus">{t.tourDiary.modeOptions.bus}</option>
                                                <option value="Own Car">{t.tourDiary.modeOptions.ownCar}</option>
                                                <option value="Own Bike">{t.tourDiary.modeOptions.ownBike}</option>
                                            </select>
                                        </td>

                                        {/* Distance */}
                                        <td style={{ border: '1px solid black', padding: '0', textAlign: 'center' }}>
                                            <input type="number" className="print-input"
                                                value={j.distance_km}
                                                onChange={e => handleJourneyChange(i, 'distance_km', e.target.value)}
                                                style={{ width: '60px', textAlign: 'center' }}
                                            />
                                        </td>

                                        {/* Purpose */}
                                        {!info?.isMergedChild && (
                                            <td
                                                rowSpan={info?.rowSpan || 1}
                                                style={{
                                                    border: '1px solid black',
                                                    padding: '4px',
                                                    position: 'relative',
                                                    verticalAlign: 'middle',
                                                    background: (info?.rowSpan || 1) > 1 ? '#f8fafc' : 'transparent'
                                                }}
                                            >
                                                {/* Printable View */}
                                                <div className="print-only" style={{
                                                    whiteSpace: 'pre-wrap',
                                                    wordBreak: 'break-word',
                                                    fontSize: '0.85rem',
                                                    lineHeight: '1.4',
                                                    padding: '2px'
                                                }}>
                                                    {j.purpose}
                                                </div>

                                                {/* Screen Edit Mode */}
                                                <div className="no-print" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                                                    <textarea
                                                        className="print-input"
                                                        value={j.purpose}
                                                        onChange={e => handlePurposeChange(i, info?.rowSpan || 1, e.target.value)}
                                                        rows={Math.max(2, (info?.rowSpan || 1) * 2)}
                                                        placeholder={t.tourDiary.purpose}
                                                        style={{
                                                            resize: 'vertical',
                                                            minHeight: `${Math.max(40, (info?.rowSpan || 1) * 36)}px`,
                                                            width: '100%',
                                                            boxSizing: 'border-box'
                                                        }}
                                                    />

                                                    {/* Merge Status & Controls */}
                                                    {(info?.rowSpan || 1) > 1 ? (
                                                        <div style={{
                                                            marginTop: '4px',
                                                            padding: '3px 6px',
                                                            background: '#e0f2fe',
                                                            borderRadius: '4px',
                                                            border: '1px solid #bae6fd',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'space-between',
                                                            flexWrap: 'wrap',
                                                            gap: '4px',
                                                            fontSize: '0.72rem'
                                                        }}>
                                                            <span style={{ color: '#0369a1', fontWeight: '600' }}>
                                                                🔗 {language === 'hi' ? `पंक्ति ${i + 1}–${i + info.rowSpan} मर्ज हैं` : `Rows ${i + 1}–${i + info.rowSpan} merged`}
                                                            </span>
                                                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                                                {info.mergedIndices.map(childIdx => (
                                                                    <button
                                                                        key={childIdx}
                                                                        type="button"
                                                                        onClick={() => handleMergeToggle(childIdx, false)}
                                                                        title={language === 'hi' ? `पंक्ति ${childIdx + 1} अलग करें` : `Unmerge row ${childIdx + 1}`}
                                                                        style={{
                                                                            background: '#fee2e2',
                                                                            color: '#b91c1c',
                                                                            border: '1px solid #fca5a5',
                                                                            borderRadius: '3px',
                                                                            padding: '1px 5px',
                                                                            fontSize: '0.68rem',
                                                                            cursor: 'pointer',
                                                                            fontWeight: '500'
                                                                        }}
                                                                    >
                                                                        {language === 'hi' ? `पं. ${childIdx + 1} अलग करें ✕` : `Row ${childIdx + 1} ✕`}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        i > 0 && (
                                                            <div style={{ fontSize: '0.72rem', marginTop: '2px', textAlign: 'right', paddingRight: '2px' }}>
                                                                <label title="Merge with cell above" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#475569' }}>
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={false}
                                                                        onChange={e => handleMergeToggle(i, e.target.checked)}
                                                                    />
                                                                    <span>{t.tourDiary.mergeUp}</span>
                                                                </label>
                                                            </div>
                                                        )
                                                    )}
                                                </div>
                                            </td>
                                        )}

                                        {/* Action */}
                                        <td className="no-print" style={{ border: '1px solid black', textAlign: 'center' }}>
                                            <button className="btn btn-sm btn-outline-danger" onClick={() => handleRemoveRow(i)} style={{ padding: '2px 6px', fontSize: '0.8rem' }}>
                                                {t.common.delete}
                                            </button>
                                        </td>
                                    </tr>
                                );
                            });
                        })()}
                    </tbody>
                </table>

                <div className="no-print" style={{ marginTop: '1rem' }}>
                    <button className="btn btn-secondary" onClick={handleAddRow}>
                        <Plus size={16} /> {t.tourDiary.addRow}
                    </button>
                </div>

                <div className="tour-declaration-box" style={{ marginTop: '2rem', paddingLeft: '10px' }}>
                    <p style={{ margin: '5px 0', fontSize: '9.5pt' }}>{t.tourDiary.declaration}</p>
                    <div style={{ marginTop: '2.5rem', display: 'flex', justifyContent: 'space-between' }}>
                        <div>
                            <strong>{t.tourDiary.declarationDate}:</strong>
                            <input type="date" value={declarationDate} onChange={e => setDeclarationDate(e.target.value)}
                                style={{ border: 'none', borderBottom: '1px solid #000', marginLeft: '5px', outline: 'none' }} />
                        </div>
                        <div style={{ textAlign: 'center', marginRight: '50px' }}>
                            <div style={{ marginBottom: '5px' }}>({t.tourDiary.signature})</div>
                            <div><strong>{t.tourDiary.nameLabel}</strong> {empName}</div>
                            <div><strong>{t.tourDiary.designationLabel}</strong> {employee?.designation}</div>
                        </div>
                    </div>
                </div>

                {/* Datalist */}
                <datalist id="districts">
                    {getDistrictKeys().map((key, k) => (
                        <option key={key || k} value={getDistrictName(key, language)} />
                    ))}
                </datalist>
            </div>

            <style>{`
                .print-input {
                    width: 100%;
                    height: 100%;
                    border: none;
                    padding: 5px;
                    font-family: inherit;
                    font-size: inherit;
                    background: transparent;
                    box-sizing: border-box;
                }
                .print-input:focus {
                    outline: 2px solid var(--secondary-color);
                    background: #f0f8ff;
                }
                .print-only {
                    display: none !important;
                }
                @media print {
                    @page {
                        size: A4 portrait;
                        margin: 8mm 8mm 10mm 8mm;
                    }
                    * {
                        color: black !important;
                        border-color: black !important;
                        background: transparent !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    .print-input {
                        border: none;
                        background: transparent;
                        padding: 2px;
                        font-family: 'Times New Roman', serif;
                    }
                    .print-only { display: block !important; }
                    .no-print { display: none !important; }
                    body {
                        background: white !important;
                        font-size: 9pt;
                        font-family: 'Times New Roman', Times, serif;
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                    .card {
                        border: none !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        box-shadow: none !important;
                    }
                    .print-table, .data-table {
                        width: 100% !important;
                        border-collapse: collapse !important;
                        table-layout: fixed !important;
                        font-size: 8.5pt !important;
                        margin-bottom: 8px !important;
                    }
                    .print-table th, .print-table td, .data-table th, .data-table td {
                        border: 1px solid black !important;
                        padding: 3px 4px !important;
                        vertical-align: top !important;
                        word-break: break-word !important;
                    }
                    .print-table th, .data-table th {
                        background: #f1f5f9 !important;
                        font-weight: bold !important;
                        text-align: center !important;
                    }
                    .print-table thead, .data-table thead {
                        display: table-header-group;
                    }
                    .print-table tr, .data-table tr {
                        page-break-inside: avoid;
                    }
                    .tour-declaration-box {
                        page-break-inside: avoid !important;
                        margin-top: 18px !important;
                    }
                }
            `}</style>
        </div>
    );
};

export default TourDiary;
