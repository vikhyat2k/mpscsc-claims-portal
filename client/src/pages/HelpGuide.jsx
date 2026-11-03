import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  HelpCircle, Search, Printer, Globe, ArrowRight, CheckCircle2,
  AlertTriangle, Users, FileText, ArrowLeftRight, HeartPulse,
  FileSpreadsheet, BarChart2, ShieldCheck, Key, ExternalLink,
  ChevronDown, ChevronUp, Sparkles, BookOpen, Clock
} from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";

export default function HelpGuide() {
  const { language, setLanguage } = useLanguage();
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [openSections, setOpenSections] = useState({
    intro: true,
    workflow: true,
    auth: true,
    employees: true,
    tada: true,
    tour: false,
    transfer: false,
    medical: false,
    reports: false,
    admin: false,
    faq: true
  });

  const toggleSection = (key) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const expandAll = () => {
    const all = {};
    Object.keys(openSections).forEach(k => { all[k] = true; });
    setOpenSections(all);
  };

  const collapseAll = () => {
    const none = {};
    Object.keys(openSections).forEach(k => { none[k] = false; });
    setOpenSections(none);
  };

  const isHindi = language === "hi";

  const categories = [
    { id: "all", labelHi: "सभी विषय", labelEn: "All Topics" },
    { id: "start", labelHi: "ऑनलाइन शुरुआत", labelEn: "Online Start" },
    { id: "auth", labelHi: "लॉगिन व पासवर्ड", labelEn: "Login & Password" },
    { id: "employees", labelHi: "कर्मचारी मास्टर", labelEn: "Employee Master" },
    { id: "tada", labelHi: "यात्रा भत्ता (TA/DA)", labelEn: "TA/DA Claims" },
    { id: "tour", labelHi: "दौरा डायरी", labelEn: "Tour Diary" },
    { id: "transfer", labelHi: "स्थानांतरण दावा", labelEn: "Transfer Claim" },
    { id: "medical", labelHi: "चिकित्सा दावा", labelEn: "Medical Claim" },
    { id: "reports", labelHi: "रिपोर्ट्स व एक्सेल", labelEn: "Reports & Excel" },
    { id: "admin", labelHi: "एडमिन कार्य", labelEn: "Admin Controls" },
    { id: "faq", labelHi: "सामान्य प्रश्नोत्तर (FAQ)", labelEn: "FAQ" }
  ];

  return (
    <div className="help-guide-page" style={{ padding: "1.5rem", maxWidth: "1280px", margin: "0 auto" }}>
      {/* Top Hero Banner */}
      <div style={{
        background: "linear-gradient(135deg, #0e7c86 0%, #1a365d 100%)",
        borderRadius: "16px",
        padding: "2rem",
        color: "#ffffff",
        marginBottom: "1.75rem",
        boxShadow: "0 10px 25px -5px rgba(14, 124, 134, 0.3)",
        position: "relative",
        overflow: "hidden"
      }}>
        <div style={{ position: "relative", zIndex: 2 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <span style={{
              background: "rgba(255,255,255,0.2)",
              padding: "0.25rem 0.75rem",
              borderRadius: "999px",
              fontSize: "0.78rem",
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem"
            }}>
              <Globe size={13} /> {isHindi ? "लाइव ऑनलाइन पोर्टल गाइड" : "Live Web Portal Guide"}
            </span>
            <span style={{
              background: "#10b981",
              color: "#ffffff",
              padding: "0.25rem 0.65rem",
              borderRadius: "999px",
              fontSize: "0.75rem",
              fontWeight: 600
            }}>
              v2.1
            </span>
          </div>

          <h1 style={{ fontSize: "1.85rem", fontWeight: 800, margin: "0.25rem 0 0.5rem", letterSpacing: "-0.02em" }}>
            {isHindi ? "MPSCSC दावा पोर्टल — आसान उपयोग मार्गदर्शिका" : "MPSCSC Claims Portal — Complete User Guide"}
          </h1>
          <p style={{ margin: "0 0 1rem", fontSize: "0.98rem", opacity: 0.9, maxWidth: "800px", lineHeight: 1.5 }}>
            {isHindi
              ? "मध्यप्रदेश राज्य नागरिक आपूर्ति निगम के सभी कर्मचारियों और अधिकारियों के लिए यात्रा भत्ता (TA/DA), ट्रांसफर, मेडिकल एवं दौरा डायरी का सरल सचित्र गाइड।"
              : "Step-by-step bilingual guide for Travelling Allowance (TA/DA), Transfer Claims, Medical Reimbursement, and Tour Diaries under MP Government Rules."}
          </p>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center" }}>
            <a
              href="https://mpscsc-claims-portal.onrender.com/"
              target="_blank"
              rel="noreferrer"
              style={{
                background: "#ffffff",
                color: "#0e7c86",
                padding: "0.5rem 1rem",
                borderRadius: "8px",
                fontWeight: 700,
                fontSize: "0.88rem",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.45rem",
                boxShadow: "0 2px 8px rgba(0,0,0,0.12)"
              }}
            >
              <ExternalLink size={15} /> https://mpscsc-claims-portal.onrender.com/
            </a>

            <button
              onClick={() => window.print()}
              className="no-print"
              style={{
                background: "rgba(255,255,255,0.18)",
                color: "#ffffff",
                border: "1px solid rgba(255,255,255,0.35)",
                padding: "0.5rem 0.9rem",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: "0.85rem",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem"
              }}
            >
              <Printer size={15} /> {isHindi ? "गाइड प्रिंट करें" : "Print Guide"}
            </button>

            <button
              onClick={() => setLanguage(isHindi ? "en" : "hi")}
              className="no-print"
              style={{
                background: "#f59e0b",
                color: "#000000",
                border: "none",
                padding: "0.5rem 0.9rem",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: 700,
                fontSize: "0.85rem",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem"
              }}
            >
              <Globe size={15} /> {isHindi ? "Switch to English" : "सरल हिन्दी में बदलें"}
            </button>
          </div>
        </div>
      </div>

      {/* Control Toolbar: Search & Filter Pills */}
      <div className="no-print" style={{
        background: "var(--card-bg, #ffffff)",
        border: "1px solid var(--border-color, #e2e8f0)",
        borderRadius: "12px",
        padding: "1rem",
        marginBottom: "1.5rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem"
      }}>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
          {/* Search box */}
          <div style={{ position: "relative", flex: 1, minWidth: "260px" }}>
            <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isHindi ? "गाइड में खोजें (उदा: ट्रेन, होटल, पासवर्ड, DA, मेडिकल, रिक्त कॉलम)..." : "Search guide (e.g., train, hotel, password, DA, medical, hide blank)..."}
              style={{
                width: "100%",
                padding: "0.6rem 1rem 0.6rem 2.25rem",
                borderRadius: "8px",
                border: "1px solid var(--border-color, #cbd5e1)",
                fontSize: "0.9rem",
                outline: "none"
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                style={{
                  position: "absolute",
                  right: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#94a3b8",
                  fontSize: "0.85rem"
                }}
              >
                ✕
              </button>
            )}
          </div>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              onClick={expandAll}
              style={{
                padding: "0.45rem 0.75rem",
                fontSize: "0.82rem",
                borderRadius: "6px",
                background: "transparent",
                border: "1px solid var(--border-color, #cbd5e1)",
                cursor: "pointer"
              }}
            >
              {isHindi ? "सभी खोलें" : "Expand All"}
            </button>
            <button
              onClick={collapseAll}
              style={{
                padding: "0.45rem 0.75rem",
                fontSize: "0.82rem",
                borderRadius: "6px",
                background: "transparent",
                border: "1px solid var(--border-color, #cbd5e1)",
                cursor: "pointer"
              }}
            >
              {isHindi ? "सभी समेटें" : "Collapse All"}
            </button>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", overflowX: "auto", paddingTop: "0.25rem" }}>
          {categories.map(c => {
            const isActive = activeCategory === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setActiveCategory(c.id)}
                style={{
                  padding: "0.35rem 0.75rem",
                  fontSize: "0.82rem",
                  borderRadius: "20px",
                  border: isActive ? "1px solid #0e7c86" : "1px solid var(--border-color, #e2e8f0)",
                  background: isActive ? "#0e7c86" : "transparent",
                  color: isActive ? "#ffffff" : "inherit",
                  cursor: "pointer",
                  fontWeight: isActive ? 600 : 400,
                  transition: "all 0.15s ease"
                }}
              >
                {isHindi ? c.labelHi : c.labelEn}
              </button>
            );
          })}
        </div>
      </div>

      {/* SECTION 1: Online Start & Cold Start Warning */}
      {(activeCategory === "all" || activeCategory === "start") && (
        <div style={{
          background: "var(--card-bg, #ffffff)",
          border: "1px solid var(--border-color, #e2e8f0)",
          borderRadius: "12px",
          marginBottom: "1.25rem",
          overflow: "hidden"
        }}>
          <div
            onClick={() => toggleSection("intro")}
            style={{
              padding: "1rem 1.25rem",
              background: "rgba(14, 124, 134, 0.05)",
              borderBottom: openSections.intro ? "1px solid var(--border-color, #e2e8f0)" : "none",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              cursor: "pointer"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <Globe size={18} color="#0e7c86" />
              <h2 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>
                {isHindi ? "1. पोर्टल का ऑनलाइन उपयोग एवं जरूरी सूचना" : "1. Online Portal Access & Quick Start"}
              </h2>
            </div>
            {openSections.intro ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>

          {openSections.intro && (
            <div style={{ padding: "1.25rem" }}>
              <div style={{
                background: "rgba(245, 158, 11, 0.1)",
                borderLeft: "4px solid #f59e0b",
                padding: "1rem",
                borderRadius: "0 8px 8px 0",
                marginBottom: "1rem"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 700, color: "#b45309", marginBottom: "0.25rem" }}>
                  <AlertTriangle size={18} />
                  <span>{isHindi ? "महत्वपूर्ण सूचना: पहली बार लिंक खोलने पर 30 से 50 सेकंड लग सकते हैं" : "Important: 30-50s Wait Time on First Visit"}</span>
                </div>
                <p style={{ margin: 0, fontSize: "0.9rem", color: "#92400e", lineHeight: 1.5 }}>
                  {isHindi
                    ? "यह पोर्टल 24x7 रेंडर क्लाउड (Render Cloud) पर लाइव है। जब 15 मिनट तक कोई पोर्टल का उपयोग नहीं करता, तो सर्वर स्लीप मोड (Sleep Mode) में चला जाता है। इसलिए पहली बार लिंक खोलने पर थोड़ा धैर्य रखें और पेज को बार-बार रीफ्रेश न करें। 30-40 सेकंड में सर्वर जाग जाएगा!"
                    : "The portal is hosted 24x7 on Render Cloud. To conserve resources, the server sleeps after 15 minutes of inactivity. When visiting after an idle period, it takes 30-50 seconds to wake up. Please wait patiently without repeatedly refreshing the page."}
                </p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
                <div style={{ border: "1px solid var(--border-color, #e2e8f0)", padding: "1rem", borderRadius: "8px" }}>
                  <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#0e7c86", marginTop: 0 }}>
                    {isHindi ? "मोबाइल या कंप्यूटर में कैसे खोलें?" : "How to open on Mobile/PC"}
                  </h3>
                  <p style={{ fontSize: "0.88rem", margin: 0, lineHeight: 1.5 }}>
                    {isHindi
                      ? "अपने फोन या लैपटॉप के Chrome / Edge ब्राउज़र में सीधे https://mpscsc-claims-portal.onrender.com/ खोलें। कोई सॉफ्टवेयर इंस्टॉल नहीं करना है।"
                      : "Simply open https://mpscsc-claims-portal.onrender.com/ in any modern browser. No installations required."}
                  </p>
                </div>

                <div style={{ border: "1px solid var(--border-color, #e2e8f0)", padding: "1rem", borderRadius: "8px" }}>
                  <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#0e7c86", marginTop: 0 }}>
                    {isHindi ? "ऑफलाइन या लोकल उपयोग" : "Local Network / Offline Use"}
                  </h3>
                  <p style={{ fontSize: "0.88rem", margin: 0, lineHeight: 1.5 }}>
                    {isHindi
                      ? "यदि आपके कार्यालय में इंटरनेट न हो, तो मुख्य कंप्यूटर पर run_portal.bat चलाकर पूरे ऑफिस के LAN नेटवर्क पर बिना इंटरनेट भी चलाया जा सकता है।"
                      : "For offline branches or local LAN environments, running run_portal.bat allows complete offline usage without internet."}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION 2: Workflow Step Cards */}
      {(activeCategory === "all" || activeCategory === "start") && (
        <div style={{
          background: "var(--card-bg, #ffffff)",
          border: "1px solid var(--border-color, #e2e8f0)",
          borderRadius: "12px",
          marginBottom: "1.25rem",
          overflow: "hidden"
        }}>
          <div
            onClick={() => toggleSection("workflow")}
            style={{
              padding: "1rem 1.25rem",
              background: "rgba(14, 124, 134, 0.05)",
              borderBottom: openSections.workflow ? "1px solid var(--border-color, #e2e8f0)" : "none",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              cursor: "pointer"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <ArrowRight size={18} color="#0e7c86" />
              <h2 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>
                {isHindi ? "2. संपूर्ण दावा प्रक्रिया — 4 आसान चरणों में" : "2. Complete End-to-End Workflow in 4 Steps"}
              </h2>
            </div>
            {openSections.workflow ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>

          {openSections.workflow && (
            <div style={{ padding: "1.25rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
                <div style={{ background: "rgba(14, 124, 134, 0.06)", padding: "1rem", borderRadius: "10px", borderTop: "3px solid #0e7c86" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontWeight: 700, color: "#0e7c86", marginBottom: "0.4rem" }}>
                    <span style={{ background: "#0e7c86", color: "#fff", width: "22px", height: "22px", borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem" }}>1</span>
                    {isHindi ? "पंजीयन / लॉगिन" : "Register / Login"}
                  </div>
                  <p style={{ fontSize: "0.85rem", margin: 0, lineHeight: 1.45 }}>
                    {isHindi ? "ईमेल और पासवर्ड से लॉगिन करें। पहली बार आए हैं तो 'Register here' से तुरंत खाता बनाएं।" : "Login or create an account via 'Register here'."}
                  </p>
                </div>

                <div style={{ background: "rgba(99, 102, 241, 0.06)", padding: "1rem", borderRadius: "10px", borderTop: "3px solid #6366f1" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontWeight: 700, color: "#6366f1", marginBottom: "0.4rem" }}>
                    <span style={{ background: "#6366f1", color: "#fff", width: "22px", height: "22px", borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem" }}>2</span>
                    {isHindi ? "कर्मचारी मास्टर में नाम" : "Employee Master"}
                  </div>
                  <p style={{ fontSize: "0.85rem", margin: 0, lineHeight: 1.45 }}>
                    {isHindi ? "कर्मचारी का नाम, पदनाम, मूल वेतन और श्रेणी (A से E) दर्ज करें। यह सबसे जरूरी पहला काम है।" : "Add employee profile with Pay Level & Category (A-E)."}
                  </p>
                </div>

                <div style={{ background: "rgba(16, 185, 129, 0.06)", padding: "1rem", borderRadius: "10px", borderTop: "3px solid #10b981" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontWeight: 700, color: "#10b981", marginBottom: "0.4rem" }}>
                    <span style={{ background: "#10b981", color: "#fff", width: "22px", height: "22px", borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem" }}>3</span>
                    {isHindi ? "दावे का विवरण भरें" : "Enter Journeys / Bills"}
                  </div>
                  <p style={{ fontSize: "0.85rem", margin: 0, lineHeight: 1.45 }}>
                    {isHindi ? "यात्रा की तारीख, समय, ट्रेन/बस, टिकट व होटल का खर्चा भरें। राशि सरकारी नियम से अपने आप जुड़ेगी।" : "Fill tour legs, travel class, tickets, and stay bills."}
                  </p>
                </div>

                <div style={{ background: "rgba(245, 158, 11, 0.06)", padding: "1rem", borderRadius: "10px", borderTop: "3px solid #f59e0b" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontWeight: 700, color: "#d97706", marginBottom: "0.4rem" }}>
                    <span style={{ background: "#d97706", color: "#fff", width: "22px", height: "22px", borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem" }}>4</span>
                    {isHindi ? "प्रपत्र 21 व एक्सेल प्रिंट" : "Form 21 Bill & Print"}
                  </div>
                  <p style={{ fontSize: "0.85rem", margin: 0, lineHeight: 1.45 }}>
                    {isHindi ? "'रिक्त कॉलम छिपाएं' दबाएं, और A4 Landscape में साफ-सुथरा बिल प्रिंट निकालें या Excel डाउनलोड करें।" : "Use 'Hide Blank Columns' and print Form 21 or export Excel."}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION 3: Login & Password */}
      {(activeCategory === "all" || activeCategory === "auth") && (
        <div style={{
          background: "var(--card-bg, #ffffff)",
          border: "1px solid var(--border-color, #e2e8f0)",
          borderRadius: "12px",
          marginBottom: "1.25rem",
          overflow: "hidden"
        }}>
          <div
            onClick={() => toggleSection("auth")}
            style={{
              padding: "1rem 1.25rem",
              background: "rgba(14, 124, 134, 0.05)",
              borderBottom: openSections.auth ? "1px solid var(--border-color, #e2e8f0)" : "none",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              cursor: "pointer"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <Key size={18} color="#0e7c86" />
              <h2 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>
                {isHindi ? "3. लॉगिन, पासवर्ड एवं सुरक्षा (Login & Security)" : "3. Login, Password Recovery & Security"}
              </h2>
            </div>
            {openSections.auth ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>

          {openSections.auth && (
            <div style={{ padding: "1.25rem", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1rem" }}>
              <div style={{ border: "1px solid var(--border-color, #e2e8f0)", padding: "1rem", borderRadius: "8px" }}>
                <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#0e7c86", marginTop: 0 }}>
                  {isHindi ? "पासवर्ड भूल जाएं तो क्या करें?" : "Forgot Password?"}
                </h3>
                <ul style={{ margin: 0, paddingLeft: "1.2rem", fontSize: "0.85rem", lineHeight: 1.6 }}>
                  <li>{isHindi ? "लॉगिन पेज पर 'Forgot Password?' पर क्लिक करें।" : "Click 'Forgot Password?' on login page."}</li>
                  <li>{isHindi ? "अपना पंजीकृत ईमेल डालें, स्क्रीन पर तुरंत रीसेट लिंक मिल जाएगा।" : "Enter registered email to get instant reset link."}</li>
                  <li>{isHindi ? "या अपने जिला प्रबंधक/एडमिन से कहें, वे 1 क्लिक में नया पासवर्ड बना सकते हैं।" : "Or contact Admin for immediate password override."}</li>
                </ul>
              </div>

              <div style={{ border: "1px solid var(--border-color, #e2e8f0)", padding: "1rem", borderRadius: "8px" }}>
                <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#0e7c86", marginTop: 0 }}>
                  {isHindi ? "15 मिनट की सुरक्षा — अपने आप लॉगआउट" : "15-Min Auto Logout Security"}
                </h3>
                <ul style={{ margin: 0, paddingLeft: "1.2rem", fontSize: "0.85rem", lineHeight: 1.6 }}>
                  <li>{isHindi ? "यदि आप 15 मिनट तक कंप्यूटर पर कोई काम नहीं करते, तो पोर्टल अपने आप बंद हो जाता है।" : "Protects against unattended desk access."}</li>
                  <li>{isHindi ? "14 मिनट पर 60 सेकंड की चेतावनी आती है, बस 'Stay Logged In' दबाएं।" : "Click 'Stay Logged In' on warning dialog."}</li>
                  <li>{isHindi ? "इससे आपके बिलों में कोई दूसरा व्यक्ति छेड़छाड़ नहीं कर सकता।" : "Ensures statutory financial integrity."}</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION 4: Employee Master */}
      {(activeCategory === "all" || activeCategory === "employees") && (
        <div style={{
          background: "var(--card-bg, #ffffff)",
          border: "1px solid var(--border-color, #e2e8f0)",
          borderRadius: "12px",
          marginBottom: "1.25rem",
          overflow: "hidden"
        }}>
          <div
            onClick={() => toggleSection("employees")}
            style={{
              padding: "1rem 1.25rem",
              background: "rgba(14, 124, 134, 0.05)",
              borderBottom: openSections.employees ? "1px solid var(--border-color, #e2e8f0)" : "none",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              cursor: "pointer"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <Users size={18} color="#0e7c86" />
              <h2 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>
                {isHindi ? "4. कर्मचारी मास्टर — सबसे पहला और जरूरी काम" : "4. Employee Master & Category Entitlements"}
              </h2>
            </div>
            {openSections.employees ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>

          {openSections.employees && (
            <div style={{ padding: "1.25rem" }}>
              <p style={{ fontSize: "0.9rem", marginTop: 0, lineHeight: 1.5 }}>
                {isHindi
                  ? "किसी भी कर्मचारी का यात्रा, ट्रांसफर या मेडिकल दावा बनाने से पहले उसका नाम 'कर्मचारी मास्टर' (/employees) में दर्ज होना अनिवार्य है। कर्मचारी की श्रेणी (A से E) ही तय करती है कि उन्हें कौन सी रेल श्रेणी और कितना दैनिक भत्ता मिलेगा:"
                  : "Employees must be registered in Employee Master (/employees) before creating claims. The assigned category governs travel class and DA eligibility:"}
              </p>

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                  <thead>
                    <tr style={{ background: "rgba(14, 124, 134, 0.1)", textAlign: "left" }}>
                      <th style={{ padding: "0.5rem 0.75rem", border: "1px solid var(--border-color, #e2e8f0)" }}>{isHindi ? "श्रेणी" : "Category"}</th>
                      <th style={{ padding: "0.5rem 0.75rem", border: "1px solid var(--border-color, #e2e8f0)" }}>{isHindi ? "पात्र पद / वेतन स्तर" : "Eligible Posts / Pay Level"}</th>
                      <th style={{ padding: "0.5rem 0.75rem", border: "1px solid var(--border-color, #e2e8f0)" }}>{isHindi ? "रेल यात्रा पात्रता" : "Train Entitlement"}</th>
                      <th style={{ padding: "0.5rem 0.75rem", border: "1px solid var(--border-color, #e2e8f0)" }}>{isHindi ? "महानगर दैनिक भत्ता" : "Metro DA (₹/day)"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ padding: "0.5rem 0.75rem", border: "1px solid var(--border-color, #e2e8f0)", fontWeight: 700 }}>श्रेणी A (क)</td>
                      <td style={{ padding: "0.5rem 0.75rem", border: "1px solid var(--border-color, #e2e8f0)" }}>वरिष्ठ अधिकारी / जिला प्रबंधक (लेवल 14+)</td>
                      <td style={{ padding: "0.5rem 0.75rem", border: "1px solid var(--border-color, #e2e8f0)" }}>AC 1st Class / हवाई यात्रा</td>
                      <td style={{ padding: "0.5rem 0.75rem", border: "1px solid var(--border-color, #e2e8f0)", fontWeight: 600 }}>₹750</td>
                    </tr>
                    <tr>
                      <td style={{ padding: "0.5rem 0.75rem", border: "1px solid var(--border-color, #e2e8f0)", fontWeight: 700 }}>श्रेणी B (ख)</td>
                      <td style={{ padding: "0.5rem 0.75rem", border: "1px solid var(--border-color, #e2e8f0)" }}>लेवल 10 से 13 के अधिकारी</td>
                      <td style={{ padding: "0.5rem 0.75rem", border: "1px solid var(--border-color, #e2e8f0)" }}>AC 2-Tier / AC बस</td>
                      <td style={{ padding: "0.5rem 0.75rem", border: "1px solid var(--border-color, #e2e8f0)", fontWeight: 600 }}>₹600</td>
                    </tr>
                    <tr>
                      <td style={{ padding: "0.5rem 0.75rem", border: "1px solid var(--border-color, #e2e8f0)", fontWeight: 700 }}>श्रेणी C (ग)</td>
                      <td style={{ padding: "0.5rem 0.75rem", border: "1px solid var(--border-color, #e2e8f0)" }}>लेवल 7 से 9 (सहायक लेखा अधिकारी आदि)</td>
                      <td style={{ padding: "0.5rem 0.75rem", border: "1px solid var(--border-color, #e2e8f0)" }}>AC 3-Tier / डीलक्स बस</td>
                      <td style={{ padding: "0.5rem 0.75rem", border: "1px solid var(--border-color, #e2e8f0)", fontWeight: 600 }}>₹450</td>
                    </tr>
                    <tr>
                      <td style={{ padding: "0.5rem 0.75rem", border: "1px solid var(--border-color, #e2e8f0)", fontWeight: 700 }}>श्रेणी D (घ)</td>
                      <td style={{ padding: "0.5rem 0.75rem", border: "1px solid var(--border-color, #e2e8f0)" }}>लेवल 4 से 6 (सहायक, लिपिक वर्ग)</td>
                      <td style={{ padding: "0.5rem 0.75rem", border: "1px solid var(--border-color, #e2e8f0)" }}>स्लीपर क्लास / एक्सप्रेस बस</td>
                      <td style={{ padding: "0.5rem 0.75rem", border: "1px solid var(--border-color, #e2e8f0)", fontWeight: 600 }}>₹375</td>
                    </tr>
                    <tr>
                      <td style={{ padding: "0.5rem 0.75rem", border: "1px solid var(--border-color, #e2e8f0)", fontWeight: 700 }}>श्रेणी E (ड़)</td>
                      <td style={{ padding: "0.5rem 0.75rem", border: "1px solid var(--border-color, #e2e8f0)" }}>लेवल 1 से 3 (भृत्य, चालक आदि)</td>
                      <td style={{ padding: "0.5rem 0.75rem", border: "1px solid var(--border-color, #e2e8f0)" }}>साधारण द्वितीय श्रेणी</td>
                      <td style={{ padding: "0.5rem 0.75rem", border: "1px solid var(--border-color, #e2e8f0)", fontWeight: 600 }}>₹260</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION 5: TA/DA Claims & Form 21 */}
      {(activeCategory === "all" || activeCategory === "tada") && (
        <div style={{
          background: "var(--card-bg, #ffffff)",
          border: "1px solid var(--border-color, #e2e8f0)",
          borderRadius: "12px",
          marginBottom: "1.25rem",
          overflow: "hidden"
        }}>
          <div
            onClick={() => toggleSection("tada")}
            style={{
              padding: "1rem 1.25rem",
              background: "rgba(14, 124, 134, 0.05)",
              borderBottom: openSections.tada ? "1px solid var(--border-color, #e2e8f0)" : "none",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              cursor: "pointer"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <FileText size={18} color="#0e7c86" />
              <h2 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>
                {isHindi ? "5. यात्रा भत्ता (TA/DA) एवं प्रपत्र 21 देयक" : "5. TA/DA Claims & Statutory Form 21 Bill"}
              </h2>
            </div>
            {openSections.tada ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>

          {openSections.tada && (
            <div style={{ padding: "1.25rem" }}>
              <div style={{
                background: "rgba(16, 185, 129, 0.08)",
                border: "1px solid #10b981",
                padding: "1rem",
                borderRadius: "8px",
                marginBottom: "1.25rem"
              }}>
                <div style={{ fontWeight: 700, color: "#065f46", display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.3rem" }}>
                  <Sparkles size={17} />
                  <span>{isHindi ? "जादुई बटन: 'रिक्त कॉलम छिपाएं' (Hide Blank Columns)" : "Feature: Hide Blank Columns (1..N Auto-Numbering)"}</span>
                </div>
                <p style={{ margin: 0, fontSize: "0.88rem", color: "#047857", lineHeight: 1.5 }}>
                  {isHindi
                    ? "मध्यप्रदेश शासन के प्रपत्र 21 में 21 कॉलम होते हैं। दौरे में जो कॉलम खाली रह जाते हैं (जैसे ट्रांसफर अनुदान या सामान भाड़ा), उन्हें हटाने के लिए बिल के ऊपर 'Hide Blank Columns' बटन दबाएं। सभी खाली कॉलम गायब हो जाएंगे, और बचे हुए कॉलमों के नंबर अपने आप 1, 2, 3... हो जाएंगे!"
                    : "Official Form 21 contains 21 columns. Click 'Hide Blank Columns' in the bill toolbar to omit unused columns. The visible columns automatically renumber sequentially (1, 2, 3... N) with 100% full-width page scaling."}
                </p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
                <div style={{ border: "1px solid var(--border-color, #e2e8f0)", padding: "1rem", borderRadius: "8px" }}>
                  <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#0e7c86", marginTop: 0 }}>
                    {isHindi ? "यात्रा फेरा दर्ज करना (Journey Legs)" : "Entering Journey Legs"}
                  </h3>
                  <ul style={{ margin: 0, paddingLeft: "1.2rem", fontSize: "0.85rem", lineHeight: 1.6 }}>
                    <li>{isHindi ? "प्रस्थान व आगमन की तारीख, समय और स्टेशन भरें।" : "Enter departure and arrival dates, times, stations."}</li>
                    <li>{isHindi ? "ट्रेन, बस, कार या बाइक चुनें (क्लास अपने आप बदलेगा)।" : "Travel class dropdown filters dynamically based on mode."}</li>
                    <li>{isHindi ? "टिकट/PNR नंबर और वास्तविक किराया लिखें।" : "Enter ticket/PNR and actual ticket fare."}</li>
                  </ul>
                </div>

                <div style={{ border: "1px solid var(--border-color, #e2e8f0)", padding: "1rem", borderRadius: "8px" }}>
                  <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#0e7c86", marginTop: 0 }}>
                    {isHindi ? "रुकने का भत्ता (Stay Allowance)" : "Stay Allowance Options"}
                  </h3>
                  <ul style={{ margin: 0, paddingLeft: "1.2rem", fontSize: "0.85rem", lineHeight: 1.6 }}>
                    <li>{isHindi ? "होटल बिल: वास्तविक होटल रसीद भरें (नियम अनुसार अधिकतम सीमा अपने आप लगेगी)।" : "Hotel: Reimbursed up to statutory ceiling."}</li>
                    <li>{isHindi ? "मित्र/रिश्तेदार: बिना बिल के फिक्स दैनिक भत्ता (₹370 से ₹750/दिन)।" : "Friends stay: Fixed statutory allowance without bills."}</li>
                    <li>{isHindi ? "दौरा अग्रिम (TA Advance) लिया हो तो कटौती में भरें।" : "Tour advance is subtracted automatically."}</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION 6: Tour Diary */}
      {(activeCategory === "all" || activeCategory === "tour") && (
        <div style={{
          background: "var(--card-bg, #ffffff)",
          border: "1px solid var(--border-color, #e2e8f0)",
          borderRadius: "12px",
          marginBottom: "1.25rem",
          overflow: "hidden"
        }}>
          <div
            onClick={() => toggleSection("tour")}
            style={{
              padding: "1rem 1.25rem",
              background: "rgba(14, 124, 134, 0.05)",
              borderBottom: openSections.tour ? "1px solid var(--border-color, #e2e8f0)" : "none",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              cursor: "pointer"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <FileSpreadsheet size={18} color="#0e7c86" />
              <h2 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>
                {isHindi ? "6. शासकीय दौरा डायरी एवं दैनिक भत्ता (Tour Diary & DA)" : "6. Tour Diary & Daily Allowance Rules"}
              </h2>
            </div>
            {openSections.tour ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>

          {openSections.tour && (
            <div style={{ padding: "1.25rem" }}>
              <p style={{ fontSize: "0.9rem", marginTop: 0, lineHeight: 1.5 }}>
                {isHindi
                  ? "दौरे के प्रत्येक दिन किए गए शासकीय निरीक्षण या बैठक का विवरण दर्ज करें। सिस्टम यात्रा और ठहराव अवधि के अनुसार दैनिक भत्ता (DA) का सरकारी नियम अपने आप लगाता है:"
                  : "Daily inspection logs and duties performed. The system applies MP Govt DA slabs automatically based on journey hours:"}
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.75rem" }}>
                <div style={{ background: "rgba(239, 68, 68, 0.06)", border: "1px solid #f87171", padding: "0.75rem", borderRadius: "8px" }}>
                  <div style={{ fontWeight: 700, color: "#dc2626", fontSize: "0.85rem" }}>{isHindi ? "6 घंटे या कम" : "≤ 6 Hours"}</div>
                  <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#991b1b" }}>0% DA</div>
                  <div style={{ fontSize: "0.78rem", color: "#64748b" }}>{isHindi ? "दैनिक भत्ता नहीं मिलेगा" : "No daily allowance"}</div>
                </div>

                <div style={{ background: "rgba(245, 158, 11, 0.06)", border: "1px solid #fbbf24", padding: "0.75rem", borderRadius: "8px" }}>
                  <div style={{ fontWeight: 700, color: "#d97706", fontSize: "0.85rem" }}>{isHindi ? "6 से 12 घंटे" : "6 to 12 Hours"}</div>
                  <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#92400e" }}>50% DA</div>
                  <div style={{ fontSize: "0.78rem", color: "#64748b" }}>{isHindi ? "आधा दैनिक भत्ता" : "Half daily allowance"}</div>
                </div>

                <div style={{ background: "rgba(16, 185, 129, 0.06)", border: "1px solid #34d399", padding: "0.75rem", borderRadius: "8px" }}>
                  <div style={{ fontWeight: 700, color: "#059669", fontSize: "0.85rem" }}>{isHindi ? "12 घंटे से अधिक" : "> 12 Hours"}</div>
                  <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#065f46" }}>100% DA</div>
                  <div style={{ fontSize: "0.78rem", color: "#64748b" }}>{isHindi ? "पूरा दैनिक भत्ता" : "Full daily allowance"}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION 7: Transfer Claim */}
      {(activeCategory === "all" || activeCategory === "transfer") && (
        <div style={{
          background: "var(--card-bg, #ffffff)",
          border: "1px solid var(--border-color, #e2e8f0)",
          borderRadius: "12px",
          marginBottom: "1.25rem",
          overflow: "hidden"
        }}>
          <div
            onClick={() => toggleSection("transfer")}
            style={{
              padding: "1rem 1.25rem",
              background: "rgba(14, 124, 134, 0.05)",
              borderBottom: openSections.transfer ? "1px solid var(--border-color, #e2e8f0)" : "none",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              cursor: "pointer"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <ArrowLeftRight size={18} color="#0e7c86" />
              <h2 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>
                {isHindi ? "7. स्थानांतरण दावा (Transfer Claim)" : "7. Transfer Claims & Relocation Entitlements"}
              </h2>
            </div>
            {openSections.transfer ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>

          {openSections.transfer && (
            <div style={{ padding: "1.25rem", fontSize: "0.88rem", lineHeight: 1.6 }}>
              <p style={{ marginTop: 0 }}>
                {isHindi
                  ? "एक जिले से दूसरे जिले में ट्रांसफर होने पर सामान, ट्रक भाड़ा, पैकिंग और परिवार का टिकट क्लेम करने हेतु यह दावा भरा जाता है:"
                  : "Used when an employee is transferred across stations. Covers baggage, goods transport, packing, and family tickets:"}
              </p>
              <ul style={{ margin: 0, paddingLeft: "1.2rem" }}>
                <li><strong>{isHindi ? "52 जिलों की ड्रॉपडाउन लिस्ट:" : "52 MP Districts:"}</strong> {isHindi ? "पुराना और नया मुख्यालय आसानी से चुनें।" : "Select origin and new posting station."}</li>
                <li><strong>{isHindi ? "सामान भार (Baggage Weight):" : "Baggage Limits:"}</strong> {isHindi ? "कैट A/B हेतु 6,000 किग्रा, कैट C हेतु 3,000 किग्रा, कैट D हेतु 1,500 किग्रा तक।" : "Cat A/B: 6,000kg, Cat C: 3,000kg, Cat D: 1,500kg."}</li>
                <li><strong>{isHindi ? "ट्रक भाड़ा (Goods Transport):" : "Goods Transit Rate:"}</strong> {isHindi ? "सड़क मार्ग से ₹40/किमी (कैट A/B) और ₹25/किमी (कैट C/D) तक।" : "Reimbursed up to ₹40/km (Cat A/B) or ₹25/km (Cat C/D)."}</li>
                <li><strong>{isHindi ? "मुश्त स्थानांतरण अनुदान (Transfer Grant):" : "Composite Grant:"}</strong> {isHindi ? "श्रेणी अनुसार ₹1,800 से ₹6,500 तक एकमुश्त अनुदान अपने आप जुड़ जाता है।" : "Lump sum grant (₹1,800 to ₹6,500) applied automatically."}</li>
              </ul>
            </div>
          )}
        </div>
      )}

      {/* SECTION 8: Medical Claim */}
      {(activeCategory === "all" || activeCategory === "medical") && (
        <div style={{
          background: "var(--card-bg, #ffffff)",
          border: "1px solid var(--border-color, #e2e8f0)",
          borderRadius: "12px",
          marginBottom: "1.25rem",
          overflow: "hidden"
        }}>
          <div
            onClick={() => toggleSection("medical")}
            style={{
              padding: "1rem 1.25rem",
              background: "rgba(14, 124, 134, 0.05)",
              borderBottom: openSections.medical ? "1px solid var(--border-color, #e2e8f0)" : "none",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              cursor: "pointer"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <HeartPulse size={18} color="#0e7c86" />
              <h2 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>
                {isHindi ? "8. चिकित्सा प्रतिपूर्ति दावा (Medical Claim)" : "8. Medical Reimbursement Claims"}
              </h2>
            </div>
            {openSections.medical ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>

          {openSections.medical && (
            <div style={{ padding: "1.25rem", fontSize: "0.88rem", lineHeight: 1.6 }}>
              <ul style={{ margin: 0, paddingLeft: "1.2rem" }}>
                <li><strong>{isHindi ? "रोगी की जानकारी:" : "Patient Details:"}</strong> {isHindi ? "मरीज का नाम, कर्मचारी से संबंध (स्वयं, पत्नी, बच्चे, माता-पिता), बीमारी का नाम और इलाज की अवधि लिखें।" : "Patient name, relationship, diagnosis, and treatment dates."}</li>
                <li><strong>{isHindi ? "बिल जोड़ें (+ Add Bill Item):" : "Add Bills:"}</strong> {isHindi ? "डॉक्टर फीस (Consultation), दवाइयां (Medicine), और जांच (Test) के रसीद नंबर व राशि भरें।" : "Itemize consultations, medicines, and pathology test receipts."}</li>
                <li><strong>{isHindi ? "हिंदी फॉर्म प्रिंट:" : "Hindi Print Form:"}</strong> {isHindi ? "म.प्र. चिकित्सा नियमों के अनुसार पूरा भरा हुआ आवेदन पत्र 1 क्लिक में प्रिंट निकालें।" : "Prints standard MP Medical Attendance Rules claim form."}</li>
              </ul>
            </div>
          )}
        </div>
      )}

      {/* SECTION 9: Reports & Admin */}
      {(activeCategory === "all" || activeCategory === "reports" || activeCategory === "admin") && (
        <div style={{
          background: "var(--card-bg, #ffffff)",
          border: "1px solid var(--border-color, #e2e8f0)",
          borderRadius: "12px",
          marginBottom: "1.25rem",
          overflow: "hidden"
        }}>
          <div
            onClick={() => toggleSection("reports")}
            style={{
              padding: "1rem 1.25rem",
              background: "rgba(14, 124, 134, 0.05)",
              borderBottom: openSections.reports ? "1px solid var(--border-color, #e2e8f0)" : "none",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              cursor: "pointer"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <BarChart2 size={18} color="#0e7c86" />
              <h2 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>
                {isHindi ? "9. रिपोर्ट्स, एक्सेल डाउनलोड एवं व्यवस्थापक (Admin) कार्य" : "9. Reports, Excel Export & Admin Controls"}
              </h2>
            </div>
            {openSections.reports ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>

          {openSections.reports && (
            <div style={{ padding: "1.25rem", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
              <div style={{ border: "1px solid var(--border-color, #e2e8f0)", padding: "1rem", borderRadius: "8px" }}>
                <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#0e7c86", marginTop: 0 }}>
                  {isHindi ? "एक्सेल डाउनलोड (Excel Export)" : "Excel Export (.xlsx)"}
                </h3>
                <p style={{ fontSize: "0.85rem", margin: 0, lineHeight: 1.5 }}>
                  {isHindi
                    ? "रिपोर्ट्स पन्ने पर या प्रपत्र 21 बिल पर हरे रंग के 'Export to Excel' बटन पर क्लिक करें। पूरे दावों की सुंदर एक्सेल फाइल तुरंत आपके फोन या कंप्यूटर पर डाउनलोड हो जाएगी।"
                    : "Download complete claims registers and Form 21 bills as formatted Excel spreadsheets via SheetJS."}
                </p>
              </div>

              <div style={{ border: "1px solid var(--border-color, #e2e8f0)", padding: "1rem", borderRadius: "8px" }}>
                <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#0e7c86", marginTop: 0 }}>
                  {isHindi ? "एडमिन: कर्मचारी स्क्रीन देखना (Impersonation)" : "Admin User Impersonation"}
                </h3>
                <p style={{ fontSize: "0.85rem", margin: 0, lineHeight: 1.5 }}>
                  {isHindi
                    ? "यदि किसी कर्मचारी को बिल भरने में दिक्कत हो, तो एडमिन 'Log In As This User' दबाकर बिना पासवर्ड के उसकी स्क्रीन में जाकर बिल देख सकते हैं और ऊपर दिए पीले बटन से वापस एडमिन में आ सकते हैं।"
                    : "Administrators can assume user sessions without passwords, view issues, and safely exit back to admin anytime."}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION 10: FAQ */}
      {(activeCategory === "all" || activeCategory === "faq") && (
        <div style={{
          background: "var(--card-bg, #ffffff)",
          border: "1px solid var(--border-color, #e2e8f0)",
          borderRadius: "12px",
          marginBottom: "1.5rem",
          overflow: "hidden"
        }}>
          <div
            onClick={() => toggleSection("faq")}
            style={{
              padding: "1rem 1.25rem",
              background: "rgba(14, 124, 134, 0.05)",
              borderBottom: openSections.faq ? "1px solid var(--border-color, #e2e8f0)" : "none",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              cursor: "pointer"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <HelpCircle size={18} color="#0e7c86" />
              <h2 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>
                {isHindi ? "10. अक्सर पूछे जाने वाले सवाल (FAQ)" : "10. Frequently Asked Questions"}
              </h2>
            </div>
            {openSections.faq ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>

          {openSections.faq && (
            <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              <div style={{ borderBottom: "1px solid var(--border-color, #f1f5f9)", paddingBottom: "0.75rem" }}>
                <strong style={{ fontSize: "0.9rem", color: "#0e7c86" }}>
                  {isHindi ? "प्र. 1: क्या मैं इस पोर्टल को अपने मोबाइल फोन पर भी चला सकता हूँ?" : "Q1: Can I use this portal on a mobile phone?"}
                </strong>
                <p style={{ margin: "0.25rem 0 0", fontSize: "0.85rem", color: "#475569" }}>
                  {isHindi
                    ? "उत्तर: हाँ! अपने मोबाइल के Chrome या किसी भी ब्राउज़र में सीधे https://mpscsc-claims-portal.onrender.com/ खोलें और आसानी से दावे भरें।"
                    : "Ans: Yes! Open https://mpscsc-claims-portal.onrender.com/ directly on your mobile browser."}
                </p>
              </div>

              <div style={{ borderBottom: "1px solid var(--border-color, #f1f5f9)", paddingBottom: "0.75rem" }}>
                <strong style={{ fontSize: "0.9rem", color: "#0e7c86" }}>
                  {isHindi ? "प्र. 2: पहली बार लिंक खोलने पर 30-50 सेकंड का समय क्यों लगता है?" : "Q2: Why does the first load take 30-50 seconds?"}
                </strong>
                <p style={{ margin: "0.25rem 0 0", fontSize: "0.85rem", color: "#475569" }}>
                  {isHindi
                    ? "उत्तर: रेंडर क्लाउड पर 15 मिनट निष्क्रिय रहने पर सर्वर स्लीप में चला जाता है। पहली बार खोलने पर सर्वर को चालू होने में 30-40 सेकंड लगते हैं। कृपया थोड़ा इंतजार करें, पोर्टल खुल जाएगा!"
                    : "Ans: Free cloud instances sleep after 15m of inactivity. Please wait 30-40 seconds on the first visit while the server spins up."}
                </p>
              </div>

              <div style={{ borderBottom: "1px solid var(--border-color, #f1f5f9)", paddingBottom: "0.75rem" }}>
                <strong style={{ fontSize: "0.9rem", color: "#0e7c86" }}>
                  {isHindi ? "प्र. 3: प्रपत्र 21 पर 'देयक पारित आदेश' (Passing Order) क्यों नहीं दिख रहा?" : "Q3: Why is Passing Order hidden on my Form 21 Bill?"}
                </strong>
                <p style={{ margin: "0.25rem 0 0", fontSize: "0.85rem", color: "#475569" }}>
                  {isHindi
                    ? "उत्तर: पारित आदेश केवल सक्षम अधिकारी (Admin) के लॉगिन में दिखता है। सामान्य कर्मचारी के बिल पर केवल कर्मचारी के हस्ताक्षर आते हैं।"
                    : "Ans: Section 4 Passing Order is strictly restricted to controlling officers / administrators."}
                </p>
              </div>

              <div>
                <strong style={{ fontSize: "0.9rem", color: "#0e7c86" }}>
                  {isHindi ? "प्र. 4: प्रपत्र 21 में खाली कॉलम कैसे हटाएं?" : "Q4: How do I hide empty columns in Form 21 Bill?"}
                </strong>
                <p style={{ margin: "0.25rem 0 0", fontSize: "0.85rem", color: "#475569" }}>
                  {isHindi
                    ? "उत्तर: बिल के ऊपर दिए गए 'Hide Blank Columns' (रिक्त कॉलम छिपाएं) बटन को दबाएं। सारे खाली कॉलम तुरंत छिप जाएंगे।"
                    : "Ans: Click the 'Hide Blank Columns' button in the toolbar above the bill."}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer Navigation Bar */}
      <div className="no-print" style={{
        textAlign: "center",
        padding: "1.5rem",
        borderTop: "1px solid var(--border-color, #e2e8f0)",
        color: "#64748b",
        fontSize: "0.85rem"
      }}>
        <div style={{ marginBottom: "0.5rem" }}>
          <Link to="/" style={{ color: "#0e7c86", fontWeight: 600, textDecoration: "none", marginRight: "1rem" }}>
            ← {isHindi ? "डैशबोर्ड पर वापस जाएं" : "Back to Dashboard"}
          </Link>
          <Link to="/claims/tada" style={{ color: "#0e7c86", fontWeight: 600, textDecoration: "none" }}>
            {isHindi ? "टीए/डीए दावा बनाएं →" : "Create TA/DA Claim →"}
          </Link>
        </div>
        <div>
          MPSCSC Claims Portal © 2026 · मध्यप्रदेश राज्य नागरिक आपूर्ति निगम
        </div>
      </div>
    </div>
  );
}
