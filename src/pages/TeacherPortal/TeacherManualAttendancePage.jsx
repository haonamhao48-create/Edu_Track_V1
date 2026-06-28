import React, { useState, useEffect, useRef } from 'react';
import { studentService } from '../../services/studentService';
import { attendanceService } from '../../services/attendanceService';
import { scheduleService } from '../../services/scheduleService';
import { classService } from '../../services/classService';
import styles from './TeacherManualAttendancePage.module.css';
import { toast } from 'react-hot-toast';

const TeacherManualAttendancePage = ({ onNavigate }) => {
  const urlParams = new URLSearchParams(window.location.search);
  const classId = urlParams.get('classId');
  const sessionId = urlParams.get('sessionId');
  const from = urlParams.get('from') || '';

  const [session, setSession] = useState(null);
  const [classData, setClassData] = useState(null);
  const [students, setStudents] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const initialDataRef = useRef([]);

  useEffect(() => {
    if (classId && sessionId) {
      loadStudentsAndRecords();
    } else {
      setLoading(false);
    }
  }, [classId, sessionId]);

  const loadStudentsAndRecords = async () => {
    try {
      // Fetch class data and attendance sessions in parallel (non-blocking)
      classService.getMyClasses().then(res => {
        const list = Array.isArray(res) ? res : (res?.data || []);
        setClassData(list.find(x => String(x.classId || x.id) === String(classId)));
      }).catch(() => {});

      attendanceService.getSessionsByClass(classId).then(res => {
        const list = Array.isArray(res) ? res : (res?.data || []);
        const currentSession = list.find(s => String(s.id || s.sessionId) === String(sessionId));
        setSession(currentSession);
      }).catch(() => {});

      const stdRes = await studentService.getStudentsByClass(classId);
      const stdList = Array.isArray(stdRes) ? stdRes : (stdRes?.items || stdRes?.data || []);
      
      const records = await attendanceService.getRecordsBySession(sessionId).catch(() => []);
      const recordMap = {};
      (Array.isArray(records) ? records : (records?.data || [])).forEach(r => {
        recordMap[r.studentId] = r;
      });

      const initialData = stdList.map(std => {
        const sId = std.studentId || std.id;
        const existingRec = recordMap[sId];
        return {
          studentId: sId,
          name: std.fullName || std.name || '',
          avatar: std.avatarUrl || std.avatar || '',
          status: existingRec ? existingRec.status : 'PRESENT',
          note: existingRec ? (existingRec.note || '') : '',
          recordId: existingRec ? existingRec.id : null
        };
      });

      setStudents(stdList);
      setAttendanceData(initialData);
      initialDataRef.current = JSON.parse(JSON.stringify(initialData));
    } catch (err) {
      console.error('Error loading data for manual attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (studentId, status) => {
    setAttendanceData(prev => prev.map(item => item.studentId === studentId ? { ...item, status } : item));
  };

  const markAllPresent = () => {
    setAttendanceData(prev => prev.map(item => ({ ...item, status: 'PRESENT' })));
  };

  const submitAttendance = async () => {
    setLoading(true);
    try {
      const teacherId = localStorage.getItem('teacher_id') || '';
      const errList = [];
      
      // Only submit records that have changed status or note compared to the loaded initial state, or are new
      const changedRecords = attendanceData.filter(std => {
        const initial = initialDataRef.current.find(i => i.studentId === std.studentId);
        if (!initial) return true;
        return std.status !== initial.status || std.note !== initial.note;
      });

      // Chunk requests into batches of 5 to avoid browser connection bottlenecks and server thrashing
      const chunkArray = (array, size) => {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
          chunks.push(array.slice(i, i + size));
        }
        return chunks;
      };

      const chunks = chunkArray(changedRecords, 5);
      for (const chunk of chunks) {
        await Promise.all(
          chunk.map(async (std) => {
            try {
              await attendanceService.manualAttendance({
                sessionId: sessionId,
                teacherId: teacherId,
                studentId: std.studentId,
                status: std.status,
                note: std.note
              });
            } catch (err) {
              errList.push(err);
            }
          })
        );
      }

      const expectedIds = attendanceData.map(d => d.studentId);
      await attendanceService.closeSession(sessionId, expectedIds);

      // Prepare report data and navigate to success
      const presentCount = attendanceData.filter(d => d.status === 'PRESENT').length;
      const absentCount = attendanceData.filter(d => d.status === 'ABSENT' || !d.status).length;
      const lateCount = attendanceData.filter(d => d.status === 'LATE').length;
      const absentAndLateStudents = attendanceData
        .filter(d => d.status === 'ABSENT' || d.status === 'LATE')
        .map(d => ({ name: d.name, status: d.status, note: d.note }));

      const reportData = {
        className: classData?.className,
        sessionDate: session?.sessionDate,
        time: `${session?.startTime} - ${session?.endTime}`,
        room: session?.roomName || 'A02',
        totalCount: attendanceData.length,
        presentCount,
        absentCount,
        lateCount,
        absentAndLateStudents,
        method: 'Điểm danh Thủ công'
      };

      if (errList.length > 0) {
        toast.error('Đã lưu kết quả (với một số lỗi mạng).');
        console.log(errList);
      } else {
        toast.success('Điểm danh thành công!');
      }

      sessionStorage.setItem('tempReportData', JSON.stringify(reportData));
      onNavigate(`teacher-attendance-success?classId=${classId}&sessionId=${sessionId}&from=${from}`);
    } catch (err) {
      console.error('Error saving manual attendance:', err);
      toast.error('Đã lưu kết quả (với một số lỗi mạng).');
      onNavigate('teacher-classes');
    } finally {
      setLoading(false);
    }
  };

  const openNotePage = (student) => {
    const dataItem = attendanceData.find(d => d.studentId === (student.studentId || student.id));
    sessionStorage.setItem('tempStudentData', JSON.stringify({ ...student, currentNote: dataItem?.note }));
    onNavigate(`teacher-attendance-note?classId=${classId}&sessionId=${sessionId}&from=${from}`);
  };

  return (
    <div className={styles.classesRoot}>
                  <main className={styles.mainContent}>
        <div className={styles.container}>
          <div className={styles.header}>
            <div className={styles.leftHeader}>
              <button 
                className={styles.backBtn} 
                onClick={() => {
                  if (from === 'class-detail') {
                    onNavigate(`teacher-class-detail?classId=${classId}`);
                  } else if (from === 'session-detail') {
                    onNavigate(`teacher-session-detail?classId=${classId}&scheduleId=${sessionId}`);
                  } else {
                    onNavigate('teacher-schedule');
                  }
                }}
              >
                <span className="material-symbols-outlined notranslate" translate="no">arrow_back</span>
                Quay lại
              </button>
              <h2 style={{ marginLeft: '16px' }}>Điểm danh thủ công</h2>
            </div>
            <div className={styles.actions}>
              <button className={styles.outlineBtn} onClick={markAllPresent}>Đánh dấu Có mặt tất cả</button>
              <button className={styles.primaryBtn} onClick={submitAttendance}>Lưu điểm danh</button>
            </div>
          </div>
          
          <div className={styles.content}>
            {loading ? (
              <p style={{ padding: '24px' }}>Đang tải danh sách...</p>
            ) : attendanceData.length === 0 ? (
              <p style={{ padding: '24px' }}>Không có học sinh trong lớp này.</p>
            ) : (
              attendanceData.map((data, idx) => (
                <div key={idx} className={styles.studentRow}>
                  <div className={styles.studentInfo}>
                    <div className={styles.avatar}>{(data.name || 'H').charAt(0)}</div>
                    <div>
                      <p className={styles.studentName}>{data.name}</p>
                      <p className={styles.studentId}>ID: {data.studentId}</p>
                    </div>
                  </div>
                  <div className={styles.attendanceControls}>
                    <div className={styles.radioGroup}>
                      <label className={styles.radioLabel}>
                        <input type="radio" name={`status-${data.studentId}`} checked={data.status === 'PRESENT'} onChange={() => handleStatusChange(data.studentId, 'PRESENT')} /> Có mặt
                      </label>
                      <label className={styles.radioLabel}>
                        <input type="radio" name={`status-${data.studentId}`} checked={data.status === 'ABSENT'} onChange={() => handleStatusChange(data.studentId, 'ABSENT')} /> Vắng
                      </label>
                      <label className={styles.radioLabel}>
                        <input type="radio" name={`status-${data.studentId}`} checked={data.status === 'LATE'} onChange={() => handleStatusChange(data.studentId, 'LATE')} /> Muộn
                      </label>
                    </div>
                    <button 
                      className={`${styles.noteBtn} ${data.note ? styles.hasNote : ''}`} 
                      title={data.note ? `Ghi chú: ${data.note}` : 'Thêm ghi chú'}
                      onClick={() => openNotePage(students.find(s => (s.studentId || s.id) === data.studentId))}
                    >
                      <span className="material-symbols-outlined notranslate" translate="no">edit_note</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default TeacherManualAttendancePage;
