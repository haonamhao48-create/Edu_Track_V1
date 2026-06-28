import React, { useState } from 'react';
import { studentService } from '../../services/studentService';
import styles from './TeacherAttendanceNotePage.module.css';
import { toast } from 'react-hot-toast';

const TeacherAttendanceNotePage = ({ onNavigate }) => {
  const urlParams = new URLSearchParams(window.location.search);
  const classId = urlParams.get('classId');
  const sessionId = urlParams.get('sessionId');
  const from = urlParams.get('from') || '';

  const student = JSON.parse(sessionStorage.getItem('tempStudentData') || 'null');
  const session = JSON.parse(sessionStorage.getItem('tempSessionData') || 'null');
  const classData = JSON.parse(sessionStorage.getItem('tempClassData') || 'null');
  
  const [note, setNote] = useState(student?.currentNote || '');

  const handleSave = () => {
    if (!note.trim()) {
      toast.error('Vui lòng nhập nội dung ghi chú.');
      return;
    }
    // TODO: Gọi API lưu ghi chú
    toast.success(`Đã lưu ghi chú cho ${student?.fullName || student?.name}: ${note}`);
    onNavigate(`teacher-manual-attendance?classId=${classId}&sessionId=${sessionId}&from=${from}`);
  };

  return (
    <div className={styles.classesRoot}>
                  <main className={styles.mainContent}>
        <div className={styles.container}>
          <div className={styles.header}>
            <button className={styles.backBtn} onClick={() => onNavigate(`teacher-manual-attendance?classId=${classId}&sessionId=${sessionId}&from=${from}`)}>
              <span className="material-symbols-outlined notranslate" translate="no">arrow_back</span>
              Quay lại
            </button>
            <h2 style={{ marginLeft: '16px' }}>Ghi chú điểm danh</h2>
          </div>
          
          <div className={styles.content}>
            <h3 style={{ marginBottom: '24px' }}>Học sinh: {student?.fullName || student?.name}</h3>
            <div className={styles.formGroup}>
              <label>Ghi chú</label>
              <textarea 
                className={styles.textArea} 
                rows={5} 
                value={note} 
                onChange={(e) => setNote(e.target.value)} 
                placeholder="Ví dụ: Đi muộn do kẹt xe..."
              />
            </div>
            <button className={styles.submitBtn} onClick={handleSave}>Lưu ghi chú</button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TeacherAttendanceNotePage;
