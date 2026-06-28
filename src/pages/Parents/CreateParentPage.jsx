import React, { useState, useRef } from 'react';
import { parentService } from '../../services/parentService';
import styles from './CreateParentPage.module.css';

const CreateParentPage = ({ onNavigate }) => {
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState('Nam');
  const [address, setAddress] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [autoGeneratePassword, setAutoGeneratePassword] = useState(true);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const isSubmittingRef = useRef(false);

  const toggleAutoGenerate = () => {
    setAutoGeneratePassword(!autoGeneratePassword);
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (isSubmittingRef.current) return;

    setErrorMsg('');
    setSuccessMsg('');

    if (!fullName.trim()) {
      setErrorMsg('Vui lòng nhập họ và tên phụ huynh.');
      return;
    }

    const cleanPhone = phoneNumber.replace(/\s+/g, '');
    if (!cleanPhone) {
      setErrorMsg('Vui lòng nhập số điện thoại.');
      return;
    }
    if (!/^\d{10}$/.test(cleanPhone)) {
      setErrorMsg('Số điện thoại phải bao gồm đúng 10 số (không chứa chữ cái hay ký tự đặc biệt).');
      return;
    }

    const parentPassword = autoGeneratePassword ? 'Nhodoimatkhaunhe@@' : password;
    if (!autoGeneratePassword) {
      if (!parentPassword) {
        setErrorMsg('Vui lòng nhập mật khẩu.');
        return;
      }
      if (parentPassword !== confirmPassword) {
        setErrorMsg('Mật khẩu và xác nhận mật khẩu không khớp.');
        return;
      }
    }

    isSubmittingRef.current = true;
    setLoading(true);

    try {
      await parentService.createParent({
        fullName: fullName.trim(),
        phoneNumber: cleanPhone,
        email: email.trim() || null,
        address: address.trim(),
        password: parentPassword
      });

      sessionStorage.setItem('parents_needs_reload', 'true');
      setSuccessMsg(`Tạo tài khoản phụ huynh thành công! Mật khẩu: ${parentPassword}`);
      setTimeout(() => {
        onNavigate('parents');
      }, 2000);
    } catch (err) {
      isSubmittingRef.current = false;
      console.error(err);
      setErrorMsg(err.data?.message || err.message || 'Đã xảy ra lỗi khi tạo tài khoản phụ huynh.');
      setLoading(false);
    }
  };

  return (
    <div className={styles.createParentRoot}>
                  
      <main className={styles.mainContent}>
        <div className={styles.container}>
          {/* Page Header */}
          <div className={styles.pageHeader}>
            <nav className={styles.breadcrumbs}>
              <span className={styles.breadcrumbLink} onClick={() => onNavigate('parents')}>Parents</span>
              <span className="material-symbols-outlined notranslate" translate="no">chevron_right</span>
              <span className={styles.breadcrumbCurrent}>Create Parent Account</span>
            </nav>
            <h1 className={styles.pageTitle}>Tạo tài khoản phụ huynh</h1>
            <p className={styles.pageSubtitle}>Thêm phụ huynh mới vào hệ thống EduTrack</p>
          </div>

          {/* Feedback Messages */}
          {errorMsg && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', marginBottom: '16px', backgroundColor: 'var(--error-bg)', color: 'var(--error)', borderRadius: '12px', border: '1px solid var(--outline-variant)', fontSize: '14px' }}>
              <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '20px' }}>error</span>
              <span>{errorMsg}</span>
            </div>
          )}
          {successMsg && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', marginBottom: '16px', backgroundColor: 'var(--success-bg)', color: 'var(--success)', borderRadius: '12px', border: '1px solid var(--outline-variant)', fontSize: '14px' }}>
              <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '20px' }}>check_circle</span>
              <span>{successMsg}</span>
            </div>
          )}

          {/* Content Grid */}
          <form onSubmit={handleSubmit} className={styles.contentGrid}>
            
            {/* Left Column: Primary Forms */}
            <div className={styles.leftCol}>
              
              {/* Section 1: Parent Information */}
              <div className={styles.cardBox}>
                <div className={styles.cardHeader}>
                  <span className={`material-symbols-outlined notranslate ${styles.iconPrimary}`} translate="no">person</span>
                  <h3 className={styles.cardTitle}>Thông tin phụ huynh</h3>
                </div>
                
                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Họ và tên phụ huynh <span style={{ color: 'var(--error)' }}>*</span></label>
                    <input 
                      type="text" 
                      className={styles.formInput} 
                      placeholder="Nhập họ và tên đầy đủ"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Số điện thoại <span style={{ color: 'var(--error)' }}>*</span></label>
                    <input 
                      type="tel" 
                      className={styles.formInput} 
                      placeholder="Ví dụ: 0912345678"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Email <span style={{ color: 'var(--error)' }}>*</span></label>
                    <input 
                      type="email" 
                      className={styles.formInput} 
                      placeholder="example@gmail.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Giới tính</label>
                    <div className={styles.radioGroup}>
                      <label className={styles.radioLabel}>
                        <input 
                          type="radio" 
                          name="gender" 
                          className={styles.radioInput}
                          checked={gender === 'Nam'}
                          onChange={() => setGender('Nam')}
                        />
                        <span>Nam</span>
                      </label>
                      <label className={styles.radioLabel}>
                        <input 
                          type="radio" 
                          name="gender" 
                          className={styles.radioInput}
                          checked={gender === 'Nữ'}
                          onChange={() => setGender('Nữ')}
                        />
                        <span>Nữ</span>
                      </label>
                    </div>
                  </div>
                  
                  <div className={styles.formGroupFull}>
                    <label className={styles.formLabel}>Địa chỉ</label>
                    <textarea 
                      className={styles.formTextarea} 
                      rows="3" 
                      placeholder="Nhập địa chỉ thường trú"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                    ></textarea>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Secondary Settings */}
            <div className={styles.rightCol}>
              
              {/* Section 2: Login Account Information */}
              <div className={styles.cardBox}>
                <div className={styles.cardHeader}>
                  <span className={`material-symbols-outlined notranslate ${styles.iconPrimary}`} translate="no">lock</span>
                  <h3 className={styles.cardTitle}>Tài khoản đăng nhập</h3>
                </div>
                
                <div className={styles.formGroupStack}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Tên đăng nhập (Username)</label>
                    <input 
                      type="text" 
                      className={styles.formInputDisabled} 
                      disabled 
                      placeholder={email || "Mặc định là Email"} 
                    />
                  </div>
                  
                  <div className={styles.formGroupStackInner}>
                    <div className={styles.flexBetween}>
                      <label className={styles.formLabel}>Mật khẩu</label>
                      <div className={styles.toggleGroup} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={toggleAutoGenerate}>
                        <span className={styles.toggleLabel} style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Tự động tạo</span>
                        <button 
                          type="button"
                          className={`${styles.toggleBtn} ${autoGeneratePassword ? styles.toggleActive : ''}`} 
                        >
                          <span className={styles.toggleCircle}></span>
                        </button>
                      </div>
                    </div>
                    
                    {!autoGeneratePassword && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                        <input 
                          type="password" 
                          className={styles.formInput} 
                          placeholder="Nhập mật khẩu (tối thiểu 6 ký tự)"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required={!autoGeneratePassword}
                        />
                        <input 
                          type="password" 
                          className={styles.formInput} 
                          placeholder="Xác nhận mật khẩu"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required={!autoGeneratePassword}
                        />
                      </div>
                    )}
                    {autoGeneratePassword && (
                      <div className={styles.autoGenBanner} style={{ marginTop: '8px', padding: '12px', background: '#e0f2fe', color: 'var(--info)', borderRadius: '8px', fontSize: '13px' }}>
                        Hệ thống tự động cấp mật khẩu mặc định: <strong>Nhodoimatkhaunhe@@</strong>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Info Card */}
              <div className={styles.infoCard} style={{ display: 'flex', gap: '12px', padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid var(--outline-variant)', marginTop: '16px' }}>
                <span className="material-symbols-outlined notranslate" translate="no" style={{ color: 'var(--text-muted)' }}>info</span>
                <div>
                  <p className={styles.infoTitle} style={{ margin: '0 0 4px 0', fontWeight: 600, fontSize: '14px' }}>Lưu ý liên kết học sinh</p>
                  <p className={styles.infoDesc} style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    Sau khi lưu tài khoản phụ huynh này, bạn có thể thực hiện liên kết với học sinh bằng nút <strong>"Liên kết học sinh"</strong> ở góc trang danh sách hoặc sử dụng tính năng **Add Student** trong trang chi tiết.
                  </p>
                </div>
              </div>
            </div>
          </form>
        </div>
      </main>

      {/* Sticky Footer Action Bar */}
      <div className={styles.actionBar}>
        <div className={styles.actionBarContent}>
          <button className={styles.btnCancel} onClick={() => onNavigate('parents')} disabled={loading}>
            Hủy bỏ
          </button>
          <button className={styles.btnSubmit} onClick={handleSubmit} disabled={loading}>
            {loading ? 'Đang lưu...' : 'Lưu'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateParentPage;
