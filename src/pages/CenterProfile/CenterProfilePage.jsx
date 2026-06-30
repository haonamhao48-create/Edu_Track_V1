import React, { useState, useEffect, useRef } from 'react';
import { centerService } from '../../services/centerService';
import styles from './CenterProfilePage.module.css';

const CenterProfilePage = ({ onNavigate }) => {
  const [profile, setProfile] = useState(() => {
    const cached = sessionStorage.getItem('cached_center_profile');
    return cached ? JSON.parse(cached) : null;
  });
  const [loading, setLoading] = useState(() => {
    const cached = sessionStorage.getItem('cached_center_profile');
    const needsReload = sessionStorage.getItem('center_profile_needs_reload') === 'true';
    return !cached || needsReload;
  });
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  
  // Form fields
  const [name, setName] = useState(() => {
    const cached = sessionStorage.getItem('cached_center_profile');
    if (cached) {
      const data = JSON.parse(cached);
      return data.name || '';
    }
    return '';
  });
  const [address, setAddress] = useState(() => {
    const cached = sessionStorage.getItem('cached_center_profile');
    if (cached) {
      const data = JSON.parse(cached);
      return data.address || '';
    }
    return '';
  });
  
  // Feedback
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const isSavingRef = useRef(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async (force = false) => {
    const needsReload = sessionStorage.getItem('center_profile_needs_reload') === 'true';
    const hasCache = sessionStorage.getItem('cached_center_profile');

    if (!force && !needsReload && hasCache) {
      setLoading(false);
      const data = JSON.parse(hasCache);
      setName(data.name || '');
      setAddress(data.address || '');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      const data = await centerService.getCenterProfile();
      setProfile(data);
      setName(data.name || '');
      setAddress(data.address || '');
      sessionStorage.setItem('cached_center_profile', JSON.stringify(data));
      sessionStorage.removeItem('center_profile_needs_reload');
    } catch (err) {
      console.error('Lỗi khi tải thông tin trung tâm:', err);
      setErrorMsg(err.message || 'Không thể tải thông tin trung tâm.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = () => {
    setIsEditing(true);
    setSuccessMsg('');
    setErrorMsg('');
  };

  const handleCancelClick = () => {
    setIsEditing(false);
    setName(profile?.name || '');
    setAddress(profile?.address || '');
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (isSavingRef.current) return;
    
    setErrorMsg('');
    setSuccessMsg('');

    if (!name.trim()) {
      setErrorMsg('Tên trung tâm không được để trống.');
      return;
    }

    isSavingRef.current = true;
    setSaving(true);

    try {
      const payload = {
        name: name.trim(),
        address: address.trim()
      };
      await centerService.updateCenterProfile(payload);
      sessionStorage.setItem('center_profile_needs_reload', 'true');
      
      // Update local state and cache
      setProfile(prev => {
        const next = {
          ...prev,
          name: payload.name,
          address: payload.address
        };
        sessionStorage.setItem('cached_center_profile', JSON.stringify(next));
        return next;
      });
      
      window.dispatchEvent(new Event('center_profile_updated'));
      setSuccessMsg('Cập nhật thông tin trung tâm thành công!');
      setIsEditing(false);
    } catch (err) {
      console.error('Lỗi khi lưu thông tin:', err);
      setErrorMsg(err.message || 'Lỗi khi lưu thông tin trung tâm.');
    } finally {
      setSaving(false);
      isSavingRef.current = false;
    }
  };

  const handleLogoClick = () => {
    if (isEditing && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleLogoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Basic file validation
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setErrorMsg('Vui lòng chọn tệp hình ảnh hợp lệ (jpg, png, webp, gif).');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setErrorMsg('Dung lượng ảnh tối đa là 2MB.');
      return;
    }

    setUploadingLogo(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await centerService.updateCenterLogo(file);
      const updatedLogoUrl = res.logoUrl;
      sessionStorage.setItem('center_profile_needs_reload', 'true');
      
      // Update local state and cache
      setProfile(prev => {
        const next = {
          ...prev,
          logo: updatedLogoUrl
        };
        sessionStorage.setItem('cached_center_profile', JSON.stringify(next));
        return next;
      });
      
      window.dispatchEvent(new Event('center_profile_updated'));
      setSuccessMsg('Cập nhật logo trung tâm thành công!');
    } catch (err) {
      console.error('Lỗi khi tải lên logo:', err);
      setErrorMsg(err.message || 'Lỗi khi cập nhật logo trung tâm.');
    } finally {
      setUploadingLogo(false);
      // Reset file input value to allow uploading same file again
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Get initials for avatar fallback
  const getInitials = (title) => {
    if (!title) return 'TT';
    return title
      .split(' ')
      .map(w => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <div className={styles.root}>
            
      <main className={styles.mainContent}>
        <div className={styles.container}>
          {/* Header */}
          <div className={styles.pageHeader}>
            <div>
              <h2 className={styles.pageTitle}>Thông tin trung tâm</h2>
              <p className={styles.pageSubtitle}>Quản lý hồ sơ và thiết lập logo hiển thị của trung tâm</p>
            </div>
          </div>

          {/* Feedback messages */}
          {errorMsg && <div className={styles.alertError}>{errorMsg}</div>}
          {successMsg && <div className={styles.alertSuccess}>{successMsg}</div>}

          {loading ? (
            <div className={styles.loadingContainer}>
              <div className={styles.spinner}></div>
              <p>Đang tải thông tin hồ sơ trung tâm...</p>
            </div>
          ) : profile ? (
            <div className={styles.profileLayout}>
              {/* Left Panel: Logo & Quick Stats */}
              <div className={styles.avatarPanel}>
                <div className={`${styles.avatarWrapper} ${isEditing ? styles.editable : ''}`} onClick={handleLogoClick}>
                  {profile.logo ? (
                    <img src={profile.logo} alt="Center Logo" className={styles.logoImage} />
                  ) : (
                    <div className={styles.initialsAvatar}>{getInitials(profile.name)}</div>
                  )}

                  {isEditing && (
                    <div className={styles.avatarOverlay}>
                      <span className="material-symbols-outlined notranslate" translate="no">photo_camera</span>
                      <span>Đổi ảnh</span>
                    </div>
                  )}

                  {uploadingLogo && (
                    <div className={styles.uploadingOverlay}>
                      <div className={styles.miniSpinner}></div>
                    </div>
                  )}
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  accept="image/*"
                  onChange={handleLogoChange}
                />

                <h3 className={styles.centerName}>{profile.name}</h3>
                <p className={styles.roleBadge}>Hệ thống Trung tâm Giáo dục</p>

                <div className={styles.divider}></div>

                <div className={styles.metaList}>
                  <div className={styles.metaItem}>
                    <span className="material-symbols-outlined notranslate" translate="no">mail</span>
                    <div className={styles.metaContent}>
                      <span className={styles.metaLabel}>Email liên hệ</span>
                      <span className={styles.metaValue}>{profile.email || 'Chưa cập nhật'}</span>
                    </div>
                  </div>
                  <div className={styles.metaItem}>
                    <span className="material-symbols-outlined notranslate" translate="no">phone</span>
                    <div className={styles.metaContent}>
                      <span className={styles.metaLabel}>Hotline</span>
                      <span className={styles.metaValue}>{profile.hotline || 'Chưa cập nhật'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Panel: Form Fields */}
              <div className={styles.detailsPanel}>
                <div className={styles.panelHeader}>
                  <h3 className={styles.panelTitle}>Chi tiết hồ sơ</h3>
                  {!isEditing && (
                    <button type="button" className={styles.editBtn} onClick={handleEditClick}>
                      <span className="material-symbols-outlined notranslate" translate="no">edit</span>
                      Chỉnh sửa
                    </button>
                  )}
                </div>

                <form onSubmit={handleSave} className={styles.profileForm}>
                  <div className={styles.formGrid}>
                    <div className={styles.inputGroup}>
                      <label className={styles.label}>Tên trung tâm <span className={styles.requiredStar}>*</span></label>
                      <input
                        type="text"
                        disabled={!isEditing || saving}
                        className={`${styles.inputField} ${!isEditing ? styles.readonly : ''}`}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Nhập tên trung tâm của bạn"
                        required
                      />
                    </div>

                    <div className={styles.inputGroup}>
                      <label className={styles.label}>Địa chỉ trung tâm</label>
                      <input
                        type="text"
                        disabled={!isEditing || saving}
                        className={`${styles.inputField} ${!isEditing ? styles.readonly : ''}`}
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Nhập địa chỉ trụ sở chính"
                      />
                    </div>

                    <div className={styles.inputGroup}>
                      <label className={styles.label}>Hotline (Cố định)</label>
                      <input
                        type="text"
                        disabled
                        className={`${styles.inputField} ${styles.readonly}`}
                        value={profile.hotline || ''}
                      />
                      <span className={styles.fieldNote}>Hotline và Email liên kết bảo mật tài khoản. Hãy liên hệ hỗ trợ EduTrack nếu cần thay đổi.</span>
                    </div>

                    <div className={styles.inputGroup}>
                      <label className={styles.label}>Email (Cố định)</label>
                      <input
                        type="email"
                        disabled
                        className={`${styles.inputField} ${styles.readonly}`}
                        value={profile.email || ''}
                      />
                    </div>
                  </div>

                  {isEditing && (
                    <div className={styles.formActions}>
                      <button type="button" className={styles.cancelBtn} onClick={handleCancelClick} disabled={saving}>
                        Hủy bỏ
                      </button>
                      <button type="submit" className={styles.saveBtn} disabled={saving}>
                        <span className="material-symbols-outlined notranslate" translate="no">save</span>
                        {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                      </button>
                    </div>
                  )}
                </form>
              </div>
            </div>
          ) : (
            <div className={styles.errorContainer}>
              <span className="material-symbols-outlined notranslate" translate="no">error</span>
              <p>Không tìm thấy thông tin hồ sơ trung tâm.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default CenterProfilePage;
