import React, { useEffect, useState } from 'react';
import { getPaymentReturnPageForRole } from '../../utils/roleNavigation';
import styles from './PaymentCancelPage.module.css';

const PaymentCancelPage = ({ onNavigate }) => {
  const [orderCode, setOrderCode] = useState('');

  const userStr = localStorage.getItem('user');
  let user = null;
  try {
    user = userStr ? JSON.parse(userStr) : null;
  } catch (_) {
    user = null;
  }

  const originRole = sessionStorage.getItem('payos_origin_role') || user?.role;
  const returnPage = getPaymentReturnPageForRole(originRole);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('orderCode') || '';
    setOrderCode(code);

    if (code) {
      sessionStorage.removeItem(`payos_order_${code}`);
    }
    sessionStorage.removeItem('payos_origin_role');
  }, []);

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
              Quay lại trang tài chính
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentCancelPage;
