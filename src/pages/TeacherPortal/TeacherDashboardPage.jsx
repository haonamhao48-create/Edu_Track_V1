import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { teacherService } from '../../services/teacherService';
import { scheduleService } from '../../services/scheduleService';
import { classService } from '../../services/classService';
import { chatService } from '../../services/chatService';
import styles from './TeacherDashboardPage.module.css';

const TeacherDashboardPage = ({ onNavigate }) => {
  const [profile, setProfile] = useState(null);
  const [todaySchedules, setTodaySchedules] = useState([]);
  const [classCount, setClassCount] = useState(0);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [pendingAttendance, setPendingAttendance] = useState(0);
  const [loading, setLoading] = useState(true);

  // Suggested students needing feedback
  const [suggestedStudents, setSuggestedStudents] = useState([
    { id: 'S001', name: 'Nguyễn Văn Anh', className: 'Toán nâng cao 8A', avatar: '' },
    { id: 'S002', name: 'Trần Thị Bình', className: 'Toán nâng cao 8A', avatar: '' },
    { id: 'S003', name: 'Lê Hoàng Minh', className: 'Hình học 8B', avatar: '' }
  ]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const userObj = (() => {
          try {
            return JSON.parse(localStorage.getItem('user')) || {};
          } catch (_) {
            return {};
          }
        })();
        const myUserId = (userObj?.userId || userObj?.id || userObj?.teacherId || '').toString();
        
        // Parallelize all 4 API calls for faster initial load, catching individual failures
        const [profRes, schedRes, classRes, chatRes] = await Promise.all([
          teacherService.getProfileMe().catch(e => { console.warn('Lỗi gọi API Profile:', e); return null; }),
          scheduleService.getSchedules(todayStr, todayStr).catch(e => { console.warn('Lỗi gọi API Schedules:', e); return null; }),
          classService.getMyClasses().catch(e => { console.error('Lỗi gọi API Classes:', e); return null; }),
          chatService.getRooms(myUserId).catch(e => { console.warn('Lỗi gọi API Chat Rooms:', e); return null; }),
        ]);

        // 1. Process teacher profile
        const profData = profRes?.data || profRes;
        setProfile(profData);
        if (profData?.id || profData?.teacherId) {
          localStorage.setItem('teacher_id', (profData?.id || profData?.teacherId).toString());
        }
        if (profData?.imageUrl || profData?.avatar) {
          localStorage.setItem('teacher_avatar', profData?.imageUrl || profData?.avatar);
        }

        // 2. Process today's schedules
        const schedList = Array.isArray(schedRes) ? schedRes : (schedRes?.data || []);
        setTodaySchedules(schedList);

        // Calculate pending attendance
        let pending = 0;
        for (let i = 0; i < schedList.length; i++) {
          if (schedList[i].attendanceStatus === 'Chưa điểm danh' || !schedList[i].attendanceStatus) {
            pending++;
          }
        }
        setPendingAttendance(pending);

        // 3. Process classes count
        const classList = Array.isArray(classRes) ? classRes : (classRes?.data || []);
        setClassCount(classList.length);

        // 4. Process chat rooms for unread message count
        const chatRooms = Array.isArray(chatRes) ? chatRes : (chatRes?.data || []);
        let unread = 0;
        for (let i = 0; i < chatRooms.length; i++) {
          unread += Number(chatRooms[i].unreadCount || 0);
        }
        setUnreadChatCount(unread);

      } catch (err) {
        console.error('Error fetching teacher dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const formatTime = useCallback((timeVal) => {
    if (!timeVal) return '00:00';
    if (typeof timeVal === 'object') {
      const h = String(timeVal.hour || 0).padStart(2, '0');
      const m = String(timeVal.minute || 0).padStart(2, '0');
      return `${h}:${m}`;
    }
    const timeStr = String(timeVal);
    if (timeStr.includes('T')) {
      try {
        const dt = new Date(timeStr);
        return `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
      } catch (_) {}
    }
    if (timeStr.includes(':')) {
      const parts = timeStr.split(':');
      if (parts.length >= 2) {
        return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
      }
    }
    return timeStr;
  }, []);

  const getStatusLabel = useCallback((schedule) => {
    try {
      const datePart = new Date(schedule.date);
      const today = new Date();
      const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const scheduleDate = new Date(datePart.getFullYear(), datePart.getMonth(), datePart.getDate());

      if (scheduleDate < todayDate) return { text: 'Đã hoàn thành', class: styles.statusCompleted };
      if (scheduleDate > todayDate) return { text: 'Sắp diễn ra', class: styles.statusUpcoming };

      const startTimeStr = formatTime(schedule.startTime);
      const endTimeStr = formatTime(schedule.endTime);

      const now = new Date();
      const nowMinutes = now.getHours() * 60 + now.getMinutes();

      const startParts = startTimeStr.split(':');
      const endParts = endTimeStr.split(':');
      const startMinutes = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
      const endMinutes = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);

      if (nowMinutes < startMinutes) return { text: 'Sắp diễn ra', class: styles.statusUpcoming };
      if (nowMinutes >= startMinutes && nowMinutes <= endMinutes) return { text: 'Đang diễn ra', class: styles.statusOngoing };
      return { text: 'Đã hoàn thành', class: styles.statusCompleted };
    } catch (_) {
      return { text: 'Sắp diễn ra', class: styles.statusUpcoming };
    }
  }, [formatTime]);

  return (
    <div className={styles.dashboardRoot}>
            
      <main className={styles.mainContent}>
        <div className={styles.container}>
          {/* Welcome Banner */}
          <section className={styles.welcomeSection}>
            <div className={styles.welcomeText}>
              <h3 className={styles.welcomeTitle}>
                {loading ? 'Đang tải...' : `Xin chào, ${profile?.fullName || 'Giáo viên'}!`}
              </h3>
              <p className={styles.welcomeSubtitle}>
                {profile?.centerName || 'Học viện EduTrack'} • {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}
              </p>
            </div>
            <div className={styles.quickActions}>
              <button className={`${styles.actionBtn} ${styles.btnPrimary}`} onClick={() => onNavigate('teacher-classes')}>
                <span className="material-symbols-outlined notranslate" translate="no">school</span> Lớp học của tôi
              </button>
              <button className={`${styles.actionBtn} ${styles.btnOutline}`} onClick={() => onNavigate('teacher-schedule')}>
                <span className="material-symbols-outlined notranslate" translate="no">calendar_month</span> Lịch giảng dạy tuần
              </button>
            </div>
          </section>

          {/* Stats Bento Grid */}
          <section className={styles.statsGrid}>
            <div className={`${styles.statCard} ${styles.blueCard}`}>
              <div className={styles.statHeader}>
                <span className="material-symbols-outlined notranslate" translate="no">calendar_today</span>
                <span className={styles.cardBadge}>Hôm nay</span>
              </div>
              <div className={styles.statBody}>
                <h2>{todaySchedules.length}</h2>
                <p>buổi dạy hôm nay</p>
              </div>
            </div>

            <div className={`${styles.statCard} ${styles.redCard}`}>
              <div className={styles.statHeader}>
                <span className="material-symbols-outlined notranslate" translate="no">assignment_turned_in</span>
              </div>
              <div className={styles.statBody}>
                <h2>{pendingAttendance}</h2>
                <p>buổi chưa điểm danh</p>
              </div>
            </div>

            <div className={`${styles.statCard} ${styles.yellowCard}`}>
              <div className={styles.statHeader}>
                <span className="material-symbols-outlined notranslate" translate="no">local_library</span>
              </div>
              <div className={styles.statBody}>
                <h2>{classCount}</h2>
                <p>lớp học phụ trách</p>
              </div>
            </div>

            <div className={`${styles.statCard} ${styles.greenCard}`}>
              <div className={styles.statHeader}>
                <span className="material-symbols-outlined notranslate" translate="no">forum</span>
              </div>
              <div className={styles.statBody}>
                <h2>{unreadChatCount}</h2>
                <p>tin nhắn chưa đọc</p>
              </div>
            </div>
          </section>

          {/* Schedule & Alerts split grid */}
          <div className={styles.splitGrid}>
            {/* Left side: Today's Schedule */}
            <div className={styles.panelCard}>
              <div className={styles.panelHeader}>
                <h4 className={styles.panelTitle}>Lịch dạy hôm nay</h4>
                <span className={styles.panelSubtitle}>{todaySchedules.length} buổi học</span>
              </div>
              <div className={styles.panelBody}>
                {loading ? (
                  <div className={styles.loadingSpinner}>Đang tải dữ liệu...</div>
                ) : todaySchedules.length === 0 ? (
                  <div className={styles.emptyState}>
                    <span className="material-symbols-outlined notranslate" translate="no">event_busy</span>
                    <p>Không có lịch dạy hôm nay</p>
                  </div>
                ) : (
                  <div className={styles.scheduleList}>
                    {todaySchedules.map((item, idx) => {
                      const status = getStatusLabel(item);
                      const isNotChecked = item.attendanceStatus === 'Chưa điểm danh' || !item.attendanceStatus;
                      return (
                        <div key={idx} className={styles.scheduleItem}>
                          <div className={styles.schedTimeBox}>
                            <span className={styles.schedTimeText}>
                              {formatTime(item.startTime)} - {formatTime(item.endTime)}
                            </span>
                            <span className={`${styles.statusBadge} ${status.class}`}>
                              {status.text}
                            </span>
                          </div>
                          <div className={styles.schedContent}>
                            <h5 className={styles.schedTitle}>{item.title || item.className || 'Môn học'}</h5>
                            <p className={styles.classInfo}>
                              Lớp: {item.className} • Phòng {item.roomName || 'Chưa xếp'} • {item.studentCounts || item.studentCount || 0} học sinh
                            </p>
                          </div>
                          <div className={styles.schedActions}>
                            {isNotChecked ? (
                              <button 
                                className={styles.quickAttendanceBtn}
                                onClick={() => onNavigate(`teacher-classes?classId=${item.classId}&scheduleId=${item.id || item.scheduleId}&action=attendance`)}
                              >
                                Điểm danh
                              </button>
                            ) : (
                              <span className={styles.completedCheck}>
                                <span className="material-symbols-outlined notranslate" translate="no">check_circle</span> Đã điểm danh
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right side: Needs feedback & Quick message preview */}
            <div className={styles.rightColumn}>
              {/* Needs Feedback Panel */}
              <div className={styles.panelCard}>
                <div className={styles.panelHeader}>
                  <h4 className={styles.panelTitle}>Cần nhận xét học tập</h4>
                  <span className={styles.panelSubtitle}>Học sinh cần đánh giá định kỳ</span>
                </div>
                <div className={styles.panelBody}>
                  <div className={styles.studentFeedbackList}>
                    {suggestedStudents.map((std, idx) => (
                      <div key={idx} className={styles.studentFeedbackItem}>
                        <div className={styles.studentAvatarCircle}>
                          {std.name.charAt(0)}
                        </div>
                        <div className={styles.studentInfo}>
                          <h6>{std.name}</h6>
                          <p>{std.className}</p>
                        </div>
                        <button 
                          className={styles.feedbackActionBtn}
                          onClick={() => onNavigate(`teacher-classes?classId=${std.classId || ''}&studentId=${std.id}&action=feedback`)}
                        >
                          Nhận xét
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Chat Message Alert */}
              <div className={styles.chatAlertCard} onClick={() => onNavigate('teacher-chat')}>
                <div className={styles.chatAlertHeader}>
                  <span className="material-symbols-outlined notranslate" translate="no">chat_bubble</span>
                  <h5>Trò chuyện phụ huynh</h5>
                </div>
                <p>Bạn có {unreadChatCount} tin nhắn mới chưa đọc từ phụ huynh học sinh. Nhấp để trả lời ngay.</p>
                <div className={styles.chatAlertFooter}>
                  <span>Mở giao diện chat</span>
                  <span className="material-symbols-outlined notranslate" translate="no">arrow_forward</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

export default TeacherDashboardPage;
