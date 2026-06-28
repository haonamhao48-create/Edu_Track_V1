import React, { useState, useEffect, useRef } from 'react';
import { attendanceService } from '../../services/attendanceService';
import { studentService } from '../../services/studentService';
import { scheduleService } from '../../services/scheduleService';
import { classService } from '../../services/classService';
import styles from './TeacherQrAttendancePage.module.css';
import { toast } from 'react-hot-toast';

const normalizeId = (value) => String(value ?? '').trim();

const getStudentDisplayName = (record, studentList) => {
  const directName =
    record?.studentName ||
    record?.fullName ||
    record?.name ||
    record?.studentFullName;

  if (directName) return directName;

  const matchedStudent = studentList.find((student) => {
    const candidateIds = [
      student?.studentId,
      student?.id,
      student?.profileId,
      student?.userId,
    ].map(normalizeId);

    const recordIds = [
      record?.studentId,
      record?.id,
      record?.studentProfileId,
      record?.profileId,
      record?.userId,
    ].map(normalizeId);

    return candidateIds.some((candidateId) => candidateId && recordIds.includes(candidateId));
  });

  return matchedStudent?.fullName || matchedStudent?.name || `ID: ${record?.studentId || record?.id}`;
};

const TeacherQrAttendancePage = ({ onNavigate }) => {
  const urlParams = new URLSearchParams(window.location.search);
  const classId = urlParams.get('classId');
  const sessionId = urlParams.get('sessionId');
  const from = urlParams.get('from') || '';

  const [session, setSession] = useState(null);
  const [classData, setClassData] = useState(null);

  const [qrBase64, setQrBase64] = useState('');
  const [remainingSeconds, setRemainingSeconds] = useState(600);
  const [checkedInStudents, setCheckedInStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);

  const countdownTimer = useRef(null);
  const pollingTimer = useRef(null);
  const visibilityListenerRef = useRef(null);

  useEffect(() => {
    if (classId && sessionId) {
      initQr();
    } else {
      setLoading(false);
    }
    return () => {
      clearInterval(countdownTimer.current);
      clearInterval(pollingTimer.current);
      if (visibilityListenerRef.current) {
        document.removeEventListener('visibilitychange', visibilityListenerRef.current);
      }
    };
  }, [classId, sessionId]);

  const initQr = async () => {
    try {
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
      setStudents(stdList);

      const qrRes = await attendanceService.generateQR(sessionId);
      const qrData = qrRes?.data || qrRes;
      
      if (!qrData || (!qrData.qrBase64 && !qrData.qrImageBase64)) {
        toast.error('Không tạo được mã QR.');
        return;
      }
      
      const b64 = qrData?.qrImageBase64 || qrData?.qrBase64;
      const expiredAt = qrData?.qrExpiredAt || qrData?.expiredAt;

      if (b64) {
        setQrBase64(b64.includes(',') ? b64 : `data:image/png;base64,${b64}`);
        if (expiredAt) {
          const diff = Math.floor((new Date(expiredAt).getTime() - Date.now()) / 1000);
          setRemainingSeconds(diff > 0 ? diff : 600);
        }
        startTimers(stdList);
      }
    } catch (err) {
      console.error('Error init QR:', err);
      toast.error('Không tạo được mã QR.');
    } finally {
      setLoading(false);
    }
  };

  const startTimers = (studentList) => {
    const fetchCheckedInStudents = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const records = await attendanceService.getRecordsBySession(sessionId);
        const recList = Array.isArray(records) ? records : (records?.data || []);

        const checkedIn = recList
          .filter(r => r.status === 'PRESENT' || r.status === 'LATE')
          .map(r => {
            const d = r.checkInAt ? new Date(r.checkInAt) : new Date();
            return {
              id: r.studentId || r.id,
              name: getStudentDisplayName(r, studentList),
              time: `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
            };
          });
        setCheckedInStudents(checkedIn);
      } catch (e) {}
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchCheckedInStudents();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    visibilityListenerRef.current = handleVisibility;

    countdownTimer.current = setInterval(() => {
      setRemainingSeconds(prev => {
        if (prev <= 1) {
          clearInterval(countdownTimer.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    fetchCheckedInStudents();
    pollingTimer.current = setInterval(fetchCheckedInStudents, 3000);
  };

  const handleComplete = async () => {
    clearInterval(countdownTimer.current);
    clearInterval(pollingTimer.current);
    try {
      const expectedIds = students.map(s => s.studentId || s.id);
      await attendanceService.closeSession(sessionId, expectedIds);
      
      const records = await attendanceService.getRecordsBySession(sessionId);
      const recList = Array.isArray(records) ? records : (records?.data || []);
      const recordMap = {};
      recList.forEach(r => { recordMap[r.studentId] = r; });

      let presentCount = 0; let absentCount = 0; let lateCount = 0;
      const absentAndLateStudents = [];

      students.forEach(std => {
        const rec = recordMap[std.studentId || std.id];
        const st = rec?.status || 'ABSENT';
        if (st === 'PRESENT') presentCount++;
        else if (st === 'LATE') { lateCount++; absentAndLateStudents.push({ name: std.fullName || std.name, status: 'LATE' }); }
        else { absentCount++; absentAndLateStudents.push({ name: std.fullName || std.name, status: 'ABSENT' }); }
      });

      const reportData = {
        className: classData?.className,
        sessionDate: session?.sessionDate,
        time: `${session?.startTime} - ${session?.endTime}`,
        totalCount: students.length,
        presentCount, absentCount, lateCount, absentAndLateStudents,
        method: 'Điểm danh Quét QR'
      };

      sessionStorage.setItem('tempReportData', JSON.stringify(reportData));
      toast.success('Đã chốt phiên điểm danh!');
      onNavigate(`teacher-attendance-success?classId=${classId}&sessionId=${sessionId}&from=${from}`);
    } catch (e) {
      toast.error('Đã chốt phiên điểm danh!');
      if (from === 'class-detail') {
        onNavigate(`teacher-class-detail?classId=${classId}`);
      } else if (from === 'session-detail') {
        onNavigate(`teacher-session-detail?classId=${classId}&scheduleId=${sessionId}`);
      } else {
        onNavigate('teacher-schedule');
      }
    }
  };

  const formatDuration = (s) => `${String(Math.floor(s / 60)).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`;

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
                <span className="material-symbols-outlined notranslate" translate="no">arrow_back</span> Quay lại
              </button>
              <h2 style={{ marginLeft: '16px' }}>Điểm danh QR</h2>
            </div>
            <button className={styles.primaryBtn} onClick={handleComplete}>Chốt điểm danh</button>
          </div>

          {loading ? (
            <p>Đang tạo mã QR...</p>
          ) : (
            <div className={styles.content}>
              <div className={styles.qrSection}>
                <h3>Yêu cầu học sinh quét mã để điểm danh</h3>
                {qrBase64 ? (
                  <div className={styles.qrImage}>
                    <img src={qrBase64} alt="QR Code" />
                  </div>
                ) : (
                  <p>Lỗi hiển thị mã QR.</p>
                )}
                <div className={styles.countdown}>Hết hạn sau: {formatDuration(remainingSeconds)}</div>
              </div>
              <div className={styles.checkedInList}>
                <h3>Đã điểm danh ({checkedInStudents.length}/{students.length})</h3>
                <div style={{ marginTop: '16px' }}>
                  {checkedInStudents.map((s, i) => (
                    <div key={i} className={styles.checkedInItem}>
                      <span>{s.name}</span>
                      <span style={{ color: '#6b7280', fontSize: '14px' }}>{s.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default TeacherQrAttendancePage;
