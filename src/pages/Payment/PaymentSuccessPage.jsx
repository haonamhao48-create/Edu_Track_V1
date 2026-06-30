import React, { useEffect, useState } from 'react';
import { invoiceService } from '../../services/invoiceService';
import { centerDashboardService } from '../../services/centerDashboardService';
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
  const [returnPage, setReturnPage] = useState('finance');
  const [buttonLabel, setButtonLabel] = useState('Quay lại trang tài chính');
  const [isSubscription, setIsSubscription] = useState(false);

  const userStr = localStorage.getItem('user');
  let user = null;
  try {
    user = userStr ? JSON.parse(userStr) : null;
  } catch (_) {
    user = null;
  }

  const originRole = sessionStorage.getItem('payos_origin_role') || user?.role;
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (isSuccessState && !loading) {
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
    }
  }, [isSuccessState, loading, returnPage, onNavigate]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('orderCode') || '';
    setOrderCode(code);

    if (!code) {
      setLoading(false);
      setMessage('Không tìm thấy mã giao dịch thanh toán.');
      return;
    }

    const pendingOrderCode = sessionStorage.getItem('payos_pending_order_code');
    const isSub = (sessionStorage.getItem('payos_payment_type') === 'subscription' && pendingOrderCode === String(code))
                  || (user?.role === 'Center' || user?.role === 'Admin');
    setIsSubscription(isSub);

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

    const cleanSessionData = () => {
      sessionStorage.removeItem(`payos_order_${code}`);
      sessionStorage.removeItem('payos_origin_role');
      sessionStorage.removeItem('payos_payment_type');
      sessionStorage.removeItem('payos_pending_order_code');
      sessionStorage.removeItem('payos_pending_package_id');
      sessionStorage.removeItem('payos_pending_center_id');
    };

    let attempts = 0;
    const maxAttempts = 10;

    if (isSub) {
      const pendingCenterId = sessionStorage.getItem('payos_pending_center_id');
      const pendingPackageId = sessionStorage.getItem('payos_pending_package_id');

      if (!pendingCenterId || !pendingPackageId) {
        setLoading(false);
        setIsSuccessState(true);
        setMessage(`Giao dịch đăng ký #${code} đã thanh toán thành công.`);
        cleanSessionData();
        return;
      }

      const pollSubscription = async () => {
        attempts += 1;
        setMessage(`Đang kiểm tra gói đăng ký từ máy chủ... (${attempts}/${maxAttempts})`);

        try {
          const response = await centerDashboardService.getCurrentSubscription(pendingCenterId);
          const currentPackageId = String(response?.packageId || '');
          const status = String(response?.status || '').toUpperCase();

          if (currentPackageId === String(pendingPackageId) && status === 'ACTIVE') {
            setIsSuccessState(true);
            setMessage('Giao dịch đăng ký gói đã được kích hoạt thành công!');
            setLoading(false);
            cleanSessionData();
            return;
          }

          if (attempts >= maxAttempts) {
            setIsSuccessState(true);
            setMessage('Giao dịch mua gói đã hoàn tất. Gói cước sẽ được cập nhật trong ít phút.');
            setLoading(false);
            cleanSessionData();
            return;
          }

          setTimeout(pollSubscription, 2000);
        } catch (error) {
          if (attempts >= maxAttempts) {
            setLoading(false);
            setMessage('Không thể tự động xác nhận trạng thái gói cước. Vui lòng kiểm tra lại trang quản lý gói.');
            cleanSessionData();
          } else {
            setTimeout(pollSubscription, 2000);
          }
        }
      };

      pollSubscription();
    } else {
      const cachedInvoiceId = sessionStorage.getItem(`payos_order_${code}`);
      if (!cachedInvoiceId) {
        setLoading(false);
        setIsSuccessState(true);
        setMessage(`Giao dịch học phí #${code} đã thanh toán thành công.`);
        cleanSessionData();
        return;
      }

      const pollInvoice = async () => {
        attempts += 1;
        setMessage(`Đang kiểm tra trạng thái học phí... (${attempts}/${maxAttempts})`);

        try {
          const response = await invoiceService.getInvoiceDetail(cachedInvoiceId);
          const status = String(response?.status || '').toUpperCase();

          if (status === 'PAID') {
            setInvoice(response);
            setIsSuccessState(true);
            setMessage('Thanh toán học phí thành công!');
            setLoading(false);
            cleanSessionData();
            return;
          }

          if (attempts >= maxAttempts) {
            setInvoice(response);
            setIsSuccessState(true);
            setMessage('Giao dịch học phí đã thành công và đang chờ đồng bộ.');
            setLoading(false);
            cleanSessionData();
            return;
          }

          setTimeout(pollInvoice, 2000);
        } catch (error) {
          if (attempts >= maxAttempts) {
            setLoading(false);
            setMessage('Không thể tự động xác nhận hóa đơn học phí. Vui lòng kiểm tra lại trong lịch sử hóa đơn.');
            cleanSessionData();
          } else {
            setTimeout(pollInvoice, 2000);
          }
        }
      };

      pollInvoice();
    }
  }, [originRole]);

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
                {buttonLabel} ({countdown}s)
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
                {buttonLabel}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentSuccessPage;
