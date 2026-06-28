import React, { useState, useEffect, useRef } from 'react';
import { classService } from '../../services/classService';
import { teacherService } from '../../services/teacherService';
import styles from './ManageClassTeachersPage.module.css';

const ManageClassTeachersPage = ({ onNavigate }) => {
  const [selectedClass, setSelectedClass] = useState(null);
  const [teachersList, setTeachersList] = useState([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  
  const [loadingTeachers, setLoadingTeachers] = useState(false);
  const [assigningTeacher, setAssigningTeacher] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const isAssigningRef = useRef(false);

  // Load selected class from localStorage
  useEffect(() => {
    const classData = localStorage.getItem('selectedClassForManagement');
    if (classData) {
      setSelectedClass(JSON.parse(classData));
    } else {
      setErrorMsg('Không tìm thấy thông tin lớp học. Vui lòng quay lại danh sách lớp học.');
    }
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    setLoadingTeachers(true);
    try {
      const res = await teacherService.getTeachers({ page: 1, pageSize: 200 });
      setTeachersList(res?.items || []);
    } catch (err) {
      console.error(err);
      setErrorMsg('Không thể tải danh sách giáo viên của trung tâm.');
    } finally {
      setLoadingTeachers(false);
    }
  };

  const handleAssignTeacher = async (e) => {
    e.preventDefault();
    if (!selectedTeacherId || isAssigningRef.current) return;

    isAssigningRef.current = true;
    setAssigningTeacher(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const targetClassId = selectedClass.classId || selectedClass.studyClassId || selectedClass.id;
      await classService.assignTeacher(targetClassId, selectedTeacherId);
      sessionStorage.setItem('classes_needs_reload', 'true');
      sessionStorage.setItem('teachers_needs_reload', 'true');
      sessionStorage.removeItem('cached_all_teachers');
      setSuccessMsg('Phân công giáo viên thành công!');
      
      // Update selectedClass details in state & localStorage
      const updatedClasses = await classService.getAllClasses();
      const allClasses = Array.isArray(updatedClasses) ? updatedClasses : (updatedClasses?.items || []);
      const updatedClass = allClasses.find(c => (c.classId || c.studyClassId || c.id) === targetClassId);
      if (updatedClass) {
        setSelectedClass(updatedClass);
        localStorage.setItem('selectedClassForManagement', JSON.stringify(updatedClass));
      }
      setSelectedTeacherId('');
    } catch (err) {
      setErrorMsg(err?.message || 'Lỗi khi phân công giáo viên.');
    } finally {
      setAssigningTeacher(false);
      isAssigningRef.current = false;
    }
  };

  const handleUnassignTeacher = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const targetClassId = selectedClass.classId || selectedClass.studyClassId || selectedClass.id;
      await classService.unassignTeacher(targetClassId);
      sessionStorage.setItem('classes_needs_reload', 'true');
      sessionStorage.setItem('teachers_needs_reload', 'true');
      sessionStorage.removeItem('cached_all_teachers');
      setSuccessMsg('Đã gỡ giáo viên khỏi lớp thành công.');

      // Update selectedClass details in state & localStorage
      const updatedClasses = await classService.getAllClasses();
      const allClasses = Array.isArray(updatedClasses) ? updatedClasses : (updatedClasses?.items || []);
      const updatedClass = allClasses.find(c => (c.classId || c.studyClassId || c.id) === targetClassId);
      if (updatedClass) {
        setSelectedClass(updatedClass);
        localStorage.setItem('selectedClassForManagement', JSON.stringify(updatedClass));
      }
    } catch (err) {
      setErrorMsg(err?.message || 'Lỗi khi gỡ giáo viên.');
    }
  };

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
              <h2 className={styles.pageTitle}>Quản lý giáo viên</h2>
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
              {/* Current Teacher Section */}
              <div className={styles.statusPanel}>
                <h3 className={styles.panelTitle}>Giáo viên phụ trách hiện tại</h3>
                <div className={styles.teacherCard}>
                  {selectedClass.teacherName ? (
                    <div className={styles.teacherInfo}>
                      <div className={styles.avatarPlaceholder}>
                        <span className="material-symbols-outlined notranslate" translate="no">person</span>
                      </div>
                      <div className={styles.teacherDetails}>
                        <h4 className={styles.teacherName}>{selectedClass.teacherName}</h4>
                      </div>
                      <button
                        type="button"
                        className={styles.unassignBtn}
                        onClick={handleUnassignTeacher}
                      >
                        <span className="material-symbols-outlined notranslate" translate="no">person_remove</span>
                        Gỡ giáo viên
                      </button>
                    </div>
                  ) : (
                    <div className={styles.noTeacher}>
                      <span className="material-symbols-outlined notranslate" translate="no">person_off</span>
                      <p>Lớp học này hiện tại chưa được phân công giáo viên.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Assignment Panel */}
              <div className={styles.assignPanel}>
                <h3 className={styles.panelTitle}>Phân công giáo viên mới</h3>
                <form onSubmit={handleAssignTeacher} className={styles.form}>
                  <div className={styles.inputGroup}>
                    <label className={styles.label}>Chọn giáo viên giảng dạy</label>
                    <select
                      className={styles.selectField}
                      value={selectedTeacherId}
                      onChange={(e) => setSelectedTeacherId(e.target.value)}
                      required
                      disabled={loadingTeachers}
                    >
                      <option value="">
                        {loadingTeachers ? 'Đang tải giáo viên...' : '-- Chọn giáo viên --'}
                      </option>
                      {teachersList.map((t) => (
                        <option key={t.teacherId || t.id} value={t.teacherId || t.id}>
                          {t.fullName} ({t.expertise || 'Không rõ chuyên môn'} - {t.email})
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="submit"
                    className={styles.submitBtn}
                    disabled={assigningTeacher || !selectedTeacherId}
                  >
                    <span className="material-symbols-outlined notranslate" translate="no">check_circle</span>
                    {assigningTeacher ? 'Đang phân công...' : 'Xác nhận phân công'}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ManageClassTeachersPage;
