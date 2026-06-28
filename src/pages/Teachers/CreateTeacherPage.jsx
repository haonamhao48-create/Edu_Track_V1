import React, { useState, useEffect, useRef } from 'react';
import { authService } from '../../services/authService';
import { teacherService } from '../../services/teacherService';
import { apiClient } from '../../services/apiClient';
import styles from './CreateTeacherPage.module.css';

const CreateTeacherPage = ({ onNavigate }) => {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState('Nam');
  const [expertise, setExpertise] = useState('Tiếng Anh');
  const [address, setAddress] = useState('');
  const [expertises, setExpertises] = useState([]);
  
  const [centerName, setCenterName] = useState('EduTrack Center');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const isSubmittingRef = useRef(false);

  // Fetch center details and expertises on mount
  useEffect(() => {
    const fetchInitData = async () => {
      try {
        const centerProfile = await apiClient('/profile/centers/me', { method: 'GET' });
        if (centerProfile?.name) {
          setCenterName(centerProfile.name);
        }
      } catch (err) {
        console.error('Lỗi khi tải dữ liệu khởi tạo:', err);
      }
      try {
        const expertData = await teacherService.getExpertises();
        const list = Array.isArray(expertData) ? expertData : (expertData?.data || expertData?.items || []);
        setExpertises(list);
      } catch (err) {
        console.error('Lỗi khi tải danh sách chuyên môn:', err);
      }
    };
    fetchInitData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmittingRef.current) return;

    setError('');
    setSuccess('');

    if (!fullName.trim()) {
      setError('Vui lòng nhập họ và tên giáo viên.');
      return;
    }

    if (!email.includes('@')) {
      setError('Vui lòng nhập email hợp lệ.');
      return;
    }

    // Backend FluentValidation requires phone number to be exactly 10 digits
    const cleanPhone = phone.replace(/\s+/g, '');
    if (!cleanPhone) {
      setError('Vui lòng nhập số điện thoại.');
      return;
    }
    if (!/^\d{10}$/.test(cleanPhone)) {
      setError('Số điện thoại phải bao gồm đúng 10 số (không chứa chữ cái hay ký tự đặc biệt).');
      return;
    }

    isSubmittingRef.current = true;
    setLoading(true);
    try {
      const data = {
        fullName,
        phone: cleanPhone,
        email,
        gender,
        expertise: expertise || 'Tiếng Anh',
        address: address || null,
      };

      await authService.createTeacherAccount(data);
      sessionStorage.setItem('teachers_needs_reload', 'true');
      sessionStorage.removeItem('cached_all_teachers');
      setSuccess('Tạo tài khoản giáo viên thành công! Mật khẩu mặc định: Nhodoimatkhaunhe@@');
      setTimeout(() => {
        onNavigate('teachers');
      }, 2000);
    } catch (err) {
      isSubmittingRef.current = false;
      const message = err?.data?.message || err?.message || 'Đã xảy ra lỗi khi tạo tài khoản. Vui lòng thử lại.';
      setError(message);
      setLoading(false);
    }
  };

  return (
    <div className={styles.createTeacherRoot}>
                  
      <main className={styles.mainContent}>
        {/* Breadcrumbs & Header */}
        <div className={styles.pageHeader}>
          <div>
            <nav className={styles.breadcrumbs}>
              <button className={styles.breadcrumbLink} onClick={() => onNavigate('teachers')}>Giáo viên</button>
              <span className="material-symbols-outlined notranslate text-[14px]" translate="no">chevron_right</span>
              <span className={styles.breadcrumbActive}>Tạo tài khoản giáo viên</span>
            </nav>
            <h2 className={styles.pageTitle}>Tạo tài khoản giáo viên</h2>
          </div>
          <div className={styles.headerActions}>
            <button className={styles.cancelBtn} onClick={() => onNavigate('teachers')} disabled={loading}>
              Hủy bỏ
            </button>
            <button className={styles.submitBtn} onClick={handleSubmit} disabled={loading}>
              {loading ? 'Đang lưu...' : 'Lưu'}
            </button>
          </div>
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

        {/* Bento Grid Layout for Form */}
        <form onSubmit={handleSubmit} className={styles.gridContainer}>
          {/* Left Column: Form Sections */}
          <div className={styles.leftColumn}>
            {/* Section 1: Personal Information */}
            <section className={styles.formSection}>
              <div className={styles.sectionHeader}>
                <span className="material-symbols-outlined notranslate text-primary" translate="no">person</span>
                <h3 className={styles.sectionTitle}>Thông tin cá nhân</h3>
              </div>
              <div className={styles.formGrid}>
                <div className={styles.fullWidth}>
                  <label className={styles.inputLabel}>Họ và tên <span className={styles.textError}>*</span></label>
                  <input
                    className={styles.inputField}
                    placeholder="Nhập họ và tên giáo viên"
                    required
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
                <div>
                  <label className={styles.inputLabel}>Giới tính <span className={styles.textError}>*</span></label>
                  <select 
                    className={styles.selectField}
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                  >
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                  </select>
                </div>
                <div>
                  <label className={styles.inputLabel}>Số điện thoại <span className={styles.textError}>*</span></label>
                  <div className={styles.inputWrapper}>
                    <span className={`material-symbols-outlined notranslate ${styles.inputIcon}`} translate="no">call</span>
                    <input
                      className={`${styles.inputField} ${styles.inputWithIcon}`}
                      placeholder="0901234567"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className={styles.fullWidth}>
                  <label className={styles.inputLabel}>Địa chỉ</label>
                  <input
                    className={styles.inputField}
                    placeholder="Nhập địa chỉ tạm trú/thường trú"
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>
              </div>
            </section>

            {/* Section 2: Teaching Information */}
            <section className={styles.formSection}>
              <div className={styles.sectionHeader}>
                <span className="material-symbols-outlined notranslate text-primary" translate="no">menu_book</span>
                <h3 className={styles.sectionTitle}>Thông tin giảng dạy</h3>
              </div>
              <div className={styles.formGrid}>
                <div>
                  <label className={styles.inputLabel}>Môn học chuyên môn <span className={styles.textError}>*</span></label>
                  <input
                    className={styles.inputField}
                    placeholder="Ví dụ: Tiếng Anh, Toán học, IELTS 7.5..."
                    required
                    type="text"
                    value={expertise}
                    onChange={(e) => setExpertise(e.target.value)}
                    list="expertises-list"
                  />
                  <datalist id="expertises-list">
                    {expertises.map((exp, idx) => (
                      <option key={idx} value={exp} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className={styles.inputLabel}>Trung tâm trực thuộc</label>
                  <input
                    className={styles.inputFieldDisabled}
                    disabled
                    type="text"
                    value={centerName}
                  />
                </div>
              </div>
            </section>

            {/* Section 3: Login Account Information */}
            <section className={styles.formSection}>
              <div className={styles.sectionHeader}>
                <span className="material-symbols-outlined notranslate text-primary" translate="no">key</span>
                <h3 className={styles.sectionTitle}>Thông tin tài khoản đăng nhập</h3>
              </div>
              <div className={styles.formGrid} style={{ gridTemplateColumns: '1fr' }}>
                <div>
                  <label className={styles.inputLabel}>Email tài khoản (Tên đăng nhập) <span className={styles.textError}>*</span></label>
                  <input
                    className={styles.inputField}
                    placeholder="example@teacher.com"
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>
              
              <div style={{ marginTop: '20px', padding: '16px', borderRadius: '8px', background: 'var(--surface-container-low, #f8fafc)', border: '1px solid var(--outline-variant, var(--outline-variant))' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <span className="material-symbols-outlined notranslate" translate="no" style={{ color: 'var(--info)' }}>info</span>
                  <div>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 600 }}>Mật khẩu mặc định hệ thống cấp</h4>
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                      Tài khoản giáo viên mới sẽ được thiết lập mật khẩu đăng nhập mặc định là: <strong style={{ color: 'var(--primary)', fontStyle: 'italic' }}>Nhodoimatkhaunhe@@</strong>
                    </p>
                    <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                      * Giáo viên sẽ nhận được email hướng dẫn chào mừng và khuyến nghị đổi mật khẩu trong lần đầu truy cập.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Bottom Actions Form */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
              <button 
                type="button" 
                className={styles.cancelBtn} 
                onClick={() => onNavigate('teachers')} 
                disabled={loading}
                style={{ padding: '10px 24px', height: 'auto' }}
              >
                Hủy bỏ
              </button>
              <button 
                type="submit" 
                className={styles.submitBtn} 
                disabled={loading}
                style={{ padding: '10px 24px', height: 'auto' }}
              >
                {loading ? 'Đang lưu...' : 'Lưu'}
              </button>
            </div>
          </div>


        </form>

        {/* Footer */}
        <footer className={styles.footer}>
          <div className={styles.footerContent}>
            <p>© 2024 EduTrack Center Management. Bản quyền thuộc về EduTrack Team.</p>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default CreateTeacherPage;
