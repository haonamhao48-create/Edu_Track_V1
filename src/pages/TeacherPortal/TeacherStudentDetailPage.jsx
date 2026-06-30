import React, { useState, useEffect } from 'react';
import { studentService } from '../../services/studentService';
import { attendanceService } from '../../services/attendanceService';
import { assessmentService } from '../../services/assessmentService';
import styles from './TeacherStudentDetailPage.module.css';

const apiClient = async (endpoint, options = {}) => {
  const url = `/api${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  };
  const response = await fetch(url, { ...options, headers });
  return response.json();
};

const TeacherStudentDetailPage = ({ onNavigate }) => {
  const [studentId, setStudentId] = useState(null);
  const [classId, setClassId] = useState(null);
  const [student, setStudent] = useState(null);
  const [stats, setStats] = useState(null);
  const [feedback, setFeedback] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sid = params.get('studentId');
    const cid = params.get('classId');
    if (sid) {
      setStudentId(sid);
      setClassId(cid);
      fetchStudentData(sid, cid);
    } else {
      if (onNavigate) onNavigate('teacher-classes');
    }
  }, []);

  const fetchStudentData = async (sid, cid) => {
    setLoading(true);
    try {
      // 1. Fetch student basic info with fallback
      let studentInfo = null;
      try {
        const detailRes = await studentService.getStudentDetail(sid);
        studentInfo = detailRes?.data || detailRes;
      } catch (err) {
        console.warn('Failed to fetch student details directly, trying class list fallback:', err);
        const resolvedCid = cid || classId;
        if (resolvedCid) {
          try {
            const classRes = await studentService.getStudentsByClass(resolvedCid);
            const classList = Array.isArray(classRes) ? classRes : (classRes?.items || classRes?.data || []);
            studentInfo = classList.find(s => String(s.studentId || s.id || s.code) === String(sid));
          } catch (fallbackErr) {
            console.error('Class list fallback also failed:', fallbackErr);
          }
        }
      }
      setStudent(studentInfo);

      // 2. Fetch stats
      try {
        const statRes = await attendanceService.getStudentStats(sid);
        setStats(statRes?.data || statRes);
      } catch (err) {
        console.error('Error fetching student stats:', err);
      }

      // 3. Fetch feedback
      try {
        const feedbackRes = await assessmentService.getCommentsByStudent(sid);
        setFeedback(Array.isArray(feedbackRes) ? feedbackRes : (feedbackRes?.data || []));
      } catch (err) {
        console.error('Error fetching student feedback:', err);
      }

      // 4. Fetch attendance history
      try {
        const directAttendance = await apiClient(`/attendance/student/${sid}`, { method: 'GET' }).catch(() => []);
        setAttendanceRecords(Array.isArray(directAttendance) ? directAttendance : (directAttendance?.data || []));
      } catch (err) {
        console.error('Error fetching attendance history:', err);
      }
      
    } catch (err) {
      console.error('General error fetching student data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (onNavigate) {
      if (classId) {
        onNavigate(`teacher-student-list?classId=${classId}`);
      } else {
        onNavigate('teacher-classes');
      }
    }
  };

  return (
    <div className={styles.classesRoot}>
            
      <main className={styles.mainContent}>
        <div className={styles.container}>
          <div className={styles.backHeader}>
            <button className={styles.backBtn} onClick={handleBack}>
              <span className="material-symbols-outlined notranslate" translate="no">arrow_back</span> Quay lại danh sách
            </button>
            <div className={styles.detailClassTitleBox}>
              <h3>Hồ sơ học viên</h3>
            </div>
          </div>

          {loading ? (
            <div className={styles.loadingSpinner}>Đang tải dữ liệu...</div>
          ) : (
            <div className={styles.tabContentContainer}>
              
              <div className={styles.profileSection}>
                <div className={`${styles.stdAvatarCircle} ${styles.largeAvatar}`}>
                  {(student?.fullName || student?.name || 'H').charAt(0)}
                </div>
                <div>
                  <h2 className={styles.profileName}>
                    {student?.fullName || student?.name || 'Học viên ' + studentId}
                  </h2>
                  <p className={styles.profileSubtext}>Lớp học: {student?.className || 'Chưa cập nhật'}</p>
                  <p className={styles.profileSubtext}>Phụ huynh: {student?.parentName || 'Chưa có thông tin'} • SĐT: {student?.parentPhone || 'N/A'}</p>
                </div>
              </div>

              <div className={styles.detailsGrid}>
                
                {/* Stats */}
                <div className={styles.detailCard}>
                  <h4 className={styles.cardTitle}>Thống kê chuyên cần</h4>
                  <div className={styles.statsList}>
                    <div className={styles.statRow}>
                      <span className={styles.statLabel}>Tổng số ca học:</span>
                      <span className={styles.statValue}>{stats ? (stats.totalPresent + stats.totalAbsent + stats.totalLate) : 0}</span>
                    </div>
                    <div className={styles.statRow}>
                      <span className={styles.statLabel}>Có mặt:</span>
                      <span className={styles.statValueSuccess}>{stats?.totalPresent || 0}</span>
                    </div>
                    <div className={styles.statRow}>
                      <span className={styles.statLabel}>Vắng mặt:</span>
                      <span className={styles.statValueError}>{stats?.totalAbsent || 0}</span>
                    </div>
                    <div className={styles.statRow}>
                      <span className={styles.statLabel}>Đi muộn:</span>
                      <span className={styles.statValueWarning}>{stats?.totalLate || 0}</span>
                    </div>
                  </div>
                </div>

                {/* Feedback */}
                <div className={styles.detailCard}>
                  <h4 className={styles.cardTitle}>Nhận xét giáo viên</h4>
                  <div className={styles.feedbackList}>
                    {feedback.length > 0 ? feedback.map((fb, idx) => (
                      <div key={idx} className={styles.feedbackItem}>
                        <div className={styles.feedbackItemHeader}>
                          <span className={styles.feedbackDate}>{fb.createdAt ? new Date(fb.createdAt).toLocaleDateString() : 'N/A'}</span>
                          <span className={styles.feedbackStatusBadgeEvaluated}>{fb.behaviorRating || 'Good'}</span>
                        </div>
                        <p className={styles.feedbackContent}>{fb.content}</p>
                      </div>
                    )) : (
                      <p className={styles.emptyText}>Chưa có nhận xét nào.</p>
                    )}
                  </div>
                </div>

              </div>

              {/* Attendance Records Table */}
              <div className={styles.detailCard} style={{ marginTop: '24px' }}>
                <h4 className={styles.cardTitle}>Lịch sử điểm danh</h4>
                {attendanceRecords.length > 0 ? (
                  <div className={styles.tableContainer}>
                    <table className={styles.historyTable}>
                      <thead>
                        <tr>
                          <th>Ngày</th>
                          <th>Giờ vào</th>
                          <th>Trạng thái</th>
                          <th>Ghi chú</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attendanceRecords.map((rec, idx) => {
                          const dt = rec.createdAt || rec.checkInAt;
                          let dateStr = 'N/A';
                          let timeStr = '--:--';
                          if (dt) {
                            const d = new Date(dt);
                            dateStr = d.toLocaleDateString();
                            timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
                          }
                          
                          let statusClass = styles.statusAbsent;
                          let statusText = 'Vắng mặt';
                          if (rec.status === 'PRESENT') { statusClass = styles.statusPresent; statusText = 'Có mặt'; }
                          if (rec.status === 'LATE') { statusClass = styles.statusLate; statusText = 'Đi muộn'; }

                          return (
                            <tr key={idx}>
                              <td>{dateStr}</td>
                              <td>{rec.status === 'ABSENT' ? '--' : timeStr}</td>
                              <td className={statusClass}>{statusText}</td>
                              <td>{rec.note || '-'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className={styles.emptyText}>Chưa có bản ghi điểm danh nào.</p>
                )}
              </div>

            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default TeacherStudentDetailPage;
