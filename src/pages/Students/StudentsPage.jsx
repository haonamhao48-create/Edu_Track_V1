import React, { useState, useEffect } from 'react';
import { classService } from '../../services/classService';
import { studentService } from '../../services/studentService';
import styles from './StudentsPage.module.css';
import ConfirmModal from '../../components/ConfirmModal';
import EditStudentModal from './EditStudentModal';
import { normalizeListResponse } from '../../utils/apiResponse';

const removeAccents = (str) => {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
};

const StudentsPage = ({ onNavigate }) => {
  const [classes, setClasses] = useState(() => {
    const cached = sessionStorage.getItem('cached_classes');
    return cached ? JSON.parse(cached) : [];
  });
  const [selectedClassId, setSelectedClassId] = useState('');
  const [students, setStudents] = useState(() => {
    const cached = sessionStorage.getItem('cached_students_page_1');
    return cached ? JSON.parse(cached) : [];
  });
  const [loading, setLoading] = useState(() => {
    const cached = sessionStorage.getItem('cached_students_page_1');
    const needsReload = sessionStorage.getItem('students_needs_reload') === 'true';
    return !cached || needsReload;
  });
  const [loadingClasses, setLoadingClasses] = useState(() => {
    const cached = sessionStorage.getItem('cached_classes');
    const needsReload = sessionStorage.getItem('classes_needs_reload') === 'true';
    return !cached || needsReload;
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeDropdown, setActiveDropdown] = useState(null);

  // Pagination State (Used only when listing center-wide students)
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(() => {
    const cachedTotal = sessionStorage.getItem('cached_students_total');
    return cachedTotal ? parseInt(cachedTotal, 10) : 0;
  });

  // Detail Modal State
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedStudentDetail, setSelectedStudentDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
  const [studentToEdit, setStudentToEdit] = useState(null);

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    isDanger: false
  });

  const handleSaveStudent = async (data) => {
    try {
      await studentService.updateStudentByCenter(studentToEdit.studentId || studentToEdit.id, data);
      setSuccess('Cập nhật thông tin học sinh thành công.');
      fetchStudents(true);
    } catch (err) {
      console.error('Lỗi khi cập nhật học sinh:', err);
      throw err;
    }
  };

  const handleDeactivateStudent = (student) => {
    setActiveDropdown(null);
    setConfirmModal({
      isOpen: true,
      title: 'Vô hiệu hóa học sinh',
      message: `Bạn có chắc chắn muốn vô hiệu hóa học sinh ${student.fullName || student.name}? Hành động này sẽ khóa quyền truy cập của học sinh.`,
      isDanger: true,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        setError('');
        try {
          await studentService.deactivateStudent(student.studentId || student.id);
          setSuccess('Vô hiệu hóa học sinh thành công.');
          fetchStudents(true);
        } catch (err) {
          console.error('Lỗi khi vô hiệu hóa học sinh:', err);
          setError(err.message || 'Không thể vô hiệu hóa học sinh. Vui lòng thử lại.');
        }
      }
    });
  };

  // Auto-clear success message
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const fetchClasses = async (force = false) => {
    const needsReload = sessionStorage.getItem('classes_needs_reload') === 'true';
    const hasCache = sessionStorage.getItem('cached_classes');

    if (!force && !needsReload && hasCache) {
      setLoadingClasses(false);
      return;
    }

    setLoadingClasses(true);
    try {
      const res = await classService.getAllClasses();
      const list = normalizeListResponse(res);
      setClasses(list);
      sessionStorage.setItem('cached_classes', JSON.stringify(list));
      sessionStorage.removeItem('classes_needs_reload');
    } catch (err) {
      console.error('Lỗi khi tải danh sách lớp học:', err);
      setError('Không thể tải danh sách lớp học. Vui lòng kiểm tra kết nối.');
    } finally {
      setLoadingClasses(false);
    }
  };

  // Load classes on mount
  useEffect(() => {
    fetchClasses();
  }, []);

  // Fetch students function (handles both center-wide and class-scoped listings)
  const fetchStudents = async (force = false) => {
    if (selectedClassId) {
      // Mode 1: Class-scoped list
      setLoading(true);
      setError('');
      try {
        const res = await studentService.getStudentsByClass(selectedClassId);
        const list = res?.items || (Array.isArray(res) ? res : []);
        setStudents(list);
        setTotalCount(list.length);
      } catch (err) {
        setError('Không thể tải danh sách học sinh. Vui lòng thử lại sau.');
        console.error(err);
      } finally {
        setLoading(false);
      }
      return;
    }

    // Mode 2: Center-wide list (paginated, with search filters)
    const needsReload = sessionStorage.getItem('students_needs_reload') === 'true';
    const isCacheable = !searchTerm.trim() && statusFilter === 'all';

    if (needsReload || force) {
      Object.keys(sessionStorage).forEach(key => {
        if (key.startsWith('cached_students_page_') || key === 'cached_students_total') {
          sessionStorage.removeItem(key);
        }
      });
    }

    const cacheKey = `cached_students_page_${page}`;
    const hasCache = sessionStorage.getItem(cacheKey);

    if (isCacheable && !force && !needsReload && hasCache) {
      const cached = sessionStorage.getItem(cacheKey);
      const cachedTotal = sessionStorage.getItem('cached_students_total');
      if (cached) {
        setStudents(JSON.parse(cached));
      }
      if (cachedTotal) {
        setTotalCount(parseInt(cachedTotal, 10));
      }
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await studentService.getStudentsByCenter({
        page,
        pageSize,
        studentName: searchTerm || null
      });
      const list = res?.items || [];
      setStudents(list);
      setTotalCount(res?.totalCount || list.length);

      if (isCacheable) {
        sessionStorage.setItem(cacheKey, JSON.stringify(list));
        sessionStorage.setItem('cached_students_total', (res?.totalCount || list.length).toString());
        sessionStorage.removeItem('students_needs_reload');
      }
    } catch (err) {
      setError('Không thể tải danh sách học sinh. Vui lòng thử lại sau.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Trigger loading when filters, page, or class selection changes
  useEffect(() => {
    fetchStudents();
  }, [selectedClassId, page, statusFilter]);

  // Handle local searching with trigger
  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    setPage(1);
    fetchStudents(true);
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedClassId('');
    setStatusFilter('all');
    setPage(1);
  };

  const toggleDropdown = (id) => {
    setActiveDropdown(activeDropdown === id ? null : id);
  };

  const handleViewDetail = (studentId) => {
    setActiveDropdown(null);
    localStorage.setItem('selectedStudentIdForEdit', studentId);
    localStorage.setItem('studentEditMode', 'false');
    onNavigate('edit-student');
  };

  const handleRemoveStudent = (studentId) => {
    setActiveDropdown(null);
    setConfirmModal({
      isOpen: true,
      title: 'Xác nhận xóa học sinh khỏi lớp',
      message: 'Bạn có chắc chắn muốn xóa học sinh này khỏi lớp học? Hành động này không thể hoàn tác.',
      isDanger: true,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        setError('');
        try {
          await studentService.removeStudent(selectedClassId, studentId);
          sessionStorage.setItem('students_needs_reload', 'true');
          sessionStorage.setItem('classes_needs_reload', 'true');
          setSuccess('Đã xóa học sinh khỏi lớp học thành công.');
          fetchStudents(true);
        } catch (err) {
          console.error('Lỗi khi xóa học sinh:', err);
          setError(err.message || 'Không thể xóa học sinh khỏi lớp học. Vui lòng thử lại.');
        }
      }
    });
  };

  // Calculate local filtered students only for client-side search inside class scoping
  const getFilteredStudents = () => {
    if (selectedClassId) {
      return students.filter(student => {
        const fullName = student.fullName || student.name || '';
        const studentId = student.studentId || student.id || '';
        const matchesSearch = removeAccents(fullName).toLowerCase().includes(removeAccents(searchTerm).toLowerCase()) ||
                              studentId.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || (student.status || 'active').toLowerCase() === statusFilter.toLowerCase();
        return matchesSearch && matchesStatus;
      });
    }
    return students; // If center-wide, the API already paginates and filters by studentName on server
  };

  const displayedStudents = getFilteredStudents();
  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <div className={styles.studentsRoot}>
                  
      <main className={styles.mainContent}>
        {/* Page Header */}
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>Quản lý học sinh</h1>
            <p className={styles.pageSubtitle}>Quản lý danh sách học viên, hồ sơ và ghi danh lớp học trong hệ thống.</p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className={styles.addBtn} onClick={() => onNavigate('create-student')}>
              <span className="material-symbols-outlined notranslate" translate="no">add</span>
              Tạo tài khoản học sinh
            </button>
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div style={{
            padding: '12px 16px',
            marginBottom: '16px',
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
            <button onClick={() => setError('')} style={{
              marginLeft: 'auto', background: 'none', border: 'none',
              color: 'var(--error)', cursor: 'pointer', padding: '4px',
            }}>
              <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '18px' }}>close</span>
            </button>
          </div>
        )}
        {success && (
          <div style={{
            padding: '12px 16px',
            marginBottom: '16px',
            backgroundColor: 'var(--success-bg)',
            color: 'var(--success)',
            borderRadius: '8px',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '20px' }}>check_circle</span>
            {success}
          </div>
        )}

        {/* Filter Card */}
        <form onSubmit={handleSearchSubmit} className={styles.filterSection}>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Tìm kiếm học sinh</label>
            <input 
              type="text" 
              placeholder="Tìm tên, mã học sinh..." 
              className={styles.filterSelect}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Lớp học</label>
            <select 
              className={styles.filterSelect}
              value={selectedClassId}
              onChange={(e) => {
                setSelectedClassId(e.target.value);
                setPage(1);
              }}
              disabled={loadingClasses}
            >
              <option value="">-- Tất cả học sinh --</option>
              {classes.map((cls) => (
                <option key={cls.classId || cls.id || cls._id} value={cls.classId || cls.id || cls._id}>
                  {cls.className || cls.name || `Lớp ${cls.classId || cls.id || cls._id}`}
                </option>
              ))}
            </select>
          </div>
          
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Trạng thái</label>
            <select 
              className={styles.filterSelect} 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Tất cả</option>
              <option value="active">Đang học</option>
            </select>
          </div>
          
          <div className={styles.filterActions}>
            <button 
              type="submit" 
              className={styles.searchSubmitBtn}
            >
              <span className="material-symbols-outlined notranslate" translate="no">search</span>
              Tìm kiếm
            </button>
            <button 
              type="button"
              className={styles.searchResetBtn} 
              onClick={handleResetFilters} 
              disabled={loading || loadingClasses}
            >
              <span className="material-symbols-outlined notranslate" translate="no">restart_alt</span>
              Đặt lại
            </button>
          </div>
        </form>

        {/* Data Table Card */}
        <div className={styles.tableCard}>
          <div className={styles.tableResponsive}>
            {loading ? (
              <div style={{ padding: '48px', textAlign: 'center', color: 'var(--on-surface-variant)' }}>
                <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '48px', marginBottom: '16px', display: 'block', animation: 'spin 1s linear infinite' }}>progress_activity</span>
                <p>Đang tải dữ liệu học sinh...</p>
              </div>
            ) : displayedStudents.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center', color: 'var(--on-surface-variant)' }}>
                <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '48px', marginBottom: '16px', display: 'block', opacity: 0.5 }}>person_off</span>
                <p>Không tìm thấy học sinh nào phù hợp</p>
              </div>
            ) : (
              <table className={styles.table}>
                <thead>
                  {selectedClassId ? (
                    // Headers for Class-scoped Mode
                    <tr>
                      <th>Học sinh</th>
                      <th>Ngày ghi danh</th>
                      <th>Trạng thái</th>
                      <th className={styles.textRight}>Thao tác</th>
                    </tr>
                  ) : (
                    // Headers for Center-wide Mode
                    <tr>
                      <th>Học sinh</th>
                      <th>Thông tin liên hệ</th>
                      <th>Lớp đang học</th>
                      <th>Trạng thái</th>
                      <th className={styles.textRight}>Thao tác</th>
                    </tr>
                  )}
                </thead>
                <tbody>
                  {displayedStudents.map((student) => {
                    const sId = student.studentId || student.id;
                    const initials = (student.fullName || student.name || 'HS')
                      .split(' ')
                      .map(w => w[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase();
                    
                    return (
                      <tr key={sId} className={styles.tableRow}>
                        <td>
                          <div className={styles.studentInfo}>
                            {student.imageUrl || student.avatar ? (
                              <img src={student.imageUrl || student.avatar} alt={student.fullName || student.name} className={styles.avatar} loading="lazy" />
                            ) : (
                              <div className={styles.avatarPlaceholder}>{initials}</div>
                            )}
                            <div>
                              <p className={styles.studentName}>{student.fullName || student.name}</p>
                            </div>
                          </div>
                        </td>
                        
                        {selectedClassId ? (
                           <>
                             <td>
                               <span className={styles.studentEmail}>
                                 {student.enrollmentDate ? new Date(student.enrollmentDate).toLocaleDateString('vi-VN') : '--'}
                               </span>
                             </td>
                           </>
                        ) : (
                          <>
                            <td>
                              <p style={{ margin: 0, fontSize: '14px', fontWeight: 500 }}>{student.phoneNumber || '--'}</p>
                              <p style={{ margin: 0, fontSize: '12px', color: 'var(--outline)' }}>{student.email || '--'}</p>
                            </td>
                            <td>
                              <div className={styles.classesTags}>
                                {Array.isArray(student.classes) && student.classes.length > 0 ? (
                                  student.classes.map((cls, idx) => (
                                    <span key={cls.classId || idx} className={styles.classTag}>
                                      {cls.className}
                                    </span>
                                  ))
                                ) : (
                                  <span style={{ fontSize: '13px', color: 'var(--outline)', fontStyle: 'italic' }}>Chưa vào lớp</span>
                                )}
                              </div>
                            </td>
                          </>
                        )}
                        
                        <td>
                          {student.status?.toLowerCase() === 'inactive' ? (
                            <span className={`${styles.statusBadge} ${styles.statusInactive}`}>Tạm dừng</span>
                          ) : (
                            <span className={`${styles.statusBadge} ${styles.statusActive}`}>Đang học</span>
                          )}
                        </td>
                        
                        <td className={styles.textRight}>
                          <div className={styles.actionWrapper}>
                            <button 
                              className={styles.actionBtn}
                              onClick={() => toggleDropdown(sId)}
                              aria-label="Thao tác"
                              aria-haspopup="menu"
                              aria-expanded={activeDropdown === sId}
                            >
                              <span className="material-symbols-outlined notranslate" translate="no">settings</span>
                            </button>
                            
                            {activeDropdown === sId && (
                              <div className={styles.dropdownMenu}>
                                <button className={styles.dropdownItem} onClick={() => handleViewDetail(sId)}>
                                  <span className="material-symbols-outlined notranslate" translate="no">visibility</span> Xem chi tiết
                                </button>
                                 <button className={styles.dropdownItem} onClick={() => {
                                   setActiveDropdown(null);
                                   localStorage.setItem('selectedStudentIdForEdit', sId);
                                   localStorage.setItem('studentEditMode', 'true');
                                   onNavigate('edit-student');
                                 }}>
                                   <span className="material-symbols-outlined notranslate" translate="no">edit</span> Chỉnh sửa
                                 </button>
                                <button className={`${styles.dropdownItem} ${styles.textError}`} onClick={() => handleDeactivateStudent(student)}>
                                  <span className="material-symbols-outlined notranslate" translate="no">block</span> Vô hiệu hóa
                                </button>
                                {selectedClassId && (
                                  <>
                                    <div className={styles.dropdownDivider}></div>
                                    <button className={`${styles.dropdownItem} ${styles.textError}`} onClick={() => handleRemoveStudent(sId)}>
                                      <span className="material-symbols-outlined notranslate" translate="no">block</span> Xóa khỏi lớp
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
          
          {/* Pagination */}
          {totalCount > 0 && (
            <div className={styles.pagination}>
              <p className={styles.pageInfo}>
                Hiển thị <span>{selectedClassId ? `1 - ${displayedStudents.length}` : `${Math.min((page - 1) * pageSize + 1, totalCount)} - ${Math.min(page * pageSize, totalCount)}`}</span> trong số <span>{totalCount}</span> học sinh
              </p>
              {!selectedClassId && (
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
              )}
            </div>
          )}
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

export default StudentsPage;
