import React, { useState, useEffect, useRef } from 'react';
import { studentService } from '../../services/studentService';
import styles from './ManageClassStudentsPage.module.css';

const ManageClassStudentsPage = ({ onNavigate }) => {
  const [selectedClass, setSelectedClass] = useState(null);
  const [classStudents, setClassStudents] = useState([]);
  const [centerStudents, setCenterStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  
  const [loadingClassStudents, setLoadingClassStudents] = useState(true);
  const [loadingCenterStudents, setLoadingCenterStudents] = useState(false);
  const [enrollingStudent, setEnrollingStudent] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const isEnrollingRef = useRef(false);

  // Load selected class from localStorage
  useEffect(() => {
    const classData = localStorage.getItem('selectedClassForManagement');
    if (classData) {
      const cls = JSON.parse(classData);
      setSelectedClass(cls);
      const targetClassId = cls.classId || cls.studyClassId || cls.id;
      fetchClassStudents(targetClassId);
    } else {
      setErrorMsg('Không tìm thấy thông tin lớp học. Vui lòng quay lại danh sách lớp học.');
      setLoadingClassStudents(false);
    }
    fetchCenterStudents();
  }, []);

  const fetchClassStudents = async (classId) => {
    setLoadingClassStudents(true);
    try {
      const res = await studentService.getStudentsByClass(classId);
      const list = res?.items || (Array.isArray(res) ? res : []);
      setClassStudents(list);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Không thể tải danh sách học sinh của lớp này.');
    } finally {
      setLoadingClassStudents(false);
    }
  };

  const fetchCenterStudents = async () => {
    setLoadingCenterStudents(true);
    try {
      // Get a large page size to let user choose, e.g. 200
      const res = await studentService.getStudentsByCenter({ page: 1, pageSize: 200 });
      const list = res?.items || [];
      setCenterStudents(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingCenterStudents(false);
    }
  };

  const handleEnrollStudent = async (e) => {
    e.preventDefault();
    if (!selectedStudentId || isEnrollingRef.current) return;

    isEnrollingRef.current = true;
    setEnrollingStudent(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const targetClassId = selectedClass.classId || selectedClass.studyClassId || selectedClass.id;
      await studentService.enrollStudent(targetClassId, selectedStudentId);
      sessionStorage.setItem('classes_needs_reload', 'true');
      sessionStorage.setItem('students_needs_reload', 'true');
      setSuccessMsg('Ghi danh học sinh vào lớp thành công!');
      setSelectedStudentId('');
      // Reload class students
      await fetchClassStudents(targetClassId);
    } catch (err) {
      setErrorMsg(err?.message || 'Lỗi khi thêm học sinh vào lớp.');
    } finally {
      setEnrollingStudent(false);
      isEnrollingRef.current = false;
    }
  };

  const handleRemoveStudent = async (studentId) => {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const targetClassId = selectedClass.classId || selectedClass.studyClassId || selectedClass.id;
      await studentService.removeStudent(targetClassId, studentId);
      sessionStorage.setItem('classes_needs_reload', 'true');
      sessionStorage.setItem('students_needs_reload', 'true');
      setSuccessMsg('Đã xóa học sinh khỏi lớp thành công.');
      await fetchClassStudents(targetClassId);
    } catch (err) {
      setErrorMsg(err?.message || 'Lỗi khi xóa học sinh khỏi lớp.');
    }
  };

  // Filter center students by search term and exclude those already in the class
  const classStudentIds = new Set(classStudents.map(st => st.studentId || st.id));
  const filteredCenterStudents = centerStudents.filter(st => {
    const stId = st.studentId || st.id;
    if (classStudentIds.has(stId)) return false;

    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;

    return (
      st.fullName?.toLowerCase().includes(term) ||
      stId?.toLowerCase().includes(term) ||
      st.email?.toLowerCase().includes(term) ||
      st.phone?.includes(term)
    );
  });

  return (
    <div className={styles.root}>
            
      <main className={styles.mainContent}>
        <div className={styles.container}>
          {/* Header */}
          <div className={styles.pageHeader}>
            <button className={styles.backBtn} onClick={() => onNavigate('classes')}>
              <span className="material-symbols-outlined notranslate" translate="no">arrow_back</span>
            </button>
            <div>
              <h2 className={styles.pageTitle}>Quản lý học sinh</h2>
              {selectedClass && (
                <p className={styles.pageSubtitle}>
                  Lớp học: <strong>{selectedClass.className}</strong> | Khóa học: {selectedClass.courseName || 'N/A'}
                </p>
              )}
            </div>
          </div>

          {/* Feedback messages */}
          {errorMsg && <div className={styles.alertError}>{errorMsg}</div>}
          {successMsg && <div className={styles.alertSuccess}>{successMsg}</div>}

          {selectedClass && (
            <div className={styles.grid}>
              {/* Left Column: Enrollment Panel */}
              <div className={styles.enrollPanel}>
                <h3 className={styles.panelTitle}>Ghi danh học sinh mới</h3>
                <form onSubmit={handleEnrollStudent} className={styles.form}>
                  <div className={styles.inputGroup}>
                    <label className={styles.label}>Tìm học sinh</label>
                    <input
                      type="text"
                      className={styles.inputField}
                      placeholder="Tìm theo tên, email, SĐT hoặc ID..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>

                  <div className={styles.inputGroup}>
                    <label className={styles.label}>Chọn học sinh</label>
                    <select
                      className={styles.selectField}
                      value={selectedStudentId}
                      onChange={(e) => setSelectedStudentId(e.target.value)}
                      required
                      disabled={loadingCenterStudents}
                    >
                      <option value="">
                        {loadingCenterStudents ? 'Đang tải danh sách...' : '-- Chọn học sinh từ danh sách --'}
                      </option>
                      {filteredCenterStudents.map((st) => (
                        <option key={st.studentId || st.id} value={st.studentId || st.id}>
                          {st.fullName} ({st.email || 'Không có email'} - {st.phone || 'Không có SĐT'})
                        </option>
                      ))}
                    </select>
                    {filteredCenterStudents.length === 0 && searchTerm && (
                      <p className={styles.helperText}>Không tìm thấy học sinh phù hợp.</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    className={styles.submitBtn}
                    disabled={enrollingStudent || !selectedStudentId}
                  >
                    <span className="material-symbols-outlined notranslate" translate="no">add_circle</span>
                    {enrollingStudent ? 'Đang ghi danh...' : 'Ghi danh vào lớp'}
                  </button>
                </form>
              </div>

              {/* Right Column: Class Students List */}
              <div className={styles.listPanel}>
                <h3 className={styles.panelTitle}>Danh sách học sinh đang học ({classStudents.length})</h3>
                {loadingClassStudents ? (
                  <div className={styles.loadingContainer}>
                    <p>Đang tải danh sách học sinh của lớp...</p>
                  </div>
                ) : classStudents.length === 0 ? (
                  <div className={styles.emptyContainer}>
                    <span className="material-symbols-outlined notranslate" translate="no">group_off</span>
                    <p>Lớp học hiện tại chưa có học sinh nào.</p>
                  </div>
                ) : (
                  <div className={styles.tableResponsive}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Học sinh</th>
                          <th>Thông tin liên hệ</th>
                          <th style={{ textAlign: 'right' }}>Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {classStudents.map((st) => {
                          const stId = st.studentId || st.id;
                          return (
                            <tr key={stId}>
                              <td>
                                <div className={styles.studentName}>{st.fullName}</div>
                              </td>
                              <td>
                                <div style={{ fontSize: '13px' }}>{st.email || 'N/A'}</div>
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{st.phone || ''}</div>
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                <button
                                  type="button"
                                  className={styles.removeBtn}
                                  onClick={() => handleRemoveStudent(stId)}
                                >
                                  <span className="material-symbols-outlined notranslate" translate="no">delete</span>
                                  Xóa khỏi lớp
                                </button>
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
      </main>
    </div>
  );
};

export default ManageClassStudentsPage;
