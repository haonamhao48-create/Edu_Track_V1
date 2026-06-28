import React, { useState, useEffect } from 'react';
import { studentService } from '../../services/studentService';
import styles from './EditStudentPage.module.css';

const EditStudentPage = ({ onNavigate }) => {
  const [studentId, setStudentId] = useState(null);
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Editable Form fields
  const [fullName, setFullName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('Nam');
  
  // Read-only fields
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState('Active');
  const [parents, setParents] = useState([]);

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const storedStudentId = localStorage.getItem('selectedStudentIdForEdit');
    if (!storedStudentId) {
      setError('Không tìm thấy ID học sinh cần chỉnh sửa.');
      setLoading(false);
      return;
    }
    setStudentId(storedStudentId);

    const editMode = localStorage.getItem('studentEditMode') === 'true';
    if (editMode) {
      setIsEditing(true);
      localStorage.removeItem('studentEditMode');
    }

    const fetchInitData = async () => {
      try {
        const detail = await studentService.getStudentDetail(storedStudentId);
        setStudent(detail);
        
        // Populate form
        setFullName(detail.fullName || '');
        
        // Handle DateOfBirth format for <input type="date"> (YYYY-MM-DD)
        let dobValue = '';
        if (detail.dateOfBirth) {
          try {
            const dobDate = new Date(detail.dateOfBirth);
            if (!isNaN(dobDate.getTime())) {
              dobValue = dobDate.toISOString().split('T')[0];
            }
          } catch (e) {
            console.error('Lỗi khi parse ngày sinh:', e);
          }
        }
        setDateOfBirth(dobValue);
        setGender(detail.gender || 'Nam');
        setEmail(detail.email || '');
        setPhone(detail.phoneNumber || '');
        setStatus(detail.status || 'Active');
        setParents(detail.parents || []);

      } catch (err) {
        console.error('Lỗi khi tải chi tiết học sinh:', err);
        setError('Không thể tải thông tin chi tiết học sinh.');
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
    if (student) {
      setFullName(student.fullName || '');
      let dobValue = '';
      if (student.dateOfBirth) {
        try {
          const dobDate = new Date(student.dateOfBirth);
          if (!isNaN(dobDate.getTime())) {
            dobValue = dobDate.toISOString().split('T')[0];
          }
        } catch (e) {
          console.error(e);
        }
      }
      setDateOfBirth(dobValue);
      setGender(student.gender || 'Nam');
    }
    setIsEditing(false);
    setError('');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setError('Vui lòng nhập họ và tên học sinh.');
      return;
    }
    if (!dateOfBirth) {
      setError('Vui lòng chọn ngày sinh.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const updatedData = {
        fullName,
        dateOfBirth,
        gender,
      };

      await studentService.updateStudentByCenter(studentId, updatedData);
      
      // Update local state
      setStudent(prev => ({
        ...prev,
        ...updatedData
      }));

      setSuccess('Cập nhật thông tin học sinh thành công.');
      setIsEditing(false);
      sessionStorage.setItem('students_needs_reload', 'true');
    } catch (err) {
      console.error(err);
      setError(err?.data?.message || err?.message || 'Có lỗi xảy ra khi lưu thay đổi.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.editStudentRoot}>
            
      <main className={styles.mainContent}>
        <div className={styles.container}>
          {/* Breadcrumbs & Header */}
          <div className={styles.pageHeader}>
            <div>
              <nav className={styles.breadcrumbs}>
                <button className={styles.breadcrumbLink} onClick={() => onNavigate('students')}>Học sinh</button>
                <span className="material-symbols-outlined notranslate text-[14px]" translate="no">chevron_right</span>
                <span className={styles.breadcrumbActive}>Chi tiết học sinh</span>
              </nav>
              <h2 className={styles.pageTitle}>Hồ sơ học sinh</h2>
            </div>
            
            <div className={styles.headerActions}>
              {!isEditing ? (
                <>
                  <button className={styles.cancelBtn} onClick={() => onNavigate('students')}>
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
              <p>Đang tải thông tin học sinh...</p>
            </div>
          ) : student ? (
            <div className={styles.gridContainer}>
              {/* Profile Card Column */}
              <div className={styles.profileCard}>
                <div className={styles.avatarPlaceholder}>
                  {(fullName || 'HS').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                </div>
                <h3 className={styles.profileName}>{fullName}</h3>
                <p className={styles.profileRole}>Học sinh Trung tâm</p>
                <div className={styles.profileStatus}>
                  <span className={`${styles.statusBadge} ${status?.toLowerCase() === 'inactive' ? styles.statusInactive : styles.statusActive}`}>
                    {status?.toLowerCase() === 'inactive' ? 'Tạm dừng' : 'Đang học'}
                  </span>
                </div>
              </div>

              {/* Form & Parents Info Column */}
              <div className={styles.formColumn}>
                <form onSubmit={handleSave} className={styles.formContainer}>
                  {/* Section 1: Personal Information */}
                  <section className={styles.formSection}>
                    <div className={styles.sectionHeader}>
                      <span className="material-symbols-outlined notranslate text-primary" translate="no">person</span>
                      <h3 className={styles.sectionTitle}>Thông tin học sinh</h3>
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
                          placeholder="Nhập họ và tên học sinh"
                        />
                      </div>

                      <div>
                        <label className={styles.inputLabel}>Ngày sinh <span className={styles.textError}>*</span></label>
                        <input
                          className={isEditing ? styles.inputField : styles.inputFieldDisabled}
                          disabled={!isEditing}
                          required
                          type="date"
                          value={dateOfBirth}
                          onChange={(e) => setDateOfBirth(e.target.value)}
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
                    </div>
                  </section>

                  {/* Section 2: Account Login Credentials */}
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

                  {/* Section 3: Linked Parents Info */}
                  <section className={styles.formSection}>
                    <div className={styles.sectionHeader}>
                      <span className="material-symbols-outlined notranslate text-primary" translate="no">family_history</span>
                      <h3 className={styles.sectionTitle}>Phụ huynh liên kết</h3>
                    </div>

                    {parents.length > 0 ? (
                      <div className={styles.parentsList}>
                        {parents.map((p, idx) => (
                          <div key={p.parentId || idx} className={styles.parentItem}>
                            <div className={styles.parentAvatar}>
                              {(p.fullName || 'PH').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                            </div>
                            <div className={styles.parentDetails}>
                              <div className={styles.parentNameRow}>
                                <span className={styles.parentName}>{p.fullName}</span>
                                <span className={styles.parentRelation}>({p.relationShip || 'Phụ huynh'})</span>
                              </div>
                              <div className={styles.parentContactInfo}>
                                <span>SĐT: {p.phoneNumber || '--'}</span>
                                <span className={styles.dividerDot}></span>
                                <span>Email: {p.email || '--'}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className={styles.noParentsText}>Chưa liên kết phụ huynh nào cho học sinh này.</p>
                    )}
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
            </div>
          ) : (
            <div className={styles.alertError}>Không thể tìm thấy thông tin học sinh.</div>
          )}
        </div>
      </main>
    </div>
  );
};

export default EditStudentPage;
