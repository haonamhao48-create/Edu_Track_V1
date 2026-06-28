import React, { useState, useEffect, useMemo } from 'react';
import { studentService } from '../../services/studentService';
import { attendanceService } from '../../services/attendanceService';
import styles from './TeacherStudentListPage.module.css';

const TeacherStudentListPage = ({ onNavigate }) => {
  const [students, setStudents] = useState([]);
  const [studentStats, setStudentStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [classId, setClassId] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cid = params.get('classId');
    if (cid) {
      setClassId(cid);
      fetchStudents(cid);
    } else {
      if (onNavigate) onNavigate('teacher-classes');
    }
  }, []);

  const fetchStudents = async (cid) => {
    setLoading(true);
    try {
      const stdRes = await studentService.getStudentsByClass(cid);
      const stdList = Array.isArray(stdRes) ? stdRes : (stdRes?.items || stdRes?.data || []);
      setStudents(stdList);

      // Batch stats fetches in chunks of 5 for concurrency control (no arbitrary cap)
      const statsMap = {};
      const chunkSize = 5;
      for (let i = 0; i < stdList.length; i += chunkSize) {
        const chunk = stdList.slice(i, i + chunkSize);
        await Promise.all(
          chunk.map(async (student) => {
            const sId = student.studentId || student.id;
            try {
              const statRes = await attendanceService.getStudentStats(sId);
              statsMap[sId] = statRes?.data || statRes;
            } catch (_) {}
          })
        );
      }
      setStudentStats(statsMap);
    } catch (err) {
      console.error('Error fetching students:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenStudentDetail = (student) => {
    const sId = student.studentId || student.id;
    if (onNavigate) {
      onNavigate(`teacher-student-detail?studentId=${sId}&classId=${classId}`);
    }
  };

  const handleOpenAddFeedback = (student) => {
    const sId = student.studentId || student.id;
    if (onNavigate) {
      onNavigate(`teacher-student-detail?studentId=${sId}&classId=${classId}`);
    }
  };

  const filteredStudents = useMemo(() => {
    return students.filter(std =>
      (std.fullName || std.name || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [students, searchQuery]);

  return (
    <div className={styles.classesRoot}>
            
      <main className={styles.mainContent}>
        <div className={styles.container}>
          <div className={styles.backHeader}>
            <button className={styles.backBtn} onClick={() => onNavigate && onNavigate(`teacher-class-detail?classId=${classId}`)}>
              <span className="material-symbols-outlined notranslate" translate="no">arrow_back</span> Quay lại chi tiết lớp
            </button>
            <div className={styles.detailClassTitleBox}>
              <h3>Danh sách học viên</h3>
            </div>
          </div>

          <div className={styles.tabContentContainer} style={{ marginTop: '20px' }}>
            <div className={styles.studentsTab}>
              <div className={styles.tabPanelHeader}>
                <h5>{students.length} Học viên</h5>
                <input 
                  type="text" 
                  placeholder="Tìm học sinh..." 
                  className={styles.searchBarInput} 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {loading ? (
                <div className={styles.loadingSpinner}>Đang tải danh sách...</div>
              ) : (
                <div className={styles.studentsGrid}>
                  {filteredStudents.map((std, idx) => {
                      const stats = studentStats[std.studentId || std.id];
                      const rate = stats ? Math.round((stats.totalPresent / (stats.totalPresent + stats.totalAbsent + stats.totalLate || 1)) * 100) : 100;
                      return (
                        <div key={idx} className={styles.studentCardRow}>
                          <div className={styles.stdProfileLeft}>
                            <div className={styles.stdAvatarCircle}>
                              {(std.fullName || std.name || 'H').charAt(0)}
                            </div>
                            <div>
                              <h6>{std.fullName || std.name}</h6>
                            </div>
                          </div>
                          <div className={styles.stdStatsInfo}>
                            <span className={styles.attendanceRateText}>Chuyên cần: {rate}%</span>
                            <div className={styles.tinyProgressBar}>
                              <div className={styles.tinyProgressFill} style={{ width: `${rate}%` }}></div>
                            </div>
                          </div>
                          <div className={styles.stdRowActions}>
                            <button className={styles.actionOutlineBtn} onClick={() => handleOpenStudentDetail(std)}>Hồ sơ</button>
                            <button className={styles.actionPrimaryBtn} onClick={() => handleOpenAddFeedback(std)}>Nhận xét</button>
                          </div>
                        </div>
                      );
                    })}
                  {filteredStudents.length === 0 && !loading && (
                    <div className={styles.emptyState}>
                      Chưa có học viên nào trong lớp này.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

export default TeacherStudentListPage;
