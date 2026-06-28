import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { classService } from '../../services/classService';
import { scheduleService } from '../../services/scheduleService';
import { studentService } from '../../services/studentService';
import { teacherService } from '../../services/teacherService';
import { attendanceService } from '../../services/attendanceService';
import styles from './TeacherClassDetailPage.module.css';

const TeacherClassDetailPage = ({ onNavigate }) => {
  const [selectedClass, setSelectedClass] = useState(null);
  const [nextSession, setNextSession] = useState(null);
  const [topStudent, setTopStudent] = useState(null);
  const [classSchedules, setClassSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const sessionsSectionRef = useRef(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const classId = params.get('classId');
    if (classId) {
      fetchClassDetail(classId);
    } else {
      if (onNavigate) onNavigate('teacher-classes');
    }
  }, []);

  const fetchClassDetail = async (classId) => {
    setLoading(true);
    try {
      // Parallelize all data fetches for faster load
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
      const endDate = new Date(now.getFullYear(), now.getMonth() + 3, 0).toISOString().split('T')[0];

      const [clsRes, allSchedulesRes, attendanceSessionsRes, profRes, stdRes] = await Promise.all([
        classService.getMyClasses().catch(() => []),
        scheduleService.getSchedules(startDate, endDate).catch(() => []),
        attendanceService.getSessionsByClass(classId).catch(() => []),
        teacherService.getProfileMe().catch(() => null),
        studentService.getStudentsByClass(classId).catch(() => []),
      ]);

      // 1. Process class info
      const classList = Array.isArray(clsRes) ? clsRes : (clsRes?.data || []);
      const foundClass = classList.find(c => String(c.classId || c.id) === String(classId));
      const classInfo = foundClass || { classId, className: 'Lớp học ' + classId, subject: 'Đang cập nhật' };

      // 3. Process profile for center name
      const profData = profRes?.data || profRes;
      if (profData?.centerName) {
        classInfo.centerName = profData.centerName;
      }

      // 4. Process students
      const stdList = Array.isArray(stdRes) ? stdRes : (stdRes?.items || stdRes?.data || []);
      classInfo.studentCount = stdList.length;
      
      setSelectedClass(classInfo);
      
      if (stdList.length > 0) {
        setTopStudent(stdList[0]);
      }

      // 2. Process schedules enriched with attendance
      const allSchedules = Array.isArray(allSchedulesRes) ? allSchedulesRes : (allSchedulesRes?.data || []);
      const attendanceSessions = Array.isArray(attendanceSessionsRes) ? attendanceSessionsRes : (attendanceSessionsRes?.data || []);
      
      // Filter by classId
      const schedules = allSchedules.filter(s => String(s.classId) === String(classId));
      
      // Enrich with attendance session status
      const enrichedSchedules = schedules.map(sched => {
        const matchingSession = attendanceSessions.find(s => s.sessionDate === sched.date);
        let status = 'Chưa điểm danh';
        if (matchingSession) {
          status = matchingSession.status === 'CLOSED' ? 'Đã điểm danh' : 'Đang điểm danh';
        }
        return {
          ...sched,
          attendanceStatus: status,
          sessionInfo: matchingSession
        };
      }).sort((a, b) => new Date(b.date + 'T' + (b.startTime || '00:00')) - new Date(a.date + 'T' + (a.startTime || '00:00')));

      setClassSchedules(enrichedSchedules);
      
      // Next session is the earliest upcoming session
      const upcoming = enrichedSchedules
        .filter(s => new Date(s.date + 'T' + (s.startTime || '00:00')) >= now)
        .sort((a, b) => new Date(a.date + 'T' + (a.startTime || '00:00')) - new Date(b.date + 'T' + (b.startTime || '00:00')));
        
      if (upcoming.length > 0) {
        setNextSession(upcoming[0]);
      } else if (enrichedSchedules.length > 0) {
        setNextSession(enrichedSchedules[0]);
      }

    } catch (err) {
      console.error('Error fetching class details:', err);
    } finally {
      setLoading(false);
    }
  };

  const classId = selectedClass?.classId || selectedClass?.id;

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const day = d.getDay();
    const dayStr = day === 0 ? 'Chủ Nhật' : `Thứ ${day + 1}`;
    const dateFormatted = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
    return `${dayStr}, ${dateFormatted}`;
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    return timeStr.substring(0, 5); // HH:mm
  };

  const getComputedRoom = () => {
    if (selectedClass?.roomName) return selectedClass.roomName;
    if (nextSession && nextSession.roomName) return nextSession.roomName;
    if (classSchedules.length > 0 && classSchedules[0].roomName) return classSchedules[0].roomName;
    return 'Đang cập nhật phòng';
  };

  const getComputedScheduleStr = () => {
    if (classSchedules.length === 0) return 'Đang cập nhật lịch học';
    const days = [...new Set(classSchedules.map(s => {
      const d = new Date(s.date).getDay();
      return d === 0 ? 'CN' : `Thứ ${d + 1}`;
    }))];
    const time = `${classSchedules[0].startTime?.substring(0, 5)} - ${classSchedules[0].endTime?.substring(0, 5) || '19:30'}`;
    return `${days.join(', ')} • ${time}`;
  };

  return (
    <div className={styles.classesRoot}>
            
      <main className={styles.mainContent}>
        <div className={styles.container}>
          <div className={styles.backHeader}>
            <button className={styles.backBtn} onClick={() => onNavigate && onNavigate('teacher-classes')}>
              <span className="material-symbols-outlined notranslate" translate="no">arrow_back</span> Chi tiết lớp học
            </button>
          </div>

          {loading ? (
            <div className={styles.loadingSpinner}>Đang tải chi tiết lớp...</div>
          ) : (
            <div className={styles.dashboardGrid}>
              
              {/* Cột trái (Thông tin chính) */}
              <div className={styles.mainColumn}>
                
                {/* 1. Thẻ thông tin lớp học */}
                <div className={styles.infoCard}>
                  <div className={styles.infoCardHeader}>
                    <h3 className={styles.infoCardTitle}>{selectedClass?.className || 'Đang tải...'}</h3>
                    <span className={styles.statusBadge}>Đang học</span>
                  </div>
                  <p className={styles.infoSubtitle}>{selectedClass?.subject || 'Môn học'}</p>
                  
                  <div className={styles.infoRows}>
                    <div className={styles.infoRow}>
                      <span className="material-symbols-outlined notranslate" translate="no">domain</span>
                      <span>{selectedClass?.centerName || 'Đang cập nhật'}</span>
                    </div>
                    <div className={styles.infoRow}>
                      <span className="material-symbols-outlined notranslate" translate="no">meeting_room</span>
                      <span>{getComputedRoom()}</span>
                    </div>
                    <div className={styles.infoRow}>
                      <span className="material-symbols-outlined notranslate" translate="no">schedule</span>
                      <span>{getComputedScheduleStr()}</span>
                    </div>
                    <div className={styles.infoRow}>
                      <span className="material-symbols-outlined notranslate" translate="no">group</span>
                      <span>{selectedClass?.studentCount || 0} học sinh</span>
                    </div>
                  </div>
                </div>

                {/* 2. Thẻ buổi học tiếp theo */}
                <div className={styles.nextSessionCard}>
                  <div className={styles.nextSessionLabel}>Buổi học tiếp theo</div>
                  {nextSession ? (
                    <>
                      <div className={styles.nextSessionTitle}>
                        {formatDate(nextSession.date)} • {formatTime(nextSession.startTime)}
                      </div>
                      <div className={styles.nextSessionRoom}>
                        <span>
                          <span className="material-symbols-outlined notranslate" translate="no" style={{fontSize: '18px'}}>meeting_room</span>
                          {nextSession.roomName || 'Đang cập nhật'}
                        </span>
                        <span className={styles.attendanceBadge}>Chưa điểm danh</span>
                      </div>
                      <div className={styles.nextSessionArrow} onClick={() => onNavigate && onNavigate(`teacher-attendance-method-selection?classId=${classId}&sessionId=${nextSession.scheduleId || nextSession.id}&from=class-detail`)}>
                        <span className="material-symbols-outlined notranslate" translate="no">chevron_right</span>
                      </div>
                    </>
                  ) : (
                    <div className={`${styles.nextSessionTitle} ${styles.noSessionTitle}`}>
                      Chưa có lịch học sắp tới
                    </div>
                  )}
                </div>

                {/* 3. Nút chức năng ngang */}
                <div className={styles.actionsScroll}>
                  <div className={styles.actionBtnCol} onClick={() => onNavigate && onNavigate(`teacher-student-list?classId=${classId}`)}>
                    <div className={styles.actionIconBox}>
                      <span className="material-symbols-outlined notranslate" translate="no">group</span>
                    </div>
                    <div className={styles.actionLabel}>Danh sách<br/>học sinh</div>
                  </div>
                  
                  <div className={styles.actionBtnCol} onClick={() => onNavigate && onNavigate(`teacher-schedule`)}>
                    <div className={styles.actionIconBox}>
                      <span className="material-symbols-outlined notranslate" translate="no">calendar_month</span>
                    </div>
                    <div className={styles.actionLabel}>Lịch dạy<br/>chi tiết</div>
                  </div>

                  <div className={styles.actionBtnCol} onClick={() => sessionsSectionRef.current?.scrollIntoView({ behavior: 'smooth' })}>
                    <div className={styles.actionIconBox}>
                      <span className="material-symbols-outlined notranslate" translate="no">history</span>
                    </div>
                    <div className={styles.actionLabel}>Lịch sử<br/>điểm danh</div>
                  </div>

                  <div className={styles.actionBtnCol}>
                    <div className={styles.actionIconBox}>
                      <span className="material-symbols-outlined notranslate" translate="no">photo_library</span>
                    </div>
                    <div className={styles.actionLabel}>Lịch sử<br/>chụp vở</div>
                  </div>

                  <div className={styles.actionBtnCol} onClick={() => {
                    if (onNavigate) {
                      const targetScheduleId = nextSession?.scheduleId || nextSession?.id || classSchedules[0]?.id || classSchedules[0]?.scheduleId || '';
                      if (targetScheduleId) {
                        onNavigate(`teacher-session-detail?classId=${classId}&scheduleId=${targetScheduleId}&from=class-detail&tab=feedback`);
                      } else {
                        toast.error('Không tìm thấy ca dạy nào để nhận xét.');
                      }
                    }
                  }}>
                    <div className={styles.actionIconBox}>
                      <span className="material-symbols-outlined notranslate" translate="no">chat_bubble</span>
                    </div>
                    <div className={styles.actionLabel}>Nhận xét<br/>thưởng</div>
                  </div>
                </div>

                {/* 3a. Danh sách ca dạy (Session History) */}
                <div className={styles.sessionsSection} ref={sessionsSectionRef}>
                  <div className={styles.sectionHeader}>
                    <h4 className={styles.sectionTitle}>Danh sách ca dạy</h4>
                  </div>
                  <div className={styles.sessionList}>
                    {classSchedules.length === 0 ? (
                      <p className={styles.emptyText}>Chưa có ca dạy nào được xếp lịch.</p>
                    ) : (
                      classSchedules.map((sess, idx) => {
                        const isDone = sess.attendanceStatus === 'Đã điểm danh';
                        const isPending = sess.attendanceStatus === 'Đang điểm danh';
                        return (
                          <div 
                            key={idx} 
                            className={styles.sessionItem}
                            onClick={() => onNavigate && onNavigate(`teacher-session-detail?classId=${classId}&scheduleId=${sess.id || sess.scheduleId}&from=class-detail`)}
                          >
                            <div className={styles.sessionMeta}>
                              <span className="material-symbols-outlined notranslate" translate="no">calendar_month</span>
                              <strong>{formatDate(sess.date)}</strong>
                              <span className={styles.sessionTime}>
                                {formatTime(sess.startTime)} - {formatTime(sess.endTime)}
                              </span>
                            </div>
                            <div className={styles.sessionStatus}>
                              <span className={isDone ? styles.statusDone : isPending ? styles.statusPending : styles.statusTodo}>
                                {sess.attendanceStatus || 'Chưa điểm danh'}
                              </span>
                              <span className="material-symbols-outlined notranslate" translate="no">chevron_right</span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Cột phải (Học sinh & Tiến độ) */}
              <div className={styles.sideColumn}>
                
                {/* 4. Học sinh tiêu biểu */}
                <div>
                  <div className={styles.sectionHeader}>
                    <h4 className={styles.sectionTitle}>Học sinh tiêu biểu</h4>
                    <span className={styles.viewAllLink} onClick={() => onNavigate && onNavigate(`teacher-student-list?classId=${classId}`)}>
                      Xem tất cả <span className="material-symbols-outlined notranslate" translate="no" style={{fontSize: '18px'}}>chevron_right</span>
                    </span>
                  </div>
                  
                  {topStudent ? (
                    <div className={styles.studentCard}>
                      <div className={styles.studentInfo}>
                        <div className={styles.studentAvatar}>
                          {(topStudent.fullName || topStudent.name || 'H').charAt(0)}
                        </div>
                        <div className={styles.studentDetails}>
                          <h5>{topStudent.fullName || topStudent.name}</h5>
                        </div>
                      </div>
                      <span className={styles.unreviewedBadge}>Chưa nhận xét</span>
                    </div>
                  ) : (
                    <div className={`${styles.studentCard} ${styles.emptyStudentCard}`}>
                      <p className={styles.emptyStudentText}>Chưa có học viên nào</p>
                    </div>
                  )}
                </div>

                {/* 5. Tiến độ chương trình */}
                <div>
                  <div className={styles.progressCard}>
                    <div className={styles.progressLabel}>Tiến độ chương trình</div>
                    <div className={styles.progressPercent}>0%</div>
                  </div>
                </div>

              </div>

            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default TeacherClassDetailPage;
