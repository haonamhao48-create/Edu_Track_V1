import React, { useState, useEffect } from 'react';
import styles from './ClassesPage.module.css';
import { classService } from '../../services/classService';
import ConfirmModal from '../../components/ConfirmModal';
import { normalizeListResponse } from '../../utils/apiResponse';


const ClassesPage = ({ onNavigate }) => {
  const [activeMenu, setActiveMenu] = useState(null);
  const [classes, setClasses] = useState([]); // holds paginated classes
  const [allClasses, setAllClasses] = useState(() => {
    const cached = sessionStorage.getItem('cached_classes');
    return cached ? JSON.parse(cached) : [];
  }); // holds all classes fetched from API
  const [loading, setLoading] = useState(() => {
    const cached = sessionStorage.getItem('cached_classes');
    const needsReload = sessionStorage.getItem('classes_needs_reload') === 'true';
    return !cached || needsReload;
  });
  const [error, setError] = useState(null);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: 'Xác nhận',
    message: '',
    onConfirm: () => {},
    isDanger: false,
  });

  // Auto-clear error message
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  // Filter state
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [appliedSearchTerm, setAppliedSearchTerm] = useState('');

  const totalPages = Math.ceil(totalCount / pageSize) || 1;


  // Fetch classes from API
  const fetchClasses = async (force = false) => {
    const needsReload = sessionStorage.getItem('classes_needs_reload') === 'true';
    const hasCache = sessionStorage.getItem('cached_classes');

    if (!force && !needsReload && hasCache) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await classService.getClasses({
        page: 1,
        pageSize: 1000,
      });
      const list = normalizeListResponse(res);
      setAllClasses(list);
      sessionStorage.setItem('cached_classes', JSON.stringify(list));
      sessionStorage.removeItem('classes_needs_reload');
    } catch (err) {
      setError(err.message || 'Không thể tải danh sách lớp học.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch classes once on mount
  useEffect(() => {
    fetchClasses();
  }, []);

  // Filter and paginate classes client-side
  useEffect(() => {
    let filtered = [...allClasses];

    // Filter by search term
    if (appliedSearchTerm.trim()) {
      const term = appliedSearchTerm.toLowerCase().trim();
      filtered = filtered.filter(cls => 
        cls.className?.toLowerCase().includes(term)
      );
    }

    // Filter by status
    if (selectedStatus && selectedStatus !== 'all') {
      filtered = filtered.filter(cls => 
        cls.status === selectedStatus
      );
    }

    setTotalCount(filtered.length);

    // Paginate
    const startIndex = (page - 1) * pageSize;
    const paginated = filtered.slice(startIndex, startIndex + pageSize);
    setClasses(paginated);
  }, [allClasses, page, selectedStatus, appliedSearchTerm]);

  // Search handler
  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    setAppliedSearchTerm(searchTerm);
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setAppliedSearchTerm('');
    setSelectedStatus('all');
    setPage(1);
  };

  const getStatusDisplay = (status) => {
    switch (status) {
      case 'Waiting':
        return { text: 'Chờ khai giảng', className: styles.statusPending };
      case 'Active':
        return { text: 'Đang học', className: styles.statusActive };
      case 'Finished':
        return { text: 'Kết thúc', className: styles.statusFinished };
      default:
        return { text: status || 'Không rõ', className: styles.statusActive };
    }
  };

  const toggleMenu = (idx, e) => {
    e.stopPropagation();
    setActiveMenu(activeMenu === idx ? null : idx);
  };

  const closeMenu = () => {
    setActiveMenu(null);
  };

  const handleOpenStudentPage = (cls) => {
    setActiveMenu(null);
    localStorage.setItem('selectedClassForManagement', JSON.stringify(cls));
    onNavigate('manage-class-students');
  };

  const handleOpenTeacherPage = (cls) => {
    setActiveMenu(null);
    localStorage.setItem('selectedClassForManagement', JSON.stringify(cls));
    onNavigate('manage-class-teachers');
  };

  const handleOpenEditClassPage = (cls) => {
    setActiveMenu(null);
    localStorage.setItem('selectedClassForManagement', JSON.stringify(cls));
    onNavigate('edit-class');
  };

  const handleDeleteClass = (cls) => {
    setActiveMenu(null);
    const className = cls.className || 'lớp học';
    
    setConfirmModal({
      isOpen: true,
      title: 'Xác nhận xóa lớp học',
      message: `Bạn có chắc chắn muốn xóa lớp học "${className}" không? Hành động này không thể hoàn tác.`,
      isDanger: true,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          const classId = cls.classId || cls.studyClassId || cls.id;
          await classService.deleteClass(classId);
          await fetchClasses(true);
        } catch (err) {
          console.error('Lỗi khi xóa lớp học:', err);
          setError(err.message || 'Không thể xóa lớp học.');
        }
      }
    });
  };


  return (
    <div className={styles.classesRoot} onClick={closeMenu}>
                  
      <main className={styles.mainContent}>
        <div className={styles.container}>
          {/* Page Header */}
          <div className={styles.pageHeader}>
            <div>
              <h2 className={styles.pageTitle}>Quản lý lớp học</h2>
              <p className={styles.pageSubtitle}>Theo dõi và cập nhật thông tin các lớp học tại trung tâm.</p>
            </div>
            <button className={styles.createBtn} onClick={() => onNavigate('create-class')}>
              <span className="material-symbols-outlined notranslate" translate="no">add</span>
              Tạo lớp
            </button>
          </div>

          {error && (
            <div style={{
              padding: '12px 16px',
              marginBottom: '16px',
              backgroundColor: 'var(--error-bg)',
              color: 'var(--error)',
              borderRadius: 'var(--border-radius-md)',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              border: '1px solid rgba(159, 47, 45, 0.1)',
            }}>
              <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '20px' }}>error</span>
              {error}
              <button onClick={() => setError(null)} style={{
                marginLeft: 'auto', background: 'none', border: 'none',
                color: 'var(--error)', cursor: 'pointer', padding: '4px',
              }}>
                <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '18px' }}>close</span>
              </button>
            </div>
          )}

          {/* Filters Section */}
          <form onSubmit={handleSearchSubmit} className={styles.filterSection}>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Tìm kiếm</label>
              <input
                type="text"
                className={styles.filterSelect}
                placeholder="Nhập tên lớp học..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Trạng thái</label>
              <select 
                className={styles.filterSelect}
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setPage(1);
                }}
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="Active">Đang học</option>
                <option value="Waiting">Chờ khai giảng</option>
                <option value="Finished">Kết thúc</option>
              </select>
            </div>
            <div className={styles.filterActions}>
              <button type="submit" className={styles.searchSubmitBtn}>
                <span className="material-symbols-outlined notranslate" translate="no">search</span>
                Tìm kiếm
              </button>
              <button type="button" className={styles.searchResetBtn} onClick={handleResetFilters}>
                <span className="material-symbols-outlined notranslate" translate="no">restart_alt</span>
                Đặt lại
              </button>
            </div>
          </form>

          {/* Data Table */}
          <div className={styles.tableCard}>
            <div className={`${styles.tableWrapper} custom-scrollbar`}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Tên lớp học</th>
                    <th>Môn học</th>
                    <th>Giáo viên</th>
                    <th className={styles.textCenter}>Sĩ số</th>
                    <th>Lịch học</th>
                    <th>Trạng thái</th>
                    <th className={styles.textRight}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="7" className={styles.textCenter} style={{ padding: '48px' }}>
                        <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '48px', display: 'block', marginBottom: '12px', animation: 'spin 1s linear infinite' }}>progress_activity</span>
                        Đang tải dữ liệu...
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan="7" className={styles.textCenter} style={{ padding: '24px', color: 'var(--error)' }}>{error}</td>
                    </tr>
                  ) : classes.length === 0 ? (
                    <tr>
                      <td colSpan="7" className={styles.textCenter} style={{ padding: '48px' }}>
                        <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '48px', display: 'block', marginBottom: '12px', opacity: 0.5 }}>school</span>
                        Không có lớp học nào phù hợp.
                      </td>
                    </tr>
                  ) : (
                    classes.map((cls, idx) => {
                      const statusDisplay = getStatusDisplay(cls.status);
                      return (
                        <tr key={cls.classId || idx}>
                          <td className={styles.className}>{cls.className}</td>
                          <td>{cls.description || 'Chưa cập nhật'}</td>
                          <td>
                            <div className={styles.teacherCell}>
                              {cls.teacherImageUrl || cls.teacherAvatar || cls.teacherImage ? (
                                <img alt="Teacher Avatar" className={styles.teacherAvatar} src={cls.teacherImageUrl || cls.teacherAvatar || cls.teacherImage} loading="lazy" />
                              ) : (
                                <div style={{
                                  width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--primary-container)', color: 'var(--primary)',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 600
                                }}>
                                  {cls.teacherName ? cls.teacherName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() : 'GV'}
                                </div>
                              )}
                              <span>{cls.teacherName || 'Chưa phân công'}</span>
                            </div>
                          </td>
                          <td className={styles.textCenter}>
                            <div className={styles.capacityBadge}>{cls.totalStudents ?? 0}</div>
                          </td>
                          <td>{cls.startDate ? new Date(cls.startDate).toLocaleDateString('vi-VN') : 'Chưa cập nhật'}</td>
                          <td><span className={statusDisplay.className}>{statusDisplay.text}</span></td>
                          <td className={styles.actionCell}>
                            <button className={styles.actionBtn} onClick={(e) => toggleMenu(idx, e)} aria-label="Thao tác" aria-haspopup="menu" aria-expanded={activeMenu === idx}>
                              <span className="material-symbols-outlined notranslate" translate="no">settings</span>
                            </button>
                            {activeMenu === idx && (
                              <div className={styles.actionMenu}>
                                <button onClick={() => handleOpenStudentPage(cls)}>
                                  <span className="material-symbols-outlined notranslate" translate="no">group</span>Quản lý học sinh
                                </button>
                                <button onClick={() => handleOpenTeacherPage(cls)}>
                                  <span className="material-symbols-outlined notranslate" translate="no">person</span>Quản lý giáo viên
                                </button>
                                <button onClick={() => handleOpenEditClassPage(cls)}>
                                  <span className="material-symbols-outlined notranslate" translate="no">edit_note</span>Xem & Chỉnh sửa
                                </button>
                                <div className={styles.dropdownDivider}></div>
                                <button className={styles.textError} onClick={() => handleDeleteClass(cls)}>
                                  <span className="material-symbols-outlined notranslate" translate="no">delete</span>Xóa lớp học
                                </button>
                              </div>
                            )}
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
                <span>
                  Hiển thị <strong>{Math.min((page - 1) * pageSize + 1, totalCount)}</strong> - <strong>{Math.min(page * pageSize, totalCount)}</strong> trên <strong>{totalCount}</strong> lớp học
                </span>
                <div className={styles.pageButtons}>
                  <button 
                    className={styles.pageBtn} 
                    disabled={page === 1}
                    onClick={() => setPage(p => Math.max(p - 1, 1))}
                  >
                    <span className="material-symbols-outlined notranslate" translate="no">chevron_left</span>
                  </button>
                  <button className={`${styles.pageBtn} ${styles.pageActive}`}>{page}</button>
                  <button 
                    className={styles.pageBtn}
                    disabled={page === totalPages}
                    onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                  >
                    <span className="material-symbols-outlined notranslate" translate="no">chevron_right</span>
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

export default ClassesPage;
