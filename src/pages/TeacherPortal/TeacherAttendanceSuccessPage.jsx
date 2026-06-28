import React from 'react';
import styles from './TeacherAttendanceSuccessPage.module.css';

const TeacherAttendanceSuccessPage = ({ onNavigate }) => {
  const urlParams = new URLSearchParams(window.location.search);
  const classId = urlParams.get('classId');
  const sessionId = urlParams.get('sessionId');
  const from = urlParams.get('from') || '';

  const reportData = JSON.parse(sessionStorage.getItem('tempReportData') || 'null');

  return (
    <div className={styles.classesRoot}>
                  <main className={styles.mainContent}>
        <div className={styles.container}>
          <div className={styles.reportCard}>
            <span className={`material-symbols-outlined notranslate ${styles.icon}`} translate="no">check_circle</span>
            <h2 className={styles.title}>Điểm danh thành công</h2>
            <p className={styles.subtitle}>
              Lớp {reportData?.className} • {reportData?.sessionDate} • {reportData?.time}
            </p>

            <div className={styles.statsGrid}>
              <div className={styles.statBox}>
                <span className={`${styles.statNum} ${styles.present}`}>{reportData?.presentCount || 0}</span>
                <span className={styles.statLabel}>Có mặt</span>
              </div>
              <div className={styles.statBox}>
                <span className={`${styles.statNum} ${styles.absent}`}>{reportData?.absentCount || 0}</span>
                <span className={styles.statLabel}>Vắng</span>
              </div>
              <div className={styles.statBox}>
                <span className={`${styles.statNum} ${styles.late}`}>{reportData?.lateCount || 0}</span>
                <span className={styles.statLabel}>Muộn</span>
              </div>
            </div>

            <button 
              className={styles.doneBtn} 
              onClick={() => {
                if (from === 'class-detail') {
                  onNavigate(`teacher-class-detail?classId=${classId}`);
                } else if (from === 'session-detail') {
                  onNavigate(`teacher-session-detail?classId=${classId}&scheduleId=${sessionId}`);
                } else {
                  onNavigate('teacher-schedule');
                }
              }}
            >
              Hoàn tất
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TeacherAttendanceSuccessPage;
