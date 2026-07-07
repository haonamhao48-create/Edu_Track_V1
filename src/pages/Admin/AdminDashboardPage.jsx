import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import { revenueService } from '../../services/revenueService';
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

const AdminDashboardPage = ({ onNavigate }) => {
  const [centersCount, setCentersCount] = useState(0);
  const [parentsCount, setParentsCount] = useState(0);
  const [revenueTotal, setRevenueTotal] = useState(0);
  const [activeSubsCount, setActiveSubsCount] = useState(0);
  
  const [recentCenters, setRecentCenters] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [centerMap, setCenterMap] = useState({});
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      setError('');
      try {
        // Parallel requests
        const [centersRes, parentsRes, revenueRes, subsRes, txRes] = await Promise.all([
          adminService.getAllCenters({ page: 1, pageSize: 100 }).catch(e => { console.warn('Lỗi Centers:', e); return null; }),
          adminService.getAllParents({ page: 1, pageSize: 1 }).catch(e => { console.warn('Lỗi Parents:', e); return null; }),
          revenueService.getAdminRevenue().catch(e => { console.warn('Lỗi Revenue:', e); return null; }),
          revenueService.getAdminSubscriptionStats().catch(e => { console.warn('Lỗi Subs Stats:', e); return null; }),
          revenueService.getAdminRecentTransactions().catch(e => { console.warn('Lỗi Transactions:', e); return null; })
        ]);

        // Process Centers & Build Map
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
        setParentsCount(parentsData.totalCount || 0);

        // Process Revenue
        const rawRevenue = revenueRes ? unwrapData(revenueRes) : null;
        setRevenueTotal(rawRevenue?.totalRevenue ?? 0);

        // Process Active Subscriptions
        const rawSubs = subsRes ? unwrapData(subsRes) : null;
        setActiveSubsCount(rawSubs?.totalActiveSubscriptions ?? 0);

        // Process Transactions
        const rawTx = txRes ? unwrapData(txRes) : null;
        setRecentTransactions(Array.isArray(rawTx) ? rawTx.slice(0, 5) : []);

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
      const d = new Date(dateStr);
      return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch (_) {
      return dateStr;
    }
  };

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
              <button className={styles.actionBtn} onClick={() => onNavigate('admin-teacher-reviews')}>
                <span className="material-symbols-outlined">rate_review</span> Quản lý Đánh giá
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

          {/* Tables Section: Centers & Transactions (Bento Block) */}
          <div className={styles.tablesBlock}>
            
            {/* Left: Recent Centers */}
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
                      <th>Địa chỉ</th>
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
                        const centerName = getCenterName(center);
                        const isActive = isCenterActive(center);
                        const initials = (centerName || 'TT')
                          .split(' ')
                          .map((w) => w[0])
                          .slice(0, 2)
                          .join('')
                          .toUpperCase();

                        return (
                          <tr key={getCenterId(center) || centerName} className={styles.tableRow}>
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
                            <td>{getCenterAddress(center)}</td>
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

            {/* Right: Recent Transactions */}
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
                        return (
                          <tr key={tx.id || tx.transactionId} className={styles.tableRow}>
                            <td>
                              <span className={styles.txCenterName}>{cName}</span>
                            </td>
                            <td>
                              <span className={`${styles.packageBadge} ${styles[tx.packageName?.toLowerCase()] || styles.packageDefault}`}>
                                {tx.packageName}
                              </span>
                            </td>
                            <td>
                              <span className={styles.txAmount}>{formatCurrency(tx.amount || tx.price)}</span>
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

        </div>
      </main>
    </div>
  );
};

export default AdminDashboardPage;
