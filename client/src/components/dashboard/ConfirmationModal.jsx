import React, { useEffect } from 'react';
import { CheckCircle2, RotateCcw, Send } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { getTranslations } from '../../utils/translations';

export default function ConfirmationModal({
  isOpen,
  title,
  message,
  type = 'approve', // 'approve' | 'return' | 'submit'
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel
}) {
  const { language } = useLanguage();
  const t = getTranslations(language);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const getIcon = () => {
    if (type === 'approve') return <CheckCircle2 size={20} />;
    if (type === 'submit') return <Send size={20} />;
    return <RotateCcw size={20} />;
  };

  const getIconStyle = () => {
    if (type === 'approve') {
      return { background: 'rgba(44, 154, 95, 0.14)', color: 'var(--c-approved)' };
    }
    if (type === 'submit') {
      return { background: 'rgba(42, 138, 212, 0.14)', color: 'var(--c-submitted)' };
    }
    return { background: 'rgba(200, 64, 47, 0.14)', color: 'var(--c-rejected)' };
  };

  const getDefaultTitle = () => {
    if (type === 'approve') return t.dashboard.confirm_approve_title;
    if (type === 'submit') return t.dashboard.confirm_submit_title || 'Submit Claim for Approval';
    return t.dashboard.confirm_return_title;
  };

  const getConfirmBtnStyle = () => {
    if (type === 'return') {
      return { background: 'var(--c-rejected)', borderColor: 'var(--c-rejected)', color: '#fff' };
    }
    if (type === 'submit') {
      return { background: 'var(--c-submitted)', borderColor: 'var(--c-submitted)', color: '#fff' };
    }
    return {};
  };

  return (
    <div className="dash-modal-overlay" onClick={onCancel} role="dialog" aria-modal="true">
      <div className="dash-modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: '10px',
            display: 'grid',
            placeItems: 'center',
            ...getIconStyle()
          }}>
            {getIcon()}
          </div>
          <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>
            {title || getDefaultTitle()}
          </h3>
        </div>
        <p style={{ margin: '0 0 20px', color: 'var(--text-2)', fontSize: '0.92rem', lineHeight: 1.5 }}>
          {message}
        </p>
        <div className="dash-modal-actions">
          <button type="button" className="btn sm" onClick={onCancel}>
            {cancelLabel || t.dashboard.confirm_no}
          </button>
          <button
            type="button"
            className="btn sm pri"
            style={getConfirmBtnStyle()}
            onClick={onConfirm}
          >
            {confirmLabel || t.dashboard.confirm_yes}
          </button>
        </div>
      </div>
    </div>
  );
}
