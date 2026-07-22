import React, { useState } from 'react';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { LOGO_URL } from '../../constants';
import { authService } from '../../services/authService';
import styles from './AdminLoginPage.module.css';

const AdminLoginPage = ({ onNavigate }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const trimmedUsername = username.trim();

    // Client-side validations
    if (!trimmedUsername) {
      setErrorMsg('Vui lòng nhập tên đăng nhập Admin.');
      return;
    }

    if (!password) {
      setErrorMsg('Vui lòng nhập mật khẩu.');
      return;
    }

    setIsLoading(true);

    try {
      const data = await authService.login(trimmedUsername, password);
      const role = data.data?.role;
      
      if (role !== 'Admin') {
        setErrorMsg('Tài khoản của bạn không có quyền Admin. Chỉ tài khoản Quản trị hệ thống mới được phép truy cập trang này.');
        setIsLoading(false);
        return;
      }
      
      // Save token and user info to localStorage
      localStorage.setItem('token', data.data?.token);
      localStorage.setItem('user', JSON.stringify(data.data));

      console.log('Admin login successful:', data);
      onNavigate('admin-dashboard');
    } catch (error) {
      console.error('Admin login error:', error);
      const msg = error.message || '';
      if (
        msg.includes('Phiên đăng nhập hết hạn') || 
        msg.includes('không có quyền truy cập') || 
        msg.includes('Unauthorized') || 
        msg.includes('invalid') || 
        msg.includes('không chính xác')
      ) {
        setErrorMsg('Tài khoản hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại.');
      } else {
        setErrorMsg(msg || 'Không thể kết nối đến máy chủ. Vui lòng thử lại sau.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.loginCard}>
        {/* Left Panel - Admin Portal Branding */}
        <div className={styles.leftPanel}>
          <div className={styles.leftHeader}>
            <div className={styles.brandLogo}>
              <img src={LOGO_URL} alt="EduTrack Logo" />
              <span>EduTrack</span>
            </div>
          </div>
          
          <div className={styles.leftBody}>
            <div className={styles.badge}>HỆ THỐNG QUẢN TRỊ</div>
            <h1 className={styles.brandingTitle}>
              Bảng điều khiển <em>Admin</em> tối cao.
            </h1>
            <p className={styles.brandingDesc}>
              Quản lý toàn diện các trung tâm giáo dục, kiểm soát tài khoản phụ huynh và giám sát toàn bộ hoạt động hệ thống EduTrack.
            </p>
            
            <div className={styles.featureList}>
              <div className={styles.featureItem}>
                <span className="material-symbols-outlined notranslate" translate="no">domain</span>
                <div className={styles.featureText}>
                  <h6>Quản lý trung tâm</h6>
                  <p>Kích hoạt, khóa hoạt động hoặc phê duyệt trung tâm tham gia hệ thống.</p>
                </div>
              </div>
              
              <div className={styles.featureItem}>
                <span className="material-symbols-outlined notranslate" translate="no">supervisor_account</span>
                <div className={styles.featureText}>
                  <h6>Quản trị người dùng</h6>
                  <p>Giám sát thông tin, cập nhật trạng thái hoạt động của phụ huynh toàn hệ thống.</p>
                </div>
              </div>
              
              <div className={styles.featureItem}>
                <span className="material-symbols-outlined notranslate" translate="no">monitoring</span>
                <div className={styles.featureText}>
                  <h6>Giám sát hệ thống</h6>
                  <p>Báo cáo tổng quan hoạt động và thống kê số liệu thực tế.</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className={styles.leftFooter}>
            <p>© 2026 EduTrack Admin Portal. Quyền lực & Bảo mật tuyệt đối.</p>
          </div>
        </div>

        {/* Right Panel - Login Form */}
        <div className={styles.rightPanel}>
          <div className={styles.rightHeader}>
            <h2 className={styles.title}>Đăng nhập Admin</h2>
            <p className={styles.subtitle}>Dành cho Quản trị viên hệ thống EduTrack</p>
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            {errorMsg && (
              <div className={styles.errorContainer}>
                <span className="material-symbols-outlined notranslate" translate="no">error</span>
                <span>{errorMsg}</span>
              </div>
            )}
            
            <Input
              label="Tên đăng nhập Admin"
              id="admin-email"
              type="text"
              icon="admin_panel_settings"
              placeholder="admin7007"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            
            <Input
              label="Mật khẩu"
              id="admin-password"
              type="password"
              icon="lock"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <Button type="submit" variant="primary" isLoading={isLoading}>
              Đăng nhập hệ thống
            </Button>
          </form>

          {/* Simple return link */}
          <div className={styles.backToPortal} style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            <a href="#" onClick={(e) => { e.preventDefault(); onNavigate('landing'); }}>
              <span className="material-symbols-outlined notranslate" translate="no">home</span>
              Trang chủ
            </a>
            <a href="#" onClick={(e) => { e.preventDefault(); onNavigate('login'); }}>
              <span className="material-symbols-outlined notranslate" translate="no">arrow_back</span>
              Cổng người dùng
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLoginPage;
