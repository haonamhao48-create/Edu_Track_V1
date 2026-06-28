import React, { useState } from 'react';
import styles from './TeacherNotificationSettingsPage.module.css';

const TeacherNotificationSettingsPage = ({ onNavigate }) => {
  const [notiSettings, setNotiSettings] = useState({
    scheduleAlert: true,
    attendanceAlert: true,
    chatAlert: true,
    emailAlert: false
  });

  const handleToggleNoti = (key) => {
    setNotiSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <div className={styles.pageRoot}>
                  <main className={styles.mainContent}>
        <div className={styles.container}>
          <button className={styles.backBtn} onClick={() => onNavigate('teacher-profile')}>
            <span className="material-symbols-outlined notranslate" translate="no">arrow_back</span>
            Quay lại
          </button>

          <div className={styles.pageHeader}>
            <h3 className={styles.pageTitle}>Cài đặt thông báo</h3>
            <p className={styles.pageSubtitle}>Tùy chỉnh các sự kiện hệ thống sẽ gửi thông báo đến bạn.</p>
          </div>

          <div className={styles.contentCard}>
            <div className={styles.togglesList}>
              <div className={styles.toggleRow}>
                <div className={styles.toggleText}>
                  <h6>Nhắc nhở lịch giảng dạy</h6>
                  <p>Thông báo trước ca dạy 30 phút để chuẩn bị giáo án.</p>
                </div>
                <button 
                  type="button" 
                  onClick={() => handleToggleNoti('scheduleAlert')}
                  className={`${styles.toggleSwitch} ${notiSettings.scheduleAlert ? styles.switchActive : ''}`}
                >
                  <span className={styles.switchHandle}></span>
                </button>
              </div>

              <div className={styles.toggleRow}>
                <div className={styles.toggleText}>
                  <h6>Nhắc lịch điểm danh</h6>
                  <p>Thông báo khi buổi học kết thúc mà chưa cập nhật điểm danh.</p>
                </div>
                <button 
                  type="button" 
                  onClick={() => handleToggleNoti('attendanceAlert')}
                  className={`${styles.toggleSwitch} ${notiSettings.attendanceAlert ? styles.switchActive : ''}`}
                >
                  <span className={styles.switchHandle}></span>
                </button>
              </div>

              <div className={styles.toggleRow}>
                <div className={styles.toggleText}>
                  <h6>Tin nhắn từ phụ huynh</h6>
                  <p>Nhận thông báo ngay lập tức khi phụ huynh gửi tin nhắn mới.</p>
                </div>
                <button 
                  type="button" 
                  onClick={() => handleToggleNoti('chatAlert')}
                  className={`${styles.toggleSwitch} ${notiSettings.chatAlert ? styles.switchActive : ''}`}
                >
                  <span className={styles.switchHandle}></span>
                </button>
              </div>

              <div className={styles.toggleRow}>
                <div className={styles.toggleText}>
                  <h6>Thông báo qua Email</h6>
                  <p>Gửi bản tóm tắt công việc và báo cáo ngày đến email cá nhân.</p>
                </div>
                <button 
                  type="button" 
                  onClick={() => handleToggleNoti('emailAlert')}
                  className={`${styles.toggleSwitch} ${notiSettings.emailAlert ? styles.switchActive : ''}`}
                >
                  <span className={styles.switchHandle}></span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TeacherNotificationSettingsPage;
