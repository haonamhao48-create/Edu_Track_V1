import React, { useState, useEffect, useRef } from 'react';
import { classService } from '../../services/classService';
import { studentService } from '../../services/studentService';
import { teacherService } from '../../services/teacherService';
import styles from './TeacherClassesPage.module.css';

const TeacherClassesPage = ({ onNavigate }) => {
  const [classList, setClassList] = useState([]);
  const [loading, setLoading] = useState(true);
  const fetchIdRef = useRef(0);

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    setLoading(true);
    try {
      const [res, profRes] = await Promise.all([
        classService.getMyClasses().catch(() => []),
        teacherService.getProfileMe().catch(() => null)
      ]);
      
      const list = Array.isArray(res) ? res : (res?.data || []);
      
      let fallbackCenterName = 'Đang cập nhật';
      const profData = profRes?.data || profRes;
      if (profData?.centerName) fallbackCenterName = profData.centerName;

      const updatedList = list.map(cls => ({
        ...cls,
        centerName: cls.centerName || fallbackCenterName,
        studentCount: cls.totalStudents ?? cls.TotalStudents ?? cls.studentCounts ?? cls.studentCount ?? 0,
        subject: cls.subject || 'Đang cập nhật'
      }));

      setClassList(updatedList);
    } catch (err) {
      console.error('Error fetching classes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectClass = (cls) => {
    const classId = cls.classId || cls.id;
    if (onNavigate) {
      onNavigate(`teacher-class-detail?classId=${classId}`);
    }
  };

  return (
    <div className={styles.classesRoot}>
            
      <main className={styles.mainContent}>
        <div className={styles.container}>
          
          {loading ? (
            <div className={styles.loadingSpinner}>Đang tải danh sách lớp học...</div>
          ) : (
            <>
              <div className={styles.pageHeader}>
                <h3 className={styles.pageTitle}>Lớp học của tôi</h3>
                <p className={styles.pageSubtitle}>Danh sách các lớp học bạn đang giảng dạy trực tiếp.</p>
              </div>

              {classList.length === 0 ? (
                <div className={styles.emptyStateContainer}>
                  <span className="material-symbols-outlined notranslate" translate="no">school</span>
                  <h5>Bạn chưa được phân công lớp học nào</h5>
                  <p>Liên hệ quản trị viên trung tâm để cập nhật lịch dạy.</p>
                </div>
              ) : (
                <div className={styles.classesGrid}>
                  {classList.map((cls, idx) => (
                    <div key={idx} className={styles.classCard} onClick={() => handleSelectClass(cls)}>
                      <div className={styles.classCardTop}>
                        <div className={styles.classAvatar}>
                          {cls.className.charAt(0)}
                        </div>
                        <div>
                          <h4>{cls.className}</h4>
                          <p>{cls.centerName || 'Đang cập nhật'}</p>
                        </div>
                      </div>
                      <div className={styles.classCardBody}>
                        <div className={styles.classDetailItem}>
                          <span className="material-symbols-outlined notranslate" translate="no">group</span>
                          <span>{cls.studentCount === 'Đang tải...' ? 'Đang lấy sĩ số...' : `${cls.studentCount} học sinh ghi danh`}</span>
                        </div>
                        <div className={styles.classDetailItem}>
                          <span className="material-symbols-outlined notranslate" translate="no">subject</span>
                          <span>Môn học: {cls.subject || 'Đang cập nhật'}</span>
                        </div>
                      </div>
                      <div className={styles.classCardFooter}>
                        <span>Xem chi tiết lớp</span>
                        <span className="material-symbols-outlined notranslate" translate="no">arrow_forward</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default TeacherClassesPage;
