import React, { useState, useEffect, useRef } from 'react';
import { teacherService } from '../../services/teacherService';
import { apiClient } from '../../services/apiClient';
import styles from './EditTeacherPage.module.css';

const EditTeacherPage = ({ onNavigate }) => {
  const [teacherId, setTeacherId] = useState(null);
  const [teacher, setTeacher] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Editable Form fields
  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState('Nam');
  const [address, setAddress] = useState('');
  const [expertise, setExpertise] = useState('');
  
  // Read-only fields
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isActive, setIsActive] = useState(true);

  const [expertises, setExpertises] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Fetch teacher details and expertises on mount
  useEffect(() => {
    const storedTeacherId = localStorage.getItem('selectedTeacherIdForEdit');
    if (!storedTeacherId) {
      setError('Không tìm thấy ID giáo viên cần chỉnh sửa.');
      setLoading(false);
      return;
    }
    setTeacherId(storedTeacherId);

    const editMode = localStorage.getItem('teacherEditMode') === 'true';
    if (editMode) {
      setIsEditing(true);
      localStorage.removeItem('teacherEditMode');
    }

    const fetchInitData = async () => {
      try {
        const detail = await teacherService.getTeacherDetail(storedTeacherId);
        setTeacher(detail);
        
        // Populate form
        setFullName(detail.fullName || '');
        setGender(detail.gender || 'Nam');
        setAddress(detail.address || '');
        setExpertise(detail.expertise || '');
        setEmail(detail.email || '');
        setPhone(detail.phoneNumber || '');
        setIsActive(detail.isActive !== false);

        // Fetch expertise datalist suggestions
        try {
          const expertData = await teacherService.getExpertises();
          const list = Array.isArray(expertData) ? expertData : (expertData?.data || expertData?.items || []);
          setExpertises(list);
        } catch (err) {
          console.error('Lỗi khi tải danh sách chuyên môn:', err);
        }
      } catch (err) {
        console.error('Lỗi khi tải chi tiết giáo viên:', err);
        setError('Không thể tải thông tin chi tiết giáo viên.');
      } finally {
        setLoading(false);
      }
    };

    fetchInitData();
  }, []);

  const handleEditClick = () => {
    setIsEditing(true);
    setError('');
    setSuccess('');
  };

  const handleCancelClick = () => {
    if (teacher) {
      // Restore original values
      setFullName(teacher.fullName || '');
      setGender(teacher.gender || 'Nam');
      setAddress(teacher.address || '');
      setExpertise(teacher.expertise || '');
    }
    setIsEditing(false);
    setError('');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setError('Vui lòng nhập họ và tên giáo viên.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const updatedData = {
        fullName,
        address: address || null,
        expertise: expertise || '',
        gender,
      };

      await teacherService.updateTeacherByCenter(teacherId, updatedData);
      
      // Update local teacher state
      setTeacher(prev => ({
        ...prev,
        ...updatedData
      }));

      setSuccess('Cập nhật thông tin giáo viên thành công.');
      setIsEditing(false);
      sessionStorage.setItem('teachers_needs_reload', 'true');
      sessionStorage.removeItem('cached_all_teachers');
    } catch (err) {
      console.error(err);
      setError(err?.data?.message || err?.message || 'Có lỗi xảy ra khi lưu thay đổi.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.editTeacherRoot}>
            
      <main className={styles.mainContent}>
        <div className={styles.container}>
          {/* Breadcrumbs & Header */}
          <div className={styles.pageHeader}>
            <div>
              <nav className={styles.breadcrumbs}>
                <button className={styles.breadcrumbLink} onClick={() => onNavigate('teachers')}>Giáo viên</button>
                <span className="material-symbols-outlined notranslate text-[14px]" translate="no">chevron_right</span>
                <span className={styles.breadcrumbActive}>Chi tiết giáo viên</span>
              </nav>
              <h2 className={styles.pageTitle}>Hồ sơ giáo viên</h2>
            </div>
            
            <div className={styles.headerActions}>
              {!isEditing ? (
                <>
                  <button className={styles.cancelBtn} onClick={() => onNavigate('teachers')}>
                    Quay lại
                  </button>
                  <button className={styles.submitBtn} onClick={handleEditClick}>
                    <span className="material-symbols-outlined text-sm">edit</span> Chỉnh sửa
                  </button>
                </>
              ) : (
                <>
                  <button className={styles.cancelBtn} onClick={handleCancelClick} disabled={saving}>
                    Hủy bỏ
                  </button>
                  <button className={styles.submitBtn} onClick={handleSave} disabled={saving}>
                    {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Feedback Messages */}
          {error && (
            <div className={styles.alertError}>
              <span className="material-symbols-outlined notranslate" translate="no">error</span>
              {error}
            </div>
          )}
          {success && (
            <div className={styles.alertSuccess}>
              <span className="material-symbols-outlined notranslate" translate="no">check_circle</span>
              {success}
            </div>
          )}

          {loading ? (
            <div className={styles.loadingSpinner}>
              <span className="material-symbols-outlined notranslate spin" translate="no">progress_activity</span>
              <p>Đang tải thông tin giáo viên...</p>
            </div>
          ) : teacher ? (
            <div className={styles.gridContainer}>
              {/* Profile Card Section */}
              <div className={styles.profileCard}>
                <div className={styles.avatarWrapper}>
                  {teacher.imageUrl ? (
                    <img src={teacher.imageUrl} alt={fullName} className={styles.avatarImage} />
                  ) : (
                    <div className={styles.avatarPlaceholder}>
                      {(fullName || 'GV').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                    </div>
                  )}
                </div>
                <h3 className={styles.profileName}>{fullName}</h3>
                <p className={styles.profileRole}>Giáo viên Trung tâm</p>
                <div className={styles.profileStatus}>
                  <span className={`${styles.statusBadge} ${isActive ? styles.statusActive : styles.statusInactive}`}>
                    {isActive ? 'Đang hoạt động' : 'Đã vô hiệu hóa'}
                  </span>
                </div>
              </div>

              {/* Form Info Section */}
              <form onSubmit={handleSave} className={styles.formContainer}>
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
                        className={isEditing ? styles.inputField : styles.inputFieldDisabled}
                        disabled={!isEditing}
                        required
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Nhập họ và tên giáo viên"
                      />
                    </div>

                    <div>
                      <label className={styles.inputLabel}>Giới tính <span className={styles.textError}>*</span></label>
                      <select
                        className={isEditing ? styles.selectField : styles.selectFieldDisabled}
                        disabled={!isEditing}
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                      >
                        <option value="Nam">Nam</option>
                        <option value="Nữ">Nữ</option>
                        <option value="Khác">Khác</option>
                      </select>
                    </div>

                    <div>
                      <label className={styles.inputLabel}>Số điện thoại</label>
                      <input
                        className={styles.inputFieldDisabled}
                        disabled
                        type="tel"
                        value={phone || 'Chưa cập nhật'}
                      />
                    </div>

                    <div className={styles.fullWidth}>
                      <label className={styles.inputLabel}>Địa chỉ</label>
                      <input
                        className={isEditing ? styles.inputField : styles.inputFieldDisabled}
                        disabled={!isEditing}
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Địa chỉ liên hệ"
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
                    <div className={styles.fullWidth}>
                      <label className={styles.inputLabel}>Môn học chuyên môn <span className={styles.textError}>*</span></label>
                      <input
                        className={isEditing ? styles.inputField : styles.inputFieldDisabled}
                        disabled={!isEditing}
                        required
                        type="text"
                        value={expertise}
                        onChange={(e) => setExpertise(e.target.value)}
                        placeholder="Chuyên ngành"
                      />
                    </div>
                  </div>
                </section>

                {/* Section 3: Login Credentials */}
                <section className={styles.formSection}>
                  <div className={styles.sectionHeader}>
                    <span className="material-symbols-outlined notranslate text-primary" translate="no">key</span>
                    <h3 className={styles.sectionTitle}>Tài khoản đăng nhập</h3>
                  </div>

                  <div className={styles.formGrid}>
                    <div className={styles.fullWidth}>
                      <label className={styles.inputLabel}>Email tài khoản (Tên đăng nhập)</label>
                      <input
                        className={styles.inputFieldDisabled}
                        disabled
                        type="email"
                        value={email}
                      />
                    </div>
                  </div>
                </section>

                {isEditing && (
                  <div className={styles.formActions}>
                    <button type="button" className={styles.cancelBtn} onClick={handleCancelClick} disabled={saving}>
                      Hủy bỏ
                    </button>
                    <button type="submit" className={styles.submitBtn} disabled={saving}>
                      {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                    </button>
                  </div>
                )}
              </form>
            </div>
          ) : (
            <div className={styles.alertError}>Không thể tìm thấy thông tin giáo viên.</div>
          )}
        </div>
      </main>
    </div>
  );
};

export default EditTeacherPage;
