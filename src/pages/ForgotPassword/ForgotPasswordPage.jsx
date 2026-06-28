import React, { useState } from 'react';
import Card from '../../components/Card';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { LOGO_URL } from '../../constants';
import { authService } from '../../services/authService';
import styles from './ForgotPasswordPage.module.css';

const ForgotPasswordPage = ({ onNavigate }) => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [resetToken, setResetToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Step 1: Request OTP via email
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!email) {
      setErrorMsg('Vui lòng nhập địa chỉ Email.');
      return;
    }
    
    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      await authService.forgotPassword(email);
      setSuccessMsg('Mã OTP đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư.');
      setTimeout(() => {
        setStep(2);
        setSuccessMsg('');
      }, 1500);
    } catch (err) {
      console.error('Request OTP error:', err);
      setErrorMsg(err.data?.message || err.message || 'Có lỗi xảy ra khi gửi yêu cầu. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify OTP code
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otpCode) {
      setErrorMsg('Vui lòng nhập mã OTP.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await authService.verifyOtp(email, otpCode);
      // Safe check for both camelCase and PascalCase properties
      const token = res?.resetToken || res?.ResetToken || res?.data?.resetToken || res?.data?.ResetToken;
      
      if (!token) {
        throw new Error('Không nhận được token đặt lại mật khẩu từ hệ thống.');
      }
      
      setResetToken(token);
      setSuccessMsg('Xác thực OTP thành công. Vui lòng nhập mật khẩu mới.');
      setTimeout(() => {
        setStep(3);
        setSuccessMsg('');
      }, 1500);
    } catch (err) {
      console.error('Verify OTP error:', err);
      setErrorMsg(err.data?.message || err.message || 'Mã OTP không chính xác hoặc đã hết hạn.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Reset password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!password || !confirmPassword) {
      setErrorMsg('Vui lòng điền đầy đủ thông tin mật khẩu.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Mật khẩu và xác nhận mật khẩu không khớp.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      await authService.resetPassword(resetToken, password);
      setSuccessMsg('Đặt lại mật khẩu thành công! Hệ thống sẽ tự động chuyển về trang Đăng nhập...');
      setTimeout(() => {
        onNavigate('login');
      }, 2000);
    } catch (err) {
      console.error('Reset password error:', err);
      setErrorMsg(err.data?.message || err.message || 'Đặt lại mật khẩu thất bại. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  const getStepClass = (stepNum) => {
    if (step === stepNum) return styles.stepActive;
    if (step > stepNum) return styles.stepCompleted;
    return '';
  };

  return (
    <main className="main-layout">
      {/* Logo Section */}
      <div className={styles.logoWrapper}>
        <img src={LOGO_URL} alt="EduTrack Logo" className={styles.logo} />
      </div>

      <Card>
        <header className={styles.header}>
          <h1 className={styles.title}>
            {step === 1 && 'Quên mật khẩu'}
            {step === 2 && 'Xác minh OTP'}
            {step === 3 && 'Đặt lại mật khẩu'}
          </h1>
          <p className={styles.subtitle}>
            {step === 1 && 'Nhập email tài khoản trung tâm để khôi phục mật khẩu'}
            {step === 2 && `Mã xác thực đã được gửi đến email: ${email}`}
            {step === 3 && 'Tạo mật khẩu mới cho tài khoản của bạn'}
          </p>
        </header>

        {/* Step Progress Indicators */}
        <div className={styles.stepWrapper}>
          <div className={`${styles.step} ${getStepClass(1)}`}>
            <div className={styles.stepNumber}>1</div>
            <span className={styles.stepLabel}>Nhập Email</span>
            <div className={`${styles.stepLine} ${step > 1 ? styles.stepLineCompleted : ''}`} />
          </div>
          <div className={`${styles.step} ${getStepClass(2)}`}>
            <div className={styles.stepNumber}>2</div>
            <span className={styles.stepLabel}>Xác minh OTP</span>
            <div className={`${styles.stepLine} ${step > 2 ? styles.stepLineCompleted : ''}`} />
          </div>
          <div className={`${styles.step} ${getStepClass(3)}`}>
            <div className={styles.stepNumber}>3</div>
            <span className={styles.stepLabel}>Mật khẩu mới</span>
          </div>
        </div>

        {/* Feedback Messages */}
        {errorMsg && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--error, #9f2f2d)', marginBottom: '16px', fontSize: '14px', padding: '12px', backgroundColor: 'var(--error-bg, #fdebec)', borderRadius: 'var(--border-radius-default, 6px)', border: '1px solid var(--error, #9f2f2d)' }}>
            <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '20px' }}>error</span>
            <span style={{ fontWeight: '500', textAlign: 'left' }}>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--success, #346538)', marginBottom: '16px', fontSize: '14px', padding: '12px', backgroundColor: 'var(--success-bg, #edf3ec)', borderRadius: 'var(--border-radius-default, 6px)', border: '1px solid var(--success, #346538)' }}>
            <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '20px' }}>check_circle</span>
            <span style={{ fontWeight: '500', textAlign: 'left' }}>{successMsg}</span>
          </div>
        )}

        {/* Step 1 Form */}
        {step === 1 && (
          <form onSubmit={handleRequestOtp} className={styles.form}>
            <Input
              label="Địa chỉ Email"
              id="email"
              type="email"
              icon="mail"
              placeholder="admin@center.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Button type="submit" variant="primary" isLoading={isLoading}>
              Gửi mã OTP
            </Button>
          </form>
        )}

        {/* Step 2 Form */}
        {step === 2 && (
          <form onSubmit={handleVerifyOtp} className={styles.form}>
            <Input
              label="Mã xác thực OTP"
              id="otp"
              type="text"
              icon="pin"
              placeholder="Nhập 6 số OTP"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              required
            />
            <Button type="submit" variant="primary" isLoading={isLoading}>
              Xác nhận mã OTP
            </Button>
          </form>
        )}

        {/* Step 3 Form */}
        {step === 3 && (
          <form onSubmit={handleResetPassword} className={styles.form}>
            <Input
              label="Mật khẩu mới"
              id="password"
              type="password"
              icon="lock"
              placeholder="Nhập mật khẩu mới"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Input
              label="Xác nhận mật khẩu mới"
              id="confirmPassword"
              type="password"
              icon="lock_reset"
              placeholder="Nhập lại mật khẩu mới"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            <Button type="submit" variant="primary" isLoading={isLoading}>
              Đặt lại mật khẩu
            </Button>
          </form>
        )}

        {/* Footer Navigation */}
        <footer className={styles.footerActions}>
          <p className={styles.footerText}>
            <a 
              href="#" 
              onClick={(e) => { e.preventDefault(); onNavigate('login'); }} 
              className={styles.footerLink}
            >
              <span className="material-symbols-outlined notranslate text-[16px]" translate="no">arrow_back</span>
              Quay lại Đăng nhập
            </a>
          </p>
        </footer>
      </Card>

      {/* Bottom Branding */}
      <div className={styles.bottomBranding}>
        <p className={styles.brandingText}>
          © 2024 EduTrack Platform. Bảo mật thông tin bởi SSL Encryption.
        </p>
      </div>
    </main>
  );
};

export default ForgotPasswordPage;
