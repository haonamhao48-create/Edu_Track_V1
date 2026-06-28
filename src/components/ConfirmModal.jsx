import React, { useEffect } from 'react';

const ConfirmModal = ({ 
  isOpen, 
  title = 'Xác nhận', 
  message, 
  onConfirm, 
  onCancel, 
  confirmText = 'Đồng ý', 
  cancelText = 'Hủy bỏ', 
  isDanger = false 
}) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(17, 17, 17, 0.4)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      animation: 'fadeIn 0.2s ease-out',
    }} onClick={onCancel}>
      <div style={{
        backgroundColor: 'var(--surface-container-lowest, #ffffff)',
        borderRadius: 'var(--border-radius-md, 8px)',
        border: '1px solid var(--outline-variant, #eaeaea)',
        width: '100%',
        maxWidth: '420px',
        boxShadow: 'var(--shadow-medium, 0 4px 12px rgba(0, 0, 0, 0.03))',
        overflow: 'hidden',
        margin: '16px',
      }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '18px 24px',
          borderBottom: '1px solid var(--outline-variant, #eaeaea)',
        }}>
          <h3 style={{
            margin: 0,
            fontSize: '16px',
            fontWeight: 700,
            color: 'var(--on-surface, #111111)',
          }}>{title}</h3>
          <button onClick={onCancel} style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--secondary, #787774)',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 'var(--border-radius-full, 9999px)',
            transition: 'background-color 0.2s',
          }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-container-high, #f0f0ef)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
            <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '20px' }}>close</span>
          </button>
        </div>

        {/* Body */}
        <div style={{
          padding: '24px',
          fontSize: '14px',
          color: 'var(--tertiary, #2f3437)',
          lineHeight: '1.6',
        }}>
          {message}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px',
          padding: '16px 24px',
          backgroundColor: 'var(--surface-container-low, #f9f9f8)',
          borderTop: '1px solid var(--outline-variant, #eaeaea)',
        }}>
          <button onClick={onCancel} style={{
            padding: '8px 16px',
            borderRadius: 'var(--border-radius-default, 6px)',
            border: '1px solid var(--outline-variant, #eaeaea)',
            backgroundColor: 'var(--surface-container-lowest, #ffffff)',
            color: 'var(--tertiary, #2f3437)',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--surface-container-low, #f9f9f8)'; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--surface-container-lowest, #ffffff)'; }}>
            {cancelText}
          </button>
          <button onClick={onConfirm} style={{
            padding: '8px 16px',
            borderRadius: 'var(--border-radius-default, 6px)',
            border: 'none',
            backgroundColor: isDanger ? 'var(--error, #9f2f2d)' : 'var(--primary, #111111)',
            color: 'var(--on-primary, #ffffff)',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'opacity 0.2s',
          }} onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; }} onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;

