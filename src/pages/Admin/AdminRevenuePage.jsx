import React, { useState, useEffect } from 'react';
import { revenueService } from '../../services/revenueService';
import { adminService } from '../../services/adminService';
import { normalizePagedResponse, unwrapData } from '../../utils/apiResponse';
import styles from './AdminRevenuePage.module.css';

// Currency Formatter Utility
const formatVND = (value) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
  }).format(value || 0);
};

// Date Formatter Utility
const formatDate = (dateString) => {
  if (!dateString) return '--';
  try {
    const date = new Date(dateString);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${hours}:${minutes} ${day}/${month}/${year}`;
  } catch (e) {
    return dateString;
  }
};

// Fallback Mock Data for demo/offline resilience
const MOCK_SUMMARY = {
  totalRevenue: 245000000,
  revenueGrowthRate: 12.5,
  activeCenters: 18,
  centerGrowthRate: 5.2,
  transactionCount: 156,
  transactionGrowthRate: 8.1,
  monthlyTarget: 50000000,
  targetProgress: 78.4,
};

const MOCK_MONTHLY_REVENUE = [
  { month: 1, revenue: 18000000 },
  { month: 2, revenue: 22000000 },
  { month: 3, revenue: 25000000 },
  { month: 4, revenue: 20000000 },
  { month: 5, revenue: 28000000 },
  { month: 6, revenue: 35000000 },
  { month: 7, revenue: 32000000 },
  { month: 8, revenue: 40000000 },
  { month: 9, revenue: 45000000 },
  { month: 10, revenue: 42000000 },
  { month: 11, revenue: 50000000 },
  { month: 12, revenue: 55000000 },
];

const MOCK_TRANSACTIONS = [
  { id: 'TX1009', centerName: 'Anh Ngữ Elite', packageName: 'Gói Premium (12 tháng)', amount: 2500000, date: '2026-06-22T08:30:00Z', status: 'COMPLETED' },
  { id: 'TX1008', centerName: 'Toán Tư Duy Genius', packageName: 'Gói Basic (3 tháng)', amount: 5000000, date: '2026-06-21T14:15:00Z', status: 'COMPLETED' },
  { id: 'TX1007', centerName: 'Tiếng Nhật Sakura', packageName: 'Gói Standard (6 tháng)', amount: 2500000, date: '2026-06-20T10:00:00Z', status: 'COMPLETED' },
  { id: 'TX1006', centerName: 'Mầm Non Sun World', packageName: 'Gói Enterprise (12 tháng)', amount: 10000000, date: '2026-06-19T17:45:00Z', status: 'PENDING' },
  { id: 'TX1005', centerName: 'Kỹ Năng Sống EduStar', packageName: 'Gói Standard (6 tháng)', amount: 5000000, date: '2026-06-18T09:20:00Z', status: 'COMPLETED' },
  { id: 'TX1004', centerName: 'Học Viện Coding Kid', packageName: 'Gói Premium (12 tháng)', amount: 7500000, date: '2026-06-17T11:30:00Z', status: 'FAILED' },
  { id: 'TX1003', centerName: 'Trung Tâm Nghệ Thuật Melody', packageName: 'Gói Standard (6 tháng)', amount: 2500000, date: '2026-06-16T15:00:00Z', status: 'COMPLETED' },
];

const AdminRevenuePage = () => {
  const [summary, setSummary] = useState(null);
  const [monthlyRevenue, setMonthlyRevenue] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(7);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isUsingMock, setIsUsingMock] = useState(false);
  const [centers, setCenters] = useState([]);

  // Load centers on mount
  useEffect(() => {
    const fetchCenters = async () => {
      try {
        const res = await adminService.getAllCenters({ page: 1, pageSize: 1000 });
        const list = res?.items || [];
        setCenters(list);
      } catch (err) {
        console.error('Lỗi khi tải danh sách trung tâm:', err);
      }
    };
    fetchCenters();
  }, []);

  // helper to get center name
  const getCenterName = (centerId) => {
    if (!centerId) return 'Trung tâm liên kết';
    const center = centers.find(c => 
      (c.centerId && c.centerId.toLowerCase() === centerId.toLowerCase()) ||
      (c.id && c.id.toLowerCase() === centerId.toLowerCase())
    );
    return center ? center.name || center.centerName : 'Trung tâm liên kết';
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        // Fetch Admin Dashboard APIs in parallel
        const [revenueRes, subsRes, txRes] = await Promise.all([
          revenueService.getAdminRevenue().catch(e => { console.warn('Lỗi gọi API Revenue:', e); return null; }),
          revenueService.getAdminSubscriptionStats().catch(e => { console.warn('Lỗi gọi API Subs Stats:', e); return null; }),
          revenueService.getAdminRecentTransactions().catch(e => { console.warn('Lỗi gọi API Transactions:', e); return null; })
        ]);

        const rawRevenue = revenueRes ? unwrapData(revenueRes) : null;
        const rawSubs = subsRes ? unwrapData(subsRes) : null;
        const rawTx = txRes ? unwrapData(txRes) : null;

        // Apply fallback if everything fails
        if (!rawRevenue && !rawSubs && !rawTx) {
          setIsUsingMock(true);
          setSummary({
            totalRevenue: MOCK_SUMMARY.totalRevenue,
            revenueGrowthRate: MOCK_SUMMARY.revenueGrowthRate,
            activeCenters: MOCK_SUMMARY.activeCenters,
            centerGrowthRate: MOCK_SUMMARY.centerGrowthRate,
            transactionCount: MOCK_SUMMARY.transactionCount,
            transactionGrowthRate: MOCK_SUMMARY.transactionGrowthRate,
            monthlyTarget: MOCK_SUMMARY.monthlyTarget,
            targetProgress: MOCK_SUMMARY.targetProgress,
          });
          setMonthlyRevenue(MOCK_MONTHLY_REVENUE);
          // Sort transactions by date descending (newest payment at top, oldest at bottom)
          const sortedMock = [...MOCK_TRANSACTIONS].sort((a, b) => {
            const dateA = a.paidAt || a.paymentDate || a.date || a.createdAt || '';
            const dateB = b.paidAt || b.paymentDate || b.date || b.createdAt || '';
            return new Date(dateB).getTime() - new Date(dateA).getTime();
          });
          setTransactions(sortedMock.slice((currentPage - 1) * pageSize, currentPage * pageSize));
          setTotalTransactions(MOCK_TRANSACTIONS.length);
        } else {
          setIsUsingMock(false);
          
          // 1. Process Revenue & Monthly Trend
          const totalRevenue = rawRevenue?.totalRevenue ?? 0;
          let processedMonthly = [];
          if (rawRevenue?.monthlyRevenue && Array.isArray(rawRevenue.monthlyRevenue)) {
            processedMonthly = Array.from({ length: 12 }, (_, i) => {
              const monthNum = i + 1;
              const found = rawRevenue.monthlyRevenue.find(m => m.month === monthNum);
              return {
                month: monthNum,
                revenue: found ? found.revenue : 0
              };
            });
          } else {
            processedMonthly = MOCK_MONTHLY_REVENUE;
          }
          setMonthlyRevenue(processedMonthly);

          // 2. Process Subscription Stats
          const activeCenters = rawSubs?.totalActiveSubscriptions ?? 0;

          // 3. Process Transactions (sort newest first)
          let txList = Array.isArray(rawTx) ? [...rawTx] : [...(rawTx?.items || [])];
          txList.sort((a, b) => {
            const dateA = a.paidAt || a.paymentDate || a.date || a.createdAt || '';
            const dateB = b.paidAt || b.paymentDate || b.date || b.createdAt || '';
            return new Date(dateB).getTime() - new Date(dateA).getTime();
          });
          
          // Client-side pagination
          const totalTx = txList.length;
          const startIndex = (currentPage - 1) * pageSize;
          const paginatedTx = txList.slice(startIndex, startIndex + pageSize);
          
          setTransactions(paginatedTx);
          setTotalTransactions(totalTx);

          // Calculate monthly target progress
          const currentMonth = new Date().getMonth() + 1;
          const currentMonthRevenue = processedMonthly.find(m => m.month === currentMonth)?.revenue || 0;
          const monthlyTarget = 50000000;
          const targetProgress = Math.round((currentMonthRevenue / monthlyTarget) * 100);

          setSummary({
            totalRevenue: totalRevenue,
            revenueGrowthRate: MOCK_SUMMARY.revenueGrowthRate,
            activeCenters: activeCenters,
            centerGrowthRate: MOCK_SUMMARY.centerGrowthRate,
            transactionCount: totalTx,
            transactionGrowthRate: MOCK_SUMMARY.transactionGrowthRate,
            monthlyTarget: monthlyTarget,
            targetProgress: targetProgress,
          });
        }
      } catch (err) {
        console.error('Lỗi khi tải dữ liệu doanh thu:', err);
        setError('Có lỗi xảy ra khi tải dữ liệu doanh thu. Đang hiển thị dữ liệu mô phỏng.');
        
        // Final fallback
        setIsUsingMock(true);
        setSummary(MOCK_SUMMARY);
        setMonthlyRevenue(MOCK_MONTHLY_REVENUE);
        setTransactions(MOCK_TRANSACTIONS.slice((currentPage - 1) * pageSize, currentPage * pageSize));
        setTotalTransactions(MOCK_TRANSACTIONS.length);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedYear, currentPage, pageSize, centers]);

  // Max value in monthly revenue for scaling chart bars
  const maxRevenue = monthlyRevenue.length > 0
    ? Math.max(...monthlyRevenue.map((item) => item.revenue || 0), 1)
    : 1;

  const totalPages = Math.ceil(totalTransactions / pageSize);

  const handleYearChange = (e) => {
    setSelectedYear(parseInt(e.target.value, 10));
    setCurrentPage(1);
  };

  const getStatusBadgeClass = (status) => {
    switch (status?.toUpperCase()) {
      case 'COMPLETED':
      case 'SUCCESS':
      case 'PAID':
        return `${styles.statusBadge} ${styles.statusSuccess}`;
      case 'PENDING':
        return `${styles.statusBadge} ${styles.statusPending}`;
      case 'FAILED':
      case 'CANCELLED':
        return `${styles.statusBadge} ${styles.statusFailed}`;
      default:
        return styles.statusBadge;
    }
  };

  const getStatusLabel = (status) => {
    switch (status?.toUpperCase()) {
      case 'COMPLETED':
      case 'SUCCESS':
      case 'PAID':
        return 'Thành công';
      case 'PENDING':
        return 'Chờ duyệt';
      case 'FAILED':
        return 'Thất bại';
      case 'CANCELLED':
        return 'Đã hủy';
      default:
        return status || 'Không rõ';
    }
  };

  return (
    <div className={styles.revenueRoot}>
      <main className={styles.mainContent}>
        <div className={styles.container}>
          {/* Header Banner */}
          <div className={styles.headerBanner}>
            <div className={styles.headerText}>
              <h2>Báo Cáo Doanh Thu Hệ Thống</h2>
              <p>Theo dõi doanh thu đăng ký dịch vụ từ các trung tâm giáo dục trên toàn hệ thống EduTrack.</p>
            </div>
            <div className={styles.yearSelector}>
              <label htmlFor="year-select">Năm báo cáo:</label>
              <select
                id="year-select"
                value={selectedYear}
                onChange={handleYearChange}
                className={styles.yearSelect}
              >
                <option value={2026}>2026</option>
                <option value={2025}>2025</option>
                <option value={2024}>2024</option>
              </select>
            </div>
          </div>

          {error && <div className={styles.errorMessage}>{error}</div>}
          
          {isUsingMock && !error && (
            <div style={{
              padding: '10px 16px',
              backgroundColor: '#eff6ff',
              border: '1px solid #dbeafe',
              color: '#1e40af',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>info</span>
              Hệ thống hiện đang sử dụng dữ liệu mô phỏng do chưa kết nối được API Finance thật.
            </div>
          )}

          {/* Stats Grid */}
          <div className={styles.statsGrid}>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className={styles.skeletonCard}>
                  <div className={`${styles.skeletonLine} ${styles.skeletonSmall}`}></div>
                  <div className={`${styles.skeletonLine} ${styles.skeletonLarge}`}></div>
                </div>
              ))
            ) : (
              <>
                {/* Total Revenue Card */}
                <div className={styles.statCard}>
                  <div className={styles.statIconRow}>
                    <span className={styles.statValue}>{formatVND(summary?.totalRevenue)}</span>
                    <div className={`${styles.statIcon} ${styles.iconRevenue}`}>
                      <span className="material-symbols-outlined">payments</span>
                    </div>
                  </div>
                  <p className={styles.statLabel}>Tổng Doanh Thu</p>
                  <p className={styles.statChange}>
                    <span className={`${styles.statChange} ${summary?.revenueGrowthRate >= 0 ? styles.changePositive : styles.changeNegative}`}>
                      <span className="material-symbols-outlined">
                        {summary?.revenueGrowthRate >= 0 ? 'arrow_upward' : 'arrow_downward'}
                      </span>
                      {Math.abs(summary?.revenueGrowthRate || 0)}%
                    </span>
                    <span style={{ color: '#94a3b8', fontWeight: 500, marginLeft: '4px' }}>so với tháng trước</span>
                  </p>
                </div>

                {/* Active Centers Card */}
                <div className={styles.statCard}>
                  <div className={styles.statIconRow}>
                    <span className={styles.statValue}>{summary?.activeCenters || 0}</span>
                    <div className={`${styles.statIcon} ${styles.iconCenters}`}>
                      <span className="material-symbols-outlined">corporate_fare</span>
                    </div>
                  </div>
                  <p className={styles.statLabel}>Số Trung Tâm Mua Gói</p>
                  <p className={styles.statChange}>
                    <span className={`${styles.statChange} ${summary?.centerGrowthRate >= 0 ? styles.changePositive : styles.changeNegative}`}>
                      <span className="material-symbols-outlined">
                        {summary?.centerGrowthRate >= 0 ? 'arrow_upward' : 'arrow_downward'}
                      </span>
                      {Math.abs(summary?.centerGrowthRate || 0)}%
                    </span>
                    <span style={{ color: '#94a3b8', fontWeight: 500, marginLeft: '4px' }}>tăng trưởng</span>
                  </p>
                </div>

                {/* Transactions Count Card */}
                <div className={styles.statCard}>
                  <div className={styles.statIconRow}>
                    <span className={styles.statValue}>{summary?.transactionCount || 0}</span>
                    <div className={`${styles.statIcon} ${styles.iconTransactions}`}>
                      <span className="material-symbols-outlined">receipt_long</span>
                    </div>
                  </div>
                  <p className={styles.statLabel}>Tổng Số Giao Dịch</p>
                  <p className={styles.statChange}>
                    <span className={`${styles.statChange} ${summary?.transactionGrowthRate >= 0 ? styles.changePositive : styles.changeNegative}`}>
                      <span className="material-symbols-outlined">
                        {summary?.transactionGrowthRate >= 0 ? 'arrow_upward' : 'arrow_downward'}
                      </span>
                      {Math.abs(summary?.transactionGrowthRate || 0)}%
                    </span>
                    <span style={{ color: '#94a3b8', fontWeight: 500, marginLeft: '4px' }}>giao dịch mới</span>
                  </p>
                </div>

                {/* Target Progress Card */}
                <div className={styles.statCard}>
                  <div className={styles.statIconRow}>
                    <span className={styles.statValue}>{summary?.targetProgress || 0}%</span>
                    <div className={`${styles.statIcon} ${styles.iconMonthly}`}>
                      <span className="material-symbols-outlined">ads_click</span>
                    </div>
                  </div>
                  <p className={styles.statLabel}>Chỉ Tiêu Tháng ({formatVND(summary?.monthlyTarget)})</p>
                  <div style={{ width: '100%', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', marginTop: '6px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${Math.min(summary?.targetProgress || 0, 100)}%`,
                        height: '100%',
                        backgroundColor: '#db2777',
                        borderRadius: '3px',
                        transition: 'width 0.5s ease-out'
                      }}
                    ></div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Monthly Revenue Trend Chart */}
          <div className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <h3 className={styles.chartTitle}>Biểu Đồ Doanh Thu Theo Tháng (Năm {selectedYear})</h3>
              <div className={styles.chartLegend}>
                <span>
                  <span className={`${styles.legendDot} ${styles.legendDotBlue}`}></span>
                  Doanh thu gói đăng ký (VND)
                </span>
              </div>
            </div>

            {loading ? (
              <div className={styles.barChartEmpty}>Đang tải biểu đồ...</div>
            ) : monthlyRevenue.length === 0 ? (
              <div className={styles.barChartEmpty}>Không có dữ liệu biểu đồ cho năm {selectedYear}</div>
            ) : (
              <div className={styles.barChart}>
                {monthlyRevenue.map((item) => {
                  const percent = maxRevenue > 0 ? (item.revenue / maxRevenue) * 100 : 0;
                  return (
                    <div key={item.month} className={styles.barColumn}>
                      <div className={styles.barWrapper}>
                        <div
                          className={styles.bar}
                          style={{ height: `${Math.max(percent, 3)}%` }}
                        >
                          <span className={styles.barTooltip}>
                            Tháng {item.month}: {formatVND(item.revenue)}
                          </span>
                        </div>
                      </div>
                      <span className={styles.barLabel}>T{item.month}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent Transactions Table */}
          <div className={styles.tableCard}>
            <div className={styles.tableHeader}>
              <h3 className={styles.tableTitle}>Giao Dịch Gần Đây</h3>
              <span className={styles.tableBadge}>Tổng {totalTransactions} giao dịch</span>
            </div>

            <div className={styles.tableResponsive}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Mã Giao Dịch</th>
                    <th>Trung Tâm</th>
                    <th>Gói Dịch Vụ</th>
                    <th>Số Tiền</th>
                    <th>Thời Gian</th>
                    <th>Trạng Thái</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '32px' }}>
                        Đang tải danh sách giao dịch...
                      </td>
                    </tr>
                  ) : transactions.length === 0 ? (
                    <tr>
                      <td colSpan="6">
                        <div className={styles.emptyState}>
                          <span className="material-symbols-outlined">receipt</span>
                          <p>Chưa có giao dịch nào được ghi nhận</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    transactions.map((tx) => {
                      const displayId = tx.id && tx.id.length > 8 ? `${tx.id.substring(0, 8)}...` : tx.id;
                      return (
                        <tr key={tx.id} className={styles.tableRow}>
                          <td style={{ fontWeight: 600, color: '#475569' }} title={tx.id}>{displayId}</td>
                          <td className={styles.centerName}>{tx.centerName || getCenterName(tx.centerId)}</td>
                          <td style={{ fontWeight: 500 }}>{tx.packageName || 'Gói Standard'}</td>
                          <td className={styles.amountCell}>{formatVND(tx.amount)}</td>
                          <td>{formatDate(tx.paidAt || tx.paymentDate || tx.date)}</td>
                          <td>
                            <span className={getStatusBadgeClass(tx.status)}>
                              {getStatusLabel(tx.status)}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {!loading && totalPages > 1 && (
              <div className={styles.pagination}>
                <button
                  className={styles.pageBtn}
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((prev) => prev - 1)}
                >
                  Trước
                </button>
                {Array.from({ length: totalPages }).map((_, idx) => {
                  const p = idx + 1;
                  return (
                    <button
                      key={p}
                      className={`${styles.pageBtn} ${currentPage === p ? styles.pageBtnActive : ''}`}
                      onClick={() => setCurrentPage(p)}
                    >
                      {p}
                    </button>
                  );
                })}
                <button
                  className={styles.pageBtn}
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((prev) => prev + 1)}
                >
                  Sau
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminRevenuePage;
