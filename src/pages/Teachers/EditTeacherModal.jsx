import React, { useState, useEffect } from 'react';
import Input from '../../components/Input';
import styles from './EditTeacherModal.module.css';

const EditTeacherModal = ({ isOpen, onClose, teacher, onSave }) => {
  const [fullName, setFullName] = useState('');
  const [expertise, setExpertise] = useState('');
  const [address, setAddress] = useState('');
  const [gender, setGender] = useState('Nam');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (teacher) {
      setFullName(teacher.fullName || '');
      setExpertise(teacher.expertise || '');
      setAddress(teacher.address || '');
      setGender(teacher.gender || 'Nam');
      setError('');
    }
  }, [teacher, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setError('Họ và tên không được để trống.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await onSave({
        fullName,
        expertise,
        address,
        gender
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Lỗi khi cập nhật thông tin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>Chỉnh sửa thông tin giáo viên</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.modalBody}>
          {error && <div className={styles.errorMessage}>{error}</div>}

          <Input
            label="Họ và tên *"
            id="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            placeholder="Nhập họ và tên giáo viên"
          />

          <Input
            label="Chuyên môn"
            id="expertise"
            value={expertise}
            onChange={(e) => setExpertise(e.target.value)}
            placeholder="Nhập chuyên môn (Ví dụ: Toán, Tiếng Anh)"
          />

          <div className={styles.selectWrapper}>
            <label className={styles.selectLabel}>Giới tính</label>
            <select
              className={styles.selectInput}
              value={gender}
              onChange={(e) => setGender(e.target.value)}
            >
              <option value="Nam">Nam</option>
              <option value="Nữ">Nữ</option>
              <option value="Khác">Khác</option>
            </select>
          </div>

          <Input
            label="Địa chỉ"
            id="address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Nhập địa chỉ giáo viên"
          />

          <div className={styles.modalFooter}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={onClose}
              disabled={loading}
            >
              Hủy
            </button>
            <button
              type="submit"
              className={styles.saveBtn}
              disabled={loading}
            >
              {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditTeacherModal;
