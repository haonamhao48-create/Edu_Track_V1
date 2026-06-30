import React, { useState, useEffect } from 'react';
import { classService } from '../../services/classService';
import { teacherService } from '../../services/teacherService';
import styles from './TeachersPage.module.css';
import ConfirmModal from '../../components/ConfirmModal';
import EditTeacherModal from './EditTeacherModal';
import { normalizeListResponse } from '../../utils/apiResponse';

const removeAccents = (str) => {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
};

const TeachersPage = ({ onNavigate }) => {
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeDropdown, setActiveDropdown] = useState(null);

  // Pagination State
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [expertises, setExpertises] = useState([]);

  // Detail Modal State
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTeacherDetail, setSelectedTeacherDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
  const [teacherToEdit, setTeacherToEdit] = useState(null);

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    isDanger: false
  });

  const handleSaveTeacher = async (data) => {
    try {
      await teacherService.updateTeacherByCenter(teacherToEdit.teacherId || teacherToEdit.id, data);
      setSuccess('Cập nhật thông tin giáo viên thành công.');
      fetchTeachers({ force: true });
    } catch (err) {
      console.error('Lỗi khi cập nhật giáo viên:', err);
      throw err;
    }
  };

  const handleDeactivateTeacher = (teacher) => {
    setActiveDropdown(null);
    setConfirmModal({
      isOpen: true,
      title: 'Vô hiệu hóa giáo viên',
      message: `Bạn có chắc chắn muốn vô hiệu hóa giáo viên ${teacher.fullName || teacher.name}? Hành động này sẽ khóa quyền truy cập của giáo viên.`,
      isDanger: true,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        setError('');
        try {
          await teacherService.deactivateTeacher(teacher.teacherId || teacher.id);
          setSuccess('Vô hiệu hóa giáo viên thành công.');
          fetchTeachers({ force: true });
        } catch (err) {
          console.error('Lỗi khi vô hiệu hóa giáo viên:', err);
          setError('Không thể vô hiệu hóa giáo viên. Vui lòng thử lại.');
        }
      }
    });
  };

  // Success message auto-clear
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // Fetch classes for class count matching
  const fetchClasses = async () => {
    setLoadingClasses(true);
    try {
      const data = await classService.getAllClasses();
      const list = normalizeListResponse(data);
      setClasses(list);
    } catch (err) {
      console.error('Lỗi khi tải danh sách lớp học:', err);
    } finally {
      setLoadingClasses(false);
    }
  };

  // Fetch teachers based on filters & page
  const fetchTeachers = async (overrideParams = {}) => {
    const activePage = overrideParams.page !== undefined ? overrideParams.page : page;
    const activeStatusFilter = overrideParams.statusFilter !== undefined ? overrideParams.statusFilter : statusFilter;
    const activeSubjectFilter = overrideParams.subjectFilter !== undefined ? overrideParams.subjectFilter : subjectFilter;
    const activeSearchTerm = overrideParams.searchTerm !== undefined ? overrideParams.searchTerm : searchTerm;

    setLoading(true);
    setError('');
    try {
      // Map statusFilter
      let mappedStatus = null;
      if (activeStatusFilter === 'active') mappedStatus = true;
      if (activeStatusFilter === 'inactive') mappedStatus = false;

      // Map subjectFilter (expertise)
      const mappedExpertise = !activeSubjectFilter || activeSubjectFilter === 'all' ? null : activeSubjectFilter.trim();

      const data = await teacherService.getTeachers({
        page: activePage,
        pageSize,
        teacherName: activeSearchTerm || null,
        expertise: mappedExpertise,
        status: mappedStatus
      });

      const list = data?.items || [];
      setTeachers(list);
      setTotalCount(data?.totalCount || list.length);
    } catch (err) {
      console.error('Lỗi khi tải danh sách giáo viên:', err);
      setError('Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại dịch vụ.');
    } finally {
      setLoading(false);
    }
  };

  const fetchExpertises = async () => {
    try {
      const data = await teacherService.getExpertises();
      const list = Array.isArray(data) ? data : (data?.data || data?.items || []);
      setExpertises(list);
    } catch (err) {
      console.error('Lỗi khi tải danh sách chuyên môn:', err);
    }
  };

  // Load teachers & classes on state changes
  useEffect(() => {
    fetchClasses();
    fetchExpertises();
  }, []);

  useEffect(() => {
    fetchTeachers();
  }, [page, statusFilter, subjectFilter]);

  // Handle local searching with trigger
  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    setPage(1);
    fetchTeachers({ page: 1 });
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setSubjectFilter('');
    setPage(1);
    fetchTeachers({
      page: 1,
      statusFilter: 'all',
      subjectFilter: '',
      searchTerm: ''
    });
  };

  const toggleDropdown = (id) => {
    setActiveDropdown(activeDropdown === id ? null : id);
  };


  // View details handler
  const handleViewDetail = (teacherId) => {
    setActiveDropdown(null);
    localStorage.setItem('selectedTeacherIdForEdit', teacherId);
    localStorage.setItem('teacherEditMode', 'false');
    onNavigate('edit-teacher');
  };

  // Block/Unblock handler
  const handleToggleActiveStatus = (teacher) => {
    setActiveDropdown(null);
    const newStatus = !teacher.isActive;
    const actionText = newStatus ? 'kích hoạt' : 'vô hiệu hóa';
    setConfirmModal({
      isOpen: true,
      title: `${newStatus ? 'Kích hoạt' : 'Vô hiệu hóa'} tài khoản giáo viên`,
      message: `Bạn có chắc chắn muốn ${actionText} tài khoản của giáo viên này?`,
      isDanger: !newStatus,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        setError('');
        try {
          await teacherService.updateActiveStatus(teacher.teacherId || teacher.id, newStatus);
          setSuccess(`Đã ${actionText} tài khoản giáo viên thành công.`);
          fetchTeachers({ force: true });
        } catch (err) {
          console.error('Lỗi khi thay đổi trạng thái tài khoản:', err);
          setError(err.message || 'Không thể cập nhật trạng thái tài khoản. Vui lòng thử lại.');
        }
      }
    });
  };

  // Password reset simulation (No backend API for Center yet)
  const handleResetPasswordSimulate = (teacherName) => {
    setActiveDropdown(null);
    setSuccess(`Đặt lại mật khẩu mặc định thành công cho giáo viên ${teacherName}: Nhodoimatkhaunhe@@`);
  };

  // Class counting logic helper
  const getTeacherClassStats = (teacher) => {
    const teacherName = teacher?.fullName || '';
    const teacherClasses = classes.filter(cls => {
      if (!cls.teacherName || !teacherName) return false;
      const normalizedCls = cls.teacherName.trim().normalize('NFC').toLowerCase();
      const normalizedTeacher = teacherName.trim().normalize('NFC').toLowerCase();
      if (normalizedCls === normalizedTeacher) return true;
      
      // Fallback: accent-insensitive match
      const cleanCls = removeAccents(normalizedCls);
      const cleanTeacher = removeAccents(normalizedTeacher);
      return cleanCls === cleanTeacher;
    });
    return {
      count: teacherClasses.length,
      list: teacherClasses.map(cls => cls.className).join(', ')
    };
  };

  const totalClasses = classes.length;
  const ratio = totalCount > 0 ? (totalClasses / totalCount).toFixed(1) : '0';
  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <div className={styles.teachersRoot}>
                  
      <main className={styles.mainContent}>
        <div className={styles.container}>
          {/* Header Section */}
          <div className={styles.pageHeader}>
            <div>
              <h2 className={styles.pageTitle}>Quản lý giáo viên</h2>
              <p className={styles.pageSubtitle}>Theo dõi và quản lý thông tin nhân sự giáo viên tại trung tâm.</p>
            </div>
            <button className={styles.addBtn} onClick={() => onNavigate('create-teacher')}>
              <span className="material-symbols-outlined notranslate" translate="no">add</span>
              Thêm giáo viên
            </button>
          </div>

          {/* Success Banner */}
          {success && (
            <div style={{
              padding: '12px 16px',
              backgroundColor: 'var(--success-bg)',
              color: 'var(--success)',
              borderRadius: '8px',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
            }}>
              <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '20px' }}>check_circle</span>
              {success}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div style={{
              padding: '12px 16px',
              backgroundColor: 'var(--error-bg)',
              color: 'var(--error)',
              borderRadius: '8px',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '20px' }}>error</span>
              {error}
            </div>
          )}

          {/* Filter Section */}
          <form onSubmit={handleSearchSubmit} className={styles.filterSection}>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Tìm kiếm giáo viên</label>
              <input
                type="text"
                placeholder="Tìm tên giáo viên..."
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

            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Chuyên môn</label>
              <select
                className={styles.filterSelect}
                value={subjectFilter}
                onChange={(e) => {
                  setSubjectFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="all">Tất cả chuyên môn</option>
                {expertises.map((exp, index) => (
                  <option key={index} value={exp}>{exp}</option>
                ))}
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

          {/* Data Table Card */}
          <div className={styles.tableCard}>
            <div className={styles.tableResponsive}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Giáo viên</th>
                    <th>Liên hệ</th>
                    <th>Chuyên môn</th>
                    <th className={styles.textCenter}>Số lớp</th>
                    <th>Trạng thái</th>
                    <th className={styles.textRight}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="6" className={styles.textCenter} style={{ padding: '48px' }}>
                        <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '36px', animation: 'spin 1s linear infinite', display: 'inline-block', marginBottom: '8px' }}>progress_activity</span>
                        <p>Đang tải danh sách giáo viên...</p>
                      </td>
                    </tr>
                  ) : teachers.length === 0 ? (
                    <tr>
                      <td colSpan="6" className={styles.textCenter} style={{ padding: '24px' }}>Không có giáo viên nào khớp với bộ lọc.</td>
                    </tr>
                  ) : (
                    teachers.map((teacher) => {
                      const tId = teacher.teacherId || teacher.id;
                      const initials = (teacher.fullName || teacher.name || 'GV')
                        .split(' ')
                        .map(w => w[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase();
                        
                      const classStats = getTeacherClassStats(teacher);
                      
                      return (
                        <tr key={tId} className={styles.tableRow}>
                          <td>
                            <div className={styles.teacherInfo}>
                              {teacher.imageUrl ? (
                                <img src={teacher.imageUrl} alt={`Giáo viên ${teacher.fullName}`} className={styles.avatar} loading="lazy" />
                              ) : (
                                <div style={{
                                  width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--primary-fixed, var(--primary-container))', color: 'var(--primary, var(--primary))',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontWeight: 600
                                }}>
                                  {initials}
                                </div>
                              )}
                              <div>
                                <p className={styles.teacherName}>{teacher.fullName}</p>
                              </div>
                            </div>
                          </td>
                          <td>
                            <p className={styles.contactPhone}>{teacher.phoneNumber || '--'}</p>
                            <p className={styles.contactEmail}>{teacher.email}</p>
                          </td>
                          <td>
                            <span className={`${styles.subjectBadge} ${styles.subjectDefault}`}>
                              {teacher.expertise || 'Không rõ'}
                            </span>
                          </td>
                          <td className={styles.textCenter}>
                            <span className={styles.classCount} title={classStats.list}>
                              {loadingClasses ? '...' : classStats.count}
                            </span>
                          </td>
                          <td>
                            {teacher.isActive ? (
                              <span className={`${styles.statusBadge} ${styles.statusActive}`}>
                                <span className={styles.dot}></span> Đang hoạt động
                              </span>
                            ) : (
                              <span className={`${styles.statusBadge} ${styles.statusInactive}`}>
                                <span className={styles.dot}></span> Đã vô hiệu hóa
                              </span>
                            )}
                          </td>
                          <td className={styles.textRight}>
                            <div className={styles.actionWrapper}>
                              <button 
                                className={styles.actionBtn}
                                onClick={() => toggleDropdown(tId)}
                                aria-label="Thao tác"
                                aria-haspopup="menu"
                                aria-expanded={activeDropdown === tId}
                              >
                                <span className="material-symbols-outlined notranslate" translate="no">settings</span>
                              </button>
                              
                              {activeDropdown === tId && (
                                <div className={styles.dropdownMenu}>
                                  <div className={styles.dropdownInner}>
                                    <button className={styles.dropdownItem} onClick={() => handleViewDetail(tId)}>
                                      <span className="material-symbols-outlined notranslate text-sm" translate="no">visibility</span> Xem chi tiết
                                    </button>
                                    <button className={styles.dropdownItem} onClick={() => {
                                      setActiveDropdown(null);
                                      localStorage.setItem('selectedTeacherIdForEdit', tId);
                                      localStorage.setItem('teacherEditMode', 'true');
                                      onNavigate('edit-teacher');
                                    }}>
                                      <span className="material-symbols-outlined notranslate text-sm" translate="no">edit</span> Chỉnh sửa
                                    </button>
                                    <button className={styles.dropdownItem} onClick={() => handleResetPasswordSimulate(teacher.fullName)}>
                                      <span className="material-symbols-outlined notranslate text-sm" translate="no">key</span> Đặt lại mật khẩu
                                    </button>
                                    <div className={styles.dropdownDivider}></div>
                                    {teacher.isActive ? (
                                      <button 
                                        className={`${styles.dropdownItem} ${styles.textError}`} 
                                        onClick={() => handleDeactivateTeacher(teacher)}
                                      >
                                        <span className="material-symbols-outlined notranslate text-sm" translate="no">delete</span> Vô hiệu hóa
                                      </button>
                                    ) : (
                                      <button 
                                        className={styles.dropdownItem} 
                                        onClick={() => handleToggleActiveStatus(teacher)}
                                      >
                                        <span className="material-symbols-outlined notranslate text-sm" translate="no">check_circle</span> Kích hoạt lại
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
                  Hiển thị <span>{Math.min((page - 1) * pageSize + 1, totalCount)} - {Math.min(page * pageSize, totalCount)}</span> trên <span>{totalCount}</span> giáo viên
                </p>
                <div className={styles.pageControls}>
                  <button 
                    className={styles.pageNavBtn} 
                    onClick={() => setPage(p => Math.max(p - 1, 1))}
                    disabled={page === 1}
                  >
                    <span className="material-symbols-outlined notranslate text-sm" translate="no">chevron_left</span>
                  </button>
                  <button className={`${styles.pageNumBtn} ${styles.pageActive}`}>{page}</button>
                  <button 
                    className={styles.pageNavBtn} 
                    onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                    disabled={page === totalPages}
                  >
                    <span className="material-symbols-outlined notranslate text-sm" translate="no">chevron_right</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Dashboard Style Bento Insight */}
          <div className={styles.bentoGrid}>
            <div className={`${styles.bentoCard} ${styles.bentoPrimary}`}>
              <div className={styles.bentoContent}>
                <p className={styles.bentoLabel}>Tổng số giáo viên</p>
                <h3 className={styles.bentoValue}>{loading ? '...' : totalCount}</h3>
                <p className={styles.bentoTrend}>
                  <span className="material-symbols-outlined notranslate text-sm" translate="no">trending_up</span> Hoạt động thực tế
                </p>
              </div>
              <span className={`material-symbols-outlined notranslate ${styles.bentoIconBg}`} translate="no">group</span>
            </div>
            
            <div className={`${styles.bentoCard} ${styles.bentoSurface}`}>
              <div className={styles.bentoContentTop}>
                <p className={styles.bentoLabelDark}>Tỷ lệ lớp/GV</p>
                <h3 className={styles.bentoValuePrimary}>{loadingClasses ? '...' : ratio}</h3>
              </div>
              <div className={styles.progressBar}>
                <div className={styles.progressFill} style={{ width: `${loadingClasses ? 0 : Math.min(parseFloat(ratio) * 20, 100)}%` }}></div>
              </div>
            </div>
            
            <div className={`${styles.bentoCard} ${styles.bentoTertiary}`}>
              <div className={styles.bentoContent}>
                <p className={styles.bentoLabel}>Số chuyên môn</p>
                <h3 className={styles.bentoValue}>{expertises.length}</h3>
                <p className={styles.bentoDesc}>Chuyên ngành giảng dạy tại trung tâm</p>
              </div>
              <span className={`material-symbols-outlined notranslate ${styles.bentoIconBg}`} translate="no">workspace_premium</span>
            </div>
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

export default TeachersPage;
