import React, { useState } from 'react';
import Card from '../../components/Card';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { LOGO_URL } from '../../constants';
import { authService } from '../../services/authService';
import styles from './RegisterPage.module.css';

const RegisterPage = ({ onNavigate }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    const form = e.target;
    
    const terms = form.terms.checked;
    if (!terms) {
      setErrorMsg('Vui lòng đồng ý với Điều khoản & Điều kiện');
      return;
    }

    const password = form.password.value;
    const confirm_password = form.confirm_password.value;
    if (password !== confirm_password) {
      setErrorMsg('Mật khẩu và Xác nhận mật khẩu không khớp.');
      return;
    }

    const payload = {
      username: form.email.value,
      email: form.email.value,
      password: password,
      name: form.center_name.value,
      hotline: form.phone.value,
      address: form.address.value,
    };

    setIsLoading(true);
    try {
      await authService.registerCenter(payload);
      setSuccessMsg('Tạo tài khoản trung tâm thành công! Hệ thống sẽ tự động chuyển đến trang Đăng nhập...');
      setTimeout(() => {
        onNavigate('login');
      }, 2000);
    } catch (error) {
      setErrorMsg(error.message || 'Đã có lỗi xảy ra trong quá trình đăng ký.');
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.registerLayout}>
      <Card>
        {/* Header Section */}
        <div className={styles.header}>
          <img src={LOGO_URL} alt="EduTrack Logo" className={styles.logo} />
          <h1 className={styles.title}>Đăng ký Trung tâm</h1>
          <p className={styles.subtitle}>Tạo tài khoản quản lý trung tâm trên EduTrack</p>
        </div>
        
        <form onSubmit={handleSubmit} className={styles.form}>
          {errorMsg && (
            <div className={styles.errorAlert}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>error</span>
              <span style={{ fontWeight: '500', textAlign: 'left' }}>{errorMsg}</span>
            </div>
          )}
          {successMsg && (
            <div className={styles.successAlert}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>check_circle</span>
              <span style={{ fontWeight: '500', textAlign: 'left' }}>{successMsg}</span>
            </div>
          )}
          {/* Two Column Form Layout */}
          <div className={styles.grid}>
            {/* Left Column */}
            <div className={styles.column}>
              <Input label="Tên trung tâm" id="center_name" name="center_name" icon="school" placeholder="Ví dụ: Anh ngữ EduTrack" autoComplete="organization" required />
              <Input label="Họ tên quản trị viên" id="admin_name" name="admin_name" icon="person" placeholder="Nguyễn Văn A" autoComplete="name" required />
              <Input label="Số điện thoại" id="phone" name="phone" type="tel" icon="call" placeholder="0123 456 789" autoComplete="tel" required />
              <Input label="Email" id="email" name="email" type="email" icon="mail" placeholder="admin@edutrack.com" autoComplete="email" required />
            </div>

            {/* Right Column */}
            <div className={styles.column}>
              <Input label="Mật khẩu" id="password" name="password" type="password" icon="lock" placeholder="••••••••" autoComplete="new-password" required />
              <Input label="Xác nhận mật khẩu" id="confirm_password" name="confirm_password" type="password" icon="lock_reset" placeholder="••••••••" autoComplete="new-password" required />
              <Input label="Địa chỉ trung tâm" id="address" name="address" icon="location_on" placeholder="123 Đường ABC, Quận X, TP. Y" autoComplete="street-address" required />
              <Input label="Mô tả trung tâm" id="description" name="description" multiline rows={3} placeholder="Giới thiệu ngắn về trung tâm..." />
            </div>
          </div>

          {/* Terms & Conditions */}
          <div className={styles.termsWrapper}>
            <input type="checkbox" id="terms" name="terms" className={styles.checkbox} />
            <label htmlFor="terms" className={styles.termsLabel}>
              Tôi đồng ý với <a href="#" className={styles.termsLink}>Điều khoản &amp; Điều kiện</a> của EduTrack
            </label>
          </div>

          {/* Action Buttons */}
          <div className={styles.actions}>
            <Button type="submit" variant="primary" isLoading={isLoading}>
              Tạo tài khoản Trung tâm
            </Button>
            <div className={styles.loginPrompt}>
              <p className={styles.promptText}>
                Đã có tài khoản?{' '}
                <button type="button" onClick={() => onNavigate('login')} className={styles.loginLink}>
                  Đăng nhập
                </button>
              </p>
            </div>
          </div>
        </form>

        {/* Aesthetic Footer Text */}
        <div className={styles.footerText}>
          <p>© 2024 EduTrack Platform. Bảo mật • Hiệu quả • Uy tín.</p>
        </div>
      </Card>
    </div>
  );
};

export default RegisterPage;
