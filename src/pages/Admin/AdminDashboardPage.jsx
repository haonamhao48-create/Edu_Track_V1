import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import { normalizePagedResponse } from '../../utils/apiResponse';
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
  const [recentCenters, setRecentCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      setError('');
      try {
        const centersResponse = await adminService.getAllCenters({ page: 1, pageSize: 5 });
        const parentsResponse = await adminService.getAllParents({ page: 1, pageSize: 1 });
        const centersData = normalizePagedResponse(centersResponse);
        const parentsData = normalizePagedResponse(parentsResponse);
        
        setCentersCount(centersData.totalCount || 0);
        setParentsCount(parentsData.totalCount || 0);
        setRecentCenters(centersData.items || []);
      } catch (err) {
        console.error('Lỗi khi tải dữ liệu dashboard admin:', err);
        setError('Không thể kết nối đến máy chủ để tải dữ liệu.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  return (
    <div className={styles.adminDashboardRoot}>
            
      <main className={styles.mainContent}>
        <div className={styles.container}>
          {/* Welcome section */}
          <div className={styles.welcomeSection}>
            <div className={styles.welcomeText}>
              <h2 className={styles.welcomeTitle}>Chào mừng trở lại, Admin!</h2>
              <p className={styles.welcomeSubtitle}>Hệ thống EduTrack đang vận hành ổn định. Dưới đây là thống kê tổng quan hệ thống.</p>
            </div>
            <div className={styles.quickActions}>
              <button className={styles.actionBtn} onClick={() => onNavigate('admin-centers')}>
                <span className="material-symbols-outlined">school</span> Quản lý Trung tâm
              </button>
              <button className={styles.actionBtn} onClick={() => onNavigate('admin-parents')}>
                <span className="material-symbols-outlined">family_restroom</span> Quản lý Phụ huynh
              </button>
            </div>
          </div>

          {error && <div className={styles.errorMessage}>{error}</div>}

          {/* Metrics Grid */}
          <div className={styles.metricsGrid}>
            <div className={styles.metricCard}>
              <div className={styles.metricHeader}>
                <span className={`material-symbols-outlined ${styles.iconCenter}`}>school</span>
              </div>
              <p className={styles.metricLabel}>Tổng số Trung tâm</p>
              <h3 className={styles.metricValue}>{loading ? '...' : centersCount}</h3>
              <p className={styles.metricDesc}>Trung tâm giáo dục đang hoạt động trên hệ thống</p>
            </div>

            <div className={styles.metricCard}>
              <div className={styles.metricHeader}>
                <span className={`material-symbols-outlined ${styles.iconParent}`}>family_restroom</span>
              </div>
              <p className={styles.metricLabel}>Tổng số Phụ huynh</p>
              <h3 className={styles.metricValue}>{loading ? '...' : parentsCount}</h3>
              <p className={styles.metricDesc}>Tài khoản phụ huynh học sinh đăng ký tham gia</p>
            </div>
          </div>

          {/* Recent Registrations Table */}
          <div className={styles.tableCard}>
            <div className={styles.tableHeader}>
              <h3 className={styles.tableTitle}>Danh sách Trung tâm đăng ký gần đây</h3>
              <button className={styles.viewAllBtn} onClick={() => onNavigate('admin-centers')}>
                Xem tất cả
              </button>
            </div>

            <div className={styles.tableResponsive}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Trung tâm</th>
                    <th>Địa chỉ</th>
                    <th>Liên hệ</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', padding: '24px' }}>
                        Đang tải danh sách...
                      </td>
                    </tr>
                  ) : recentCenters.length === 0 ? (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', padding: '24px' }}>
                        Chưa có trung tâm nào đăng ký.
                      </td>
                    </tr>
                  ) : (
                    recentCenters.map((center) => {
                      const centerName = getCenterName(center);
                      const initials = (centerName || 'TT')
                        .split(' ')
                        .map((w) => w[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase();

                      return (
                        <tr key={getCenterId(center) || centerName} className={styles.tableRow}>
                          <td>
                            <div className={styles.centerInfo}>
                              {getCenterLogo(center) ? (
                                <img src={getCenterLogo(center)} alt={centerName} className={styles.avatar} />
                              ) : (
                                <div className={styles.avatarPlaceholder}>{initials}</div>
                              )}
                              <span className={styles.centerName}>{centerName}</span>
                            </div>
                          </td>
                          <td>{getCenterAddress(center)}</td>
                          <td>
                            <p style={{ margin: 0, fontSize: '13px', fontWeight: 500 }}>{getCenterPhone(center)}</p>
                            <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>{getCenterEmail(center)}</p>
                          </td>
                          <td>
                            {isCenterActive(center) ? (
                              <span className={`${styles.statusBadge} ${styles.statusActive}`}>Đang hoạt động</span>
                            ) : (
                              <span className={`${styles.statusBadge} ${styles.statusInactive}`}>Đã vô hiệu hóa</span>
                            )}
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
      </main>
    </div>
  );
};

export default AdminDashboardPage;
