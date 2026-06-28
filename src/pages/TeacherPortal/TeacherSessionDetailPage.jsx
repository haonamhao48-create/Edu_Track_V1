import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { attendanceService } from '../../services/attendanceService';
import { assessmentService } from '../../services/assessmentService';
import { scheduleService } from '../../services/scheduleService';
import { studentService } from '../../services/studentService';
import styles from './TeacherSessionDetailPage.module.css';

const normalizeId = (value) => String(value ?? '').trim();
const getStudentId = (student) => normalizeId(student?.studentId || student?.id || student?.code || '');

const formatDate = (dateStr) => {
  if (!dateStr) return 'Chưa có thông tin';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const formatTime = (timeStr) => {
  if (!timeStr) return '--:--';
  return String(timeStr).slice(0, 5);
};

const QUICK_COMMENTS = [
  'Tích cực',
  'Hoàn thành bài tốt',
  'Cần tập trung hơn',
  'Chưa làm bài tập',
  'Cần phụ huynh hỗ trợ',
];

const getStatusLabel = (status) => {
  if (status === 'PRESENT') return 'Có mặt';
  if (status === 'LATE') return 'Đi muộn';
  if (status === 'ABSENT') return 'Vắng mặt';
  return status || 'Chưa điểm danh';
};

const TeacherSessionDetailPage = ({ onNavigate }) => {
  const urlParams = new URLSearchParams(window.location.search);
  const classId = urlParams.get('classId');
  const scheduleId = urlParams.get('scheduleId') || urlParams.get('sessionId');
  const initialAttendanceSessionId = urlParams.get('attendanceSessionId');
  const initialTab = urlParams.get('tab') === 'feedback' ? 'feedback' : 'attendance';
  const from = urlParams.get('from') || '';

  const [session, setSession] = useState(null);
  const [attendanceSessionId, setAttendanceSessionId] = useState(initialAttendanceSessionId || '');
  const [students, setStudents] = useState([]);
  const [records, setRecords] = useState([]);
  const [comments, setComments] = useState([]);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [loading, setLoading] = useState(true);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [savingFeedback, setSavingFeedback] = useState(false);
  const [feedbackForm, setFeedbackForm] = useState({
    scheduleId: scheduleId || '',
    studentId: '',
    behaviorRating: 'Good',
    content: '',
  });
  const [selectedQuickComments, setSelectedQuickComments] = useState([]);

  useEffect(() => {
    if (scheduleId && classId) {
      loadSessionDetail();
    } else {
      setLoading(false);
    }
  }, [scheduleId, classId]);

  const latestCommentsByStudent = useMemo(() => {
    const map = {};
    comments.forEach((comment) => {
      const studentKey = normalizeId(comment.studentId);
      if (!studentKey) return;

      const existing = map[studentKey];
      if (!existing) {
        map[studentKey] = comment;
        return;
      }

      const existingTime = new Date(existing.createdAt || 0).getTime();
      const currentTime = new Date(comment.createdAt || 0).getTime();
      if (currentTime >= existingTime) {
        map[studentKey] = comment;
      }
    });
    return map;
  }, [comments]);

  const studentsWithFeedback = useMemo(() => {
    return students.map((student) => {
      const resolvedStudentId = getStudentId(student);
      const comment = latestCommentsByStudent[resolvedStudentId];
      const note = comment?.content || comment?.note || '';
      const behaviorRating = comment?.behaviorRating || '';
      const isEvaluated = Boolean(
        note.trim() ||
        behaviorRating.trim() ||
        comment?.feedbackStatus === 'EVALUATED'
      );

      return {
        ...student,
        resolvedStudentId,
        note,
        behaviorRating,
        isEvaluated,
      };
    });
  }, [students, latestCommentsByStudent]);

  const enrichedRecords = useMemo(() => {
    return records.map((record) => {
      const matchedStudent = students.find(
        (student) => getStudentId(student) === normalizeId(record.studentId)
      );

      return {
        ...record,
        studentName:
          record.studentName ||
          record.fullName ||
          matchedStudent?.fullName ||
          matchedStudent?.name ||
          'Hoc sinh',
      };
    });
  }, [records, students]);

  const loadSessionDetail = async () => {
    setLoading(true);
    try {
      const [scheduleRes, studentsRes, commentsRes] = await Promise.all([
        scheduleService.getScheduleById(scheduleId),
        studentService.getStudentsByClass(classId),
        assessmentService.getCommentsBySchedule(scheduleId).catch(() => []),
      ]);

      const scheduleData = scheduleRes?.data || scheduleRes;
      const studentList = Array.isArray(studentsRes)
        ? studentsRes
        : (studentsRes?.items || studentsRes?.data || []);
      const commentList = Array.isArray(commentsRes)
        ? commentsRes
        : (commentsRes?.data || []);

      setSession(scheduleData);
      setStudents(studentList);
      setComments(commentList);

      let resolvedAttendanceSessionId = initialAttendanceSessionId || '';
      if (!resolvedAttendanceSessionId) {
        const attendanceSessionsRes = await attendanceService.getSessionsByClass(classId).catch(() => []);
        const attendanceSessions = Array.isArray(attendanceSessionsRes)
          ? attendanceSessionsRes
          : (attendanceSessionsRes?.data || []);

        const matchedAttendanceSession = attendanceSessions.find((attendanceSession) => (
          attendanceSession.sessionDate === scheduleData?.date &&
          normalizeId(attendanceSession.classId) === normalizeId(classId)
        ));

        resolvedAttendanceSessionId =
          matchedAttendanceSession?.id ||
          matchedAttendanceSession?.sessionId ||
          '';
      }

      setAttendanceSessionId(resolvedAttendanceSessionId);

      if (resolvedAttendanceSessionId) {
        const recordsRes = await attendanceService.getRecordsBySession(resolvedAttendanceSessionId).catch(() => []);
        setRecords(Array.isArray(recordsRes) ? recordsRes : (recordsRes?.data || []));
      } else {
        setRecords([]);
      }
    } catch (err) {
      console.error('Error loading session details:', err);
      toast.error('Không thể tải chi tiết ca dạy.');
    } finally {
      setLoading(false);
    }
  };

  const openFeedbackModal = (student) => {
    const initialContent = student.note || '';
    setSelectedStudent(student);
    setFeedbackForm({
      scheduleId: scheduleId || '',
      studentId: student.resolvedStudentId || getStudentId(student),
      behaviorRating: student.behaviorRating || 'Good',
      content: initialContent,
    });
    setSelectedQuickComments(
      QUICK_COMMENTS.filter((tag) => initialContent.includes(tag))
    );
    setShowFeedbackModal(true);
  };

  const toggleQuickComment = (tag) => {
    setSelectedQuickComments((prev) => {
      const exists = prev.includes(tag);
      const next = exists ? prev.filter((item) => item !== tag) : [...prev, tag];

      setFeedbackForm((current) => {
        const currentParts = current.content
          .split(',')
          .map((part) => part.trim())
          .filter(Boolean)
          .filter((part) => !QUICK_COMMENTS.includes(part));

        const merged = [...next, ...currentParts];
        return {
          ...current,
          content: merged.join(', '),
        };
      });

      return next;
    });
  };

  const handleSubmitFeedback = async (event) => {
    event.preventDefault();

    if (!feedbackForm.scheduleId || !feedbackForm.studentId || !feedbackForm.content.trim()) {
      toast.error('Vui lòng nhập đầy đủ dữ liệu nhận xét.');
      return;
    }

    setSavingFeedback(true);
    try {
      await assessmentService.createComment({
        scheduleId: feedbackForm.scheduleId,
        studentId: feedbackForm.studentId,
        content: feedbackForm.content.trim(),
        behaviorRating: feedbackForm.behaviorRating,
      });

      const commentsRes = await assessmentService.getCommentsBySchedule(scheduleId).catch(() => []);
      setComments(Array.isArray(commentsRes) ? commentsRes : (commentsRes?.data || []));

      toast.success('Đã gửi nhận xét thành công.');
      setShowFeedbackModal(false);
      setSelectedStudent(null);
    } catch (err) {
      console.error('Error creating feedback:', err);
      toast.error('Không thể gửi nhận xét. Vui lòng thử lại.');
    } finally {
      setSavingFeedback(false);
    }
  };

  return (
    <div className={styles.classesRoot}>
      <main className={styles.mainContent}>
        <div className={styles.container}>
          <div className={styles.header}>
            <button 
              className={styles.backBtn} 
              onClick={() => {
                if (from === 'class-detail') {
                  onNavigate(`teacher-class-detail?classId=${classId}`);
                } else {
                  onNavigate('teacher-schedule');
                }
              }}
            >
              <span className="material-symbols-outlined notranslate" translate="no">arrow_back</span>
              Quay lại
            </button>
            <h2 className={styles.pageTitle}>Chi tiết ca dạy</h2>
          </div>

          <div className={styles.content}>
            {loading ? (
              <p>Đang tải dữ liệu...</p>
            ) : !scheduleId || !classId ? (
              <p>Không tìm thấy thông tin ca dạy.</p>
            ) : (
              <>
                <div className={styles.summaryCard}>
                  <div>
                    <p className={styles.summaryLabel}>Môn học / lớp</p>
                    <h3>{session?.title || session?.className || 'Ca dạy'}</h3>
                    <p className={styles.summaryMeta}>Lớp: {session?.className || 'Chưa có thông tin'}</p>
                  </div>
                  <div className={styles.summaryInfoGrid}>
                    <div className={styles.summaryInfoItem}>
                      <span className="material-symbols-outlined notranslate" translate="no">calendar_month</span>
                      <div>
                        <p>Ngày dạy</p>
                        <strong>{formatDate(session?.date)}</strong>
                      </div>
                    </div>
                    <div className={styles.summaryInfoItem}>
                      <span className="material-symbols-outlined notranslate" translate="no">schedule</span>
                      <div>
                        <p>Thời gian</p>
                        <strong>{formatTime(session?.startTime)} - {formatTime(session?.endTime)}</strong>
                      </div>
                    </div>
                    <div className={styles.summaryInfoItem}>
                      <span className="material-symbols-outlined notranslate" translate="no">meeting_room</span>
                      <div>
                        <p>Phòng học</p>
                        <strong>{session?.roomName || 'Chưa xếp phòng'}</strong>
                      </div>
                    </div>
                    <div className={styles.summaryInfoItem}>
                      <span className="material-symbols-outlined notranslate" translate="no">groups</span>
                      <div>
                        <p>Sĩ số</p>
                        <strong>{students.length} học sinh</strong>
                      </div>
                    </div>
                  </div>
                </div>

                <div className={styles.topActions}>
                  <button
                    className={styles.primaryActionBtn}
                    onClick={() => onNavigate(`teacher-attendance-method-selection?classId=${classId}&sessionId=${scheduleId}&from=${from}`)}
                  >
                    <span className="material-symbols-outlined notranslate" translate="no">assignment_turned_in</span>
                    Điểm danh
                  </button>
                  <button
                    className={activeTab === 'feedback' ? styles.activeTabBtn : styles.secondaryActionBtn}
                    onClick={() => setActiveTab('feedback')}
                  >
                    <span className="material-symbols-outlined notranslate" translate="no">rate_review</span>
                    Nhận xét
                  </button>
                  <button
                    className={activeTab === 'attendance' ? styles.activeTabBtn : styles.secondaryActionBtn}
                    onClick={() => setActiveTab('attendance')}
                  >
                    <span className="material-symbols-outlined notranslate" translate="no">fact_check</span>
                    Xem điểm danh
                  </button>
                </div>

                {activeTab === 'attendance' ? (
                  <>
                    <h3>Danh sách điểm danh</h3>
                    <div className={styles.recordList}>
                      {attendanceSessionId ? (
                        enrichedRecords.length === 0 ? (
                          <p>Ca dạy này đã có buổi điểm danh nhưng chưa có bản ghi học sinh.</p>
                        ) : (
                          enrichedRecords.map((record, idx) => (
                            <div key={idx} className={styles.recordItem}>
                              <div>
                                <strong>{record.studentName}</strong>
                                {record.note && <p className={styles.recordNote}>Ghi chú: {record.note}</p>}
                              </div>
                              <span
                                className={`${styles.statusBadge} ${
                                  record.status === 'PRESENT'
                                    ? styles.statusPresent
                                    : record.status === 'LATE'
                                      ? styles.statusLate
                                      : styles.statusAbsent
                                }`}
                              >
                                {getStatusLabel(record.status)}
                              </span>
                            </div>
                          ))
                        )
                      ) : (
                        <div className={styles.emptyBox}>
                          <p>Ca dạy này chưa có buổi điểm danh.</p>
                          <button
                            className={styles.inlineActionBtn}
                            onClick={() => onNavigate(`teacher-attendance-method-selection?classId=${classId}&sessionId=${scheduleId}&from=${from}`)}
                          >
                            Tạo điểm danh ngay
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className={styles.feedbackHeader}>
                      <div>
                        <h3>Danh sách học sinh nhận xét</h3>
                        <p className={styles.feedbackHint}>Bấm vào biểu tượng nhận xét để thêm hoặc sửa nhận xét theo buổi học.</p>
                      </div>
                    </div>
                    <div className={styles.studentList}>
                      {studentsWithFeedback.length === 0 ? (
                        <p>Không có học sinh trong lớp này.</p>
                      ) : (
                        studentsWithFeedback.map((student, idx) => (
                          <div key={idx} className={styles.studentItem}>
                            <div className={styles.studentIdentity}>
                              <div className={styles.studentAvatar}>
                                {(student.fullName || student.name || 'H').charAt(0)}
                              </div>
                              <div>
                                <p className={styles.studentName}>{student.fullName || student.name || 'Học sinh'}</p>
                                <div className={`${styles.feedbackBadge} ${student.isEvaluated ? styles.feedbackDone : styles.feedbackPending}`}>
                                  {student.isEvaluated ? 'Đã nhận xét' : 'Chưa nhận xét'}
                                </div>
                                {student.note && (
                                  <p className={styles.commentPreview}>{student.note}</p>
                                )}
                              </div>
                            </div>
                            <button
                              className={styles.commentIconBtn}
                              title="Nhận xét học sinh"
                              onClick={() => openFeedbackModal(student)}
                            >
                              <span className="material-symbols-outlined notranslate" translate="no">rate_review</span>
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      {showFeedbackModal && selectedStudent && (
        <div className={styles.modalOverlay} onClick={() => setShowFeedbackModal(false)}>
          <div className={styles.modalCard} onClick={(event) => event.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h4>Tạo nhận xét học sinh</h4>
                <p>{selectedStudent.fullName || selectedStudent.name}</p>
              </div>
              <button className={styles.closeBtn} onClick={() => setShowFeedbackModal(false)}>
                <span className="material-symbols-outlined notranslate" translate="no">close</span>
              </button>
            </div>

            <form className={styles.feedbackForm} onSubmit={handleSubmitFeedback}>
              <input type="hidden" name="scheduleId" value={feedbackForm.scheduleId} readOnly />
              <input type="hidden" name="studentId" value={feedbackForm.studentId} readOnly />

              <div className={styles.feedbackSessionSummary}>
                <p className={styles.feedbackSessionTitle}>{session?.className || 'Buổi học'}</p>
                <p className={styles.feedbackSessionMeta}>
                  {formatDate(session?.date)} • {formatTime(session?.startTime)} - {formatTime(session?.endTime)}
                </p>
              </div>

              <div className={styles.quickCommentsSection}>
                <p className={styles.quickCommentsTitle}>Nhận xét nhanh</p>
                <div className={styles.quickCommentsWrap}>
                  {QUICK_COMMENTS.map((tag) => {
                    const isSelected = selectedQuickComments.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        className={`${styles.quickCommentChip} ${isSelected ? styles.quickCommentChipActive : ''}`}
                        onClick={() => toggleQuickComment(tag)}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              <label className={styles.formField}>
                <span>Đánh giá thái độ</span>
                <select
                  value={feedbackForm.behaviorRating}
                  onChange={(event) => setFeedbackForm((prev) => ({ ...prev, behaviorRating: event.target.value }))}
                >
                  <option value="Excellent">Excellent</option>
                  <option value="Good">Good</option>
                  <option value="Average">Average</option>
                  <option value="Bad">Bad</option>
                </select>
              </label>

              <label className={styles.formField}>
                <span>Nội dung nhận xét</span>
                <textarea
                  rows={5}
                  value={feedbackForm.content}
                  onChange={(event) => setFeedbackForm((prev) => ({ ...prev, content: event.target.value }))}
                  placeholder="Nhập nội dung nhận xét để gửi về hệ thống..."
                  required
                />
              </label>

              {latestCommentsByStudent[normalizeId(feedbackForm.studentId)] && (
                <div className={styles.latestCommentBox}>
                  <p className={styles.latestCommentTitle}>Nhận xét gần nhất</p>
                  <p>{latestCommentsByStudent[normalizeId(feedbackForm.studentId)]?.content || latestCommentsByStudent[normalizeId(feedbackForm.studentId)]?.note}</p>
                </div>
              )}

              <div className={styles.formActions}>
                <button type="button" className={styles.cancelBtn} onClick={() => setShowFeedbackModal(false)}>
                  Hủy
                </button>
                <button type="submit" className={styles.submitBtn} disabled={savingFeedback || !feedbackForm.content.trim()}>
                  {savingFeedback ? 'Đang gửi...' : 'Gửi nhận xét'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherSessionDetailPage;
