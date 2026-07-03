import React, { useEffect, useMemo, useState } from 'react';
import { centerService } from '../../services/centerService';
import { centerDashboardService } from '../../services/centerDashboardService';
import { subscriptionService } from '../../services/subscriptionService';
import { normalizeDetailResponse, normalizeListResponse } from '../../utils/apiResponse';
import { normalizeCurrentSubscription, parseBackendDateTime } from '../../utils/subscriptionStatus';
import styles from './CenterSubscriptionsPage.module.css';

const normalizePackage = (pkg) => ({
  ...pkg,
  id: String(pkg?.id || pkg?.packageId || ''),
  name: pkg?.name || pkg?.packageName || 'Gói đăng ký',
  price: Number(pkg?.price || 0),
  duration: Number(pkg?.duration || 0),
  durationUnit: String(pkg?.durationUnit || 'MONTH').toUpperCase(),
  maxUsers: Number(pkg?.maxUsers || 0),
  maxClasses: pkg?.maxClasses ?? null,
  maxStudentsPerClass: pkg?.maxStudentsPerClass ?? null,
  maxParentsPerClass: pkg?.maxParentsPerClass ?? null,
  isActive: pkg?.isActive !== false,
  createdAt: parseBackendDateTime(pkg?.createdAt),
});

const formatCurrency = (value) => {
  if (value === undefined || value === null) return '0 VND';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(Number(value));
};

const formatDate = (value) => {
  if (!value) return 'Không giới hạn';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Không giới hạn';
  return date.toLocaleDateString('vi-VN');
};

const formatOptionalLimit = (value, suffix = '') => {
  if (value === null || value === undefined || value === '') return 'Không giới hạn';
  return `${value}${suffix}`;
};

const getDurationLabel = (duration, unit) => {
  if (!duration) return 'Linh hoạt';
  if (unit === 'YEAR') return `${duration} năm`;
  return `${duration} tháng`;
};

const isEnterprisePackage = (pkg) => String(pkg?.name || '').toUpperCase().includes('ENTERPRISE');

const extractCheckoutPayload = (response) => {
  const payload = response?.data && typeof response.data === 'object'
    ? response.data
    : response;

  return {
    checkoutUrl: payload?.checkoutUrl || payload?.paymentUrl || payload?.url || '',
    orderCode: String(payload?.orderCode || payload?.paymentOrderCode || payload?.code || ''),
    invoiceId: String(
      payload?.invoiceId
        || payload?.subscriptionInvoiceId
        || payload?.paymentTransaction?.invoiceId
        || payload?.invoice?.id
        || '',
    ),
  };
};

const getCenterId = (profile) => String(
  profile?.centerId
  || profile?.id
  || profile?.center?.id
  || '',
);

const getSubscriptionStateText = (subscription) => {
  if (!subscription || subscription.isFreePlan) {
    return subscription?.originalStatus
      ? 'Gói cũ không còn hiệu lực'
      : 'Đang sử dụng gói mặc định';
  }

  return `Hiệu lực đến ${formatDate(subscription.endDate)}`;
};

const CenterSubscriptionsPage = () => {
  const [centerProfile, setCenterProfile] = useState(null);
  const [packages, setPackages] = useState([]);
  const [currentSubscription, setCurrentSubscription] = useState(() => normalizeCurrentSubscription(null));
  const [loading, setLoading] = useState(true);
  const [redirectingId, setRedirectingId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');

      try {
        const profile = normalizeDetailResponse(await centerService.getCenterProfile().catch(() => null));
        const resolvedCenterId = getCenterId(profile);

        const [packageResponse, currentSubscriptionResponse] = await Promise.all([
          subscriptionService.getCenterPackages(),
          resolvedCenterId
            ? centerDashboardService.getCurrentSubscription(resolvedCenterId).catch((subscriptionError) => {
              if (Number(subscriptionError?.status) === 404) {
                return null;
              }

              throw subscriptionError;
            })
            : Promise.resolve(null),
        ]);

        setCenterProfile(profile || null);
        setCurrentSubscription(normalizeCurrentSubscription(normalizeDetailResponse(currentSubscriptionResponse)));
        const normalizedPackages = normalizeListResponse(packageResponse)
          .map(normalizePackage)
          .filter((pkg) => pkg.id && pkg.isActive)
          .sort((left, right) => left.price - right.price);
        setPackages(normalizedPackages);
      } catch (fetchError) {
        setError(fetchError.message || 'Không thể tải danh sách gói đăng ký.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredPackages = useMemo(() => packages, [packages]);

  const centerId = getCenterId(centerProfile);
  const activePackageId = !currentSubscription.isFreePlan
    ? String(currentSubscription.packageId || '')
    : '';

  const handleCheckout = async (pkg) => {
    if (!pkg?.id) return;
    if (!centerId) {
      setError('Không tìm thấy centerId để tạo phiên thanh toán gói đăng ký.');
      return;
    }

    setRedirectingId(pkg.id);
    setError('');

    try {
      const response = await subscriptionService.createCenterSubscriptionCheckout({
        centerId,
        packageId: pkg.id,
      });
      const { checkoutUrl, orderCode, invoiceId } = extractCheckoutPayload(response);

      if (!checkoutUrl) {
        throw new Error('Hệ thống chưa trả về liên kết thanh toán hợp lệ cho gói này.');
      }

      sessionStorage.setItem('payos_origin_role', 'Center');
      sessionStorage.setItem('payos_payment_type', 'subscription');
      sessionStorage.setItem('payos_pending_order_code', String(orderCode));
      sessionStorage.setItem('payos_pending_package_id', pkg.id);
      sessionStorage.setItem('payos_pending_center_id', centerId);
      if (orderCode && invoiceId) {
        sessionStorage.setItem(`payos_order_${orderCode}`, invoiceId);
      }

      window.location.href = checkoutUrl;
    } catch (checkoutError) {
      setError(checkoutError.message || 'Không thể tạo phiên thanh toán cho gói này.');
      setRedirectingId('');
    }
  };

  return (
    <div className={styles.root}>
      <main className={styles.mainContent}>
        <div className={styles.container}>
          <section className={styles.heroCard}>
            <div className={styles.heroLead}>
              <span className={styles.eyebrow}>Gói đăng ký trung tâm</span>
              <h2 className={styles.pageTitle}>Mua gói đăng ký cho trung tâm</h2>
              <p className={styles.pageSubtitle}>
                Chọn gói do quản trị viên mở bán, tạo phiên thanh toán và chuyển sang cổng thanh toán để kích hoạt.
              </p>
            </div>

            <div className={styles.heroMeta}>
              <div className={styles.metaBlock}>
                <span className="material-symbols-outlined">domain</span>
                <div>
                  <p>Trung tâm</p>
                  <strong>{centerProfile?.name || 'Tài khoản trung tâm'}</strong>
                </div>
              </div>
              <div className={styles.metaBlock}>
                <span className="material-symbols-outlined">workspace_premium</span>
                <div>
                  <p>Gói hiện tại</p>
                  <strong>{currentSubscription.packageName}</strong>
                  <small>{getSubscriptionStateText(currentSubscription)}</small>
                </div>
              </div>
            </div>
          </section>

          {error && <div className={styles.alertError}>{error}</div>}

          {loading ? (
            <section className={styles.emptyState}>
              <div className={styles.spinner}></div>
              <p>Đang tải danh sách gói đăng ký...</p>
            </section>
          ) : filteredPackages.length === 0 ? (
            <section className={styles.emptyState}>
              <span className="material-symbols-outlined">inventory_2</span>
              <p>Chưa có gói đăng ký phù hợp để mua.</p>
            </section>
          ) : (
            <section className={styles.packageGrid}>
              {filteredPackages.map((pkg) => (
                <article
                  key={pkg.id}
                  className={`${styles.packageCard} ${isEnterprisePackage(pkg) ? styles.enterpriseCard : ''}`}
                >
                  <div className={styles.cardHeader}>
                    <div>
                      <p className={styles.packageLabel}>Gói {getDurationLabel(pkg.duration, pkg.durationUnit)}</p>
                      <h3>{pkg.name}</h3>
                    </div>
                    {isEnterprisePackage(pkg) && <span className={styles.enterpriseBadge}>Enterprise</span>}
                  </div>

                  <div className={styles.priceLine}>
                    <strong>{formatCurrency(pkg.price)}</strong>
                    <span>/ {getDurationLabel(pkg.duration, pkg.durationUnit)}</span>
                  </div>

                  <div className={styles.capacityPill}>
                    <span className="material-symbols-outlined">groups</span>
                    Tối đa {pkg.maxUsers || 0} người dùng
                  </div>

                  <div className={styles.limitList}>
                    <div>
                      <span>Số lớp</span>
                      <strong>{formatOptionalLimit(pkg.maxClasses)}</strong>
                    </div>
                    <div>
                      <span>Học sinh / lớp</span>
                      <strong>{formatOptionalLimit(pkg.maxStudentsPerClass)}</strong>
                    </div>
                    <div>
                      <span>Phụ huynh / lớp</span>
                      <strong>{formatOptionalLimit(pkg.maxParentsPerClass)}</strong>
                    </div>
                  </div>

                  <div className={styles.cardFooter}>
                    {activePackageId && activePackageId === pkg.id ? (
                      <div className={styles.currentPlanBox}>
                        <span className="material-symbols-outlined">task_alt</span>
                        <div>
                          <strong>Đang sử dụng</strong>
                          <p>Gói này hiện còn hiệu lực.</p>
                        </div>
                      </div>
                    ) : (
                      <button
                        className={styles.buyButton}
                        onClick={() => handleCheckout(pkg)}
                        disabled={redirectingId === pkg.id}
                      >
                        {redirectingId === pkg.id ? 'Đang tạo liên kết thanh toán...' : 'Thanh toán gói này'}
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </section>
          )}
        </div>
      </main>
    </div>
  );
};

export default CenterSubscriptionsPage;
