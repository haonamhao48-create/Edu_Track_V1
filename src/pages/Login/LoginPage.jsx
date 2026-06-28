import React, { useEffect, useState } from 'react';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { LOGO_URL } from '../../constants';
import { authService } from '../../services/authService';
import styles from './LoginPage.module.css';

const ROLE_CONFIG = {
  Center: {
    label: 'Trung tâm',
    icon: 'school',
    inputLabel: 'Địa chỉ Email',
    inputType: 'email',
    inputIcon: 'mail',
    placeholder: 'admin@edutrack.com',
    submitLabel: 'Đăng nhập Trung tâm',
  },
  Teacher: {
    label: 'Giảng viên',
    icon: 'person',
    inputLabel: 'Địa chỉ Email',
    inputType: 'email',
    inputIcon: 'mail',
    placeholder: 'teacher@edutrack.com',
    submitLabel: 'Đăng nhập Giảng viên',
  },
  Admin: {
    label: 'Admin',
    icon: 'admin_panel_settings',
    inputLabel: 'Tên đăng nhập Admin',
    inputType: 'text',
    inputIcon: 'admin_panel_settings',
    placeholder: 'admin7007',
    submitLabel: 'Đăng nhập Quản trị',
  },
};

const getRoleHomePage = (role) => {
  if (role === 'Teacher') return 'teacher-dashboard';
  if (role === 'Admin') return 'admin-dashboard';
  return 'dashboard';
};

const getRoleMismatchMessage = (role) => {
  if (role === 'Teacher') return 'Tài khoản của bạn không phải tài khoản Giảng viên.';
  if (role === 'Admin') return 'Tài khoản của bạn không phải tài khoản Admin.';
  return 'Tài khoản của bạn không phải tài khoản Trung tâm.';
};

const LoginPage = ({ onNavigate }) => {
  const [activeRole, setActiveRole] = useState('Center');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const handleCredentialResponse = async (response) => {
      setErrorMsg('');
      setIsLoading(true);

      try {
        const res = await authService.loginByGoogle(response.credential);
        const role = res.data?.role;

        if (role !== activeRole) {
          setErrorMsg(getRoleMismatchMessage(activeRole));
          return;
        }

        localStorage.setItem('token', res.data?.token);
        localStorage.setItem('user', JSON.stringify(res.data));
        onNavigate(getRoleHomePage(role));
      } catch (error) {
        const msg = error.message || '';
        const lowerMsg = msg.toLowerCase();

        if (
          lowerMsg.includes('khoa') ||
          lowerMsg.includes('ngung hoat dong') ||
          lowerMsg.includes('inactive') ||
          lowerMsg.includes('blocked')
        ) {
          setErrorMsg('Tài khoản của bạn đã bị khóa hoặc ngừng hoạt động. Vui lòng liên hệ quản trị viên.');
        } else if (lowerMsg.includes('not found') || lowerMsg.includes('khong tim thay') || error.status === 404) {
          setErrorMsg('Email Google này chưa được đăng ký trên hệ thống. Vui lòng liên hệ quản trị viên.');
        } else {
          setErrorMsg(msg || 'Lỗi đăng nhập Google. Vui lòng thử lại.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    const initializeGoogle = () => {
      if (!window.google?.accounts?.id) return;

      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      if (!clientId || clientId.includes('your-google-client-id-here')) {
        console.warn('Google Client ID is not configured in .env file.');
        return;
      }

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleCredentialResponse,
      });

      const btnContainer = document.getElementById('google-signin-button');
      if (btnContainer) {
        const containerWidth = btnContainer.offsetWidth || 380;
        const buttonWidth = Math.min(Math.max(containerWidth, 200), 400);

        btnContainer.innerHTML = '';
        window.google.accounts.id.renderButton(btnContainer, {
          theme: 'outline',
          size: 'large',
          width: buttonWidth,
          text: 'signin_with',
        });
      }
    };

    let attempts = 0;
    const checkGoogleAndInit = () => {
      if (window.google?.accounts?.id) {
        initializeGoogle();
      } else if (attempts < 10) {
        attempts += 1;
        setTimeout(checkGoogleAndInit, 300);
      }
    };

    checkGoogleAndInit();
  }, [activeRole, onNavigate]);

  const handleRoleChange = (role) => {
    setActiveRole(role);
    setErrorMsg('');
    setUsername('');
    setPassword('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMsg('');

    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      setErrorMsg(activeRole === 'Admin' ? 'Vui lòng nhập tên đăng nhập Admin.' : 'Vui lòng nhập địa chỉ Email.');
      return;
    }

    if (activeRole !== 'Admin') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedUsername)) {
        setErrorMsg('Email không đúng định dạng, ví dụ: admin@edutrack.com.');
        return;
      }
    }

    if (!password) {
      setErrorMsg('Vui lòng nhập mật khẩu.');
      return;
    }

    setIsLoading(true);

    try {
      const data = await authService.login(trimmedUsername, password);
      const role = data.data?.role;

      if (role !== activeRole) {
        setErrorMsg(getRoleMismatchMessage(activeRole));
        return;
      }

      localStorage.setItem('token', data.data?.token);
      localStorage.setItem('user', JSON.stringify(data.data));
      onNavigate(getRoleHomePage(role));
    } catch (error) {
      const msg = error.message || '';
      const lowerMsg = msg.toLowerCase();

      if (
        lowerMsg.includes('khoa') ||
        lowerMsg.includes('ngung hoat dong') ||
        lowerMsg.includes('inactive') ||
        lowerMsg.includes('blocked')
      ) {
        setErrorMsg('Tài khoản của bạn đã bị khóa hoặc ngừng hoạt động. Vui lòng liên hệ quản trị viên.');
      } else if (
        lowerMsg.includes('phien dang nhap het han') ||
        lowerMsg.includes('khong co quyen truy cap') ||
        lowerMsg.includes('unauthorized') ||
        lowerMsg.includes('invalid') ||
        lowerMsg.includes('khong chinh xac') ||
        error.status === 401
      ) {
        setErrorMsg(activeRole === 'Admin' ? 'Tên đăng nhập hoặc mật khẩu không chính xác.' : 'Email hoặc mật khẩu không chính xác.');
      } else {
        setErrorMsg(msg || 'Không thể kết nối đến máy chủ. Vui lòng thử lại sau.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const config = ROLE_CONFIG[activeRole];

  return (
    <div className={styles.pageContainer}>
      <div className={styles.loginCard}>
        <div className={styles.leftPanel}>
          <div className={styles.leftHeader}>
            <div className={styles.brandLogo}>
              <img src={LOGO_URL} alt="EduTrack Logo" />
              <span>EduTrack</span>
            </div>
          </div>

          <div className={styles.leftBody}>
            <h1 className={styles.brandingTitle}>
              Nền tảng quản lý học tập <em>tối ưu</em> cho trung tâm giáo dục.
            </h1>
            <p className={styles.brandingDesc}>
              Vận hành trơn tru từ điểm danh tự động, lên lịch giảng dạy cho đến hóa đơn học phí và kết nối học viên.
            </p>

            <div className={styles.featureList}>
              <div className={styles.featureItem}>
                <span className="material-symbols-outlined notranslate" translate="no">qr_code_scanner</span>
                <div className={styles.featureText}>
                  <h6>Điểm danh thông minh</h6>
                  <p>Hỗ trợ quét mã QR nhanh gọn và tự động lưu sổ chuyên cần.</p>
                </div>
              </div>

              <div className={styles.featureItem}>
                <span className="material-symbols-outlined notranslate" translate="no">payments</span>
                <div className={styles.featureText}>
                  <h6>Hóa đơn và học phí</h6>
                  <p>Tự động hóa chu kỳ học phí và theo dõi trạng thái biên lai.</p>
                </div>
              </div>

              <div className={styles.featureItem}>
                <span className="material-symbols-outlined notranslate" translate="no">diversity_3</span>
                <div className={styles.featureText}>
                  <h6>Cổng thông tin Giáo viên và Phụ huynh</h6>
                  <p>Tương tác hai chiều tức thì, gửi phản hồi và báo cáo học tập.</p>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.leftFooter}>
            <p>© 2026 EduTrack Platform. Đồng hành cùng giáo dục số.</p>
          </div>
        </div>

        <div className={styles.rightPanel}>
          <div className={styles.rightHeader}>
            <h2 className={styles.title}>Chào mừng trở lại</h2>
            <p className={styles.subtitle}>Chọn tài khoản phù hợp để truy cập hệ thống</p>
          </div>

          <div className={styles.roleTabs}>
            {Object.keys(ROLE_CONFIG).map((roleKey) => (
              <button
                key={roleKey}
                type="button"
                className={`${styles.tabBtn} ${activeRole === roleKey ? styles.activeTab : ''}`}
                onClick={() => handleRoleChange(roleKey)}
              >
                <span className="material-symbols-outlined notranslate" translate="no">{ROLE_CONFIG[roleKey].icon}</span>
                <span>{ROLE_CONFIG[roleKey].label}</span>
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            {errorMsg && (
              <div className={styles.errorContainer}>
                <span className="material-symbols-outlined notranslate" translate="no">error</span>
                <span>{errorMsg}</span>
              </div>
            )}

            <Input
              label={config.inputLabel}
              id="email"
              type={config.inputType}
              icon={config.inputIcon}
              placeholder={config.placeholder}
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
            />

            <Input
              label="Mật khẩu"
              id="password"
              type="password"
              icon="lock"
              placeholder="........"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              forgotPasswordLink={() => onNavigate('forgot-password')}
              required
            />

            <div className={styles.formActions}>
              <div className={styles.rememberMe}>
                <input type="checkbox" id="remember" className={styles.checkbox} />
                <label htmlFor="remember" className={styles.checkboxLabel}>Ghi nhớ đăng nhập</label>
              </div>
            </div>

            <Button type="submit" variant="primary" isLoading={isLoading}>
              {config.submitLabel}
            </Button>
          </form>

          <div className={styles.dividerWrapper}>
            <div className={styles.dividerLine} />
            <span className={styles.dividerText}>HOẶC ĐĂNG NHẬP NHANH</span>
            <div className={styles.dividerLine} />
          </div>

          <div id="google-signin-button" className={styles.googleBtnContainer}></div>

          {activeRole === 'Center' && (
            <p className={styles.footerText}>
              Chưa có tài khoản?{' '}
              <a href="#" onClick={(event) => { event.preventDefault(); onNavigate('register'); }} className={styles.footerLink}>
                Đăng ký trung tâm
              </a>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
