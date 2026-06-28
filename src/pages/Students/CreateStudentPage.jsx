import React, { useState, useRef } from 'react';
import { authService } from '../../services/authService';
import styles from './CreateStudentPage.module.css';

const CreateStudentPage = ({ onNavigate }) => {
  const [fullName, setFullName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('Nam');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const isSubmittingRef = useRef(false);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (isSubmittingRef.current) return;

    setError('');
    setSuccess('');

    if (!email.includes('@')) {
      setError('Vui lòng nhập định dạng email hợp lệ.');
      return;
    }

    isSubmittingRef.current = true;
    setLoading(true);
    try {
      const data = {
        fullName,
        dateOfBirth,
        gender,
        email,
        phone: phone || null,
      };

      await authService.createStudentAccount(data);
      sessionStorage.setItem('students_needs_reload', 'true');
      setSuccess('Tạo tài khoản học sinh thành công! Mật khẩu mặc định: Nhodoimatkhaunhe@@');
      setTimeout(() => {
        onNavigate('students');
      }, 2000);
    } catch (err) {
      isSubmittingRef.current = false;
      const message = err?.data?.message || err?.message || 'Đã xảy ra lỗi khi tạo tài khoản. Vui lòng thử lại.';
      setError(message);
      setLoading(false);
    }
  };

  return (
    <div className={styles.createRoot}>
                  
      <main className={styles.mainContent}>
        {/* Breadcrumbs & Title */}
        <div className={styles.pageHeader}>
          <nav className={styles.breadcrumb}>
            <button 
              onClick={() => onNavigate('students')} 
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--primary)', font: 'inherit' }}
            >
              Học sinh
            </button>
            <span className="material-symbols-outlined notranslate text-sm" translate="no">chevron_right</span>
            <span className={styles.breadcrumbActive}>Tạo tài khoản mới</span>
          </nav>
          <h2 className={styles.pageTitle}>Tạo tài khoản học sinh</h2>
          <p className={styles.pageSubtitle}>Vui lòng điền đầy đủ các thông tin bắt buộc để thiết lập tài khoản học sinh mới.</p>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div style={{ background: 'var(--error-bg)', color: 'var(--error)', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '20px' }}>error</span>
            {error}
          </div>
        )}
        {success && (
          <div style={{ background: '#e8f5e9', color: 'var(--success)', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '20px' }}>check_circle</span>
            {success}
          </div>
        )}

        <div className={styles.grid}>
          {/* Form Section */}
          <div className={styles.formCol}>
            <form onSubmit={handleCreate}>
              {/* Section 1: Student Information */}
              <section className={styles.formSection}>
                <div className={styles.sectionHeader}>
                  <div className={styles.iconWrapperPrimary}>
                    <span className="material-symbols-outlined notranslate" translate="no">badge</span>
                  </div>
                  <h3>Thông tin học sinh</h3>
                </div>
                <div className={styles.inputGrid}>
                  <div className={styles.inputGroupCol2}>
                    <label>Họ và tên <span className={styles.textError}>*</span></label>
                    <input 
                      type="text" 
                      placeholder="Nhập họ và tên đầy đủ" 
                      required 
                      className={styles.inputField} 
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>
                  <div className={styles.inputGroupCol2}>
                    <label>Ngày sinh <span className={styles.textError}>*</span></label>
                    <input 
                      type="date" 
                      required 
                      className={styles.inputField}
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                    />
                  </div>
                  <div className={styles.inputGroupCol2}>
                    <label>Giới tính <span className={styles.textError}>*</span></label>
                    <div className={styles.radioGroup}>
                      <label className={styles.radioLabel}>
                        <input 
                          type="radio" 
                          name="gender" 
                          checked={gender === 'Nam'} 
                          onChange={() => setGender('Nam')} 
                          className={styles.radioInput} 
                        />
                        <span>Nam</span>
                      </label>
                      <label className={styles.radioLabel}>
                        <input 
                          type="radio" 
                          name="gender" 
                          checked={gender === 'Nữ'} 
                          onChange={() => setGender('Nữ')} 
                          className={styles.radioInput} 
                        />
                        <span>Nữ</span>
                      </label>
                      <label className={styles.radioLabel}>
                        <input 
                          type="radio" 
                          name="gender" 
                          checked={gender === 'Khác'} 
                          onChange={() => setGender('Khác')} 
                          className={styles.radioInput} 
                        />
                        <span>Khác</span>
                      </label>
                    </div>
                  </div>
                  <div className={styles.inputGroupCol2}>
                    <label>Số điện thoại (Học sinh)</label>
                    <input 
                      type="tel" 
                      placeholder="0xxx xxx xxx" 
                      className={styles.inputField} 
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                </div>
              </section>

              {/* Section 2: Account Login Credentials */}
              <section className={styles.formSection}>
                <div className={styles.sectionHeader}>
                  <div className={styles.iconWrapperSurface}>
                    <span className="material-symbols-outlined notranslate" translate="no">lock</span>
                  </div>
                  <h3>Thông tin đăng nhập tài khoản</h3>
                </div>
                <div className={styles.inputGrid}>
                  <div className={styles.inputGroupFull}>
                    <label>Email đăng nhập (Tài khoản học sinh) <span className={styles.textError}>*</span></label>
                    <input 
                      type="email" 
                      required 
                      placeholder="example@student.com" 
                      className={styles.inputField}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
                      Học sinh sẽ dùng email này để đăng nhập vào hệ thống EduTrack.
                    </p>
                  </div>
                </div>

                <div style={{ marginTop: '20px', padding: '16px', borderRadius: '8px', background: 'var(--surface-container-low, #f8fafc)', border: '1px solid var(--outline-variant, var(--outline-variant))' }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <span className="material-symbols-outlined notranslate" translate="no" style={{ color: 'var(--info)' }}>info</span>
                    <div>
                      <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 600 }}>Mật khẩu mặc định hệ thống cấp</h4>
                      <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                        Tài khoản học sinh mới sẽ được thiết lập mật khẩu mặc định là: <strong style={{ color: 'var(--primary)', fontStyle: 'italic' }}>Nhodoimatkhaunhe@@</strong>
                      </p>
                      <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                        * Học sinh sẽ nhận được email chào mừng kèm hướng dẫn đăng nhập và được khuyến nghị đổi mật khẩu ở lần truy cập đầu tiên.
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Action Buttons */}
              <div className={styles.formFooter}>
                <button type="button" className={styles.cancelBtn} onClick={() => onNavigate('students')} disabled={loading}>Hủy bỏ</button>
                <button type="submit" className={styles.submitBtn} disabled={loading}>
                  {loading ? (
                    <>
                      <span className="material-symbols-outlined notranslate" translate="no" style={{ animation: 'spin 1s linear infinite' }}>progress_activity</span>
                      Đang lưu...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined notranslate" translate="no">save</span>
                      Lưu
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CreateStudentPage;
