import React, { useState, useEffect } from 'react';
import { teacherService } from '../../services/teacherService';
import { authService } from '../../services/authService';
import toast from 'react-hot-toast';
import styles from './TeacherAccountPage.module.css';

const TeacherAccountPage = ({ onNavigate }) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ fullName: '', expertise: '', address: '', email: '', phoneNumber: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await teacherService.getProfileMe();
      const data = res?.data || res;
      setProfile(data);
      setEditForm({
        fullName: data?.fullName || '',
        expertise: data?.expertise || '',
        address: data?.address || '',
        email: data?.email || '',
        phoneNumber: data?.phoneNumber || ''
      });
    } catch (err) {
      console.error('Error loading profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updateTasks = [];
      updateTasks.push(teacherService.updateProfileMe({
        fullName: editForm.fullName,
        expertise: editForm.expertise,
        address: editForm.address
      }));

      const authUpdates = {};
      if (editForm.email !== profile.email) authUpdates.email = editForm.email;
      if (editForm.phoneNumber !== profile.phoneNumber) authUpdates.phoneNumber = editForm.phoneNumber;

      if (Object.keys(authUpdates).length > 0) {
        updateTasks.push(authService.updateInformation(authUpdates));
      }

      await Promise.all(updateTasks);

      setProfile(prev => ({ ...prev, ...editForm }));
      setIsEditing(false);
      toast.success('Cập nhật hồ sơ thành công!');
    } catch (err) {
      console.error('Error updating profile:', err);
      // Determine error message from backend if available
      const errMsg = err?.response?.data?.message || err?.message || 'Có lỗi xảy ra khi cập nhật hồ sơ.';
      toast.error('Cập nhật thất bại: ' + errMsg);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  return (
    <div className={styles.pageRoot}>
                  <main className={styles.mainContent}>
        <div className={styles.container}>
          <button className={styles.backBtn} onClick={() => onNavigate('teacher-profile')}>
            <span className="material-symbols-outlined notranslate" translate="no">arrow_back</span>
            Quay lại
          </button>
          
          <div className={styles.pageHeader}>
            <h3 className={styles.pageTitle}>Hồ sơ cá nhân</h3>
            <p className={styles.pageSubtitle}>Thông tin chi tiết về tài khoản giảng viên của bạn.</p>
          </div>

          {loading ? (
            <div className={styles.loadingSpinner}>Đang tải thông tin tài khoản...</div>
          ) : (
            <div className={styles.contentCard}>
              <div className={styles.profileHeaderSection}>
                <div className={styles.avatarCircle}>
                  {(profile?.fullName || 'T').charAt(0)}
                </div>
                <div style={{ flex: 1 }}>
                  {isEditing ? (
                    <input 
                      name="fullName"
                      className={styles.inputField} 
                      value={editForm.fullName} 
                      onChange={handleChange} 
                      placeholder="Họ và tên"
                    />
                  ) : (
                    <>
                      <h4>{profile?.fullName || 'Giáo viên'}</h4>
                      <p>{profile?.centerName || 'Đang cập nhật'}</p>
                    </>
                  )}
                </div>
                {!isEditing ? (
                  <button className={styles.editBtn} onClick={() => setIsEditing(true)}>Chỉnh sửa</button>
                ) : (
                  <div>
                    <button className={styles.cancelBtn} onClick={() => setIsEditing(false)} disabled={saving}>Hủy</button>
                    <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
                      {saving ? 'Đang lưu...' : 'Lưu lại'}
                    </button>
                  </div>
                )}
              </div>

              <div className={styles.detailsGrid}>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Mã giáo viên</span>
                  <span className={styles.detailValue}>{profile?.id || profile?.teacherId || 'N/A'}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Địa chỉ Email</span>
                  {isEditing ? (
                    <input 
                      name="email"
                      type="email"
                      className={styles.inputField} 
                      value={editForm.email} 
                      onChange={handleChange} 
                      placeholder="Email liên hệ..."
                    />
                  ) : (
                    <span className={styles.detailValue}>{profile?.email || 'Chưa cập nhật'}</span>
                  )}
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Số điện thoại</span>
                  {isEditing ? (
                    <input 
                      name="phoneNumber"
                      className={styles.inputField} 
                      value={editForm.phoneNumber} 
                      onChange={handleChange} 
                      placeholder="Số điện thoại..."
                    />
                  ) : (
                    <span className={styles.detailValue}>{profile?.phoneNumber || 'Chưa cập nhật'}</span>
                  )}
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Chuyên môn giảng dạy</span>
                  {isEditing ? (
                    <input 
                      name="expertise"
                      className={styles.inputField} 
                      value={editForm.expertise} 
                      onChange={handleChange} 
                      placeholder="VD: Toán học, Lập trình..."
                    />
                  ) : (
                    <span className={styles.detailValue}>{profile?.expertise || 'Chưa cập nhật'}</span>
                  )}
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Địa chỉ</span>
                  {isEditing ? (
                    <input 
                      name="address"
                      className={styles.inputField} 
                      value={editForm.address} 
                      onChange={handleChange} 
                      placeholder="Địa chỉ liên hệ..."
                    />
                  ) : (
                    <span className={styles.detailValue}>{profile?.address || 'Chưa cập nhật'}</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default TeacherAccountPage;
