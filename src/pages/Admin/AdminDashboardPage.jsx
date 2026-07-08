import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import { revenueService } from '../../services/revenueService';
import { reviewService } from '../../services/reviewService';
import { normalizePagedResponse, unwrapData } from '../../utils/apiResponse';
import styles from './AdminDashboardPage.module.css';

const getCenterId = (center) => center?.centerId || center?.id || center?.userId || '';
const getCenterName = (center) => center?.name || center?.centerName || 'Trung tâm';
const getCenterAddress = (center) => center?.address || center?.centerAddress || '--';
const getCenterEmail = (center) => center?.email || center?.contactEmail || '--';
const getCenterPhone = (center) => center?.phoneNumber || center?.phone || center?.contactPhone || '--';
const getCenterLogo = (center) => center?.logo || center?.imageUrl || center?.avatar || '';
const isCenterActive = (center) => {
  if (typeof center?.isActive === 'boolean') return center.isActive;
  if (typeof center?.status === 'string') return center.status.toLowerCase() === 'active';
  return Boolean(center?.status ?? true);
};

const DEFAULT_PACKAGES = ['ENTERPRISE', 'SCALE', 'STANDARD', 'BASIC'];

const AdminDashboardPage = ({ onNavigate }) => {
  const [centersCount, setCentersCount] = useState(0);
  const [parentsCount, setParentsCount] = useState(0);
  const [revenueTotal, setRevenueTotal] = useState(0);
  const [activeSubsCount, setActiveSubsCount] = useState(0);
  
  const [recentCenters, setRecentCenters] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [centerMap, setCenterMap] = useState({});
  const [parentMap, setParentMap] = useState({});
  
  // New Bento metrics
  const [monthlyRevenue, setMonthlyRevenue] = useState([]);
  const [packageStats, setPackageStats] = useState([]);
  const [centerRatings, setCenterRatings] = useState({}); // { centerId: { avg: 0, count: 0 } }
  const [recentReviews, setRecentReviews] = useState([]);
  const [chartMode, setChartMode] = useState('quarter'); // 'month' or 'quarter'

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      setError('');
      try {
        // Step 1: Parallel requests for basic data, revenue, subscriptions, and transactions
        const [centersRes, parentsRes, revenueRes, subsRes, txRes, pkgStatsRes] = await Promise.all([
          adminService.getAllCenters({ page: 1, pageSize: 100 }).catch(e => { console.warn('Lỗi Centers:', e); return null; }),
          adminService.getAllParents({ page: 1, pageSize: 1000 }).catch(e => { console.warn('Lỗi Parents:', e); return null; }),
          revenueService.getAdminRevenue().catch(e => { console.warn('Lỗi Revenue:', e); return null; }),
          revenueService.getAdminSubscriptionStats().catch(e => { console.warn('Lỗi Subs Stats:', e); return null; }),
          revenueService.getAdminRecentTransactions().catch(e => { console.warn('Lỗi Transactions:', e); return null; }),
          revenueService.getAdminPackageRevenueStats().catch(e => { console.warn('Lỗi Pkg Stats:', e); return null; })
        ]);

        // Process Centers
        const centersData = normalizePagedResponse(centersRes);
        const allCenters = centersData.items || [];
        setCentersCount(centersData.totalCount || 0);
        setRecentCenters(allCenters.slice(0, 5)); // Show 5 most recent

        const cMap = {};
        allCenters.forEach(c => {
          cMap[getCenterId(c)] = getCenterName(c);
        });
        setCenterMap(cMap);

        // Process Parents
        const parentsData = normalizePagedResponse(parentsRes);
        const allParents = parentsData.items || [];
        setParentsCount(parentsData.totalCount || 0);

        const pMap = {};
        allParents.forEach(p => {
          if (p.parentId) pMap[p.parentId] = p.fullName || p.name;
          if (p.userId) pMap[p.userId] = p.fullName || p.name;
          if (p.id) pMap[p.id] = p.fullName || p.name;
        });
        setParentMap(pMap);

        // Process Revenue & Monthly Trend
        const rawRevenue = revenueRes ? unwrapData(revenueRes) : null;
        setRevenueTotal(rawRevenue?.totalRevenue ?? 0);
        
        const rawMonthly = rawRevenue?.monthlyRevenue || [];
        // Map to 12 months array
        const fullYearMonthly = Array.from({ length: 12 }, (_, i) => {
          const monthNum = i + 1;
          const found = rawMonthly.find(m => m.month === monthNum);
          return {
            month: `Th. ${monthNum}`,
            revenue: found ? found.revenue : 0
          };
        });
        setMonthlyRevenue(fullYearMonthly);

        // Process Active Subscriptions
        const rawSubs = subsRes ? unwrapData(subsRes) : null;
        setActiveSubsCount(rawSubs?.totalActiveSubscriptions ?? 0);

        // Process Transactions
        const rawTx = txRes ? unwrapData(txRes) : null;
        setRecentTransactions(Array.isArray(rawTx) ? rawTx.slice(0, 5) : []);

        // Process Package revenue stats (grouped from transaction list to bypass backend database packageName entry bug)
        const statsMap = {
          'ENTERPRISE': { packageName: 'ENTERPRISE', revenue: 0, salesCount: 0 },
          'SCALE': { packageName: 'SCALE', revenue: 0, salesCount: 0 },
          'STANDARD': { packageName: 'STANDARD', revenue: 0, salesCount: 0 },
          'BASIC': { packageName: 'BASIC', revenue: 0, salesCount: 0 }
        };

        const txList = Array.isArray(rawTx) ? rawTx : [];
        txList.forEach(tx => {
          const price = Number(tx.amount || tx.price || 0);
          let pName = 'ENTERPRISE';
          if (price === 949000) pName = 'ENTERPRISE';
          else if (price === 639000) pName = 'SCALE';
          else if (price === 499000) pName = 'STANDARD';
          else if (price === 249000) pName = 'BASIC';
          
          if (statsMap[pName]) {
            statsMap[pName].salesCount += 1;
            statsMap[pName].revenue += price;
          }
        });

        // Set packageStats in catalog order
        const orderedStats = DEFAULT_PACKAGES.map(name => statsMap[name]);
        setPackageStats(orderedStats);

        // Step 2: Fetch reviews for all centers to calculate ratings and compile feed
        if (allCenters.length > 0) {
          const reviewsPromises = allCenters.map(async (c) => {
            const cid = getCenterId(c);
            try {
              const reviewsRes = await reviewService.getCenterReviews(cid, 1, 100);
              const items = reviewsRes?.result?.items || reviewsRes?.data?.items || reviewsRes?.items || [];
              return { centerId: cid, reviews: items };
            } catch (_) {
              return { centerId: cid, reviews: [] };
            }
          });

          const reviewsResults = await Promise.all(reviewsPromises);

          // Calculate center ratings map and merge reviews
          const ratings = {};
          const mergedReviews = [];

          reviewsResults.forEach(res => {
            const cid = res.centerId;
            const items = res.reviews;
            const total = items.length;
            let sum = 0;
            items.forEach(r => {
              sum += Number(r.stars || 0);
              // Add center name to review object for feed
              mergedReviews.push({
                ...r,
                centerName: cMap[cid] || 'Trung tâm'
              });
            });

            ratings[cid] = {
              avg: total > 0 ? sum / total : 0,
              count: total
            };
          });

          setCenterRatings(ratings);

          // Sort merged reviews by date (newest first)
          mergedReviews.sort((a, b) => {
            let dateA = a.createdAt;
            let dateB = b.createdAt;
            if (dateA && !dateA.endsWith('Z') && !dateA.includes('+') && !dateA.includes('-')) dateA += 'Z';
            if (dateB && !dateB.endsWith('Z') && !dateB.includes('+') && !dateB.includes('-')) dateB += 'Z';
            return new Date(dateB) - new Date(dateA);
          });
          setRecentReviews(mergedReviews.slice(0, 5));
        }

      } catch (err) {
        console.error('Lỗi khi tải dữ liệu dashboard admin:', err);
        setError('Không thể kết nối đến máy chủ để tải dữ liệu.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      let cleanStr = String(dateStr);
      if (!/Z$|[+-]\d{2}:?\d{2}$/i.test(cleanStr)) {
        cleanStr += 'Z';
      }
      const d = new Date(cleanStr);
      return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch (_) {
      return dateStr;
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '';
    try {
      let cleanStr = String(dateStr);
      if (!/Z$|[+-]\d{2}:?\d{2}$/i.test(cleanStr)) {
        cleanStr += 'Z';
      }
      const d = new Date(cleanStr);
      return d.toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour12: false
      }).replace(',', '');
    } catch (_) {
      return dateStr;
    }
  };

  // SVG Chart rendering helper parameters
  const chartHeight = 150;
  const chartWidth = 500;

  // Group monthly revenue into 4 quarters
  const getQuarterlyRevenue = () => {
    const quarters = [
      { name: 'Quý 1', revenue: 0, months: 'Th. 1 - 3' },
      { name: 'Quý 2', revenue: 0, months: 'Th. 4 - 6' },
      { name: 'Quý 3', revenue: 0, months: 'Th. 7 - 9' },
      { name: 'Quý 4', revenue: 0, months: 'Th. 10 - 12' },
    ];
    monthlyRevenue.forEach((m, index) => {
      if (index >= 0 && index <= 2) quarters[0].revenue += m.revenue;
      else if (index >= 3 && index <= 5) quarters[1].revenue += m.revenue;
      else if (index >= 6 && index <= 8) quarters[2].revenue += m.revenue;
      else if (index >= 9 && index <= 11) quarters[3].revenue += m.revenue;
    });
    return quarters;
  };
  const quarterlyRevenue = getQuarterlyRevenue();

  const maxRevenueVal = chartMode === 'month' 
    ? Math.max(...monthlyRevenue.map(m => m.revenue), 100000)
    : Math.max(...quarterlyRevenue.map(q => q.revenue), 100000);
  const maxRevenue = maxRevenueVal * 1.15;

  return (
    <div className={styles.adminDashboardRoot}>
      <main className={styles.mainContent}>
        <div className={styles.container}>
          
          {/* Welcome section with Banner style */}
          <div className={styles.welcomeBanner}>
            <div className={styles.welcomeText}>
              <h2 className={styles.welcomeTitle}>Chào mừng trở lại, Admin!</h2>
              <p className={styles.welcomeSubtitle}>
                Hệ thống EduTrack đang vận hành ổn định. Dưới đây là các chỉ số thống kê hiệu suất hệ thống thời gian thực.
              </p>
            </div>
            <div className={styles.quickActions}>
              <button className={styles.actionBtn} onClick={() => onNavigate('admin-centers')}>
                <span className="material-symbols-outlined">school</span> Quản lý Trung tâm
              </button>
              <button className={styles.actionBtn} onClick={() => onNavigate('admin-parents')}>
                <span className="material-symbols-outlined">family_restroom</span> Quản lý Phụ huynh
              </button>
              <button className={styles.actionBtn} onClick={() => onNavigate('admin-center-reviews')}>
                <span className="material-symbols-outlined">domain</span> Đánh giá Trung tâm
              </button>
              <button className={styles.actionBtn} onClick={() => onNavigate('admin-teacher-reviews')}>
                <span className="material-symbols-outlined">rate_review</span> Đánh giá Giáo viên
              </button>
            </div>
          </div>

          {error && (
            <div className={styles.errorBanner}>
              <span className="material-symbols-outlined">error</span>
              <p>{error}</p>
            </div>
          )}

          {/* Metrics Bento Grid */}
          <div className={styles.metricsGrid}>
            
            <div className={styles.metricCard} onClick={() => onNavigate('admin-centers')}>
              <div className={styles.metricHeader}>
                <span className={`${styles.iconBg} ${styles.iconCenterBg}`}>
                  <span className="material-symbols-outlined">school</span>
                </span>
                <span className={styles.trendUp}>+12%</span>
              </div>
              <div className={styles.metricContent}>
                <p className={styles.metricLabel}>Tổng số Trung tâm</p>
                <h3 className={styles.metricValue}>{loading ? '...' : centersCount}</h3>
                <p className={styles.metricDesc}>Trung tâm đang hoạt động</p>
              </div>
            </div>

            <div className={styles.metricCard} onClick={() => onNavigate('admin-parents')}>
              <div className={styles.metricHeader}>
                <span className={`${styles.iconBg} ${styles.iconParentBg}`}>
                  <span className="material-symbols-outlined">family_restroom</span>
                </span>
                <span className={styles.trendUp}>+8%</span>
              </div>
              <div className={styles.metricContent}>
                <p className={styles.metricLabel}>Tổng số Phụ huynh</p>
                <h3 className={styles.metricValue}>{loading ? '...' : parentsCount}</h3>
                <p className={styles.metricDesc}>Tài khoản đã liên kết</p>
              </div>
            </div>

            <div className={styles.metricCard} onClick={() => onNavigate('admin-revenue')}>
              <div className={styles.metricHeader}>
                <span className={`${styles.iconBg} ${styles.iconRevenueBg}`}>
                  <span className="material-symbols-outlined">payments</span>
                </span>
                <span className={styles.trendUp}>+18%</span>
              </div>
              <div className={styles.metricContent}>
                <p className={styles.metricLabel}>Doanh thu hệ thống</p>
                <h3 className={styles.metricValue}>{loading ? '...' : formatCurrency(revenueTotal)}</h3>
                <p className={styles.metricDesc}>Tổng giá trị giao dịch</p>
              </div>
            </div>

            <div className={styles.metricCard} onClick={() => onNavigate('admin-revenue')}>
              <div className={styles.metricHeader}>
                <span className={`${styles.iconBg} ${styles.iconSubsBg}`}>
                  <span className="material-symbols-outlined">workspace_premium</span>
                </span>
                <span className={styles.trendStable}>Active</span>
              </div>
              <div className={styles.metricContent}>
                <p className={styles.metricLabel}>Thuê bao kích hoạt</p>
                <h3 className={styles.metricValue}>{loading ? '...' : activeSubsCount}</h3>
                <p className={styles.metricDesc}>Trung tâm đang đăng ký gói</p>
              </div>
            </div>

          </div>

          {/* Tier 2: Monthly Revenue Chart & Package Shares (Bento Blocks) */}
          <div className={styles.chartBentoBlock}>
            
            {/* Monthly/Quarterly Revenue Chart */}
            <div className={styles.bentoChartCard}>
              <div className={styles.bentoChartHeader}>
                <h3 className={styles.bentoCardTitle}>Xu hướng doanh thu</h3>
                <div className={styles.toggleGroup}>
                  <button
                    className={`${styles.toggleBtn} ${chartMode === 'quarter' ? styles.activeToggle : ''}`}
                    onClick={() => setChartMode('quarter')}
                  >
                    Quý
                  </button>
                  <button
                    className={`${styles.toggleBtn} ${chartMode === 'month' ? styles.activeToggle : ''}`}
                    onClick={() => setChartMode('month')}
                  >
                    Tháng
                  </button>
                </div>
              </div>

              {loading ? (
                <div className={styles.chartLoading}>Đang tải biểu đồ...</div>
              ) : (
                <div className={styles.svgChartContainer}>
                  <svg viewBox={`0 0 ${chartWidth} 190`} className={styles.svgChart}>
                    {/* Grid lines */}
                    <line x1="40" y1="10" x2="480" y2="10" stroke="#eaeaea" strokeDasharray="3 3" />
                    <line x1="40" y1="60" x2="480" y2="60" stroke="#eaeaea" strokeDasharray="3 3" />
                    <line x1="40" y1="110" x2="480" y2="110" stroke="#eaeaea" strokeDasharray="3 3" />
                    <line x1="40" y1="160" x2="480" y2="160" stroke="#eaeaea" />

                    {/* Bars rendering */}
                    {chartMode === 'quarter' ? (
                      quarterlyRevenue.map((data, index) => {
                        const barWidth = 44;
                        const spacing = 100;
                        const x = 70 + index * spacing;
                        const barHeight = (data.revenue / maxRevenue) * chartHeight;
                        const y = 160 - barHeight;

                        return (
                          <g key={data.name} className={styles.barGroup}>
                            <title>{`${data.name} (${data.months}): ${formatCurrency(data.revenue)}`}</title>
                            <rect
                              x={x}
                              y={y}
                              width={barWidth}
                              height={barHeight}
                              rx="4"
                              className={styles.chartBar}
                              fill={data.revenue > 0 ? 'var(--primary)' : 'var(--surface-container-high)'}
                            />
                            <text
                              x={x + barWidth / 2}
                              y="180"
                              textAnchor="middle"
                              className={styles.chartLabel}
                              fill="var(--text-muted)"
                            >
                              {data.name}
                            </text>
                            {data.revenue > 0 && (
                              <text
                               x={x + barWidth / 2}
                               y={y - 6}
                               textAnchor="middle"
                               className={styles.chartBarValue}
                               fill="var(--on-surface)"
                              >
                                {data.revenue >= 1000000 ? `${(data.revenue / 1000000).toFixed(2)}M` : `${data.revenue / 1000}k`}
                              </text>
                            )}
                          </g>
                        );
                      })
                    ) : (
                      monthlyRevenue.map((data, index) => {
                        const barWidth = 22;
                        const spacing = 36;
                        const x = 50 + index * spacing;
                        const barHeight = (data.revenue / maxRevenue) * chartHeight;
                        const y = 160 - barHeight;

                        return (
                          <g key={data.month} className={styles.barGroup}>
                            {/* Tooltip on hover */}
                            <title>{`${data.month}: ${formatCurrency(data.revenue)}`}</title>
                            
                            {/* Main bar */}
                            <rect
                              x={x}
                              y={y}
                              width={barWidth}
                              height={barHeight}
                              rx="3"
                              className={styles.chartBar}
                              fill={data.revenue > 0 ? 'var(--primary)' : 'var(--surface-container-high)'}
                            />

                            {/* Month labels */}
                            <text
                              x={x + barWidth / 2}
                              y="180"
                              textAnchor="middle"
                              className={styles.chartLabel}
                              fill="var(--text-muted)"
                            >
                              {data.month}
                            </text>

                            {/* Value above active bar */}
                            {data.revenue > 0 && (
                              <text
                                x={x + barWidth / 2}
                                y={y - 6}
                                textAnchor="middle"
                                className={styles.chartBarValue}
                                fill="var(--on-surface)"
                              >
                                {data.revenue >= 1000000 ? `${(data.revenue / 1000000).toFixed(1)}M` : `${data.revenue / 1000}k`}
                              </text>
                            )}
                          </g>
                        );
                      })
                    )}
                  </svg>
                </div>
              )}
            </div>

            {/* Package Revenue Share */}
            <div className={styles.bentoPackageCard}>
              <h3 className={styles.bentoCardTitle}>Thống kê gói dịch vụ</h3>
              <div className={styles.packageList}>
                {loading ? (
                  <div className={styles.chartLoading}>Đang tải thống kê gói...</div>
                ) : packageStats.length === 0 ? (
                  <div className={styles.noDataText}>Chưa có giao dịch gói cước nào được thực hiện.</div>
                ) : (
                  packageStats.map(pkg => {
                    const totalSales = packageStats.reduce((sum, item) => sum + item.salesCount, 0);
                    const percent = totalSales > 0 ? (pkg.salesCount / totalSales) * 100 : 0;
                    return (
                      <div key={pkg.packageName} className={styles.pkgRow}>
                        <div className={styles.pkgMeta}>
                          <span className={styles.pkgName}>{pkg.packageName}</span>
                          <span className={styles.pkgSales}>{pkg.salesCount} đơn đăng ký</span>
                        </div>
                        <div className={styles.pkgProgressBg}>
                          <div
                            className={`${styles.pkgProgressFill} ${styles[pkg.packageName.toLowerCase()] || styles.pkgDefaultFill}`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <div className={styles.pkgValueRow}>
                          <span className={styles.pkgRevenue}>Doanh thu: {formatCurrency(pkg.revenue)}</span>
                          <span className={styles.pkgPercent}>{Math.round(percent)}% thị phần</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>

          {/* Tier 3: Tables Section: Centers, Transactions & Center Reviews (Bento Block) */}
          <div className={styles.tablesBlock}>
            
            {/* Column 1: Recent Centers */}
            <div className={styles.tableCard}>
              <div className={styles.tableHeader}>
                <h3 className={styles.tableTitle}>Trung tâm mới đăng ký gần đây</h3>
                <button className={styles.viewAllLink} onClick={() => onNavigate('admin-centers')}>
                  Xem tất cả
                </button>
              </div>
              <div className={styles.tableResponsive}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Trung tâm</th>
                      <th>Đánh giá</th>
                      <th>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="3" className={styles.tableLoading}>Đang tải...</td>
                      </tr>
                    ) : recentCenters.length === 0 ? (
                      <tr>
                        <td colSpan="3" className={styles.tableEmpty}>Chưa có trung tâm đăng ký.</td>
                      </tr>
                    ) : (
                      recentCenters.map((center) => {
                        const cid = getCenterId(center);
                        const centerName = getCenterName(center);
                        const isActive = isCenterActive(center);
                        const rating = centerRatings[cid];
                        const initials = (centerName || 'TT')
                          .split(' ')
                          .map((w) => w[0])
                          .slice(0, 2)
                          .join('')
                          .toUpperCase();

                        return (
                          <tr key={cid || centerName} className={styles.tableRow}>
                            <td>
                              <div className={styles.centerMeta}>
                                {getCenterLogo(center) ? (
                                  <img src={getCenterLogo(center)} alt={centerName} className={styles.avatar} />
                                ) : (
                                  <div className={styles.avatarPlaceholder}>{initials}</div>
                                )}
                                <div>
                                  <span className={styles.centerName}>{centerName}</span>
                                  <span className={styles.centerEmail}>{getCenterEmail(center)}</span>
                                </div>
                              </div>
                            </td>
                            <td>
                              {rating && rating.count > 0 ? (
                                <div className={styles.centerRatingCol}>
                                  <span className={styles.starIcon}>★</span>
                                  <span className={styles.ratingNumber}>{rating.avg.toFixed(1)}</span>
                                  <span className={styles.ratingCount}>({rating.count})</span>
                                </div>
                              ) : (
                                <span className={styles.noRatingText}>Chưa có đánh giá</span>
                              )}
                            </td>
                            <td>
                              <span className={`${styles.statusBadge} ${isActive ? styles.badgeActive : styles.badgeInactive}`}>
                                {isActive ? 'Hoạt động' : 'Đang khóa'}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Column 2: Recent Transactions */}
            <div className={styles.tableCard}>
              <div className={styles.tableHeader}>
                <h3 className={styles.tableTitle}>Giao dịch đăng ký gói cước mới</h3>
                <button className={styles.viewAllLink} onClick={() => onNavigate('admin-revenue')}>
                  Xem chi tiết
                </button>
              </div>
              <div className={styles.tableResponsive}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Trung tâm</th>
                      <th>Gói cước</th>
                      <th>Thanh toán</th>
                      <th>Thời gian</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="4" className={styles.tableLoading}>Đang tải...</td>
                      </tr>
                    ) : recentTransactions.length === 0 ? (
                      <tr>
                        <td colSpan="4" className={styles.tableEmpty}>Chưa có giao dịch nào.</td>
                      </tr>
                    ) : (
                      recentTransactions.map((tx) => {
                        const cName = centerMap[tx.centerId] || 'Trung tâm';
                        const price = Number(tx.amount || tx.price || 0);
                        
                        // Resolve package name from price
                        let resolvedPkgName = tx.packageName;
                        if (price === 949000) resolvedPkgName = 'ENTERPRISE';
                        else if (price === 639000) resolvedPkgName = 'SCALE';
                        else if (price === 499000) resolvedPkgName = 'STANDARD';
                        else if (price === 249000) resolvedPkgName = 'BASIC';

                        return (
                          <tr key={tx.id || tx.transactionId} className={styles.tableRow}>
                            <td>
                              <span className={styles.txCenterName}>{cName}</span>
                            </td>
                            <td>
                              <span className={`${styles.packageBadge} ${styles[resolvedPkgName?.toLowerCase()] || styles.packageDefault}`}>
                                {resolvedPkgName}
                              </span>
                            </td>
                            <td>
                              <span className={styles.txAmount}>{formatCurrency(price)}</span>
                            </td>
                            <td>
                              <span className={styles.txDate}>{formatDate(tx.paidAt || tx.date || tx.createdAt)}</span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* Tier 4: Recent Parent Reviews Feed (Full Width Bento Card) */}
          <div className={styles.reviewsFeedCard}>
            <div className={styles.tableHeader}>
              <h3 className={styles.tableTitle}>Đánh giá gần đây từ Phụ huynh</h3>
              <button className={styles.viewAllLink} onClick={() => onNavigate('admin-center-reviews')}>
                Quản lý đánh giá
              </button>
            </div>

            <div className={styles.reviewsListContainer}>
              {loading ? (
                <div className={styles.tableLoading}>Đang tải các đánh giá mới nhất...</div>
              ) : recentReviews.length === 0 ? (
                <div className={styles.tableEmpty}>Chưa nhận được phản hồi/đánh giá nào từ phụ huynh gửi cho trung tâm.</div>
              ) : (
                <div className={styles.reviewsGridList}>
                  {recentReviews.map(rev => {
                    const pName = parentMap[rev.reviewerId] || 'Phụ huynh học sinh';
                    const initials = (pName !== 'Phụ huynh học sinh')
                      ? pName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
                      : 'PH';

                    return (
                      <div key={rev.id} className={styles.reviewFeedItem}>
                        <div className={styles.reviewItemHeader}>
                          <div className={styles.reviewerMeta}>
                            <div className={styles.avatarMini}>{initials}</div>
                            <div>
                              <h5 className={styles.reviewerName}>{pName}</h5>
                              <span className={styles.reviewedCenterName}>Đánh giá trung tâm: <strong>{rev.centerName}</strong></span>
                            </div>
                          </div>
                          <div className={styles.starsMeta}>
                            <div className={styles.starsRow}>
                              {Array.from({ length: 5 }, (_, i) => (
                                <span
                                  key={i}
                                  className="material-symbols-outlined"
                                  style={{
                                    fontSize: '15px',
                                    color: i < Math.round(rev.stars) ? '#EAB308' : '#D1D5DB'
                                  }}
                                >
                                  star
                                </span>
                              ))}
                            </div>
                            <span className={styles.reviewTime}>{formatDateTime(rev.createdAt)}</span>
                          </div>
                        </div>
                        <div className={styles.reviewText}>
                          {rev.comment ? `"${rev.comment}"` : <span className={styles.noComment}>Không để lại bình luận chi tiết.</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

export default AdminDashboardPage;
