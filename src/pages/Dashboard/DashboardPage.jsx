import React, { useEffect, useMemo, useState } from 'react';
import { centerService } from '../../services/centerService';
import { classService } from '../../services/classService';
import { studentService } from '../../services/studentService';
import { teacherService } from '../../services/teacherService';
import { parentService } from '../../services/parentService';
import { centerDashboardService } from '../../services/centerDashboardService';
import { normalizeDetailResponse, normalizeListResponse, normalizePagedResponse } from '../../utils/apiResponse';
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

  const [classCount, setClassCount] = useState(0);
  const [studentCount, setStudentCount] = useState(0);
  const [teacherCount, setTeacherCount] = useState(0);
  const [parentCount, setParentCount] = useState(0);

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

        const centerId = getCenterId(profile);
        if (!centerId) {
          throw new Error('Không tìm thấy thông tin trung tâm để tải dashboard.');
        }

        const [
          classesResponse,
          revenueResponse,
          invoiceResponse,
          subscriptionResponse,
          studentsResponse,
          teachersResponse,
          parentsResponse
        ] = await Promise.all([
          classService.getAllClasses().catch(() => null),
          centerDashboardService.getRevenueDashboard(centerId).catch(() => null),
          centerDashboardService.getInvoiceDashboard(centerId).catch(() => null),
          centerDashboardService.getCurrentSubscription(centerId).catch((subscriptionError) => {
            if (Number(subscriptionError?.status) === 404) return null;
            throw subscriptionError;
          }),
          studentService.getStudentsByCenter({ page: 1, pageSize: 1 }).catch(() => null),
          teacherService.getTeachers({ page: 1, pageSize: 1 }).catch(() => null),
          parentService.getParents({ page: 1, pageSize: 1 }).catch(() => null)
        ]);

        const classes = normalizeListResponse(classesResponse);
        const revenueData = normalizeDetailResponse(revenueResponse) || {};
        const invoiceData = normalizeDetailResponse(invoiceResponse) || {};
        const currentSubscriptionData = normalizeDetailResponse(subscriptionResponse);
        
        const studentsData = normalizePagedResponse(studentsResponse);
        const teachersData = normalizePagedResponse(teachersResponse);
        const parentsData = normalizePagedResponse(parentsResponse);

        setClassCount(classes.length);
        setStudentCount(studentsData.totalCount);
        setTeacherCount(teachersData.totalCount);
        setParentCount(parentsData.totalCount);

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

    const presentMonths = revenueStats.monthlyRevenue
      .map((item) => getMonthNumber(item?.month))
      .filter(Boolean);

    if (presentMonths.length === 0) return [];

    const minMonth = Math.min(...presentMonths);
    const maxMonth = Math.max(...presentMonths);

    const sortedRaw = [...revenueStats.monthlyRevenue].sort(
      (a, b) => (getMonthNumber(a?.month) || 0) - (getMonthNumber(b?.month) || 0),
    );

    return sortedRaw.map((item, index) => {
      const monthNum = getMonthNumber(item?.month);
      const prevItem = index > 0 ? sortedRaw[index - 1] : null;

      let growthRate = null;
      if (prevItem) {
        const prevRevenue = normalizeNumber(prevItem?.revenue);
        const currentRevenue = normalizeNumber(item?.revenue);
        if (prevRevenue > 0) {
          growthRate = Math.round(((currentRevenue - prevRevenue) / prevRevenue) * 100);
        }
      }

      return {
        label: getMonthLabel(item?.month, index),
        rawMonth: getRawMonthValue(item?.month, index),
        revenue: normalizeNumber(item?.revenue),
        growthRate,
        index,
      };
    });
  }, [revenueStats]);

  const latestMonth = useMemo(() => {
    if (revenueHistory.length === 0) return null;
    return revenueHistory[revenueHistory.length - 1];
  }, [revenueHistory]);

  const strongestMonth = useMemo(() => {
    if (revenueHistory.length === 0) return null;
    return [...revenueHistory].sort((a, b) => b.revenue - a.revenue)[0];
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

  const revenueByQuarter = useMemo(() => {
    const quarters = [
      { name: 'Quý 1', months: [1, 2, 3], items: [], totalRevenue: 0 },
      { name: 'Quý 2', months: [4, 5, 6], items: [], totalRevenue: 0 },
      { name: 'Quý 3', months: [7, 8, 9], items: [], totalRevenue: 0 },
      { name: 'Quý 4', months: [10, 11, 12], items: [], totalRevenue: 0 },
    ];

    revenueHistory.forEach((item) => {
      const monthNum = getMonthNumber(item.rawMonth);
      if (monthNum !== null) {
        const quarter = quarters.find((q) => q.months.includes(monthNum));
        if (quarter) {
          quarter.items.push(item);
          quarter.totalRevenue += item.revenue;
        }
      }
    });

    return quarters.filter((q) => q.items.length > 0);
  }, [revenueHistory]);

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

  const userStats = [
    {
      label: 'Học sinh',
      value: studentCount,
      icon: 'school',
      desc: 'Học sinh đang theo học',
      route: 'students',
      colorClass: styles.colorStudent,
    },
    {
      label: 'Giáo viên',
      value: teacherCount,
      icon: 'person',
      desc: 'Giáo viên đang giảng dạy',
      route: 'teachers',
      colorClass: styles.colorTeacher,
    },
    {
      label: 'Phụ huynh',
      value: parentCount,
      icon: 'family_restroom',
      desc: 'Phụ huynh đã liên kết',
      route: 'parents',
      colorClass: styles.colorParent,
    },
    {
      label: 'Lớp học',
      value: classCount,
      icon: 'class',
      desc: 'Lớp học đang hoạt động',
      route: 'classes',
      colorClass: styles.colorClass,
    },
  ];

  return (
    <div className={styles.dashboardRoot}>
      <main className={styles.mainContent}>
        <div className={styles.container}>
          
          {/* TẦNG 1: TỔNG QUAN VÀ GÓI ĐĂNG KÝ */}
          <section className={styles.heroCard}>
            <div className={styles.heroCopy}>
              <span className={styles.kicker}>Dashboard trung tâm</span>
              <h1 className={styles.heroTitle}>
                {loading ? 'Đang tải dữ liệu tổng quan' : `Tổng quan vận hành của ${centerName}`}
              </h1>
              <p className={styles.heroSubtitle}>
                Hệ thống đang vận hành ổn định. Các chỉ số người dùng và doanh thu tài chính dưới đây được cập nhật thời gian thực từ hệ thống.
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
                  <span className="material-symbols-outlined">workspace_premium</span>
                  <div>
                    <small>Gói hiện tại</small>
                    <strong className={styles.planName}>{loading ? '...' : subscriptionInfo.packageName}</strong>
                  </div>
                </div>
              </div>

              <div className={styles.quickActions}>
                <button className={`${styles.actionBtn} ${styles.actionPrimary}`} onClick={() => onNavigate('finance')}>
                  <span className="material-symbols-outlined">payments</span> Quản lý doanh thu
                </button>
                <button className={styles.actionBtn} onClick={() => onNavigate('center-subscriptions')}>
                  <span className="material-symbols-outlined">workspace_premium</span> Gói dịch vụ
                </button>
              </div>
            </div>

            <aside className={styles.heroAside}>
              <div className={styles.summaryBlock}>
                <span className={styles.summaryLabel}>Hạn đăng ký gói</span>
                <strong className={styles.summaryValue}>
                  {loading ? '...' : subscriptionInfo.packageName}
                </strong>
                <p className={styles.summaryHint}>
                  {loading
                    ? 'Đang đồng bộ dữ liệu'
                    : subscriptionInfo.isFreePlan
                      ? (subscriptionInfo.originalStatus ? 'Gói cũ đã hết hiệu lực, trung tâm đang ở gói Free.' : 'Trung tâm đang sử dụng gói Free.')
                      : `Hiệu lực đến ${formatDate(subscriptionInfo.endDate)}`}
                </p>
              </div>

              <div className={styles.summaryBlock}>
                <span className={styles.summaryLabel}>Thông tin nhanh</span>
                <ul className={styles.inlineStats}>
                  <li>
                    <span>Doanh thu kỳ này</span>
                    <strong>{loading ? '...' : (latestMonth ? formatCompactCurrency(latestMonth.revenue) : '0 ₫')}</strong>
                  </li>
                  <li>
                    <span>Lớp học</span>
                    <strong>{loading ? '...' : `${classCount} lớp`}</strong>
                  </li>
                </ul>
              </div>
            </aside>
          </section>

          {error && (
            <section className={styles.errorBox}>
              <span className="material-symbols-outlined">error</span>
              <p>{error}</p>
            </section>
          )}

          {/* TẦNG 2: QUẢN LÝ THÀNH VIÊN (USER MANAGEMENT) - Ở GIỮA */}
          <section className={styles.sectionBlock}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Quản lý Thành viên & Lớp học</h2>
              <p className={styles.sectionSubtitle}>Tổng số lượng học sinh, giáo viên, phụ huynh và lớp học đang hoạt động tại trung tâm.</p>
            </div>

            <div className={styles.userGrid}>
              {userStats.map((stat) => (
                <article
                  key={stat.label}
                  className={styles.userCard}
                  onClick={() => onNavigate(stat.route)}
                >
                  <div className={styles.userCardHeader}>
                    <span className={`${styles.userIcon} ${stat.colorClass} material-symbols-outlined`}>
                      {stat.icon}
                    </span>
                    <span className={styles.userCardLink}>
                      Quản lý <span className="material-symbols-outlined">navigate_next</span>
                    </span>
                  </div>
                  <div className={styles.userCardContent}>
                    <span className={styles.userCardLabel}>{stat.label}</span>
                    <h3 className={styles.userCardValue}>{loading ? '...' : stat.value}</h3>
                    <p className={styles.userCardDesc}>{stat.desc}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          {/* TẦNG 3: TÀI CHÍNH VÀ BÁO CÁO DOANH THU - Ở DƯỚI */}
          <section className={styles.sectionBlock}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Tài chính & Báo cáo doanh thu</h2>
              <p className={styles.sectionSubtitle}>Các chỉ số tài chính, tình trạng thu học phí và biểu đồ cột xu hướng doanh thu theo các kỳ.</p>
            </div>

            {/* Financial KPI Cards */}
            <div className={styles.financeKpiGrid}>
              <article className={styles.financeKpiCard}>
                <div className={styles.kpiHeader}>
                  <span className={`${styles.kpiIcon} ${styles.bgRevenue} material-symbols-outlined`}>payments</span>
                  <span className={styles.kpiNote}>Ghi nhận</span>
                </div>
                <span className={styles.kpiLabel}>Tổng doanh thu</span>
                <strong className={styles.kpiValue}>
                  {loading ? '...' : formatCurrency(revenueStats.totalRevenue)}
                </strong>
              </article>

              <article className={styles.financeKpiCard}>
                <div className={styles.kpiHeader}>
                  <span className={`${styles.kpiIcon} ${styles.bgInvoice} material-symbols-outlined`}>receipt_long</span>
                  <span className={styles.kpiNote}>Đã xuất</span>
                </div>
                <span className={styles.kpiLabel}>Tổng số hóa đơn</span>
                <strong className={styles.kpiValue}>
                  {loading ? '...' : `${invoiceStats.totalInvoices} hóa đơn`}
                </strong>
              </article>

              <article className={styles.financeKpiCard}>
                <div className={styles.kpiHeader}>
                  <span className={`${styles.kpiIcon} ${styles.bgPaid} material-symbols-outlined`}>task_alt</span>
                  <span className={`${styles.kpiTrend} ${styles.trendGreen}`}>{collectionRate}% đã thu</span>
                </div>
                <span className={styles.kpiLabel}>Hóa đơn đã thu</span>
                <strong className={styles.kpiValue}>
                  {loading ? '...' : `${invoiceStats.paidInvoices} hóa đơn`}
                </strong>
              </article>

              <article className={styles.financeKpiCard}>
                <div className={styles.kpiHeader}>
                  <span className={`${styles.kpiIcon} ${styles.bgPending} material-symbols-outlined`}>schedule</span>
                  <span className={`${styles.kpiTrend} ${styles.trendOrange}`}>{unpaidRate}% chờ</span>
                </div>
                <span className={styles.kpiLabel}>Chờ thanh toán</span>
                <strong className={styles.kpiValue}>
                  {loading ? '...' : `${invoiceStats.pendingInvoices} hóa đơn`}
                </strong>
              </article>
            </div>

            {/* Charts Row */}
            <div className={styles.contentGrid}>
              <article className={`${styles.panel} ${styles.revenuePanel}`}>
                <div className={styles.panelHeader}>
                  <div>
                    <h3 className={styles.panelTitle}>Doanh thu theo kỳ</h3>
                    {activeHoverIndex !== null && revenueHistory[activeHoverIndex] ? (
                      <p className={`${styles.panelSubtitle} ${styles.revealActive}`}>
                        Chi tiết: <strong>{revenueHistory[activeHoverIndex].label}</strong> — <span className={styles.revealAmount}>{formatCurrency(revenueHistory[activeHoverIndex].revenue)}</span>
                        {revenueHistory[activeHoverIndex].growthRate !== null && (
                          <span className={`${styles.growthBadge} ${revenueHistory[activeHoverIndex].growthRate >= 0 ? styles.growthPositive : styles.growthNegative}`}>
                            {revenueHistory[activeHoverIndex].growthRate >= 0 ? `↑ +${revenueHistory[activeHoverIndex].growthRate}%` : `↓ ${revenueHistory[activeHoverIndex].growthRate}%`}
                          </span>
                        )}
                      </p>
                    ) : (
                      <p className={styles.panelSubtitle}>Theo dõi doanh thu theo các kỳ tháng và quý (rê chuột để xem chi tiết).</p>
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
                    <h3 className={styles.panelTitle}>Trạng thái hóa đơn</h3>
                    <p className={styles.panelSubtitle}>Tổng hợp phân bổ trạng thái các hóa đơn đã phát hành.</p>
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
            </div>
          </section>

        </div>
      </main>
    </div>
  );
};

export default DashboardPage;
