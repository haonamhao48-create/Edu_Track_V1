import React from 'react';
import styles from './TeacherProfilePage.module.css';

const TeacherProfilePage = ({ onNavigate }) => {
  return (
    <div className={styles.profileRoot}>
            
      <main className={styles.mainContent}>
        <div className={styles.container}>
          <div className={styles.pageHeader}>
            <h3 className={styles.pageTitle}>Tài khoản giáo viên</h3>
            <p className={styles.pageSubtitle}>Quản lý thông tin hồ sơ cá nhân và cấu hình tài khoản của bạn.</p>
          </div>

          <div className={styles.menuGrid}>
            <button className={styles.menuItem} onClick={() => onNavigate('teacher-account')}>
              <span className="material-symbols-outlined notranslate" translate="no">person</span>
              <div className={styles.menuText}>
                <h4>Hồ sơ cá nhân</h4>
                <p>Xem thông tin cá nhân và liên hệ</p>
              </div>
              <span className="material-symbols-outlined notranslate" translate="no">chevron_right</span>
            </button>
            
            <button className={styles.menuItem} onClick={() => onNavigate('teacher-change-password')}>
              <span className="material-symbols-outlined notranslate" translate="no">lock</span>
              <div className={styles.menuText}>
                <h4>Đổi mật khẩu</h4>
                <p>Cập nhật mật khẩu bảo mật tài khoản</p>
              </div>
              <span className="material-symbols-outlined notranslate" translate="no">chevron_right</span>
            </button>
            
            <button className={styles.menuItem} onClick={() => onNavigate('teacher-notifications')}>
              <span className="material-symbols-outlined notranslate" translate="no">notifications</span>
              <div className={styles.menuText}>
                <h4>Cài đặt thông báo</h4>
                <p>Tùy chỉnh thông báo đẩy và email</p>
              </div>
              <span className="material-symbols-outlined notranslate" translate="no">chevron_right</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TeacherProfilePage;
