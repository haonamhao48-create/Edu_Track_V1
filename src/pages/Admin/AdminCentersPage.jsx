import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import ConfirmModal from '../../components/ConfirmModal';
import { normalizePagedResponse } from '../../utils/apiResponse';
import styles from './AdminCentersPage.module.css';

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

const AdminCentersPage = ({ onNavigate }) => {
  const [centers, setCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeDropdown, setActiveDropdown] = useState(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'active', 'inactive'

  // No longer using inline detail/edit modals

  // Confirm Modal
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    isDanger: false
  });

  // Success auto-clear
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const fetchCenters = async (forcePage = null) => {
    setLoading(true);
    setError('');
    try {
      let isActiveParam = null;
      if (statusFilter === 'active') isActiveParam = true;
      if (statusFilter === 'inactive') isActiveParam = false;

      const activePage = forcePage !== null ? forcePage : page;

      const response = await adminService.getAllCenters({
        page: activePage,
        pageSize,
        name: searchTerm || null,
        isActive: isActiveParam
      });
      const data = normalizePagedResponse(response);

      setCenters(data.items || []);
      setTotalCount(data.totalCount || 0);
    } catch (err) {
      console.error('Lỗi tải danh sách trung tâm:', err);
      setError('Không thể tải danh sách trung tâm.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCenters();
  }, [page, statusFilter]);

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    setPage(1);
    fetchCenters(1);
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setPage(1);
    // Fetch directly with reset states
    setLoading(true);
    adminService.getAllCenters({ page: 1, pageSize, name: null, isActive: null })
      .then((response) => {
        const data = normalizePagedResponse(response);
        setCenters(data.items || []);
        setTotalCount(data.totalCount || 0);
      })
      .catch((err) => setError('Không thể tải danh sách trung tâm.'))
      .finally(() => setLoading(false));
  };

  const toggleDropdown = (id) => {
    setActiveDropdown(activeDropdown === id ? null : id);
  };

  const handleViewDetail = (center) => {
    setActiveDropdown(null);
    localStorage.setItem('selectedCenterIdForEdit', getCenterId(center));
    localStorage.setItem('centerEditMode', 'false');
    onNavigate('edit-center');
  };

  // Status toggle (Active/Inactive)
  const handleToggleStatus = (center) => {
    setActiveDropdown(null);
    const newStatus = !isCenterActive(center);
    const actionText = newStatus ? 'kích hoạt' : 'vô hiệu hóa';
    setConfirmModal({
      isOpen: true,
      title: `${newStatus ? 'Kích hoạt' : 'Vô hiệu hóa'} tài khoản trung tâm`,
      message: `Bạn có chắc chắn muốn ${actionText} trung tâm "${getCenterName(center)}"?`,
      isDanger: !newStatus,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        setError('');
        try {
          await adminService.updateCenterStatus(getCenterId(center), newStatus);
          setSuccess(`Đã ${actionText} trung tâm thành công.`);
          fetchCenters();
        } catch (err) {
          console.error(err);
          setError(err.message || 'Không thể cập nhật trạng thái trung tâm.');
        }
      }
    });
  };

  // Soft Deactivate Center
  const handleDeactivateCenter = (center) => {
    setActiveDropdown(null);
    setConfirmModal({
      isOpen: true,
      title: 'Vô hiệu hóa trung tâm',
      message: `Bạn có chắc chắn muốn vô hiệu hóa trung tâm "${getCenterName(center)}"? Hành động này sẽ khóa tài khoản trung tâm và các giáo viên/học sinh thuộc trung tâm.`,
      isDanger: true,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        setError('');
        try {
          await adminService.deleteCenter(getCenterId(center));
          setSuccess('Vô hiệu hóa trung tâm thành công.');
          fetchCenters();
        } catch (err) {
          console.error(err);
          setError(err.message || 'Không thể vô hiệu hóa trung tâm.');
        }
      }
    });
  };

  // Open Edit Page
  const handleOpenEdit = (center) => {
    setActiveDropdown(null);
    localStorage.setItem('selectedCenterIdForEdit', getCenterId(center));
    localStorage.setItem('centerEditMode', 'true');
    onNavigate('edit-center');
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <div className={styles.centersRoot}>
            
      <main className={styles.mainContent}>
        <div className={styles.container}>
          <div className={styles.pageHeader}>
            <div>
              <h2 className={styles.pageTitle}>Quản lý Trung tâm</h2>
              <p className={styles.pageSubtitle}>Xem thông tin chi tiết, chỉnh sửa thông tin hoặc vô hiệu hóa các trung tâm giáo dục.</p>
            </div>
          </div>

          {success && (
            <div className={styles.successMessage}>
              <span className="material-symbols-outlined">check_circle</span>
              {success}
            </div>
          )}

          {error && (
            <div className={styles.errorMessage}>
              <span className="material-symbols-outlined">error</span>
              {error}
            </div>
          )}

          {/* Filter Section */}
          <form onSubmit={handleSearchSubmit} className={styles.filterSection}>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Tìm kiếm trung tâm</label>
              <input
                type="text"
                placeholder="Nhập tên trung tâm..."
                className={styles.filterSelect}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Trạng thái</label>
              <select
                className={styles.filterSelect}
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="active">Đang hoạt động</option>
                <option value="inactive">Đã vô hiệu hóa</option>
              </select>
            </div>

            <div className={styles.filterActions}>
              <button type="submit" className={styles.searchSubmitBtn}>
                <span className="material-symbols-outlined">search</span> Tìm kiếm
              </button>
              <button type="button" className={styles.searchResetBtn} onClick={handleResetFilters}>
                <span className="material-symbols-outlined">restart_alt</span> Đặt lại
              </button>
            </div>
          </form>

          {/* Table Card */}
          <div className={styles.tableCard}>
            <div className={styles.tableResponsive}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Trung tâm</th>
                    <th>Địa chỉ</th>
                    <th>Liên hệ</th>
                    <th>Trạng thái</th>
                    <th className={styles.textRight}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '48px' }}>
                        Đang tải danh sách trung tâm...
                      </td>
                    </tr>
                  ) : centers.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '24px' }}>
                        Không tìm thấy trung tâm nào phù hợp.
                      </td>
                    </tr>
                  ) : (
                    centers.map((center, index) => {
                      const centerId = getCenterId(center);
                      const centerName = getCenterName(center);
                      const isLastRows = index >= centers.length - 2;
                      const initials = (centerName || 'TT')
                        .split(' ')
                        .map((w) => w[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase();

                      return (
                        <tr key={centerId || centerName} className={styles.tableRow}>
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
                          <td className={styles.textRight}>
                            <div className={styles.actionWrapper}>
                              <button className={styles.actionBtn} onClick={() => toggleDropdown(centerId)}>
                                <span className="material-symbols-outlined">more_vert</span>
                              </button>

                              {activeDropdown === centerId && (
                                <div className={isLastRows ? styles.dropdownMenuUp : styles.dropdownMenu}>
                                  <div className={styles.dropdownInner}>
                                    <button className={styles.dropdownItem} onClick={() => handleViewDetail(center)}>
                                      <span className="material-symbols-outlined text-sm">visibility</span> Xem chi tiết
                                    </button>
                                    <button className={styles.dropdownItem} onClick={() => handleOpenEdit(center)}>
                                      <span className="material-symbols-outlined text-sm">edit</span> Chỉnh sửa
                                    </button>
                                    <div className={styles.dropdownDivider}></div>
                                    {isCenterActive(center) ? (
                                      <button
                                        className={`${styles.dropdownItem} ${styles.textError}`}
                                        onClick={() => handleDeactivateCenter(center)}
                                      >
                                        <span className="material-symbols-outlined text-sm">delete</span> Vô hiệu hóa
                                      </button>
                                    ) : (
                                      <button
                                        className={styles.dropdownItem}
                                        onClick={() => handleToggleStatus(center)}
                                      >
                                        <span className="material-symbols-outlined text-sm">check_circle</span> Kích hoạt lại
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalCount > 0 && (
              <div className={styles.pagination}>
                <p className={styles.pageInfo}>
                  Hiển thị <span>{Math.min((page - 1) * pageSize + 1, totalCount)} - {Math.min(page * pageSize, totalCount)}</span> trên <span>{totalCount}</span> trung tâm
                </p>
                <div className={styles.pageControls}>
                  <button
                    className={styles.pageNavBtn}
                    onClick={() => setPage(p => Math.max(p - 1, 1))}
                    disabled={page === 1}
                  >
                    <span className="material-symbols-outlined text-sm">chevron_left</span>
                  </button>
                  <button className={`${styles.pageNumBtn} ${styles.pageActive}`}>{page}</button>
                  <button
                    className={styles.pageNavBtn}
                    onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                    disabled={page === totalPages}
                  >
                    <span className="material-symbols-outlined text-sm">chevron_right</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>



      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText="Xác nhận"
        cancelText="Hủy"
        isDanger={confirmModal.isDanger}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

export default AdminCentersPage;
