import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { scheduleService } from '../../services/scheduleService';
import { attendanceService } from '../../services/attendanceService';
import { studentService } from '../../services/studentService';
import styles from './TeacherSchedulePage.module.css';

const TeacherSchedulePage = ({ onNavigate }) => {
  const [currentWeekStart, setCurrentWeekStart] = useState(getStartOfWeek(new Date()));
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const fetchIdRef = useRef(0);

  // Modal Session Details
  const [showModal, setShowModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionRecords, setSessionRecords] = useState([]);

  function getStartOfWeek(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    return new Date(d.setDate(diff));
  }

  const getWeekDays = (startOfWeek) => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const weekDays = getWeekDays(currentWeekStart);

  useEffect(() => {
    fetchWeekSchedules();
  }, [currentWeekStart]);

  const fetchWeekSchedules = async () => {
    const currentFetchId = ++fetchIdRef.current;
    setLoading(true);
    try {
      const getLocalStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const startDateStr = getLocalStr(weekDays[0]);
      const endDateStr = getLocalStr(weekDays[6]);

      const res = await scheduleService.getSchedules(startDateStr, endDateStr);
      if (currentFetchId !== fetchIdRef.current) return;

      let list = Array.isArray(res) ? res : (res?.data || []);
      
      const initialList = list.map(sched => ({ ...sched, attendanceStatus: 'Đang tải...' }));
      setSchedules(initialList);
      setLoading(false);

      const classIds = [...new Set(list.map(s => s.classId).filter(Boolean))];
      const sessionsByClass = {};
      
      await Promise.all(classIds.map(async (classId) => {
        try {
          const sessRes = await attendanceService.getSessionsByClass(classId);
          sessionsByClass[classId] = Array.isArray(sessRes) ? sessRes : (sessRes?.data || []);
        } catch (e) {
          sessionsByClass[classId] = [];
        }
      }));

      if (currentFetchId !== fetchIdRef.current) return;

      setSchedules(prev => prev.map(sched => {
        const classSessions = sessionsByClass[sched.classId] || [];
        const matchingSession = classSessions.find(s => s.sessionDate === sched.date);
        
        let status = 'Chưa điểm danh';
        if (matchingSession) {
          status = matchingSession.status === 'CLOSED' ? 'Đã điểm danh' : 'Đang điểm danh';
        }
        return { ...sched, attendanceStatus: status, sessionInfo: matchingSession };
      }));

    } catch (err) {
      if (currentFetchId !== fetchIdRef.current) return;
      console.error('Error fetching week schedules:', err);
      setLoading(false);
    }
  };

  const handlePrevWeek = () => {
    const prev = new Date(currentWeekStart);
    prev.setDate(currentWeekStart.getDate() - 7);
    setCurrentWeekStart(prev);
  };

  const handleNextWeek = () => {
    const next = new Date(currentWeekStart);
    next.setDate(currentWeekStart.getDate() + 7);
    setCurrentWeekStart(next);
  };

  const handleTodayWeek = () => {
    setCurrentWeekStart(getStartOfWeek(new Date()));
  };

  // Group schedules by day of week (yyyy-mm-dd) — memoized to avoid re-filtering on every render
  const schedulesByDay = useMemo(() => {
    const map = {};
    for (let i = 0; i < schedules.length; i++) {
      const s = schedules[i];
      if (!map[s.date]) map[s.date] = [];
      map[s.date].push(s);
    }
    // Sort each day's schedules by startTime
    Object.keys(map).forEach(key => {
      map[key].sort((a, b) => String(a.startTime).localeCompare(String(b.startTime)));
    });
    return map;
  }, [schedules]);

  const getSchedulesForDay = useCallback((date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;
    return schedulesByDay[dateStr] || [];
  }, [schedulesByDay]);

  const handleOpenSessionDetails = useCallback(async (session) => {
    setSelectedSession(session);
    setShowModal(true);
    try {
      const attendanceSessionId = session?.sessionInfo?.id || session?.sessionInfo?.sessionId;
      if (!attendanceSessionId) {
        setSessionRecords([]);
        return;
      }

      // Fetch attendance records and class students in parallel
      const [recRes, stdRes] = await Promise.all([
        attendanceService.getRecordsBySession(attendanceSessionId),
        session?.classId
          ? studentService.getStudentsByClass(session.classId).catch(() => [])
          : Promise.resolve([]),
      ]);

      const records = Array.isArray(recRes) ? recRes : (recRes?.data || []);
      const classStudents = Array.isArray(stdRes) ? stdRes : (stdRes?.items || stdRes?.data || []);

      // Build a name lookup map from the batch-fetched students — no N+1 individual calls
      const studentNameMap = {};
      for (let i = 0; i < classStudents.length; i++) {
        const std = classStudents[i];
        const sId = String(std.studentId || std.id);
        studentNameMap[sId] = std.fullName || std.name || 'Học viên';
      }
      
      const populated = records.map((rec) => {
        const sIdStr = String(rec.studentId);
        return {
          ...rec,
          studentName: studentNameMap[sIdStr] || rec.studentName || rec.fullName || 'Học viên ẩn danh',
        };
      });
      setSessionRecords(populated);
    } catch (_) {
      setSessionRecords([]);
    }
  }, []);

  const formatTime = (timeVal) => {
    if (!timeVal) return '00:00';
    if (typeof timeVal === 'object') {
      const h = String(timeVal.hour || 0).padStart(2, '0');
      const m = String(timeVal.minute || 0).padStart(2, '0');
      return `${h}:${m}`;
    }
    const timeStr = String(timeVal);
    if (timeStr.includes(':')) {
      const parts = timeStr.split(':');
      if (parts.length >= 2) {
        return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
      }
    }
    return timeStr;
  };

  const dayNames = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];

  return (
    <div className={styles.scheduleRoot}>
            
      <main className={styles.mainContent}>
        <div className={styles.container}>
          {/* Header Bar */}
          <div className={styles.pageHeader}>
            <div className={styles.titleArea}>
              <h3 className={styles.pageTitle}>Lịch giảng dạy</h3>
              <p className={styles.pageSubtitle}>Xem và quản lý thời khóa biểu các ca dạy trong tuần.</p>
            </div>
            
            <div className={styles.navigationControls}>
              <button className={styles.navBtn} onClick={handlePrevWeek}>
                <span className="material-symbols-outlined notranslate" translate="no">chevron_left</span>
              </button>
              <button className={styles.todayBtn} onClick={handleTodayWeek}>Tuần này</button>
              <button className={styles.navBtn} onClick={handleNextWeek}>
                <span className="material-symbols-outlined notranslate" translate="no">chevron_right</span>
              </button>
              <span className={styles.weekRangeLabel}>
                {weekDays[0].toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })} - {weekDays[6].toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              </span>
            </div>
          </div>

          {loading ? (
            <div className={styles.loadingSpinner}>Đang tải lịch giảng dạy...</div>
          ) : (
            /* Weekly View Grid */
            <div className={styles.weeklyGrid}>
              {weekDays.map((day, idx) => {
                const daySchedules = getSchedulesForDay(day);
                const isToday = new Date().toDateString() === day.toDateString();
                return (
                  <div key={idx} className={`${styles.dayColumn} ${isToday ? styles.todayColumn : ''}`}>
                    <div className={styles.dayHeader}>
                      <span className={styles.dayName}>{dayNames[idx]}</span>
                      <span className={`${styles.dayNumber} ${isToday ? styles.todayNumberBadge : ''}`}>
                        {day.getDate()}
                      </span>
                    </div>

                    <div className={styles.daySessionsList}>
                      {daySchedules.length === 0 ? (
                        <span className={styles.noSessionsLabel}>Không có ca dạy</span>
                      ) : (
                        daySchedules.map((sess, sIdx) => {
                          const isDone = sess.attendanceStatus === 'Đã điểm danh';
                          return (
                            <div 
                              key={sIdx} 
                              className={`${styles.sessionCard} ${isDone ? styles.cardDone : styles.cardTodo}`}
                              onClick={() => handleOpenSessionDetails(sess)}
                            >
                              <div className={styles.cardTime}>
                                {formatTime(sess.startTime)} - {formatTime(sess.endTime)}
                              </div>
                              <h5 className={styles.cardTitle}>{sess.title || sess.className || 'Môn học'}</h5>
                              <p className={styles.cardRoom}>Phòng: {sess.roomName || 'A02'}</p>
                              
                              <div className={styles.cardBottomRow}>
                                <span className={isDone ? styles.statusTextDone : styles.statusTextTodo}>
                                  {sess.attendanceStatus || 'Chưa điểm danh'}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      </main>

      {/* --- SESSION DETAILS MODAL --- */}
      {showModal && selectedSession && (
        <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h5>Chi tiết ca dạy</h5>
              <button className={styles.closeModalBtn} onClick={() => setShowModal(false)}>
                <span className="material-symbols-outlined notranslate" translate="no">close</span>
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.sessionOverviewBox}>
                <h4>{selectedSession.title || selectedSession.className}</h4>
                <p>Lớp học: <strong>{selectedSession.className}</strong></p>
                <p>Ngày dạy: <strong>{selectedSession.date}</strong></p>
                <p>Thời gian: <strong>{formatTime(selectedSession.startTime)} - {formatTime(selectedSession.endTime)}</strong></p>
                <p>Phòng học: <strong>{selectedSession.roomName || 'Chưa xếp phòng'}</strong></p>
                <p>Trạng thái: <strong>{selectedSession.attendanceStatus || 'Chưa điểm danh'}</strong></p>
              </div>

              <div className={styles.actionButtonsRow}>
                <button 
                  className={styles.modalSecondaryActionBtn}
                  onClick={() => {
                    setShowModal(false);
                    onNavigate(`teacher-session-detail?classId=${selectedSession.classId}&scheduleId=${selectedSession.id || selectedSession.scheduleId}&attendanceSessionId=${selectedSession.sessionInfo?.id || selectedSession.sessionInfo?.sessionId || ''}&tab=feedback&from=schedule`);
                  }}
                >
                  <span className="material-symbols-outlined notranslate" translate="no">rate_review</span> Đánh giá
                </button>
                <button 
                  className={styles.modalSecondaryActionBtn}
                  onClick={() => {
                    setShowModal(false);
                    onNavigate(`teacher-session-detail?classId=${selectedSession.classId}&scheduleId=${selectedSession.id || selectedSession.scheduleId}&attendanceSessionId=${selectedSession.sessionInfo?.id || selectedSession.sessionInfo?.sessionId || ''}&from=schedule`);
                  }}
                >
                  <span className="material-symbols-outlined notranslate" translate="no">menu_book</span> Chi tiết ca dạy
                </button>
                <button 
                  className={styles.modalPrimaryActionBtn}
                  onClick={() => {
                    setShowModal(false);
                    onNavigate(`teacher-attendance-method-selection?classId=${selectedSession.classId}&sessionId=${selectedSession.id || selectedSession.scheduleId}&from=schedule`);
                  }}
                >
                  <span className="material-symbols-outlined notranslate" translate="no">assignment_turned_in</span> Điểm danh lớp học
                </button>
              </div>

              <div className={styles.modalSectionTitle}>Học viên buổi học</div>
              <div className={styles.studentRecordsList}>
                {sessionRecords.length === 0 ? (
                  <p className={styles.emptyText}>Chưa có bản ghi điểm danh nào cho buổi này.</p>
                ) : (
                  sessionRecords.map((rec, idx) => (
                    <div key={idx} className={styles.studentRowItem}>
                      <span>Học viên: {rec.studentName || 'Đang tải...'}</span>
                      <span className={rec.status === 'PRESENT' ? styles.statusPresent : rec.status === 'LATE' ? styles.statusLate : styles.statusAbsent}>
                        {rec.status === 'PRESENT' ? 'Có mặt' : rec.status === 'LATE' ? 'Đi muộn' : 'Vắng mặt'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default TeacherSchedulePage;
