import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  HelpCircle, Search, Printer, Globe, ArrowRight, ArrowDown, CheckCircle2,
  AlertTriangle, Users, FileText, ArrowLeftRight, HeartPulse,
  FileSpreadsheet, BarChart2, ShieldCheck, Key, ExternalLink,
  ChevronDown, ChevronUp, Sparkles, BookOpen, Clock, GitFork,
  Check, X, FileCheck, Layers, CornerDownRight, HelpCircle as QuestionIcon
} from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";

export default function HelpGuide() {
  const { language, setLanguage } = useLanguage();
  const [activeTab, setActiveTab] = useState("flowcharts"); // "flowcharts" | "stepwise" | "faq"
  const [activeFlowchart, setActiveFlowchart] = useState("overall"); // "overall" | "tada" | "transfer" | "medical" | "admin"
  const [searchQuery, setSearchQuery] = useState("");
  const [openStepModule, setOpenStepModule] = useState({
    start: true,
    emp: true,
    tada: true,
    tour: true,
    transfer: false,
    medical: false,
    reports: false,
    admin: false
  });

  const toggleStepModule = (mod) => {
    setOpenStepModule(prev => ({ ...prev, [mod]: !prev[mod] }));
  };

  const isHindi = language === "hi";

  // Flowchart Node Component for visual diagrams
  const FlowNode = ({ number, titleHi, titleEn, descHi, descEn, icon: Icon, color = "#0e7c86", badge }) => (
    <div style={{
      background: "var(--card-bg, #ffffff)",
      border: `2px solid ${color}`,
      borderRadius: "12px",
      padding: "1rem",
      boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
      position: "relative",
      minWidth: "240px",
      maxWidth: "320px",
      flex: 1
    }}>
      {number && (
        <span style={{
          position: "absolute",
          top: "-12px",
          left: "14px",
          background: color,
          color: "#ffffff",
          fontWeight: 800,
          fontSize: "0.75rem",
          padding: "2px 8px",
          borderRadius: "999px"
        }}>
          {isHindi ? `चरण ${number}` : `Step ${number}`}
        </span>
      )}
      {badge && (
        <span style={{
          position: "absolute",
          top: "-12px",
          right: "14px",
          background: "#f59e0b",
          color: "#000",
          fontWeight: 700,
          fontSize: "0.7rem",
          padding: "2px 8px",
          borderRadius: "999px"
        }}>
          {badge}
        </span>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem", marginTop: number ? "0.2rem" : 0 }}>
        {Icon && <Icon size={18} color={color} />}
        <strong style={{ fontSize: "0.95rem", color: color }}>
          {isHindi ? titleHi : titleEn}
        </strong>
      </div>
      <p style={{ margin: 0, fontSize: "0.82rem", color: "#475569", lineHeight: 1.45 }}>
        {isHindi ? descHi : descEn}
      </p>
    </div>
  );

  const FlowConnector = ({ label, direction = "down" }) => (
    <div style={{
      display: "flex",
      flexDirection: direction === "down" ? "column" : "row",
      alignItems: "center",
      justifyContent: "center",
      padding: "0.5rem",
      color: "#0e7c86",
      fontWeight: 700,
      fontSize: "0.75rem"
    }}>
      {direction === "down" ? (
        <>
          {label && <span style={{ background: "rgba(14, 124, 134, 0.1)", padding: "2px 8px", borderRadius: "4px", marginBottom: "2px" }}>{label}</span>}
          <ArrowDown size={20} strokeWidth={2.5} />
        </>
      ) : (
        <>
          {label && <span style={{ background: "rgba(14, 124, 134, 0.1)", padding: "2px 8px", borderRadius: "4px", marginRight: "4px" }}>{label}</span>}
          <ArrowRight size={20} strokeWidth={2.5} />
        </>
      )}
    </div>
  );

  const DecisionNode = ({ questionHi, questionEn, yesLabelHi = "हाँ (Yes)", noLabelHi = "नहीं (No)" }) => (
    <div style={{
      background: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)",
      border: "2px dashed #f59e0b",
      borderRadius: "14px",
      padding: "1rem",
      maxWidth: "340px",
      textAlign: "center",
      boxShadow: "0 4px 12px rgba(245, 158, 11, 0.15)",
      margin: "0 auto"
    }}>
      <div style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", color: "#b45309", fontWeight: 800, fontSize: "0.95rem", marginBottom: "0.4rem" }}>
        <QuestionIcon size={18} />
        {isHindi ? "जांच / निर्णय (Decision)" : "Decision Point"}
      </div>
      <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "#78350f", marginBottom: "0.5rem" }}>
        {isHindi ? questionHi : questionEn}
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: "1rem", fontSize: "0.78rem", fontWeight: 700 }}>
        <span style={{ color: "#15803d", background: "#dcfce7", padding: "2px 8px", borderRadius: "4px" }}>✓ {yesLabelHi}</span>
        <span style={{ color: "#b91c1c", background: "#fee2e2", padding: "2px 8px", borderRadius: "4px" }}>✗ {noLabelHi}</span>
      </div>
    </div>
  );

  return (
    <div className="help-guide-page" style={{ padding: "1.25rem", maxWidth: "1280px", margin: "0 auto" }}>
      {/* Hero Header */}
      <div style={{
        background: "linear-gradient(135deg, #0e7c86 0%, #1e3a8a 100%)",
        borderRadius: "16px",
        padding: "1.75rem 2rem",
        color: "#ffffff",
        marginBottom: "1.5rem",
        boxShadow: "0 10px 25px -5px rgba(14, 124, 134, 0.3)"
      }}>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
              <span style={{ background: "rgba(255,255,255,0.2)", padding: "0.2rem 0.65rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600 }}>
                🌐 Live Portal: https://mpscsc-claims-portal.onrender.com/
              </span>
              <span style={{ background: "#10b981", color: "#fff", padding: "0.2rem 0.65rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 700 }}>
                {isHindi ? "सचित्र गाइड" : "Visual Guide"}
              </span>
            </div>
            <h1 style={{ fontSize: "1.85rem", fontWeight: 800, margin: "0.2rem 0 0.4rem" }}>
              {isHindi ? "MPSCSC दावा पोर्टल — सचित्र फ्लोचार्ट एवं चरणबद्ध गाइड" : "MPSCSC Claims Portal — Flowcharts & Step-by-Step Guide"}
            </h1>
            <p style={{ margin: 0, fontSize: "0.95rem", opacity: 0.9 }}>
              {isHindi
                ? "यात्रा भत्ता (TA/DA), प्रपत्र 21, दौरा डायरी, स्थानांतरण एवं चिकित्सा दावों के लिए आसान फ्लोचार्ट और स्टेप-बाय-स्टेप निर्देश।"
                : "Interactive graphical flowcharts and detailed step-by-step instructions for all claims and modules."}
            </p>
          </div>

          <div style={{ display: "flex", gap: "0.6rem" }}>
            <button
              onClick={() => window.print()}
              className="no-print"
              style={{
                background: "rgba(255,255,255,0.18)",
                color: "#ffffff",
                border: "1px solid rgba(255,255,255,0.35)",
                padding: "0.5rem 0.85rem",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: "0.85rem",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem"
              }}
            >
              <Printer size={15} /> {isHindi ? "प्रिंट गाइड" : "Print Guide"}
            </button>
            <button
              onClick={() => setLanguage(isHindi ? "en" : "hi")}
              className="no-print"
              style={{
                background: "#f59e0b",
                color: "#000",
                border: "none",
                padding: "0.5rem 0.85rem",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: 700,
                fontSize: "0.85rem",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem"
              }}
            >
              <Globe size={15} /> {isHindi ? "English" : "हिन्दी"}
            </button>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation: Flowcharts vs Step-by-Step vs FAQ */}
      <div className="no-print" style={{
        display: "flex",
        gap: "0.5rem",
        marginBottom: "1.5rem",
        borderBottom: "2px solid var(--border-color, #e2e8f0)",
        paddingBottom: "0.5rem"
      }}>
        <button
          onClick={() => setActiveTab("flowcharts")}
          style={{
            padding: "0.6rem 1.25rem",
            borderRadius: "8px",
            border: "none",
            background: activeTab === "flowcharts" ? "#0e7c86" : "transparent",
            color: activeTab === "flowcharts" ? "#ffffff" : "inherit",
            fontWeight: 700,
            fontSize: "0.95rem",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.45rem"
          }}
        >
          <GitFork size={17} /> {isHindi ? "1. सचित्र फ्लोचार्ट्स (Visual Flowcharts)" : "1. Visual Flowcharts"}
        </button>

        <button
          onClick={() => setActiveTab("stepwise")}
          style={{
            padding: "0.6rem 1.25rem",
            borderRadius: "8px",
            border: "none",
            background: activeTab === "stepwise" ? "#0e7c86" : "transparent",
            color: activeTab === "stepwise" ? "#ffffff" : "inherit",
            fontWeight: 700,
            fontSize: "0.95rem",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.45rem"
          }}
        >
          <Layers size={17} /> {isHindi ? "2. चरण-दर-चरण गाइड (Step-by-Step Guide)" : "2. Step-by-Step Guide"}
        </button>

        <button
          onClick={() => setActiveTab("faq")}
          style={{
            padding: "0.6rem 1.25rem",
            borderRadius: "8px",
            border: "none",
            background: activeTab === "faq" ? "#0e7c86" : "transparent",
            color: activeTab === "faq" ? "#ffffff" : "inherit",
            fontWeight: 700,
            fontSize: "0.95rem",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.45rem"
          }}
        >
          <HelpCircle size={17} /> {isHindi ? "3. सामान्य प्रश्न (FAQ)" : "3. FAQ"}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: VISUAL FLOWCHARTS                                                 */}
      {/* ========================================================================= */}
      {activeTab === "flowcharts" && (
        <div>
          {/* Flowchart Sub-selector Pills */}
          <div className="no-print" style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
            {[
              { id: "overall", labelHi: "संपूर्ण पोर्टल प्रक्रिया (Overall Process)", labelEn: "Overall Portal Lifecycle" },
              { id: "tada", labelHi: "यात्रा भत्ता व प्रपत्र 21 (TA/DA & Form 21)", labelEn: "TA/DA & Form 21 Bill" },
              { id: "transfer", labelHi: "स्थानांतरण दावा (Transfer Claim)", labelEn: "Transfer Claim Flow" },
              { id: "medical", labelHi: "चिकित्सा दावा (Medical Claim)", labelEn: "Medical Reimbursement" },
              { id: "admin", labelHi: "अधिकारी अनुमोदन (Admin Approval & Sanction)", labelEn: "Admin Sanction Flow" }
            ].map(f => {
              const isCur = activeFlowchart === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => setActiveFlowchart(f.id)}
                  style={{
                    padding: "0.4rem 0.85rem",
                    borderRadius: "20px",
                    border: isCur ? "1px solid #0e7c86" : "1px solid var(--border-color, #cbd5e1)",
                    background: isCur ? "rgba(14, 124, 134, 0.12)" : "transparent",
                    color: isCur ? "#0e7c86" : "inherit",
                    fontWeight: isCur ? 700 : 500,
                    fontSize: "0.85rem",
                    cursor: "pointer"
                  }}
                >
                  {isHindi ? f.labelHi : f.labelEn}
                </button>
              );
            })}
          </div>

          {/* FLOWCHART 1: OVERALL CLAIM LIFECYCLE */}
          {activeFlowchart === "overall" && (
            <div style={{ background: "var(--card-bg, #ffffff)", border: "1px solid var(--border-color, #e2e8f0)", borderRadius: "12px", padding: "1.5rem", marginBottom: "1.5rem" }}>
              <div style={{ marginBottom: "1.25rem", textAlign: "center" }}>
                <h3 style={{ margin: "0 0 0.25rem", fontSize: "1.2rem", color: "#0e7c86" }}>
                  {isHindi ? "🔄 संपूर्ण पोर्टल कार्यप्रवाह (End-to-End Portal Workflow)" : "🔄 Complete End-to-End Claim Lifecycle"}
                </h3>
                <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b" }}>
                  {isHindi ? "ऑनलाइन लिंक खोलने से लेकर दावा भरने, जांचने और अंतिम भुगतान तक का पूरा रास्ता" : "From opening the live URL to drafting, verification, approval, and final disbursement"}
                </p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
                <FlowNode
                  number="1"
                  icon={Globe}
                  color="#1e3a8a"
                  titleHi="ऑनलाइन पोर्टल खोलें"
                  titleEn="Open Live Portal"
                  descHi="ब्राउज़र में https://mpscsc-claims-portal.onrender.com/ खोलें। (पहले लोड पर 30-40 सेकंड का समय लग सकता है)"
                  descEn="Open portal in Chrome/Edge. (Takes ~30-40s to wake up on first visit)"
                />

                <FlowConnector label="लॉगिन करें (Sign In)" />

                <DecisionNode
                  questionHi="क्या कर्मचारी का नाम 'कर्मचारी मास्टर' में जुड़ा है?"
                  questionEn="Is employee profile created in Employee Master?"
                  yesLabelHi="हाँ, जुड़ा है → दावा बनाएं"
                  noLabelHi="नहीं → पहले मास्टर में जोड़ें"
                />

                <div style={{ width: "100%", maxWidth: "700px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", margin: "0.5rem 0" }}>
                  <div style={{ border: "2px dashed #dc2626", borderRadius: "10px", padding: "0.75rem", background: "#fef2f2" }}>
                    <strong style={{ color: "#b91c1c", fontSize: "0.85rem", display: "block", marginBottom: "0.25rem" }}>
                      ✗ {isHindi ? "यदि नाम नहीं है:" : "If Not Registered:"}
                    </strong>
                    <span style={{ fontSize: "0.8rem", color: "#7f1d1d" }}>
                      {isHindi ? "'कर्मचारी मास्टर' में जाएं → '+ Add Employee' दबाएं → नाम, पद, वेतन लेवल व श्रेणी (A-E) भरकर सहेजें।" : "Go to Employee Master → Add Employee profile with Pay Level & Category (A-E)."}
                    </span>
                  </div>

                  <div style={{ border: "2px solid #16a34a", borderRadius: "10px", padding: "0.75rem", background: "#f0fdf4" }}>
                    <strong style={{ color: "#15803d", fontSize: "0.85rem", display: "block", marginBottom: "0.25rem" }}>
                      ✓ {isHindi ? "यदि नाम मौजूद है:" : "If Registered:"}
                    </strong>
                    <span style={{ fontSize: "0.8rem", color: "#14532d" }}>
                      {isHindi ? "सीधे दावे का प्रकार चुनें: [TA/DA दावा] [स्थानांतरण दावा] [चिकित्सा प्रतिपूर्ति] [दौरा डायरी]।" : "Select claim module: TA/DA, Transfer, Medical, or Tour Diary."}
                    </span>
                  </div>
                </div>

                <FlowConnector label="दावा तैयार करें (Draft Claim)" />

                <FlowNode
                  number="2"
                  icon={FileText}
                  color="#0e7c86"
                  titleHi="दौरे/बिल का विवरण भरें और ड्राफ्ट सहेजें"
                  titleEn="Fill Tour Legs & Save Draft"
                  descHi="तारीख, समय, स्टेशन, ट्रेन/बस क्लास, टिकट नंबर व होटल रसीद भरें। सरकारी नियम से राशि अपने आप जुड़ेगी।"
                  descEn="Enter dates, times, travel mode, class, ticket fare, and hotel receipts. Amounts calculated automatically."
                />

                <FlowConnector label="अधिकारी को सबमिट करें (Final Submit)" />

                <FlowNode
                  number="3"
                  icon={ShieldCheck}
                  color="#d97706"
                  titleHi="सक्षम अधिकारी / व्यवस्थापक द्वारा जांच"
                  titleEn="Controlling Officer Review"
                  descHi="जिला प्रबंधक या अधिकृत अधिकारी दावे के टिकटों, रसीदों और दरों का परीक्षण करते हैं।"
                  descEn="Controlling Officer checks vouchers, tour purpose, and statutory rate eligibility."
                />

                <FlowConnector label="अधिकारी का निर्णय (Officer Decision)" />

                <div style={{ width: "100%", maxWidth: "700px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div style={{ border: "1px solid #f59e0b", borderRadius: "10px", padding: "0.75rem", background: "#fffbeb" }}>
                    <strong style={{ color: "#b45309", fontSize: "0.85rem", display: "block", marginBottom: "0.25rem" }}>
                      ↺ {isHindi ? "सुधार आवश्यक (Return):" : "Return for Corrections:"}
                    </strong>
                    <span style={{ fontSize: "0.8rem", color: "#92400e" }}>
                      {isHindi ? "दावा वापस ड्राफ्ट में लौटाया जाता है ताकि कर्मचारी छूटा हुआ टिकट या रसीद जोड़ सके।" : "Reverted to Draft so claimant can attach missing tickets/vouchers."}
                    </span>
                  </div>

                  <div style={{ border: "1px solid #16a34a", borderRadius: "10px", padding: "0.75rem", background: "#f0fdf4" }}>
                    <strong style={{ color: "#15803d", fontSize: "0.85rem", display: "block", marginBottom: "0.25rem" }}>
                      ✓ {isHindi ? "स्वीकृति (Approve):" : "Approved & Sanctioned:"}
                    </strong>
                    <span style={{ fontSize: "0.8rem", color: "#14532d" }}>
                      {isHindi ? "प्रपत्र 21 में 'देयक पारित आदेश' पर हस्ताक्षर होते हैं और लेखा शाखा द्वारा भुगतान जारी होता है।" : "Passing order signed in Form 21, and financial disbursement is issued."}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* FLOWCHART 2: TA/DA & FORM 21 */}
          {activeFlowchart === "tada" && (
            <div style={{ background: "var(--card-bg, #ffffff)", border: "1px solid var(--border-color, #e2e8f0)", borderRadius: "12px", padding: "1.5rem", marginBottom: "1.5rem" }}>
              <div style={{ marginBottom: "1.25rem", textAlign: "center" }}>
                <h3 style={{ margin: "0 0 0.25rem", fontSize: "1.2rem", color: "#0e7c86" }}>
                  {isHindi ? "🚆 यात्रा भत्ता (TA/DA) एवं प्रपत्र 21 देयक निर्माण फ्लोचार्ट" : "🚆 TA/DA & Form 21 Statutory Bill Workflow"}
                </h3>
                <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b" }}>
                  {isHindi ? "नया दावा बनाने से लेकर प्रपत्र 21 के 'रिक्त कॉलम छिपाने' और एक्सेल डाउनलोड तक का क्रम" : "Step-by-step lifecycle from creating a claim to hiding blank columns and exporting Excel"}
                </p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem", position: "relative" }}>
                <FlowNode
                  number="1"
                  icon={FileText}
                  color="#0e7c86"
                  badge="नया दावा"
                  titleHi="नया TA/DA दावा बनाएं"
                  titleEn="Create New Claim"
                  descHi="टीए/डीए दावा मेनू में जाएं → '+ New TA/DA Claim' दबाएं → कर्मचारी का नाम, माह व वर्ष चुनें → दावा आईडी (CL-YY-XXXX) जारी होगी।"
                  descEn="Go to TA/DA Claims → Click '+ New TA/DA Claim' → Select Employee, Month, Year → System assigns unique ID."
                />

                <FlowNode
                  number="2"
                  icon={Clock}
                  color="#6366f1"
                  badge="फेरा दर्ज करें"
                  titleHi="यात्रा फेरे (Journey Legs) भरें"
                  titleEn="Add Journey Legs"
                  descHi="प्रस्थान व आगमन की तारीख, समय, स्टेशन लिखें। ट्रेन/बस/कार मोड चुनें (क्लास अपने आप फिल्टर होगी)। टिकट नंबर और किराया भरें।"
                  descEn="Enter departure/arrival dates, times, stations. Mode-dependent travel class dropdown filters automatically."
                />

                <FlowNode
                  number="3"
                  icon={Sparkles}
                  color="#d97706"
                  badge="ठहराव व अग्रिम"
                  titleHi="रुकने का भत्ता व पेशगी"
                  titleEn="Stay Allowance & Advance"
                  descHi="होटल बिल (नियम अनुसार अधिकतम सीमा तक) या मित्र/रिश्तेदार के यहाँ ठहराव (फिक्स ₹) चुनें। दौरा अग्रिम लिया हो तो भरें।"
                  descEn="Choose Hotel (capped by category) or Friends stay (statutory allowance). Deduct tour advances."
                />

                <FlowNode
                  number="4"
                  icon={FileCheck}
                  color="#10b981"
                  badge="जादुई बटन"
                  titleHi="प्रपत्र 21 व 'रिक्त कॉलम छिपाएं'"
                  titleEn="Form 21 & Hide Blank Cols"
                  descHi="'View Bill' दबाएं। 'Hide Blank Columns' बटन दबाते ही खाली कॉलम छिप जाएंगे और नंबर 1, 2, 3... अपने आप सही हो जाएंगे!"
                  descEn="Open Form 21 Bill. Click 'Hide Blank Columns' to omit unused columns with 1..N renumbering."
                />
              </div>

              <div style={{ marginTop: "1.25rem", padding: "1rem", background: "rgba(14, 124, 134, 0.06)", borderRadius: "8px", border: "1px dashed #0e7c86", textAlign: "center" }}>
                <strong style={{ color: "#0e7c86", fontSize: "0.9rem" }}>
                  {isHindi ? "🖨️ अंतिम चरण: A4 Landscape में साफ़ प्रिंट निकालें या 'Export to Excel' से एक्सेल डाउनलोड करें!" : "🖨️ Final Step: Print on A4 Landscape or Export to Excel (.xlsx)!"}
                </strong>
              </div>
            </div>
          )}

          {/* FLOWCHART 3: TRANSFER CLAIMS */}
          {activeFlowchart === "transfer" && (
            <div style={{ background: "var(--card-bg, #ffffff)", border: "1px solid var(--border-color, #e2e8f0)", borderRadius: "12px", padding: "1.5rem", marginBottom: "1.5rem" }}>
              <div style={{ marginBottom: "1.25rem", textAlign: "center" }}>
                <h3 style={{ margin: "0 0 0.25rem", fontSize: "1.2rem", color: "#0e7c86" }}>
                  {isHindi ? "🚚 स्थानांतरण दावा फ्लोचार्ट (Transfer Claim Workflow)" : "🚚 Transfer Claim Entitlement Workflow"}
                </h3>
                <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b" }}>
                  {isHindi ? "सामान ढुलाई, ट्रक भाड़ा, पैकिंग एवं परिवार के टिकट का क्लेम बनाने की प्रक्रिया" : "Claiming personal baggage transport, packing, truck freight, and family travel grants"}
                </p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
                <FlowNode
                  number="1"
                  icon={ArrowLeftRight}
                  color="#4f46e5"
                  titleHi="मुख्यालय का चयन"
                  titleEn="Select Districts"
                  descHi="52 जिलों की ड्रॉपडाउन लिस्ट में से पुराना पदस्थ जिला एवं नवीन पदस्थापना जिला चुनें।"
                  descEn="Select Old HQ and New HQ stations from the 52 MP Districts bilingual dropdown."
                />

                <FlowNode
                  number="2"
                  icon={Users}
                  color="#0e7c86"
                  titleHi="परिवार के सदस्य"
                  titleEn="Family Members"
                  descHi="स्थानांतरण में साथ गए परिवार के सदस्यों के आगे सही (✓) का निशान लगाएं।"
                  descEn="Check family members who traveled along with the employee for passenger fare."
                />

                <FlowNode
                  number="3"
                  icon={Layers}
                  color="#d97706"
                  titleHi="सामान वजन एवं ट्रक भाड़ा"
                  titleEn="Baggage & Freight"
                  descHi="सामान का वजन (किग्रा में) और ट्रक/ट्रांसपोर्ट का बिल भरें (कैट A/B: ₹40/किमी, C/D: ₹25/किमी तक)।"
                  descEn="Enter baggage weight (kg) and truck transit receipt (₹40/km Cat A/B, ₹25/km Cat C/D)."
                />

                <FlowNode
                  number="4"
                  icon={CheckCircle2}
                  color="#16a34a"
                  titleHi="मुश्त अनुदान व प्रिंट"
                  titleEn="Grant & Submission"
                  descHi="एकमुश्त स्थानांतरण अनुदान (₹1,800 से ₹6,500) अपने आप जुड़ जाएगा। सहेजें और प्रिंट निकालें।"
                  descEn="Composite Transfer Grant added automatically. Save draft, review, and print."
                />
              </div>
            </div>
          )}

          {/* FLOWCHART 4: MEDICAL CLAIMS */}
          {activeFlowchart === "medical" && (
            <div style={{ background: "var(--card-bg, #ffffff)", border: "1px solid var(--border-color, #e2e8f0)", borderRadius: "12px", padding: "1.5rem", marginBottom: "1.5rem" }}>
              <div style={{ marginBottom: "1.25rem", textAlign: "center" }}>
                <h3 style={{ margin: "0 0 0.25rem", fontSize: "1.2rem", color: "#0e7c86" }}>
                  {isHindi ? "🏥 चिकित्सा प्रतिपूर्ति दावा फ्लोचार्ट (Medical Claim Workflow)" : "🏥 Medical Reimbursement Claim Workflow"}
                </h3>
                <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b" }}>
                  {isHindi ? "डॉक्टर परामर्श, दवाइयां एवं जांच के बिल जोड़कर हिंदी आवेदन तैयार करना" : "Itemizing consultations, medicines, diagnostic tests, and generating the statutory Hindi form"}
                </p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
                <FlowNode
                  number="1"
                  icon={HeartPulse}
                  color="#c026d3"
                  titleHi="मरीज एवं बीमारी का नाम"
                  titleEn="Patient Particulars"
                  descHi="मरीज का नाम, कर्मचारी से रिश्ता (स्वयं, पत्नी, पुत्र, माता आदि) और बीमारी का नाम लिखें।"
                  descEn="Enter patient name, relationship to employee, diagnosis, and treatment duration."
                />

                <FlowNode
                  number="2"
                  icon={FileText}
                  color="#0e7c86"
                  titleHi="एक-एक बिल जोड़ें"
                  titleEn="Itemize Bills"
                  descHi="डॉक्टर फीस, दवाइयां और खून/एक्स-रे जांच (Test) के रसीद नंबर, दुकान का नाम और राशि भरें।"
                  descEn="Add bills under Consultation, Medicine, Pathology/Diagnostics with receipt details."
                />

                <FlowNode
                  number="3"
                  icon={Sparkles}
                  color="#10b981"
                  titleHi="कुल राशि का जोड़"
                  titleEn="Automatic Total"
                  descHi="सभी बिलों का कुल योग अपने आप तैयार हो जाएगा। मूल संलग्नक बिलों की संख्या लिखें।"
                  descEn="System computes grand total across all bill heads and captures enclosure counts."
                />

                <FlowNode
                  number="4"
                  icon={Printer}
                  color="#1e3a8a"
                  titleHi="हिंदी फॉर्म प्रिंट निकालें"
                  titleEn="Print Hindi Form"
                  descHi="'Print Claim Form' दबाएं। म.प्र. चिकित्सा नियमों अनुसार पूरा भरा हुआ हिंदी फॉर्म प्रिंट करें।"
                  descEn="Prints the official Madhya Pradesh Medical Attendance Rules Hindi claim application."
                />
              </div>
            </div>
          )}

          {/* FLOWCHART 5: ADMIN GOVERNANCE */}
          {activeFlowchart === "admin" && (
            <div style={{ background: "var(--card-bg, #ffffff)", border: "1px solid var(--border-color, #e2e8f0)", borderRadius: "12px", padding: "1.5rem", marginBottom: "1.5rem" }}>
              <div style={{ marginBottom: "1.25rem", textAlign: "center" }}>
                <h3 style={{ margin: "0 0 0.25rem", fontSize: "1.2rem", color: "#0e7c86" }}>
                  {isHindi ? "🛡️ व्यवस्थापक / अधिकारी अनुमोदन फ्लोचार्ट (Admin Sanction Flow)" : "🛡️ Admin Approval & Passing Order Workflow"}
                </h3>
                <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b" }}>
                  {isHindi ? "दावों का परीक्षण, उपयोगकर्ता नियंत्रण और प्रपत्र 21 पर देयक पारित आदेश जारी करना" : "Statewide claims review, impersonation troubleshooting, and signing Section 4 Passing Orders"}
                </p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
                <FlowNode
                  number="1"
                  icon={ShieldCheck}
                  color="#0e7c86"
                  titleHi="राज्यव्यापी दावा रजिस्टर"
                  titleEn="Statewide Claims Register"
                  descHi="एडमिन मेनू में '/admin/claims' खोलें। राज्य के सभी जिलों से आए दावों की सूची सामने होगी।"
                  descEn="Open Admin Claims ledger to inspect pending claims across all offices and employees."
                />

                <FlowNode
                  number="2"
                  icon={Key}
                  color="#f59e0b"
                  titleHi="यूजर स्क्रीन देखना (Impersonate)"
                  titleEn="User Impersonation"
                  descHi="कर्मचारी की समस्या हल करने हेतु 'Log In As This User' से बिना पासवर्ड लॉगिन करें और ऊपर दिए पीले बटन से वापस आएं।"
                  descEn="Assume user session safely without knowing password; exit back anytime via top banner."
                />

                <FlowNode
                  number="3"
                  icon={GitFork}
                  color="#6366f1"
                  titleHi="दावा निर्णय (Approve/Return)"
                  titleEn="Sanction Action"
                  descHi="दावा सही हो तो 'स्वीकृत (Approve)' करें, अथवा कोई रसीद छूटी हो तो रिमार्क लिखकर 'सुधार हेतु वापस (Return)' करें।"
                  descEn="Approve valid claims, or return to Draft with remarks for correction."
                />

                <FlowNode
                  number="4"
                  icon={FileCheck}
                  color="#15803d"
                  titleHi="प्रपत्र 21: देयक पारित आदेश"
                  titleEn="Form 21 Passing Order"
                  descHi="प्रपत्र 21 के भाग 4 में पारित राशि शब्दों व अंकों में दर्ज करें और सक्षम अधिकारी के हस्ताक्षर करें।"
                  descEn="Fill sanctioned amount in Section 4 'देयक पारित आदेश' on Form 21 TA Bill."
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: STEP-BY-STEP DETAILED MODULE GUIDES                                */}
      {/* ========================================================================= */}
      {activeTab === "stepwise" && (
        <div>
          <div style={{ marginBottom: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 800, margin: "0 0 0.2rem", color: "#0e7c86" }}>
                {isHindi ? "📖 प्रत्येक मॉड्यूल का चरण-दर-चरण सचित्र उपयोग" : "📖 Module-by-Module Step-by-Step Instructions"}
              </h2>
              <span style={{ fontSize: "0.85rem", color: "#64748b" }}>
                {isHindi ? "विस्तृत विवरण देखने के लिए संबंधित मॉड्यूल पर क्लिक करें" : "Click on any module to view exact button clicks and field instructions"}
              </span>
            </div>
          </div>

          {/* STEP MODULE 1: Online Start & Registration */}
          <div style={{ background: "var(--card-bg, #ffffff)", border: "1px solid var(--border-color, #e2e8f0)", borderRadius: "10px", marginBottom: "1rem", overflow: "hidden" }}>
            <div
              onClick={() => toggleStepModule("start")}
              style={{ padding: "0.85rem 1.25rem", background: "rgba(14, 124, 134, 0.05)", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Globe size={17} color="#0e7c86" />
                <strong style={{ fontSize: "1rem" }}>{isHindi ? "मॉड्यूल 1: ऑनलाइन पोर्टल खोलना, नया खाता व लॉगिन" : "Module 1: Opening Live Portal, Registration & Login"}</strong>
              </div>
              {openStepModule.start ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
            </div>

            {openStepModule.start && (
              <div style={{ padding: "1.25rem", fontSize: "0.88rem", lineHeight: 1.6 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  <div style={{ borderLeft: "3px solid #0e7c86", paddingLeft: "0.75rem" }}>
                    <strong>{isHindi ? "चरण 1: लिंक खोलें" : "Step 1: Open URL"}</strong>
                    <div>{isHindi ? "अपने मोबाइल या कंप्यूटर के ब्राउज़र में https://mpscsc-claims-portal.onrender.com/ खोलें।" : "Open https://mpscsc-claims-portal.onrender.com/ in Chrome or Edge."}</div>
                  </div>

                  <div style={{ borderLeft: "3px solid #0e7c86", paddingLeft: "0.75rem" }}>
                    <strong>{isHindi ? "चरण 2: नया खाता बनाएं (यदि पहली बार आए हैं)" : "Step 2: Register (First Time Users)"}</strong>
                    <div>{isHindi ? "लॉगिन पेज पर 'Register here' दबाएं → पूरा नाम, ईमेल आईडी, मोबाइल नंबर और पासवर्ड लिखकर 'Create Account' दबाएं।" : "Click 'Register here' on login page → Fill Name, Email, Mobile, Password → Submit."}</div>
                  </div>

                  <div style={{ borderLeft: "3px solid #0e7c86", paddingLeft: "0.75rem" }}>
                    <strong>{isHindi ? "चरण 3: लॉगिन करें" : "Step 3: Sign In"}</strong>
                    <div>{isHindi ? "अपना पंजीकृत ईमेल और पासवर्ड डालकर 'Sign In' बटन दबाएं। आप मुख्य डैशबोर्ड पर पहुँच जाएंगे।" : "Enter registered email and password → Click Sign In."}</div>
                  </div>

                  <div style={{ borderLeft: "3px solid #0e7c86", paddingLeft: "0.75rem" }}>
                    <strong>{isHindi ? "चरण 4: भाषा बदलें (आवश्यकतानुसार)" : "Step 4: Switch Language"}</strong>
                    <div>{isHindi ? "बाईं तरफ मेनू में नीचे दिए 'हिं' या 'Eng' बटन को दबाकर भाषा कभी भी बदल सकते हैं।" : "Toggle between 'हिं' and 'Eng' in the sidebar footer anytime."}</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* STEP MODULE 2: Employee Master */}
          <div style={{ background: "var(--card-bg, #ffffff)", border: "1px solid var(--border-color, #e2e8f0)", borderRadius: "10px", marginBottom: "1rem", overflow: "hidden" }}>
            <div
              onClick={() => toggleStepModule("emp")}
              style={{ padding: "0.85rem 1.25rem", background: "rgba(14, 124, 134, 0.05)", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Users size={17} color="#0e7c86" />
                <strong style={{ fontSize: "1rem" }}>{isHindi ? "मॉड्यूल 2: कर्मचारी मास्टर — नाम और श्रेणी जोड़ना" : "Module 2: Employee Master (First Mandatory Step)"}</strong>
              </div>
              {openStepModule.emp ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
            </div>

            {openStepModule.emp && (
              <div style={{ padding: "1.25rem", fontSize: "0.88rem", lineHeight: 1.6 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  <div style={{ borderLeft: "3px solid #0e7c86", paddingLeft: "0.75rem" }}>
                    <strong>{isHindi ? "चरण 1: कर्मचारी मास्टर में जाएं" : "Step 1: Navigate"}</strong>
                    <div>{isHindi ? "बाईं तरफ के मेनू में 'कर्मचारी मास्टर' (/employees) पर क्लिक करें।" : "Click 'Employee Master' (/employees) in sidebar."}</div>
                  </div>

                  <div style={{ borderLeft: "3px solid #0e7c86", paddingLeft: "0.75rem" }}>
                    <strong>{isHindi ? "चरण 2: '+ Add Employee' दबाएं" : "Step 2: Add Employee"}</strong>
                    <div>{isHindi ? "कर्मचारी का नाम (अंग्रेजी व हिन्दी), पदनाम, पदस्थ मुख्यालय, वेतन स्तर (Pay Level) और मूल वेतन भरें।" : "Enter Employee Name (English & Hindi), Designation, Headquarters, Pay Level, Basic Pay."}</div>
                  </div>

                  <div style={{ borderLeft: "3px solid #0e7c86", paddingLeft: "0.75rem" }}>
                    <strong>{isHindi ? "चरण 3: श्रेणी (Category A से E) चुनें" : "Step 3: Select Category (A to E)"}</strong>
                    <div>{isHindi ? "कैट A (लेवल 14+), कैट B (लेवल 10-13), कैट C (लेवल 7-9), कैट D (लेवल 4-6), कैट E (लेवल 1-3)। यह चयन ही तय करता है कि रेल में कौन सी क्लास मिलेगी।" : "Assign category A to E based on pay matrix level. This directly governs travel class entitlement."}</div>
                  </div>

                  <div style={{ borderLeft: "3px solid #0e7c86", paddingLeft: "0.75rem" }}>
                    <strong>{isHindi ? "चरण 4: परिवार विवरण जोड़ें (ट्रांसफर के लिए)" : "Step 4: Add Family Details"}</strong>
                    <div>{isHindi ? "कर्मचारी कार्ड पर 'Manage Family' दबाकर पत्नी, बच्चों या माता-पिता का नाम व जन्मतिथि जोड़ें।" : "Click 'Manage Family' to add spouse, children, and dependent parents for transfer fare claims."}</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* STEP MODULE 3: TA/DA & Form 21 */}
          <div style={{ background: "var(--card-bg, #ffffff)", border: "1px solid var(--border-color, #e2e8f0)", borderRadius: "10px", marginBottom: "1rem", overflow: "hidden" }}>
            <div
              onClick={() => toggleStepModule("tada")}
              style={{ padding: "0.85rem 1.25rem", background: "rgba(14, 124, 134, 0.05)", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <FileText size={17} color="#0e7c86" />
                <strong style={{ fontSize: "1rem" }}>{isHindi ? "मॉड्यूल 3: यात्रा भत्ता (TA/DA) एवं प्रपत्र 21 देयक" : "Module 3: TA/DA Claims & Statutory Form 21 Bill"}</strong>
              </div>
              {openStepModule.tada ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
            </div>

            {openStepModule.tada && (
              <div style={{ padding: "1.25rem", fontSize: "0.88rem", lineHeight: 1.6 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  <div style={{ borderLeft: "3px solid #0e7c86", paddingLeft: "0.75rem" }}>
                    <strong>{isHindi ? "चरण 1: '+ New TA/DA Claim' दबाएं" : "Step 1: Create New Claim"}</strong>
                    <div>{isHindi ? "'टीए/डीए दावा' मेनू में जाकर कर्मचारी का नाम, माह व वर्ष चुनें और 'Create Claim' दबाएं।" : "Go to TA/DA Claims → select employee, month, year → click Create Claim."}</div>
                  </div>

                  <div style={{ borderLeft: "3px solid #0e7c86", paddingLeft: "0.75rem" }}>
                    <strong>{isHindi ? "चरण 2: यात्रा का एक-एक फेरा दर्ज करें" : "Step 2: Enter Journey Legs"}</strong>
                    <div>{isHindi ? "प्रस्थान स्टेशन (दिनांक व समय), आगमन स्टेशन (दिनांक व समय), यात्रा का साधन (Rail, Bus, Air, Car, Bike) चुनें। क्लास ड्रॉपडाउन अपने आप बदलेगा। टिकट नंबर और वास्तविक किराया लिखें। शासकीय प्रयोजन (उदा. धान उपार्जन बैठक) लिखें।" : "Enter Departure/Arrival date, time, stations. Select Travel Mode & Class. Fill Ticket/PNR, Fare amount, and official purpose."}</div>
                  </div>

                  <div style={{ borderLeft: "3px solid #0e7c86", paddingLeft: "0.75rem" }}>
                    <strong>{isHindi ? "चरण 3: रुकने का भत्ता व अग्रिम कटौती भरें" : "Step 3: Stay & Advance"}</strong>
                    <div>{isHindi ? "होटल बिल या मित्र/रिश्तेदार के यहाँ रुकना चुनें। यदि दौरे से पहले ऑफिस से कोई अग्रिम राशि (Advance) ली थी, तो उसे भरें। 'Save Journey Details' दबाएं।" : "Choose Hotel Bill or Friends Stay. Fill any tour advance taken. Save details."}</div>
                  </div>

                  <div style={{ borderLeft: "3px solid #0e7c86", paddingLeft: "0.75rem" }}>
                    <strong>{isHindi ? "चरण 4: प्रपत्र 21 खोलें और 'रिक्त कॉलम छिपाएं'" : "Step 4: View Bill & Hide Blank Columns"}</strong>
                    <div>{isHindi ? "ऊपर दिए 'View Bill' पर क्लिक करें। आधिकारिक प्रपत्र २१ खुलेगा। ऊपर दिए 'Hide Blank Columns' बटन को दबाएं — खाली कॉलम तुरंत छिप जाएंगे और बचे हुए कॉलम नंबर 1, 2, 3... हो जाएंगे!" : "Click 'View Bill'. On Form 21, click 'Hide Blank Columns' to omit unused columns with continuous 1..N renumbering."}</div>
                  </div>

                  <div style={{ borderLeft: "3px solid #0e7c86", paddingLeft: "0.75rem" }}>
                    <strong>{isHindi ? "चरण 5: प्रिंट या एक्सेल डाउनलोड" : "Step 5: Print or Excel Export"}</strong>
                    <div>{isHindi ? "'Print: A4 Landscape' दबाकर प्रिंट निकालें या 'Export to Excel' से एक्सेल फ़ाइल डाउनलोड करें।" : "Click 'Print: A4 Landscape' or 'Export to Excel' to save as .xlsx."}</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* STEP MODULE 4: Tour Diary */}
          <div style={{ background: "var(--card-bg, #ffffff)", border: "1px solid var(--border-color, #e2e8f0)", borderRadius: "10px", marginBottom: "1rem", overflow: "hidden" }}>
            <div
              onClick={() => toggleStepModule("tour")}
              style={{ padding: "0.85rem 1.25rem", background: "rgba(14, 124, 134, 0.05)", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <FileSpreadsheet size={17} color="#0e7c86" />
                <strong style={{ fontSize: "1rem" }}>{isHindi ? "मॉड्यूल 4: दौरा डायरी — दिनवार शासकीय कार्य" : "Module 4: Tour Diary & Duty Logs"}</strong>
              </div>
              {openStepModule.tour ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
            </div>

            {openStepModule.tour && (
              <div style={{ padding: "1.25rem", fontSize: "0.88rem", lineHeight: 1.6 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  <div style={{ borderLeft: "3px solid #0e7c86", paddingLeft: "0.75rem" }}>
                    <strong>{isHindi ? "चरण 1: दौरा डायरी खोलें" : "Step 1: Open Diary"}</strong>
                    <div>{isHindi ? "मेनू में 'दौरा डायरी' पर जाएं या TA/DA दावे के अंदर से 'Tour Diary' बटन दबाएं।" : "Go to Tour Diaries or click Tour Diary from inside any claim."}</div>
                  </div>
                  <div style={{ borderLeft: "3px solid #0e7c86", paddingLeft: "0.75rem" }}>
                    <strong>{isHindi ? "चरण 2: निरीक्षण व कार्यों का विवरण लिखें" : "Step 2: Enter Inspection Details"}</strong>
                    <div>{isHindi ? "प्रत्येक तारीख के सामने किए गए शासकीय कार्य (जैसे गोदाम निरीक्षण, बैठक) दर्ज करें।" : "Log duties and inspections performed for each tour day."}</div>
                  </div>
                  <div style={{ borderLeft: "3px solid #0e7c86", paddingLeft: "0.75rem" }}>
                    <strong>{isHindi ? "दैनिक भत्ता (DA) का नियम:" : "Statutory DA Rules:"}</strong>
                    <div>{isHindi ? "6 घंटे या कम = 0% DA | 6 से 12 घंटे = 50% DA | 12 घंटे से ऊपर = 100% DA (सिस्टम अपने आप निकालता है)।" : "≤6h: 0% DA, 6-12h: 50% DA, >12h: 100% DA calculated automatically."}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: FAQ                                                                */}
      {/* ========================================================================= */}
      {activeTab === "faq" && (
        <div style={{ background: "var(--card-bg, #ffffff)", border: "1px solid var(--border-color, #e2e8f0)", borderRadius: "12px", padding: "1.5rem" }}>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 800, margin: "0 0 1rem", color: "#0e7c86" }}>
            {isHindi ? "❓ अक्सर पूछे जाने वाले सवाल (Frequently Asked Questions)" : "❓ Frequently Asked Questions"}
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ borderBottom: "1px solid var(--border-color, #e2e8f0)", paddingBottom: "0.85rem" }}>
              <strong style={{ color: "#0e7c86", fontSize: "0.95rem" }}>
                {isHindi ? "प्र. 1: पहली बार लिंक खोलने पर 30 से 50 सेकंड क्यों लगते हैं?" : "Q1: Why does it take 30-50s on first load?"}
              </strong>
              <p style={{ margin: "0.3rem 0 0", fontSize: "0.88rem", color: "#475569" }}>
                {isHindi
                  ? "उत्तर: पोर्टल रेंडर क्लाउड पर लाइव है। 15 मिनट तक कोई हलचल न होने पर सर्वर स्लीप मोड में चला जाता है। इसलिए पहली बार खोलने पर 30-40 सेकंड का समय लगता है। कृपया रिफ्रेश किए बिना थोड़ा इंतजार करें!"
                  : "Ans: Render free instances sleep after 15m of inactivity. Please wait 30-40 seconds for cold start without refreshing."}
              </p>
            </div>

            <div style={{ borderBottom: "1px solid var(--border-color, #e2e8f0)", paddingBottom: "0.85rem" }}>
              <strong style={{ color: "#0e7c86", fontSize: "0.95rem" }}>
                {isHindi ? "प्र. 2: क्या इसे मोबाइल फोन पर चलाया जा सकता है?" : "Q2: Can I use it on mobile?"}
              </strong>
              <p style={{ margin: "0.3rem 0 0", fontSize: "0.88rem", color: "#475569" }}>
                {isHindi
                  ? "उत्तर: हाँ! अपने मोबाइल के किसी भी ब्राउज़र में https://mpscsc-claims-portal.onrender.com/ खोलकर आसानी से बिल भर सकते हैं।"
                  : "Ans: Yes, open https://mpscsc-claims-portal.onrender.com/ in any smartphone browser."}
              </p>
            </div>

            <div style={{ borderBottom: "1px solid var(--border-color, #e2e8f0)", paddingBottom: "0.85rem" }}>
              <strong style={{ color: "#0e7c86", fontSize: "0.95rem" }}>
                {isHindi ? "प्र. 3: प्रपत्र 21 में खाली कॉलम कैसे हटाएं?" : "Q3: How do I hide empty columns?"}
              </strong>
              <p style={{ margin: "0.3rem 0 0", fontSize: "0.88rem", color: "#475569" }}>
                {isHindi
                  ? "उत्तर: बिल के ऊपर दिए गए 'Hide Blank Columns' (रिक्त कॉलम छिपाएं) बटन को दबाएं। सारे खाली कॉलम तुरंत छिप जाएंगे और नंबर 1, 2, 3... क्रम से हो जाएंगे।"
                  : "Ans: Click the 'Hide Blank Columns' button on Form 21. Columns renumber 1, 2, 3... automatically."}
              </p>
            </div>

            <div style={{ borderBottom: "1px solid var(--border-color, #e2e8f0)", paddingBottom: "0.85rem" }}>
              <strong style={{ color: "#0e7c86", fontSize: "0.95rem" }}>
                {isHindi ? "प्र. 4: 'देयक पारित आदेश' (Passing Order) मेरे बिल पर क्यों नहीं दिख रहा?" : "Q4: Why is Passing Order hidden?"}
              </strong>
              <p style={{ margin: "0.3rem 0 0", fontSize: "0.88rem", color: "#475569" }}>
                {isHindi
                  ? "उत्तर: नियम अनुसार पारित आदेश केवल सक्षम अधिकारी (Admin) के लॉगिन में दिखता है। सामान्य कर्मचारी के बिल पर केवल कर्मचारी के हस्ताक्षर आते हैं।"
                  : "Ans: Section 4 Passing Order is strictly restricted to controlling officers / administrators."}
              </p>
            </div>

            <div>
              <strong style={{ color: "#0e7c86", fontSize: "0.95rem" }}>
                {isHindi ? "प्र. 5: क्या बिल को एक्सेल में डाउनलोड किया जा सकता है?" : "Q5: Can I export to Excel?"}
              </strong>
              <p style={{ margin: "0.3rem 0 0", fontSize: "0.88rem", color: "#475569" }}>
                {isHindi
                  ? "उत्तर: हाँ, प्रपत्र 21 बिल या रिपोर्ट्स पन्ने पर दिए गए हरे रंग के 'Export to Excel' बटन पर क्लिक करें। एक्सेल फ़ाइल तुरंत डाउनलोड हो जाएगी।"
                  : "Ans: Yes, click 'Export to Excel' on Form 21 or Reports to download a complete .xlsx file."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Footer Return Link */}
      <div className="no-print" style={{ textAlign: "center", marginTop: "2rem", padding: "1rem", color: "#64748b", fontSize: "0.85rem" }}>
        <Link to="/" style={{ color: "#0e7c86", fontWeight: 700, textDecoration: "none", marginRight: "1rem" }}>
          ← {isHindi ? "मुख्य डैशबोर्ड पर जाएं" : "Return to Dashboard"}
        </Link>
        <Link to="/claims/tada" style={{ color: "#0e7c86", fontWeight: 700, textDecoration: "none" }}>
          {isHindi ? "टीए/डीए दावा बनाएं →" : "Create TA/DA Claim →"}
        </Link>
      </div>
    </div>
  );
}
