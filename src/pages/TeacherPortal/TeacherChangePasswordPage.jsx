import React, { useState } from 'react';
import styles from './TeacherChangePasswordPage.module.css';

const TeacherChangePasswordPage = ({ onNavigate }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Vui lòng điền đầy đủ các trường mật khẩu.');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('Mật khẩu mới phải có tối thiểu 6 ký tự.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Mật khẩu xác nhận không trùng khớp.');
      return;
    }

    // Call password update API (Mocked)
    setTimeout(() => {
      setPasswordSuccess('Đổi mật khẩu thành công!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }, 500);
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
            <h3 className={styles.pageTitle}>Đổi mật khẩu</h3>
            <p className={styles.pageSubtitle}>Cập nhật mật khẩu để bảo mật tài khoản của bạn.</p>
          </div>

          <div className={styles.contentCard}>
            <form onSubmit={handlePasswordSubmit} className={styles.passwordForm}>
              {passwordError && (
                <div className={styles.errorAlert}>
                  <span className="material-symbols-outlined notranslate" translate="no">error</span>
                  <span>{passwordError}</span>
                </div>
              )}
              {passwordSuccess && (
                <div className={styles.successAlert}>
                  <span className="material-symbols-outlined notranslate" translate="no">check_circle</span>
                  <span>{passwordSuccess}</span>
                </div>
              )}

              <div className={styles.formGroup}>
                <label>Mật khẩu hiện tại</label>
                <input 
                  type="password" 
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className={styles.inputField}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Mật khẩu mới</label>
                <input 
                  type="password" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Tối thiểu 6 ký tự..."
                  className={styles.inputField}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Xác nhận mật khẩu mới</label>
                <input 
                  type="password" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu mới..."
                  className={styles.inputField}
                />
              </div>

              <button type="submit" className={styles.submitBtn}>Cập nhật mật khẩu</button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TeacherChangePasswordPage;
