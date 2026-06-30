import React, { useEffect, useState } from 'react';
import { getPaymentReturnPageForRole } from '../../utils/roleNavigation';
import styles from './PaymentCancelPage.module.css';

const PaymentCancelPage = ({ onNavigate }) => {
  const [orderCode, setOrderCode] = useState('');
  const [returnPage, setReturnPage] = useState('finance');
  const [buttonLabel, setButtonLabel] = useState('Quay lại trang tài chính');

  const userStr = localStorage.getItem('user');
  let user = null;
  try {
    user = userStr ? JSON.parse(userStr) : null;
  } catch (_) {
    user = null;
  }

  const originRole = sessionStorage.getItem('payos_origin_role') || user?.role;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('orderCode') || '';
    setOrderCode(code);

    const pendingOrderCode = sessionStorage.getItem('payos_pending_order_code');
    const isSub = (sessionStorage.getItem('payos_payment_type') === 'subscription' && pendingOrderCode === String(code))
                  || (user?.role === 'Center' || user?.role === 'Admin');

    let resolvedReturnPage = 'finance';
    let resolvedButtonLabel = 'Quay lại trang tài chính';

    if (isSub) {
      resolvedReturnPage = getPaymentReturnPageForRole(originRole);
      resolvedButtonLabel = resolvedReturnPage === 'admin-subscriptions'
        ? 'Quay lại trang quản lý gói đăng ký'
        : 'Quay lại trang gói đăng ký';
    }
    setReturnPage(resolvedReturnPage);
    setButtonLabel(resolvedButtonLabel);

    if (code) {
      sessionStorage.removeItem(`payos_order_${code}`);
    }
    sessionStorage.removeItem('payos_origin_role');
    sessionStorage.removeItem('payos_payment_type');
    sessionStorage.removeItem('payos_pending_order_code');
    sessionStorage.removeItem('payos_pending_package_id');
    sessionStorage.removeItem('payos_pending_center_id');

    // Tự động chuyển hướng sau 100ms để đảm bảo React hoàn tất render/commit phase
    const timer = setTimeout(() => {
      onNavigate(resolvedReturnPage);
    }, 100);

    return () => clearTimeout(timer);
  }, [originRole, onNavigate]);

  return (
    <div className={styles.pageRoot}>
      <div className={styles.card}>
        <div className={styles.cancelContainer}>
          <div className={styles.iconWrapper}>
            <span className="material-symbols-outlined notranslate" translate="no">close</span>
          </div>

          <h2 className={styles.cancelTitle}>Đã hủy thanh toán</h2>
          <p className={styles.cancelSub}>
            Giao dịch thanh toán hóa đơn của bạn đã bị hủy bỏ theo yêu cầu. Bạn sẽ không bị trừ tiền cho giao dịch này.
          </p>

          {orderCode && (
            <div className={styles.detailsBox}>
              <div className={styles.detailRow}>
                <span className={styles.label}>Mã giao dịch (PayOS)</span>
                <span className={`${styles.value} ${styles.code}`}>#{orderCode}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.label}>Trạng thái</span>
                <span className={styles.value} style={{ color: '#dc2626', fontWeight: 600 }}>Đã hủy</span>
              </div>
            </div>
          )}

          <div className={styles.actions}>
            <button className={styles.btnPrimary} onClick={() => onNavigate(returnPage)}>
              {buttonLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentCancelPage;
