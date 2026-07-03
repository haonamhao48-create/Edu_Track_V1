import React, { useEffect, useState } from 'react';
import { getPaymentReturnPageForRole } from '../../utils/roleNavigation';
import styles from './PaymentCancelPage.module.css';

const PaymentCancelPage = ({ onNavigate }) => {
  const [orderCode, setOrderCode] = useState('');
  const [returnPage, setReturnPage] = useState('finance');
  const [buttonLabel, setButtonLabel] = useState('Quay lại trang tài chính');
  const [countdown, setCountdown] = useState(8);

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
        ? 'Quay lại quản lý gói'
        : 'Quay lại trang gói';
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
  }, [originRole]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onNavigate(returnPage);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [returnPage, onNavigate]);

  return (
    <div className={styles.pageRoot}>
      <div className={styles.card}>
        <div className={styles.cancelContainer}>
          <div className={styles.iconWrapper}>
            <span className="material-symbols-outlined notranslate" translate="no">close</span>
          </div>

          <h2 className={styles.cancelTitle}>Đã hủy thanh toán</h2>
          <p className={styles.cancelSub}>
            Giao dịch thanh toán của bạn đã bị hủy bỏ theo yêu cầu. Bạn sẽ không bị trừ tiền cho giao dịch này.
          </p>

          {orderCode && (
            <div className={styles.detailsBox}>
              <div className={styles.detailRow}>
                <span className={styles.label}>Mã giao dịch (PayOS)</span>
                <span className={`${styles.value} ${styles.code}`}>#{orderCode}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.label}>Trạng thái</span>
                <span className={styles.value} style={{ color: '#dc2626', fontWeight: 600 }}>Thất bại / Đã hủy</span>
              </div>
            </div>
          )}

          <div className={styles.actions}>
            <button className={styles.btnPrimary} onClick={() => onNavigate(returnPage)}>
              {buttonLabel} ({countdown}s)
            </button>
            <button className={styles.btnSecondary} onClick={() => onNavigate(user?.role ? getPaymentReturnPageForRole(user.role) === 'admin-subscriptions' ? 'admin-dashboard' : 'dashboard' : 'login')}>
              Quay lại trang tổng quan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentCancelPage;
