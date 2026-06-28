import React, { useEffect, useMemo, useState } from 'react';
import { centerService } from '../../services/centerService';
import { classService } from '../../services/classService';
import { centerDashboardService } from '../../services/centerDashboardService';
import { normalizeDetailResponse, normalizeListResponse } from '../../utils/apiResponse';
import { normalizeCurrentSubscription } from '../../utils/subscriptionStatus';
import styles from './DashboardPage.module.css';

const normalizeNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getMonthNumber = (monthValue) => {
  const numericMonth = Number(monthValue);
  if (Number.isFinite(numericMonth) && numericMonth >= 1 && numericMonth <= 12) {
    return numericMonth;
  }
  if (typeof monthValue === 'string') {
    const parsedDate = new Date(monthValue);
    if (!Number.isNaN(parsedDate.getTime())) {
      return parsedDate.getMonth() + 1;
    }
  }
  return null;
};

const formatCurrency = (value) => (
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    currencyDisplay: 'code',
    maximumFractionDigits: 0,
  }).format(normalizeNumber(value))
);

const formatCompactCurrency = (value) => {
  const num = normalizeNumber(value);
  if (num < 1000000) {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      currencyDisplay: 'code',
      maximumFractionDigits: 0,
    }).format(num);
  }
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    currencyDisplay: 'code',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(num);
};

const formatDate = (value) => {
  if (!value) return 'Không giới hạn';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Không giới hạn';
  return date.toLocaleDateString('vi-VN');
};

const getCenterId = (profile) => String(
  profile?.centerId
  || profile?.id
  || profile?.center?.id
  || ''
);

const getSubscriptionNote = (subscriptionInfo) => {
  if (!subscriptionInfo || subscriptionInfo.isFreePlan) {
    if (subscriptionInfo?.originalStatus) {
      return 'Gói cũ hiện không còn hiệu lực';
    }

    return 'Đang sử dụng gói mặc định';
  }

  return `Hết hạn ${formatDate(subscriptionInfo.endDate)}`;
};

const normalizeMonthlyRevenue = (items) => {
  if (!Array.isArray(items)) return [];

  return items.map((item, index) => ({
    month: item?.month,
    revenue: normalizeNumber(item?.revenue),
    index,
  }));
};

const getMonthLabel = (monthValue, index) => {
  const numericMonth = Number(monthValue);

  if (Number.isFinite(numericMonth) && numericMonth >= 1 && numericMonth <= 12) {
    return `Tháng ${numericMonth}`;
  }

  if (typeof monthValue === 'string') {
    const parsedDate = new Date(monthValue);
    if (!Number.isNaN(parsedDate.getTime())) {
      return `Tháng ${parsedDate.getMonth() + 1}`;
    }
  }

  return `Kỳ ${index + 1}`;
};

const getRawMonthValue = (monthValue, index) => {
  if (monthValue === null || monthValue === undefined || monthValue === '') {
    return `Kỳ ${index + 1}`;
  }

  return String(monthValue);
};

const DashboardPage = ({ onNavigate }) => {
  const [centerProfile, setCenterProfile] = useState(() => {
    const cached = sessionStorage.getItem('cached_center_profile');
    if (!cached) return null;

    try {
      return JSON.parse(cached);
    } catch (_) {
      return null;
    }
  });
  const [classCount, setClassCount] = useState(() => {
    const cached = sessionStorage.getItem('cached_classes');
    if (!cached) return 0;

    try {
      const parsed = JSON.parse(cached);
      return Array.isArray(parsed) ? parsed.length : 0;
    } catch (_) {
      return 0;
    }
  });
  const [revenueStats, setRevenueStats] = useState({
    totalRevenue: 0,
    monthlyRevenue: [],
  });
  const [invoiceStats, setInvoiceStats] = useState({
    totalInvoices: 0,
    pendingInvoices: 0,
    paidInvoices: 0,
    cancelledInvoices: 0,
  });
  const [subscriptionInfo, setSubscriptionInfo] = useState(() => normalizeCurrentSubscription(null));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [animateBars, setAnimateBars] = useState(false);
  const [activeHoverIndex, setActiveHoverIndex] = useState(null);

  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => setAnimateBars(true), 150);
      return () => clearTimeout(timer);
    } else {
      setAnimateBars(false);
    }
  }, [loading]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      setError('');

      try {
        const profile = normalizeDetailResponse(await centerService.getCenterProfile());
        setCenterProfile(profile || null);
        sessionStorage.setItem('cached_center_profile', JSON.stringify(profile));
        sessionStorage.removeItem('center_profile_needs_reload');

        const centerId = getCenterId(profile);
        if (!centerId) {
          throw new Error('Không tìm thấy thông tin trung tâm để tải dashboard.');
        }

        const [classesResponse, revenueResponse, invoiceResponse, subscriptionResponse] = await Promise.all([
          classService.getAllClasses(),
          centerDashboardService.getRevenueDashboard(centerId),
          centerDashboardService.getInvoiceDashboard(centerId),
          centerDashboardService.getCurrentSubscription(centerId).catch((subscriptionError) => {
            if (Number(subscriptionError?.status) === 404) {
              return null;
            }

            throw subscriptionError;
          }),
        ]);

        const classes = normalizeListResponse(classesResponse);
        const revenueData = normalizeDetailResponse(revenueResponse) || {};
        const invoiceData = normalizeDetailResponse(invoiceResponse) || {};
        const currentSubscriptionData = normalizeDetailResponse(subscriptionResponse);

        setClassCount(classes.length);
        sessionStorage.setItem('cached_classes', JSON.stringify(classes));
        sessionStorage.removeItem('classes_needs_reload');

        setRevenueStats({
          totalRevenue: normalizeNumber(
            revenueData?.totalRevenue
            ?? revenueData?.revenueTotal
            ?? revenueData?.totalAmount,
          ),
          monthlyRevenue: normalizeMonthlyRevenue(
            revenueData?.monthlyRevenue
            ?? revenueData?.monthlyRevenues
            ?? revenueData?.revenueByMonth
            ?? revenueData?.items,
          ),
        });

        setInvoiceStats({
          totalInvoices: normalizeNumber(invoiceData?.totalInvoices ?? invoiceData?.invoiceCount),
          pendingInvoices: normalizeNumber(invoiceData?.pendingInvoices ?? invoiceData?.pendingCount),
          paidInvoices: normalizeNumber(invoiceData?.paidInvoices ?? invoiceData?.paidCount),
          cancelledInvoices: normalizeNumber(invoiceData?.cancelledInvoices ?? invoiceData?.cancelledCount),
        });

        setSubscriptionInfo(normalizeCurrentSubscription(currentSubscriptionData));
      } catch (fetchError) {
        console.error('Lỗi khi tải dashboard trung tâm:', fetchError);
        setError(fetchError.message || 'Không thể tải dữ liệu dashboard.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const centerName = centerProfile?.name || 'Trung tâm';

  const revenueHistory = useMemo(() => {
    if (!Array.isArray(revenueStats.monthlyRevenue) || revenueStats.monthlyRevenue.length === 0) {
      return [];
    }

    // Extract present months
    const presentMonths = revenueStats.monthlyRevenue
      .map((item) => getMonthNumber(item?.month))
      .filter(Boolean);

    if (presentMonths.length === 0) return [];

    const minMonth = Math.min(...presentMonths);
    const maxMonth = Math.max(...presentMonths);

    // Get the quarters span
    const startQuarter = Math.ceil(minMonth / 3);
    const endQuarter = Math.ceil(maxMonth / 3);

    // Generate all calendar months for quarters in the span
    const allMonths = [];
    for (let q = startQuarter; q <= endQuarter; q++) {
      allMonths.push((q - 1) * 3 + 1);
      allMonths.push((q - 1) * 3 + 2);
      allMonths.push((q - 1) * 3 + 3);
    }

    // Map each month, matching with API data or creating a zero placeholder
    const timeline = allMonths.map((mNum, idx) => {
      const existingItem = revenueStats.monthlyRevenue.find(
        (item) => getMonthNumber(item?.month) === mNum
      );

      const revenue = existingItem ? normalizeNumber(existingItem.revenue || existingItem.revenueTotal || existingItem.totalAmount) : 0;
      return {
        month: mNum,
        revenue,
        label: `Tháng ${mNum}`,
        rawMonth: String(mNum),
        index: idx,
      };
    });

    // Calculate growth rate sequentially
    return timeline.map((item, index) => {
      let growthRate = null;
      if (index > 0) {
        const prevRevenue = timeline[index - 1].revenue;
        if (prevRevenue > 0) {
          growthRate = Math.round(((item.revenue - prevRevenue) / prevRevenue) * 100);
        } else if (item.revenue > 0) {
          growthRate = 100; // 100% growth from zero
        }
      }
      return {
        ...item,
        growthRate,
      };
    });
  }, [revenueStats.monthlyRevenue]);

  const revenueByQuarter = useMemo(() => {
    const quarters = {};
    revenueHistory.forEach((item) => {
      const monthNum = getMonthNumber(item.month);
      const qKey = monthNum ? `Quý ${Math.ceil(monthNum / 3)}` : 'Khác';
      if (!quarters[qKey]) {
        quarters[qKey] = {
          name: qKey,
          items: [],
          totalRevenue: 0,
        };
      }
      quarters[qKey].items.push(item);
      quarters[qKey].totalRevenue += item.revenue;
    });
    return Object.values(quarters);
  }, [revenueHistory]);

  const strongestMonth = useMemo(() => {
    const validMonths = revenueHistory.filter((item) => item.revenue > 0);
    if (!validMonths.length) return null;

    return validMonths.reduce((best, current) => (
      current.revenue > best.revenue ? current : best
    ), validMonths[0]);
  }, [revenueHistory]);

  const latestMonth = useMemo(() => {
    const validMonths = revenueHistory.filter((item) => item.revenue > 0);
    if (!validMonths.length) return null;
    return validMonths[validMonths.length - 1];
  }, [revenueHistory]);

  const collectionRate = useMemo(() => {
    if (!invoiceStats.totalInvoices) return 0;
    return Math.round((invoiceStats.paidInvoices / invoiceStats.totalInvoices) * 100);
  }, [invoiceStats]);

  const unpaidRate = useMemo(() => {
    if (!invoiceStats.totalInvoices) return 0;
    return Math.round((invoiceStats.pendingInvoices / invoiceStats.totalInvoices) * 100);
  }, [invoiceStats]);

  const maxRevenue = useMemo(() => (
    Math.max(...revenueHistory.map((item) => item.revenue), 0)
  ), [revenueHistory]);

  const metricCards = [
    {
      label: 'Tổng doanh thu',
      value: loading ? '...' : formatCurrency(revenueStats.totalRevenue),
      note: 'Doanh thu đã ghi nhận',
      icon: 'payments',
      isFeatured: true,
    },
    {
      label: 'Kỳ gần nhất',
      value: loading ? '...' : (latestMonth ? formatCurrency(latestMonth.revenue) : '0 VND'),
      note: latestMonth ? latestMonth.label : 'Chưa có dữ liệu',
      icon: 'calendar_month',
    },
    {
      label: 'Tổng hóa đơn',
      value: loading ? '...' : String(invoiceStats.totalInvoices),
      note: 'Tổng số hóa đơn hiện có',
      icon: 'receipt_long',
    },
    {
      label: 'Đã thu',
      value: loading ? '...' : String(invoiceStats.paidInvoices),
      note: `${collectionRate}% tổng hóa đơn`,
      icon: 'task_alt',
    },
    {
      label: 'Chờ thanh toán',
      value: loading ? '...' : String(invoiceStats.pendingInvoices),
      note: `${unpaidRate}% tổng hóa đơn`,
      icon: 'schedule',
    },
    {
      label: 'Lớp đang quản lý',
      value: loading ? '...' : String(classCount),
      note: 'Từ danh sách lớp hiện có',
      icon: 'school',
    },
    {
      label: 'Gói hiện tại',
      value: loading ? '...' : subscriptionInfo.packageName,
      note: loading ? 'Đang đồng bộ' : getSubscriptionNote(subscriptionInfo),
      icon: 'workspace_premium',
    },
  ];

  const invoiceBreakdown = [
    {
      label: 'Tổng hóa đơn',
      value: invoiceStats.totalInvoices,
      tone: styles.toneNeutral,
    },
    {
      label: 'Đã thu',
      value: invoiceStats.paidInvoices,
      tone: styles.toneSuccess,
    },
    {
      label: 'Chờ thanh toán',
      value: invoiceStats.pendingInvoices,
      tone: styles.toneWarning,
    },
    {
      label: 'Đã hủy',
      value: invoiceStats.cancelledInvoices,
      tone: styles.toneMuted,
    },
  ];

  const revenueApiFields = [
    {
      key: 'totalRevenue',
      label: 'Tổng doanh thu',
      value: formatCurrency(revenueStats.totalRevenue),
    },
    {
      key: 'monthlyRevenue.length',
      label: 'Số kỳ doanh thu',
      value: `${revenueHistory.length} kỳ`,
    },
  ];

  const invoiceApiFields = [
    {
      key: 'totalInvoices',
      label: 'Tổng hóa đơn',
      value: String(invoiceStats.totalInvoices),
    },
    {
      key: 'pendingInvoices',
      label: 'Hóa đơn chờ thanh toán',
      value: String(invoiceStats.pendingInvoices),
    },
    {
      key: 'paidInvoices',
      label: 'Hóa đơn đã thu',
      value: String(invoiceStats.paidInvoices),
    },
    {
      key: 'cancelledInvoices',
      label: 'Hóa đơn đã hủy',
      value: String(invoiceStats.cancelledInvoices),
    },
  ];

  return (
    <div className={styles.dashboardRoot}>
      <main className={styles.mainContent}>
        <div className={styles.container}>
          <section className={styles.heroCard}>
            <div className={styles.heroCopy}>
              <span className={styles.kicker}>Dashboard trung tâm</span>
              <h1 className={styles.heroTitle}>
                {loading ? 'Đang tải dữ liệu tài chính' : `Tổng quan vận hành của ${centerName}`}
              </h1>
              <p className={styles.heroSubtitle}>
                Màn hình này tổng hợp doanh thu, lịch sử doanh thu theo kỳ và tình trạng hóa đơn của trung tâm bằng đơn vị tiền tệ Việt Nam.
              </p>

              <div className={styles.heroMeta}>
                <div className={styles.metaChip}>
                  <span className="material-symbols-outlined">domain</span>
                  <div>
                    <small>Trung tâm</small>
                    <strong>{centerName}</strong>
                  </div>
                </div>
                <div className={styles.metaChip}>
                  <span className="material-symbols-outlined">bar_chart</span>
                  <div>
                    <small>Số kỳ doanh thu</small>
                    <strong>{loading ? '...' : `${revenueHistory.length} kỳ`}</strong>
                  </div>
                </div>
                <div className={styles.metaChip}>
                  <span className="material-symbols-outlined">fact_check</span>
                  <div>
                    <small>Tỷ lệ thu</small>
                    <strong>{loading ? '...' : `${collectionRate}%`}</strong>
                  </div>
                </div>
                <div className={styles.metaChip}>
                  <span className="material-symbols-outlined">workspace_premium</span>
                  <div>
                    <small>Gói hiện tại</small>
                    <strong>{loading ? '...' : subscriptionInfo.packageName}</strong>
                  </div>
                </div>
              </div>

              <div className={styles.quickActions}>
                <button className={`${styles.actionBtn} ${styles.actionPrimary}`} onClick={() => onNavigate('finance')}>
                  <span className="material-symbols-outlined">payments</span> Mở hóa đơn
                </button>
                <button className={styles.actionBtn} onClick={() => onNavigate('center-subscriptions')}>
                  <span className="material-symbols-outlined">workspace_premium</span> Xem gói đăng ký
                </button>
                <button className={styles.actionBtn} onClick={() => onNavigate('create-class')}>
                  <span className="material-symbols-outlined">add_box</span> Tạo lớp mới
                </button>
              </div>
            </div>

            <aside className={styles.heroAside}>
              <div className={styles.summaryBlock}>
                <span className={styles.summaryLabel}>Tổng doanh thu hiện tại</span>
                <strong className={styles.summaryValue}>
                  {loading ? '...' : formatCompactCurrency(revenueStats.totalRevenue)}
                </strong>
                <p className={styles.summaryHint}>
                  {loading
                    ? 'Đang đồng bộ dữ liệu'
                    : strongestMonth
                      ? `Kỳ cao nhất: ${strongestMonth.label} với ${formatCurrency(strongestMonth.revenue)}`
                      : 'Chưa có dữ liệu doanh thu theo kỳ'}
                </p>
              </div>

              <div className={styles.summaryBlock}>
                <span className={styles.summaryLabel}>Tình trạng hóa đơn</span>
                <ul className={styles.inlineStats}>
                  {invoiceBreakdown.map((item) => (
                    <li key={item.label}>
                      <span>{item.label}</span>
                      <strong>{loading ? '...' : item.value}</strong>
                    </li>
                  ))}
                </ul>
              </div>

              <div className={styles.summaryBlock}>
                <span className={styles.summaryLabel}>Gói đăng ký hiện tại</span>
                <strong className={styles.summaryValue}>
                  {loading ? '...' : subscriptionInfo.packageName}
                </strong>
                <p className={styles.summaryHint}>
                  {loading
                    ? 'Đang đồng bộ dữ liệu'
                    : subscriptionInfo.isFreePlan
                      ? (subscriptionInfo.originalStatus ? 'Gói cũ đã hết hiệu lực, trung tâm đang ở gói Free.' : 'Trung tâm đang sử dụng gói Free.')
                      : `Hiệu lực đến ${formatDate(subscriptionInfo.endDate)}.`}
                </p>
              </div>
            </aside>
          </section>

          {error && (
            <section className={styles.errorBox}>
              <span className="material-symbols-outlined">error</span>
              <p>{error}</p>
            </section>
          )}

          <section className={styles.metricsGrid}>
            {metricCards.map((card) => (
              <article 
                key={card.label} 
                className={`${styles.metricCard} ${card.isFeatured ? styles.metricFeatured : ''}`}
              >
                <div className={styles.metricTop}>
                  <span className={`material-symbols-outlined ${styles.metricIcon} ${card.isFeatured ? styles.metricIconFeatured : ''}`}>{card.icon}</span>
                  <span className={`${styles.metricNote} ${card.isFeatured ? styles.metricNoteFeatured : ''}`}>{card.note}</span>
                </div>
                <p className={`${styles.metricLabel} ${card.isFeatured ? styles.metricLabelFeatured : ''}`}>{card.label}</p>
                <strong className={styles.metricValue}>{card.value}</strong>
              </article>
            ))}
          </section>

          <section className={styles.contentGrid}>
            <article className={`${styles.panel} ${styles.revenuePanel}`}>
              <div className={styles.panelHeader}>
                <div>
                  <h2 className={styles.panelTitle}>Doanh thu theo kỳ</h2>
                  {activeHoverIndex !== null && revenueHistory[activeHoverIndex] ? (
                    <p className={`${styles.panelSubtitle} ${styles.revealActive}`}>
                      Chi tiết: <strong>{revenueHistory[activeHoverIndex].label}</strong> (Kỳ: {revenueHistory[activeHoverIndex].rawMonth}) — <span className={styles.revealAmount}>{formatCurrency(revenueHistory[activeHoverIndex].revenue)}</span>
                      {revenueHistory[activeHoverIndex].growthRate !== null && (
                        <span className={`${styles.growthBadge} ${revenueHistory[activeHoverIndex].growthRate >= 0 ? styles.growthPositive : styles.growthNegative}`}>
                          {revenueHistory[activeHoverIndex].growthRate >= 0 ? `↑ +${revenueHistory[activeHoverIndex].growthRate}%` : `↓ ${revenueHistory[activeHoverIndex].growthRate}%`}
                        </span>
                      )}
                    </p>
                  ) : (
                    <p className={styles.panelSubtitle}>Theo dõi đầy đủ các kỳ doanh thu đang có của trung tâm (rê chuột để xem chi tiết).</p>
                  )}
                </div>
                <button className={styles.textButton} onClick={() => onNavigate('finance')}>
                  Xem chi tiết hóa đơn
                </button>
              </div>

              {loading ? (
                <div className={styles.chartSkeleton}>
                  <div className={styles.skeletonBar}></div>
                  <div className={styles.skeletonBar}></div>
                  <div className={styles.skeletonBar}></div>
                  <div className={styles.skeletonBar}></div>
                  <div className={styles.skeletonBar}></div>
                </div>
              ) : revenueHistory.length === 0 ? (
                <div className={styles.emptyState}>
                  <span className="material-symbols-outlined">bar_chart_off</span>
                  <p>Chưa có dữ liệu doanh thu theo kỳ.</p>
                </div>
              ) : (
                <>
                  <div className={styles.chartScroller}>
                    <div className={styles.quartersWrapper}>
                      {revenueByQuarter.map((quarter) => (
                        <div key={quarter.name} className={styles.quarterGroup}>
                          <div className={styles.quarterHeader}>
                            <span className={styles.quarterTitle}>{quarter.name}</span>
                            <span className={styles.quarterTotal}>{formatCompactCurrency(quarter.totalRevenue)}</span>
                          </div>
                          <div className={styles.quarterColumns}>
                            {quarter.items.map((item) => (
                              <div 
                                key={`${item.rawMonth}-${item.index}`} 
                                className={`${styles.chartColumn} ${activeHoverIndex === item.index ? styles.chartColumnActive : ''}`}
                                onMouseEnter={() => setActiveHoverIndex(item.index)}
                                onMouseLeave={() => setActiveHoverIndex(null)}
                              >
                                <span className={styles.chartAmount}>{formatCompactCurrency(item.revenue)}</span>
                                <div className={styles.chartTrack}>
                                  <div
                                    className={`${styles.chartBar} ${animateBars ? styles.chartBarAnimate : ''}`}
                                    style={{
                                      '--target-height': `${maxRevenue > 0 ? Math.max((item.revenue / maxRevenue) * 100, 8) : 8}%`,
                                    }}
                                  ></div>
                                </div>
                                <span className={styles.chartLabel}>{item.label}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className={styles.historyList}>
                    {revenueHistory.map((item) => (
                      <div key={`history-${item.rawMonth}-${item.index}`} className={styles.historyRow}>
                        <div>
                          <strong className={styles.historyTitle}>{item.label}</strong>
                          <p className={styles.historyMeta}>Kỳ ghi nhận: {item.rawMonth}</p>
                        </div>
                        <div className={styles.historyAmountWrapper}>
                          {item.growthRate !== null && (
                            <span className={`${styles.growthBadge} ${item.growthRate >= 0 ? styles.growthPositive : styles.growthNegative}`}>
                              {item.growthRate >= 0 ? `+${item.growthRate}%` : `${item.growthRate}%`}
                            </span>
                          )}
                          <strong className={styles.historyAmount}>{formatCurrency(item.revenue)}</strong>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </article>

            <article className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <h2 className={styles.panelTitle}>Trạng thái hóa đơn</h2>
                  <p className={styles.panelSubtitle}>Tổng hợp đầy đủ số lượng hóa đơn theo từng trạng thái hiện có.</p>
                </div>
              </div>

              <div className={styles.invoiceGrid}>
                {invoiceBreakdown.map((item) => (
                  <div key={item.label} className={`${styles.invoiceCard} ${item.tone}`}>
                    <span>{item.label}</span>
                    <strong>{loading ? '...' : item.value}</strong>
                  </div>
                ))}
              </div>

              <div className={styles.snapshotBox}>
                <div className={styles.snapshotRow}>
                  <span>Tỷ lệ thu học phí</span>
                  <strong>{loading ? '...' : `${collectionRate}%`}</strong>
                </div>
                <div className={styles.snapshotRow}>
                  <span>Tỷ lệ chờ thanh toán</span>
                  <strong>{loading ? '...' : `${unpaidRate}%`}</strong>
                </div>
                <div className={styles.snapshotRow}>
                  <span>Kỳ doanh thu gần nhất</span>
                  <strong>{loading ? '...' : (latestMonth ? latestMonth.label : 'Chưa có')}</strong>
                </div>
              </div>
            </article>

            <article className={`${styles.panel} ${styles.apiPanel}`}>
              <div className={styles.panelHeader}>
                <div>
                  <h2 className={styles.panelTitle}>Tóm tắt dữ liệu</h2>
                  <p className={styles.panelSubtitle}>Hiển thị gọn toàn bộ thông tin doanh thu và hóa đơn để đối chiếu nhanh ngay trên dashboard.</p>
                </div>
              </div>

              <div className={styles.apiGrid}>
                <section className={styles.apiCard}>
                  <h3>Thông tin doanh thu</h3>
                  <div className={styles.keyValueList}>
                    {revenueApiFields.map((field) => (
                      <div key={field.key} className={styles.keyValueRow}>
                        <span>{field.label}</span>
                        <strong>{loading ? '...' : field.value}</strong>
                      </div>
                    ))}
                  </div>
                </section>

                <section className={styles.apiCard}>
                  <h3>Thông tin hóa đơn</h3>
                  <div className={styles.keyValueList}>
                    {invoiceApiFields.map((field) => (
                      <div key={field.key} className={styles.keyValueRow}>
                        <span>{field.label}</span>
                        <strong>{loading ? '...' : field.value}</strong>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </article>
          </section>
        </div>
      </main>
    </div>
  );
};

export default DashboardPage;
