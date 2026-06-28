import React from 'react';
import { scheduleService } from '../../services/scheduleService';
import { attendanceService } from '../../services/attendanceService';
import { toast } from 'react-hot-toast';
import styles from './TeacherAttendanceMethodSelectionPage.module.css';

const TeacherAttendanceMethodSelectionPage = ({ onNavigate }) => {
  const urlParams = new URLSearchParams(window.location.search);
  const classId = urlParams.get('classId');
  const scheduleId = urlParams.get('sessionId'); // The URL passes scheduleId as "sessionId"
  const from = urlParams.get('from') || '';

  const handleSelectMethod = async (method) => {
    if (!classId || !scheduleId) {
      toast.error('Thiếu thông tin lớp học hoặc lịch học.');
      return;
    }

    try {
      const toastId = toast.loading('Đang khởi tạo buổi điểm danh...');
      
      // 1. Get schedule info
      const schedRes = await scheduleService.getScheduleById(scheduleId);
      const sched = schedRes?.data || schedRes;

      // 2. Check if a session already exists for this date and class
      const sessRes = await attendanceService.getSessionsByClass(classId);
      const sessions = Array.isArray(sessRes) ? sessRes : (sessRes?.data || []);
      
      let activeSession = sessions.find(s => 
        s.status === 'OPEN' && 
        s.sessionDate === sched.date
      );

      // 3. Create a new session if none exists
      if (!activeSession) {
        let teacherId = localStorage.getItem('teacher_id');
        if (!teacherId) {
           try {
             const userObj = JSON.parse(localStorage.getItem('user'));
             teacherId = userObj?.teacherId || userObj?.id;
           } catch (e) {}
        }

        const createRes = await attendanceService.createSession({
          classId: classId,
          teacherId: teacherId,
          sessionDate: sched.date,
          startTime: sched.startTime,
          endTime: sched.endTime
        });
        activeSession = createRes?.data || createRes;
      }

      toast.dismiss(toastId);
      const realSessionId = activeSession?.id || activeSession?.sessionId;

      if (!realSessionId) {
         toast.error('Lỗi khi lấy ID buổi điểm danh.');
         return;
      }

      if (method === 'manual') {
        onNavigate(`teacher-manual-attendance?classId=${classId}&sessionId=${realSessionId}&from=${from}`);
      } else {
        onNavigate(`teacher-qr-attendance?classId=${classId}&sessionId=${realSessionId}&from=${from}`);
      }
    } catch (err) {
      console.error(err);
      toast.dismiss();
      toast.error('Không thể khởi tạo buổi điểm danh. Kiểm tra kết nối mạng.');
    }
  };

  return (
    <div className={styles.classesRoot}>
                  <main className={styles.mainContent}>
        <div className={styles.container}>
          <div className={styles.header}>
            <button 
              className={styles.backBtn} 
              onClick={() => {
                if (from === 'class-detail') {
                  onNavigate(`teacher-class-detail?classId=${classId}`);
                } else if (from === 'session-detail') {
                  onNavigate(`teacher-session-detail?classId=${classId}&scheduleId=${scheduleId}`);
                } else {
                  onNavigate('teacher-schedule');
                }
              }}
            >
              <span className="material-symbols-outlined notranslate" translate="no">arrow_back</span>
              Quay lại
            </button>
            <h2 style={{ marginLeft: '16px' }}>Chọn phương thức điểm danh</h2>
          </div>
          
          <div className={styles.content}>
            <div className={styles.methodCard} onClick={() => handleSelectMethod('manual')}>
              <div className={styles.iconWrapper}>
                <span className="material-symbols-outlined notranslate" translate="no">checklist</span>
              </div>
              <h3>Điểm danh thủ công</h3>
              <p>Tích chọn trực tiếp trạng thái Có mặt, Vắng mặt, Đi muộn cho từng học sinh trong danh sách.</p>
            </div>
            
            <div className={styles.methodCard} onClick={() => handleSelectMethod('qr')}>
              <div className={styles.iconWrapper}>
                <span className="material-symbols-outlined notranslate" translate="no">qr_code_scanner</span>
              </div>
              <h3>Điểm danh bằng mã QR</h3>
              <p>Tạo mã QR để học sinh tự quét và điểm danh bằng ứng dụng trên điện thoại cá nhân.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TeacherAttendanceMethodSelectionPage;
