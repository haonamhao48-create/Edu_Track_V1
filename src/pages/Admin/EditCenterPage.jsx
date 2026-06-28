import React, { useState, useEffect } from 'react';

import { adminService } from '../../services/adminService';
import { normalizeDetailResponse } from '../../utils/apiResponse';
import styles from './EditCenterPage.module.css';

const EditCenterPage = ({ onNavigate }) => {
  const [centerId, setCenterId] = useState(null);
  const [center, setCenter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Editable Form fields
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  
  // Read-only fields
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [logo, setLogo] = useState('');

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const storedCenterId = localStorage.getItem('selectedCenterIdForEdit');
    if (!storedCenterId) {
      setError('Không tìm thấy ID trung tâm cần chỉnh sửa.');
      setLoading(false);
      return;
    }
    setCenterId(storedCenterId);

    const editMode = localStorage.getItem('centerEditMode') === 'true';
    if (editMode) {
      setIsEditing(true);
      localStorage.removeItem('centerEditMode');
    }

    const fetchInitData = async () => {
      try {
        const detail = normalizeDetailResponse(await adminService.getCenterDetail(storedCenterId));
        setCenter(detail);
        
        // Populate form
        setName(detail.name || '');
        setAddress(detail.address || '');
        setEmail(detail.email || '');
        setPhone(detail.phoneNumber || '');
        setIsActive(detail.isActive !== false);
        setLogo(detail.logo || '');
      } catch (err) {
        console.error('Lỗi khi tải chi tiết trung tâm:', err);
        setError('Không thể tải thông tin chi tiết trung tâm.');
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
    if (center) {
      setName(center.name || '');
      setAddress(center.address || '');
    }
    setIsEditing(false);
    setError('');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Vui lòng nhập tên trung tâm.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const updatedData = {
        name: name.trim(),
        address: address.trim() || null,
      };

      await adminService.updateCenter(centerId, updatedData);
      
      setCenter(prev => ({
        ...prev,
        ...updatedData
      }));

      setSuccess('Cập nhật thông tin trung tâm thành công.');
      setIsEditing(false);
      sessionStorage.setItem('centers_needs_reload', 'true');
    } catch (err) {
      console.error(err);
      setError(err?.data?.message || err?.message || 'Có lỗi xảy ra khi lưu thay đổi.');
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (text) => {
    if (!text) return 'TT';
    return text.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  };

  return (
    <div className={styles.editCenterRoot}>
      
      <main className={styles.mainContent}>
        <div className={styles.container}>
          {/* Breadcrumbs & Header */}
          <div className={styles.pageHeader}>
            <div>
              <nav className={styles.breadcrumbs}>
                <button className={styles.breadcrumbLink} onClick={() => onNavigate('admin-centers')}>Quản lý Trung tâm</button>
                <span className="material-symbols-outlined notranslate text-[14px]" translate="no">chevron_right</span>
                <span className={styles.breadcrumbActive}>Chi tiết trung tâm</span>
              </nav>
              <h2 className={styles.pageTitle}>Hồ sơ trung tâm</h2>
            </div>
            
            <div className={styles.headerActions}>
              {!isEditing ? (
                <>
                  <button className={styles.cancelBtn} onClick={() => onNavigate('admin-centers')}>
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
              <p>Đang tải thông tin trung tâm...</p>
            </div>
          ) : center ? (
            <div className={styles.gridContainer}>
              {/* Profile Card Column */}
              <div className={styles.profileCard}>
                <div className={styles.avatarWrapper}>
                  {logo ? (
                    <img src={logo} alt={name} className={styles.avatarImage} />
                  ) : (
                    <div className={styles.avatarPlaceholder}>
                      {getInitials(name)}
                    </div>
                  )}
                </div>
                <h3 className={styles.profileName}>{name}</h3>
                <p className={styles.profileRole}>Trung tâm Giáo dục</p>
                <div className={styles.profileStatus}>
                  <span className={`${styles.statusBadge} ${isActive ? styles.statusActive : styles.statusInactive}`}>
                    {isActive ? 'Đang hoạt động' : 'Đã vô hiệu hóa'}
                  </span>
                </div>
              </div>

              {/* Form Info Column */}
              <form onSubmit={handleSave} className={styles.formContainer}>
                {/* Section 1: Center Information */}
                <section className={styles.formSection}>
                  <div className={styles.sectionHeader}>
                    <span className="material-symbols-outlined notranslate text-primary" translate="no">domain</span>
                    <h3 className={styles.sectionTitle}>Thông tin trung tâm</h3>
                  </div>
                  
                  <div className={styles.formGrid}>
                    <div className={styles.fullWidth}>
                      <label className={styles.inputLabel}>Tên trung tâm <span className={styles.textError}>*</span></label>
                      <input
                        className={isEditing ? styles.inputField : styles.inputFieldDisabled}
                        disabled={!isEditing}
                        required
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Nhập tên trung tâm"
                      />
                    </div>

                    <div className={styles.fullWidth}>
                      <label className={styles.inputLabel}>Địa chỉ trụ sở</label>
                      <input
                        className={isEditing ? styles.inputField : styles.inputFieldDisabled}
                        disabled={!isEditing}
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Địa chỉ trung tâm"
                      />
                    </div>
                  </div>
                </section>

                {/* Section 2: Contact Information */}
                <section className={styles.formSection}>
                  <div className={styles.sectionHeader}>
                    <span className="material-symbols-outlined notranslate text-primary" translate="no">contact_mail</span>
                    <h3 className={styles.sectionTitle}>Thông tin liên hệ</h3>
                  </div>

                  <div className={styles.formGrid}>
                    <div>
                      <label className={styles.inputLabel}>Số điện thoại</label>
                      <input
                        className={styles.inputFieldDisabled}
                        disabled
                        type="tel"
                        value={phone || 'Chưa cập nhật'}
                      />
                    </div>

                    <div>
                      <label className={styles.inputLabel}>Email liên hệ</label>
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
            <div className={styles.alertError}>Không thể tìm thấy thông tin trung tâm.</div>
          )}
        </div>
      </main>
    </div>
  );
};

export default EditCenterPage;
