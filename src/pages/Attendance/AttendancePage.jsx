import React, { useState, useEffect } from 'react';
import { attendanceService } from '../../services/attendanceService';
import { classService } from '../../services/classService';
import { teacherService } from '../../services/teacherService';
import styles from './AttendancePage.module.css';

const AttendancePage = ({ onNavigate }) => {
  // Data states
  const [classes, setClasses] = useState(() => {
    const cached = sessionStorage.getItem('cached_classes');
    return cached ? JSON.parse(cached) : [];
  });
  const [selectedClassId, setSelectedClassId] = useState('');
  const [teachers, setTeachers] = useState([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [sessions, setSessions] = useState([]);
  const [records, setRecords] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);

  // UI states
  const [loading, setLoading] = useState(false);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRecordsModal, setShowRecordsModal] = useState(false);
  const [creatingSession, setCreatingSession] = useState(false);

  // Create session form state
  const [newSession, setNewSession] = useState({
    classId: '',
    teacherId: '',
    sessionDate: '',
    startTime: '',
    endTime: '',
  });

  // Load classes on mount
  useEffect(() => {
    const fetchClasses = async () => {
      const cached = sessionStorage.getItem('cached_classes');
      const needsReload = sessionStorage.getItem('classes_needs_reload') === 'true';
      if (!needsReload && cached) {
        setClasses(JSON.parse(cached));
        return;
      }
      try {
        const data = await classService.getAllClasses();
        const classList = Array.isArray(data) ? data : (data?.items || data?.data || data?.classes || []);
        setClasses(classList);
        sessionStorage.setItem('cached_classes', JSON.stringify(classList));
        sessionStorage.removeItem('classes_needs_reload');
      } catch (err) {
        console.error('Lỗi khi tải danh sách lớp:', err);
      }
    };
    fetchClasses();
  }, []);

  // Load teachers on mount
  useEffect(() => {
    const fetchTeachers = async () => {
      const cached = sessionStorage.getItem('cached_all_teachers');
      const needsReload = sessionStorage.getItem('teachers_needs_reload') === 'true';
      if (!needsReload && cached) {
        setTeachers(JSON.parse(cached));
        return;
      }
      try {
        const data = await teacherService.getTeachers({ page: 1, pageSize: 1000 });
        const teachersList = data?.items || [];
        setTeachers(teachersList);
        sessionStorage.setItem('cached_all_teachers', JSON.stringify(teachersList));
        sessionStorage.removeItem('teachers_needs_reload');
      } catch (err) {
        console.error('Lỗi khi tải danh sách giáo viên:', err);
      }
    };
    fetchTeachers();
  }, []);

  // Load sessions when a class is selected
  useEffect(() => {
    if (!selectedClassId) {
      setSessions([]);
      setRecords([]);
      return;
    }
    const fetchSessions = async () => {
      const cacheKey = `cached_attendance_sessions_${selectedClassId}`;
      const cached = sessionStorage.getItem(cacheKey);
      const needsReload = sessionStorage.getItem(`attendance_sessions_needs_reload_${selectedClassId}`) === 'true';

      if (!needsReload && cached) {
        setSessions(JSON.parse(cached));
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');
      try {
        const data = await attendanceService.getSessionsByClass(selectedClassId);
        const sessionList = Array.isArray(data) ? data : (data?.data || data?.sessions || []);
        setSessions(sessionList);
        sessionStorage.setItem(cacheKey, JSON.stringify(sessionList));
        sessionStorage.removeItem(`attendance_sessions_needs_reload_${selectedClassId}`);
      } catch (err) {
        setError('Không thể tải danh sách buổi điểm danh. Vui lòng thử lại.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSessions();
  }, [selectedClassId]);

  // Auto-clear success message
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  const handleClassChange = (e) => {
    setSelectedClassId(e.target.value);
    setSelectedSession(null);
    setRecords([]);
    setShowRecordsModal(false);
  };

  const handleViewRecords = async (session) => {
    setSelectedSession(session);
    setLoadingRecords(true);
    setShowRecordsModal(true);
    try {
      const data = await attendanceService.getRecordsBySession(session.id || session._id || session.sessionId);
      const recordList = Array.isArray(data) ? data : (data?.data || data?.records || []);
      setRecords(recordList);
    } catch (err) {
      console.error('Lỗi khi tải bản ghi điểm danh:', err);
      setRecords([]);
    } finally {
      setLoadingRecords(false);
    }
  };

   const handleCreateSession = async (e) => {
    e.preventDefault();
    setCreatingSession(true);
    setError('');
    try {
      await attendanceService.createSession(newSession);
      setSuccessMsg('Tạo buổi điểm danh thành công!');
      setShowCreateModal(false);
      
      // Mark that attendance sessions for this class need reload
      sessionStorage.setItem(`attendance_sessions_needs_reload_${newSession.classId}`, 'true');
      
      const createdClassId = newSession.classId;
      setNewSession({ classId: '', teacherId: '', sessionDate: '', startTime: '', endTime: '' });
      
      // Reload sessions if the created session belongs to the currently selected class
      if (createdClassId === selectedClassId) {
        const data = await attendanceService.getSessionsByClass(selectedClassId);
        const sessionList = Array.isArray(data) ? data : (data?.data || data?.sessions || []);
        setSessions(sessionList);
        sessionStorage.setItem(`cached_attendance_sessions_${selectedClassId}`, JSON.stringify(sessionList));
        sessionStorage.removeItem(`attendance_sessions_needs_reload_${selectedClassId}`);
      }
    } catch (err) {
      setError('Không thể tạo buổi điểm danh. Vui lòng kiểm tra lại thông tin.');
      console.error(err);
    } finally {
      setCreatingSession(false);
    }
  };

  const handleRefresh = async () => {
    if (!selectedClassId) return;
    setLoading(true);
    setError('');
    try {
      const data = await attendanceService.getSessionsByClass(selectedClassId);
      const sessionList = Array.isArray(data) ? data : (data?.data || data?.sessions || []);
      setSessions(sessionList);
      sessionStorage.setItem(`cached_attendance_sessions_${selectedClassId}`, JSON.stringify(sessionList));
      sessionStorage.removeItem(`attendance_sessions_needs_reload_${selectedClassId}`);
      setSuccessMsg('Đã tải lại dữ liệu.');
    } catch (err) {
      setError('Không thể tải lại dữ liệu. Vui lòng thử lại.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Helper to map teacher ID to teacher name
  const getTeacherName = (teacherId) => {
    if (!teacherId) return '--';
    const teacher = teachers.find(t => 
      (t.teacherId && t.teacherId.toLowerCase() === teacherId.toLowerCase()) ||
      (t.id && t.id.toLowerCase() === teacherId.toLowerCase())
    );
    return teacher ? teacher.fullName || teacher.name : teacherId;
  };

  // Filtered sessions by selected teacher
  const filteredSessions = sessions.filter(session => {
    if (!selectedTeacherId) return true;
    return (session.teacherId && session.teacherId.toLowerCase() === selectedTeacherId.toLowerCase());
  });

  // Calculate summary from sessions
  const totalSessions = sessions.length;
  const openSessions = sessions.filter(s => s.status === 'open' || s.status === 'OPEN' || s.status === 'active').length;
  const closedSessions = sessions.filter(s => s.status === 'closed' || s.status === 'CLOSED' || s.status === 'completed').length;

  // Helper: format date
  const formatDate = (dateStr) => {
    if (!dateStr) return '--';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('vi-VN');
    } catch {
      return dateStr;
    }
  };

  // Helper: format time
  const formatTime = (timeStr) => {
    if (!timeStr) return '--:--';
    return timeStr;
  };

  // Helper: get session status display
  const getStatusDisplay = (status) => {
    const statusLower = (status || '').toLowerCase();
    if (statusLower === 'open' || statusLower === 'active') {
      return { text: 'Đang mở', className: styles.statusPresent };
    }
    if (statusLower === 'closed' || statusLower === 'completed') {
      return { text: 'Đã đóng', className: styles.statusAbsent };
    }
    return { text: status || '--', className: styles.statusLate };
  };

  // Helper: get record status display
  const getRecordStatusDisplay = (status) => {
    const statusLower = (status || '').toLowerCase();
    if (statusLower === 'present' || statusLower === 'có mặt') {
      return { text: 'Có mặt', className: styles.statusPresent };
    }
    if (statusLower === 'absent' || statusLower === 'vắng mặt') {
      return { text: 'Vắng mặt', className: styles.statusAbsent };
    }
    if (statusLower === 'late' || statusLower === 'đi muộn') {
      return { text: 'Đi muộn', className: styles.statusLate };
    }
    return { text: status || '--', className: '' };
  };

  return (
    <div className={styles.attendanceRoot}>
                  
      <main className={styles.mainContent}>
        <div className={styles.container}>
          {/* Page Header */}
          <div className={styles.pageHeader}>
            <div>
              <h1 className={styles.pageTitle}>Báo cáo điểm danh</h1>
              <p className={styles.pageSubtitle}>Quản lý và thống kê tình hình chuyên cần của học viên</p>
            </div>
            <div className={styles.headerActions}>
              <button className={styles.btnPrimary} onClick={() => {
                setShowCreateModal(true);
                setNewSession(prev => ({ ...prev, classId: selectedClassId || '' }));
              }}>
                <span className="material-symbols-outlined">add</span>
                <span>Điểm danh mới</span>
              </button>
            </div>
          </div>

          {/* Status Messages */}
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
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>error</span>
              {error}
              <button onClick={() => setError('')} style={{
                marginLeft: 'auto', background: 'none', border: 'none',
                color: 'var(--error)', cursor: 'pointer', padding: '4px',
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
              </button>
            </div>
          )}
          {successMsg && (
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
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>check_circle</span>
              {successMsg}
            </div>
          )}

          {/* Filters Section */}
          <section className={styles.filterSection}>
            <div className={styles.filterGrid}>
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Khoảng thời gian</label>
                <div className={styles.inputWrapper}>
                  <span className={`material-symbols-outlined ${styles.inputIcon}`}>calendar_today</span>
                  <input
                    className={`${styles.filterInput} ${styles.inputWithIcon}`}
                    type="text" 
                    defaultValue="01/10/2023 - 31/10/2023"
                  />
                </div>
              </div>
              
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Lớp học</label>
                <select
                  className={styles.filterSelect}
                  value={selectedClassId}
                  onChange={handleClassChange}
                >
                  <option value="">-- Chọn lớp --</option>
                  {classes.map((cls) => (
                    <option key={cls.classId || cls.id || cls._id} value={cls.classId || cls.id || cls._id}>
                      {cls.name || cls.className || cls.title || `Lớp ${cls.classId || cls.id || cls._id}`}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Học sinh</label>
                <input
                  className={styles.filterInput}
                  placeholder="Tìm tên..." 
                  type="text"
                />
              </div>
              
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Giáo viên</label>
                <select
                  className={styles.filterSelect}
                  value={selectedTeacherId}
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                >
                  <option value="">Tất cả giáo viên</option>
                  {teachers.map((t) => {
                    const tId = t.teacherId || t.id;
                    return (
                      <option key={tId} value={tId}>
                        {t.fullName || t.name}
                      </option>
                    );
                  })}
                </select>
              </div>
              
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Trạng thái</label>
                <select className={styles.filterSelect}>
                  <option>Tất cả</option>
                  <option>Đang mở</option>
                  <option>Đã đóng</option>
                </select>
              </div>
              
              <div className={styles.filterGroupFlexEnd}>
                <button className={styles.btnFilter} onClick={handleRefresh}>
                  <span className="material-symbols-outlined text-[20px]">filter_alt</span>
                  <span>Lọc kết quả</span>
                </button>
              </div>
            </div>
          </section>

          {/* Summary Cards */}
          <section className={styles.summaryGrid}>
            <div className={`${styles.summaryCard} ${styles.borderTertiary}`}>
              <div className={styles.summaryHeader}>
                <span className={styles.summaryTitle}>Tổng số buổi</span>
                <div className={styles.iconTertiary}>
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>event_available</span>
                </div>
              </div>
              <h3 className={styles.summaryValueTertiary}>{selectedClassId ? totalSessions : '--'}</h3>
              <div className={styles.summaryTrendTertiary}>
                <span className="material-symbols-outlined text-[16px]">calendar_month</span>
                <span>{selectedClassId ? 'Buổi điểm danh' : 'Chọn lớp để xem'}</span>
              </div>
            </div>

            <div className={`${styles.summaryCard} ${styles.borderError}`}>
              <div className={styles.summaryHeader}>
                <span className={styles.summaryTitle}>Buổi đã đóng</span>
                <div className={styles.iconError}>
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>cancel</span>
                </div>
              </div>
              <h3 className={styles.summaryValueError}>{selectedClassId ? closedSessions : '--'}</h3>
              <div className={styles.summaryTrendError}>
                <span className="material-symbols-outlined text-[16px]">lock</span>
                <span>{selectedClassId ? 'Đã hoàn thành' : 'Chọn lớp để xem'}</span>
              </div>
            </div>

            <div className={`${styles.summaryCard} ${styles.borderSecondary}`}>
              <div className={styles.summaryHeader}>
                <span className={styles.summaryTitle}>Buổi đang mở</span>
                <div className={styles.iconSecondary}>
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>schedule</span>
                </div>
              </div>
              <h3 className={styles.summaryValueSecondary}>{selectedClassId ? openSessions : '--'}</h3>
              <div className={styles.summaryTrendSecondary}>
                <span className="material-symbols-outlined text-[16px]">pending</span>
                <span>{selectedClassId ? 'Đang điểm danh' : 'Chọn lớp để xem'}</span>
              </div>
            </div>

            <div className={`${styles.summaryCard} ${styles.borderPrimary}`}>
              <div className={styles.summaryHeader}>
                <span className={styles.summaryTitle}>Tỷ lệ hoàn thành</span>
                <div className={styles.iconPrimary}>
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>analytics</span>
                </div>
              </div>
              <h3 className={styles.summaryValuePrimary}>
                {selectedClassId && totalSessions > 0
                  ? `${Math.round((closedSessions / totalSessions) * 100)}%`
                  : '--'}
              </h3>
              <div className={styles.summaryTrendPrimary}>
                <span className="material-symbols-outlined text-[16px]">verified</span>
                <span>{selectedClassId ? 'Buổi đã hoàn thành' : 'Chọn lớp để xem'}</span>
              </div>
            </div>
          </section>

          {/* Attendance Sessions Table */}
          <section className={styles.tableSection}>
            <div className={styles.tableHeader}>
              <h2 className={styles.tableTitle}>Danh sách buổi điểm danh</h2>
              <div className={styles.tableActions}>
                <button className={styles.iconBtn} onClick={handleRefresh} title="Tải lại">
                  <span className="material-symbols-outlined">refresh</span>
                </button>
                <button className={styles.iconBtn} aria-label="Thao tác">
                  <span className="material-symbols-outlined">more_vert</span>
                </button>
              </div>
            </div>
            
            <div className={styles.tableResponsive}>
              {loading ? (
                <div style={{ padding: '48px', textAlign: 'center', color: 'var(--on-surface-variant)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '48px', marginBottom: '16px', display: 'block', animation: 'spin 1s linear infinite' }}>progress_activity</span>
                  <p>Đang tải dữ liệu...</p>
                </div>
              ) : !selectedClassId ? (
                <div style={{ padding: '48px', textAlign: 'center', color: 'var(--on-surface-variant)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '48px', marginBottom: '16px', display: 'block', opacity: 0.5 }}>school</span>
                  <p>Vui lòng chọn một lớp học để xem danh sách buổi điểm danh</p>
                </div>
              ) : sessions.length === 0 ? (
                <div style={{ padding: '48px', textAlign: 'center', color: 'var(--on-surface-variant)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '48px', marginBottom: '16px', display: 'block', opacity: 0.5 }}>event_busy</span>
                  <p>Chưa có buổi điểm danh nào cho lớp này</p>
                </div>
              ) : (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Ngày</th>
                      <th>Giờ bắt đầu</th>
                      <th>Giờ kết thúc</th>
                      <th>Giáo viên</th>
                      <th>Trạng thái</th>
                      <th>Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSessions.map((session) => {
                      const sessionId = session.id || session._id || session.sessionId;
                      const statusDisplay = getStatusDisplay(session.status);
                      return (
                        <tr key={sessionId} className={styles.tableRow}>
                          <td className={styles.fwMedium}>{formatDate(session.sessionDate || session.date)}</td>
                          <td className={styles.textVariant}>{formatTime(session.startTime)}</td>
                          <td className={styles.textVariant}>{formatTime(session.endTime)}</td>
                          <td className={styles.textVariant}>{session.teacherName || getTeacherName(session.teacherId)}</td>
                          <td>
                            <span className={`${styles.statusBadge} ${statusDisplay.className}`}>
                              {statusDisplay.text}
                            </span>
                          </td>
                          <td>
                            <button
                              className={styles.btnOutline}
                              style={{ padding: '4px 12px', fontSize: '13px' }}
                              onClick={() => handleViewRecords(session)}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>visibility</span>
                              <span>Xem chi tiết</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
            
            <div className={styles.pagination}>
              <p className={styles.pageInfo}>
                {selectedClassId
                  ? `Hiển thị ${filteredSessions.length} buổi điểm danh`
                  : 'Chọn lớp để xem dữ liệu'}
              </p>
              <div className={styles.pageControls}>
                <button className={styles.pageNavBtn}>
                  <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                </button>
                <button className={`${styles.pageNumBtn} ${styles.pageActive}`}>1</button>
                <button className={styles.pageNavBtn}>
                  <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                </button>
              </div>
            </div>
          </section>

        </div>
      </main>

      {/* Create Session Modal */}
      {showCreateModal && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }} onClick={() => setShowCreateModal(false)}>
          <div style={{
            backgroundColor: 'var(--surface-container-lowest, #fff)',
            borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '500px',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--primary)' }}>Tạo buổi điểm danh mới</h2>
              <button onClick={() => setShowCreateModal(false)} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--on-surface-variant)', padding: '4px',
              }}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateSession}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className={styles.filterGroup}>
                  <label className={styles.filterLabel}>Lớp học *</label>
                  <select
                    className={styles.filterSelect}
                    value={newSession.classId}
                    onChange={(e) => setNewSession(prev => ({ ...prev, classId: e.target.value }))}
                    required
                  >
                    <option value="">-- Chọn lớp --</option>
                    {classes.map((cls) => (
                      <option key={cls.id || cls._id} value={cls.id || cls._id}>
                        {cls.name || cls.className || cls.title || `Lớp ${cls.id || cls._id}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.filterGroup}>
                  <label className={styles.filterLabel}>Giáo viên *</label>
                  <select
                    className={styles.filterSelect}
                    value={newSession.teacherId}
                    onChange={(e) => setNewSession(prev => ({ ...prev, teacherId: e.target.value }))}
                    required
                  >
                    <option value="">-- Chọn giáo viên --</option>
                    {teachers.map((t) => {
                      const tId = t.teacherId || t.id;
                      return (
                        <option key={tId} value={tId}>
                          {t.fullName || t.name}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className={styles.filterGroup}>
                  <label className={styles.filterLabel}>Ngày điểm danh *</label>
                  <input
                    className={styles.filterInput}
                    type="date"
                    value={newSession.sessionDate}
                    onChange={(e) => setNewSession(prev => ({ ...prev, sessionDate: e.target.value }))}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className={styles.filterGroup}>
                    <label className={styles.filterLabel}>Giờ bắt đầu *</label>
                    <input
                      className={styles.filterInput}
                      type="time"
                      value={newSession.startTime}
                      onChange={(e) => setNewSession(prev => ({ ...prev, startTime: e.target.value }))}
                      required
                    />
                  </div>
                  <div className={styles.filterGroup}>
                    <label className={styles.filterLabel}>Giờ kết thúc *</label>
                    <input
                      className={styles.filterInput}
                      type="time"
                      value={newSession.endTime}
                      onChange={(e) => setNewSession(prev => ({ ...prev, endTime: e.target.value }))}
                      required
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className={styles.btnOutline}
                  onClick={() => setShowCreateModal(false)}
                  disabled={creatingSession}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className={styles.btnPrimary}
                  disabled={creatingSession}
                >
                  {creatingSession ? (
                    <>
                      <span className="material-symbols-outlined" style={{ fontSize: '18px', animation: 'spin 1s linear infinite' }}>progress_activity</span>
                      <span>Đang tạo...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined">add</span>
                      <span>Tạo buổi điểm danh</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Session Records Modal */}
      {showRecordsModal && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }} onClick={() => setShowRecordsModal(false)}>
          <div style={{
            backgroundColor: 'var(--surface-container-lowest, #fff)',
            borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '700px',
            maxHeight: '80vh', overflow: 'auto',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--primary)' }}>Chi tiết buổi điểm danh</h2>
                {selectedSession && (
                  <p style={{ fontSize: '14px', color: 'var(--on-surface-variant)', marginTop: '4px' }}>
                    Ngày: {formatDate(selectedSession.sessionDate || selectedSession.date)}
                    {' | '}
                    {formatTime(selectedSession.startTime)} - {formatTime(selectedSession.endTime)}
                  </p>
                )}
              </div>
              <button onClick={() => setShowRecordsModal(false)} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--on-surface-variant)', padding: '4px',
              }}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {loadingRecords ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--on-surface-variant)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '40px', display: 'block', marginBottom: '12px', animation: 'spin 1s linear infinite' }}>progress_activity</span>
                <p>Đang tải bản ghi...</p>
              </div>
            ) : records.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--on-surface-variant)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '40px', display: 'block', marginBottom: '12px', opacity: 0.5 }}>person_off</span>
                <p>Chưa có bản ghi điểm danh cho buổi này</p>
              </div>
            ) : (
              <div className={styles.tableResponsive}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Học sinh</th>
                      <th>Trạng thái</th>
                      <th>Thời gian</th>
                      <th>Phương thức</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((record, index) => {
                      const recordStatus = getRecordStatusDisplay(record.status);
                      const studentName = record.studentName || record.student?.name || `Học sinh ${record.studentId || ''}`;
                      const initials = studentName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
                      return (
                        <tr key={record.id || record._id || index} className={styles.tableRow}>
                          <td>
                            <div className={styles.studentInfo}>
                              <div className={`${styles.studentAvatar} ${styles.avatarPrimary}`}>{initials}</div>
                              <span className={styles.studentName}>{studentName}</span>
                            </div>
                          </td>
                          <td>
                            <span className={`${styles.statusBadge} ${recordStatus.className}`}>
                              {recordStatus.text}
                            </span>
                          </td>
                          <td className={styles.textVariant}>
                            {record.checkInTime || record.time || '--:--'}
                          </td>
                          <td>
                            {record.method ? (
                              <div className={styles.methodWrapper}>
                                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                                  {record.method === 'qr' || record.method === 'QR' ? 'qr_code_2' : 'edit_note'}
                                </span>
                                <span>{record.method === 'qr' || record.method === 'QR' ? 'QR Code' : 'Thủ công'}</span>
                              </div>
                            ) : (
                              <span className={styles.methodEmpty}>Không rõ</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendancePage;
