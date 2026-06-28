import React, { useState, useEffect } from 'react';

import { adminService } from '../../services/adminService';
import styles from './EditParentPage.module.css';

const EditParentPage = ({ onNavigate }) => {
  const [parentId, setParentId] = useState(null);
  const [parent, setParent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Editable Form fields
  const [fullName, setFullName] = useState('');
  const [address, setAddress] = useState('');
  
  // Read-only fields
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [imageUrl, setImageUrl] = useState('');

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const storedParentId = localStorage.getItem('selectedParentIdForEdit');
    if (!storedParentId) {
      setError('Không tìm thấy ID phụ huynh cần chỉnh sửa.');
      setLoading(false);
      return;
    }
    setParentId(storedParentId);

    const editMode = localStorage.getItem('parentEditMode') === 'true';
    if (editMode) {
      setIsEditing(true);
      localStorage.removeItem('parentEditMode');
    }

    const fetchInitData = async () => {
      try {
        const detail = await adminService.getParentDetail(storedParentId);
        setParent(detail);
        
        // Populate form
        setFullName(detail.fullName || '');
        setAddress(detail.address || '');
        setEmail(detail.email || '');
        setPhone(detail.phoneNumber || '');
        setIsActive(detail.isActive !== false);
        setImageUrl(detail.imageUrl || '');
      } catch (err) {
        console.error('Lỗi khi tải chi tiết phụ huynh:', err);
        setError('Không thể tải thông tin chi tiết phụ huynh.');
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
    if (parent) {
      setFullName(parent.fullName || '');
      setAddress(parent.address || '');
    }
    setIsEditing(false);
    setError('');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setError('Vui lòng nhập họ và tên phụ huynh.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const updatedData = {
        fullName: fullName.trim(),
        address: address.trim() || null,
      };

      await adminService.updateParent(parentId, updatedData);
      
      setParent(prev => ({
        ...prev,
        ...updatedData
      }));

      setSuccess('Cập nhật thông tin phụ huynh thành công.');
      setIsEditing(false);
      sessionStorage.setItem('parents_needs_reload', 'true');
    } catch (err) {
      console.error(err);
      setError(err?.data?.message || err?.message || 'Có lỗi xảy ra khi lưu thay đổi.');
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (text) => {
    if (!text) return 'PH';
    return text.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  };

  return (
    <div className={styles.editParentRoot}>
      
      <main className={styles.mainContent}>
        <div className={styles.container}>
          {/* Breadcrumbs & Header */}
          <div className={styles.pageHeader}>
            <div>
              <nav className={styles.breadcrumbs}>
                <button className={styles.breadcrumbLink} onClick={() => onNavigate('admin-parents')}>Quản lý Phụ huynh</button>
                <span className="material-symbols-outlined notranslate text-[14px]" translate="no">chevron_right</span>
                <span className={styles.breadcrumbActive}>Chi tiết phụ huynh</span>
              </nav>
              <h2 className={styles.pageTitle}>Hồ sơ phụ huynh</h2>
            </div>
            
            <div className={styles.headerActions}>
              {!isEditing ? (
                <>
                  <button className={styles.cancelBtn} onClick={() => onNavigate('admin-parents')}>
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
              <p>Đang tải thông tin phụ huynh...</p>
            </div>
          ) : parent ? (
            <div className={styles.gridContainer}>
              {/* Profile Card Column */}
              <div className={styles.profileCard}>
                <div className={styles.avatarWrapper}>
                  {imageUrl ? (
                    <img src={imageUrl} alt={fullName} className={styles.avatarImage} />
                  ) : (
                    <div className={styles.avatarPlaceholder}>
                      {getInitials(fullName)}
                    </div>
                  )}
                </div>
                <h3 className={styles.profileName}>{fullName}</h3>
                <p className={styles.profileRole}>Phụ huynh Học sinh</p>
                <div className={styles.profileStatus}>
                  <span className={`${styles.statusBadge} ${isActive ? styles.statusActive : styles.statusInactive}`}>
                    {isActive ? 'Đang hoạt động' : 'Đã vô hiệu hóa'}
                  </span>
                </div>
              </div>

              {/* Form Info Column */}
              <form onSubmit={handleSave} className={styles.formContainer}>
                {/* Section 1: Parent Profile Information */}
                <section className={styles.formSection}>
                  <div className={styles.sectionHeader}>
                    <span className="material-symbols-outlined notranslate text-primary" translate="no">person</span>
                    <h3 className={styles.sectionTitle}>Thông tin phụ huynh</h3>
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
                        placeholder="Nhập họ và tên phụ huynh"
                      />
                    </div>

                    <div className={styles.fullWidth}>
                      <label className={styles.inputLabel}>Địa chỉ liên lạc</label>
                      <input
                        className={isEditing ? styles.inputField : styles.inputFieldDisabled}
                        disabled={!isEditing}
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Nhập địa chỉ nhà riêng/cơ quan"
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
                      <label className={styles.inputLabel}>Email đăng nhập</label>
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
            <div className={styles.alertError}>Không thể tìm thấy thông tin phụ huynh.</div>
          )}
        </div>
      </main>
    </div>
  );
};

export default EditParentPage;
