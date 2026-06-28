import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import ConfirmModal from '../../components/ConfirmModal';
import styles from './AdminParentsPage.module.css';

const AdminParentsPage = ({ onNavigate }) => {
  const [parents, setParents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeDropdown, setActiveDropdown] = useState(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [searchName, setSearchName] = useState('');
  const [searchPhone, setSearchPhone] = useState('');
  const [searchEmail, setSearchEmail] = useState('');

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

  const fetchParents = async (forcePage = null) => {
    setLoading(true);
    setError('');
    try {
      const activePage = forcePage !== null ? forcePage : page;

      const data = await adminService.getAllParents({
        page: activePage,
        pageSize,
        fullName: searchName || null,
        phoneNumber: searchPhone || null,
        email: searchEmail || null
      });

      setParents(data?.items || []);
      setTotalCount(data?.totalCount || 0);
    } catch (err) {
      console.error('Lỗi tải danh sách phụ huynh:', err);
      setError('Không thể tải danh sách phụ huynh.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParents();
  }, [page]);

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    setPage(1);
    fetchParents(1);
  };

  const handleResetFilters = () => {
    setSearchName('');
    setSearchPhone('');
    setSearchEmail('');
    setPage(1);
    setLoading(true);
    adminService.getAllParents({ page: 1, pageSize })
      .then((data) => {
        setParents(data?.items || []);
        setTotalCount(data?.totalCount || 0);
      })
      .catch((err) => setError('Không thể tải danh sách phụ huynh.'))
      .finally(() => setLoading(false));
  };

  const toggleDropdown = (id) => {
    setActiveDropdown(activeDropdown === id ? null : id);
  };

  const handleViewDetail = (parent) => {
    setActiveDropdown(null);
    localStorage.setItem('selectedParentIdForEdit', parent.parentId);
    localStorage.setItem('parentEditMode', 'false');
    onNavigate('edit-parent');
  };

  // Toggle Parent Active Status
  const handleToggleStatus = (parent) => {
    setActiveDropdown(null);
    const newStatus = !parent.isActive;
    const actionText = newStatus ? 'kích hoạt' : 'vô hiệu hóa';
    setConfirmModal({
      isOpen: true,
      title: `${newStatus ? 'Kích hoạt' : 'Vô hiệu hóa'} tài khoản phụ huynh`,
      message: `Bạn có chắc chắn muốn ${actionText} tài khoản của phụ huynh "${parent.fullName}"?`,
      isDanger: !newStatus,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        setError('');
        try {
          await adminService.updateParentStatus(parent.parentId, newStatus);
          setSuccess(`Đã ${actionText} phụ huynh thành công.`);
          fetchParents();
        } catch (err) {
          console.error(err);
          setError(err.message || 'Không thể cập nhật trạng thái phụ huynh.');
        }
      }
    });
  };

  // Soft Delete Parent
  const handleDeactivateParent = (parent) => {
    setActiveDropdown(null);
    setConfirmModal({
      isOpen: true,
      title: 'Vô hiệu hóa phụ huynh',
      message: `Bạn có chắc chắn muốn vô hiệu hóa phụ huynh "${parent.fullName}"? Hành động này sẽ khóa quyền đăng nhập của họ.`,
      isDanger: true,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        setError('');
        try {
          await adminService.deleteParent(parent.parentId);
          setSuccess('Vô hiệu hóa phụ huynh thành công.');
          fetchParents();
        } catch (err) {
          console.error(err);
          setError(err.message || 'Không thể vô hiệu hóa phụ huynh.');
        }
      }
    });
  };

  // Open Edit Page
  const handleOpenEdit = (parent) => {
    setActiveDropdown(null);
    localStorage.setItem('selectedParentIdForEdit', parent.parentId);
    localStorage.setItem('parentEditMode', 'true');
    onNavigate('edit-parent');
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <div className={styles.parentsRoot}>
            
      <main className={styles.mainContent}>
        <div className={styles.container}>
          <div className={styles.pageHeader}>
            <div>
              <h2 className={styles.pageTitle}>Quản lý Phụ huynh</h2>
              <p className={styles.pageSubtitle}>Xem thông tin liên hệ, danh sách học sinh liên kết hoặc vô hiệu hóa phụ huynh.</p>
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
              <label className={styles.filterLabel}>Tên phụ huynh</label>
              <input
                type="text"
                placeholder="Nhập tên phụ huynh..."
                className={styles.filterSelect}
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
              />
            </div>

            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Số điện thoại</label>
              <input
                type="text"
                placeholder="Nhập SĐT..."
                className={styles.filterSelect}
                value={searchPhone}
                onChange={(e) => setSearchPhone(e.target.value)}
              />
            </div>

            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Email</label>
              <input
                type="text"
                placeholder="Nhập Email..."
                className={styles.filterSelect}
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
              />
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
                    <th>Phụ huynh</th>
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
                        Đang tải danh sách phụ huynh...
                      </td>
                    </tr>
                  ) : parents.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '24px' }}>
                        Không tìm thấy phụ huynh nào phù hợp.
                      </td>
                    </tr>
                  ) : (
                    parents.map((parent, index) => {
                      const isLastRows = index >= parents.length - 2;
                      const initials = (parent.fullName || 'PH')
                        .split(' ')
                        .map((w) => w[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase();

                      return (
                        <tr key={parent.parentId} className={styles.tableRow}>
                          <td>
                            <div className={styles.parentInfo}>
                              {parent.imageUrl ? (
                                <img src={parent.imageUrl} alt={parent.fullName} className={styles.avatar} />
                              ) : (
                                <div className={styles.avatarPlaceholder}>{initials}</div>
                              )}
                              <span className={styles.parentName}>{parent.fullName}</span>
                            </div>
                          </td>
                          <td>{parent.address}</td>
                          <td>
                            <p style={{ margin: 0, fontSize: '13px', fontWeight: 500 }}>{parent.phoneNumber || '--'}</p>
                            <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>{parent.email}</p>
                          </td>
                          <td>
                            {parent.isActive ? (
                              <span className={`${styles.statusBadge} ${styles.statusActive}`}>Đang hoạt động</span>
                            ) : (
                              <span className={`${styles.statusBadge} ${styles.statusInactive}`}>Đã vô hiệu hóa</span>
                            )}
                          </td>
                          <td className={styles.textRight}>
                            <div className={styles.actionWrapper}>
                              <button className={styles.actionBtn} onClick={() => toggleDropdown(parent.parentId)}>
                                <span className="material-symbols-outlined">more_vert</span>
                              </button>

                              {activeDropdown === parent.parentId && (
                                <div className={isLastRows ? styles.dropdownMenuUp : styles.dropdownMenu}>
                                  <div className={styles.dropdownInner}>
                                    <button className={styles.dropdownItem} onClick={() => handleViewDetail(parent)}>
                                      <span className="material-symbols-outlined text-sm">visibility</span> Xem chi tiết
                                    </button>
                                    <button className={styles.dropdownItem} onClick={() => handleOpenEdit(parent)}>
                                      <span className="material-symbols-outlined text-sm">edit</span> Chỉnh sửa
                                    </button>
                                    <div className={styles.dropdownDivider}></div>
                                    {parent.isActive ? (
                                      <button
                                        className={`${styles.dropdownItem} ${styles.textError}`}
                                        onClick={() => handleDeactivateParent(parent)}
                                      >
                                        <span className="material-symbols-outlined text-sm">delete</span> Vô hiệu hóa
                                      </button>
                                    ) : (
                                      <button
                                        className={styles.dropdownItem}
                                        onClick={() => handleToggleStatus(parent)}
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
                  Hiển thị <span>{Math.min((page - 1) * pageSize + 1, totalCount)} - {Math.min(page * pageSize, totalCount)}</span> trên <span>{totalCount}</span> phụ huynh
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

export default AdminParentsPage;
