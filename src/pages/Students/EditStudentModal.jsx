import React, { useState, useEffect } from 'react';
import Input from '../../components/Input';
import styles from './EditStudentModal.module.css';

const EditStudentModal = ({ isOpen, onClose, student, onSave }) => {
  const [fullName, setFullName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('Nam');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (student) {
      setFullName(student.fullName || student.name || '');
      
      // Handle DateOfBirth format for <input type="date"> (YYYY-MM-DD)
      let dobValue = '';
      if (student.dateOfBirth) {
        try {
          const dobDate = new Date(student.dateOfBirth);
          if (!isNaN(dobDate.getTime())) {
            dobValue = dobDate.toISOString().split('T')[0];
          }
        } catch (e) {
          console.error('Lỗi khi parse ngày sinh:', e);
        }
      }
      setDateOfBirth(dobValue);
      setGender(student.gender || 'Nam');
      setError('');
    }
  }, [student, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setError('Họ và tên không được để trống.');
      return;
    }
    if (!dateOfBirth) {
      setError('Ngày sinh không được để trống.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await onSave({
        fullName,
        dateOfBirth,
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
          <h2>Chỉnh sửa thông tin học sinh</h2>
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
            placeholder="Nhập họ và tên học sinh"
          />

          <Input
            label="Ngày sinh *"
            id="dateOfBirth"
            type="date"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
            required
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

export default EditStudentModal;
