import React, { useEffect, useState } from 'react';
import { invoiceService } from '../../services/invoiceService';
import { getPaymentReturnPageForRole } from '../../utils/roleNavigation';
import styles from './PaymentSuccessPage.module.css';

const formatCurrency = (value) => {
  if (value === undefined || value === null) return '0 VND';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(value));
};

const PaymentSuccessPage = ({ onNavigate }) => {
  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState(null);
  const [orderCode, setOrderCode] = useState('');
  const [message, setMessage] = useState('Đang kết nối để xác nhận giao dịch...');
  const [isSuccessState, setIsSuccessState] = useState(false);

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

    if (!code) {
      setLoading(false);
      setMessage('Không tìm thấy mã giao dịch thanh toán.');
      return;
    }

    const cachedInvoiceId = sessionStorage.getItem(`payos_order_${code}`);
    if (!cachedInvoiceId) {
      setLoading(false);
      setIsSuccessState(true);
      setMessage(`Giao dịch #${code} đã thanh toán thành công.`);
      return;
    }

    let attempts = 0;
    const maxAttempts = 10;

    const pollInvoice = async () => {
      attempts += 1;
      setMessage(`Đang kiểm tra trạng thái thanh toán từ máy chủ... (${attempts}/${maxAttempts})`);

      try {
        const response = await invoiceService.getInvoiceDetail(cachedInvoiceId);
        const status = String(response?.status || '').toUpperCase();

        if (status === 'PAID') {
          setInvoice(response);
          setIsSuccessState(true);
          setMessage('Thanh toán thành công!');
          setLoading(false);
          sessionStorage.removeItem(`payos_order_${code}`);
          sessionStorage.removeItem('payos_origin_role');
          return;
        }

        if (attempts >= maxAttempts) {
          setInvoice(response);
          setIsSuccessState(true);
          setMessage('Giao dịch đã được ghi nhận và đang chờ đồng bộ trạng thái cuối cùng.');
          setLoading(false);
          sessionStorage.removeItem(`payos_order_${code}`);
          sessionStorage.removeItem('payos_origin_role');
          return;
        }

        setTimeout(pollInvoice, 2000);
      } catch (error) {
        if (attempts >= maxAttempts) {
          setLoading(false);
          setMessage('Không thể tự động xác nhận trạng thái hóa đơn. Vui lòng kiểm tra lại trong lịch sử hóa đơn.');
        } else {
          setTimeout(pollInvoice, 2000);
        }
      }
    };

    pollInvoice();
  }, []);

  return (
    <div className={styles.pageRoot}>
      <div className={styles.card}>
        {loading ? (
          <div className={styles.loadingContainer}>
            <span className={`material-symbols-outlined notranslate ${styles.spinner}`} translate="no">progress_activity</span>
            <h2 className={styles.loadingTitle}>Đang xác nhận giao dịch</h2>
            <p className={styles.loadingText}>{message}</p>
          </div>
        ) : isSuccessState ? (
          <div className={styles.successContainer}>
            <div className={styles.iconWrapper}>
              <span className="material-symbols-outlined notranslate" translate="no">check</span>
            </div>
            <h2 className={styles.successTitle}>Thanh toán thành công!</h2>
            <p className={styles.successSub}>{message}</p>

            {invoice && (
              <div className={styles.detailsBox}>
                <div className={styles.detailRow}>
                  <span className={styles.label}>Nội dung thanh toán</span>
                  <span className={styles.value}>{invoice.description || 'Học phí khóa học'}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.label}>Số tiền đã nộp</span>
                  <span className={`${styles.value} ${styles.amount}`}>{formatCurrency(invoice.amount)}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.label}>Mã giao dịch (PayOS)</span>
                  <span className={`${styles.value} ${styles.code}`}>#{orderCode}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.label}>Thời gian</span>
                  <span className={styles.value}>
                    {invoice.paidAt ? new Date(invoice.paidAt).toLocaleString('vi-VN') : new Date().toLocaleString('vi-VN')}
                  </span>
                </div>
              </div>
            )}

            {!invoice && (
              <div className={styles.detailsBox}>
                <div className={styles.detailRow}>
                  <span className={styles.label}>Mã giao dịch (PayOS)</span>
                  <span className={`${styles.value} ${styles.code}`}>#{orderCode}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.label}>Trạng thái</span>
                  <span className={styles.value} style={{ color: '#047857', fontWeight: 600 }}>Thành công</span>
                </div>
              </div>
            )}

            <div className={styles.actions}>
              <button className={styles.btnPrimary} onClick={() => onNavigate(returnPage)}>
                Quay lại trang tài chính
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.errorContainer}>
            <div className={styles.errorIconWrapper}>
              <span className="material-symbols-outlined notranslate" translate="no">error</span>
            </div>
            <h2 className={styles.errorTitle}>Lỗi xác nhận giao dịch</h2>
            <p className={styles.errorText}>{message}</p>
            <div className={styles.actions}>
              <button className={styles.btnPrimary} onClick={() => onNavigate(returnPage)}>
                Quay lại trang tài chính
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentSuccessPage;
