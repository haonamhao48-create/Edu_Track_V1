import React, { useState, useEffect, useRef } from 'react';
import { classService } from '../../services/classService';
import { scheduleService } from '../../services/scheduleService';
import { studentService } from '../../services/studentService';
import styles from './EditClassPage.module.css';
import ConfirmModal from '../../components/ConfirmModal';

const EditClassPage = ({ onNavigate }) => {
  const [selectedClass, setSelectedClass] = useState(null);
  const [classStatus, setClassStatus] = useState('Waiting');
  const [schedules, setSchedules] = useState([]);
  const [activeTab, setActiveTab] = useState('schedules');
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  
  // States for Class Details Editing
  const [editClassName, setEditClassName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [updatingDetails, setUpdatingDetails] = useState(false);
  
  // States for feedback messages
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: 'Xác nhận',
    message: '',
    onConfirm: () => {},
    isDanger: false,
  });

  // States for Schedule Add/Edit Modal
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null); // null means adding new
  const [scheduleTitle, setScheduleTitle] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleStartTime, setScheduleStartTime] = useState('');
  const [scheduleEndTime, setScheduleEndTime] = useState('');
  const [scheduleRoom, setScheduleRoom] = useState('');
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [scheduleError, setScheduleError] = useState('');

  // States for Batch Schedule Modal
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchTitle, setBatchTitle] = useState('');
  const [batchStartTime, setBatchStartTime] = useState('08:00');
  const [batchEndTime, setBatchEndTime] = useState('10:00');
  const [batchRoom, setBatchRoom] = useState('');
  const [batchDays, setBatchDays] = useState([]); // Array of integers 1-7
  const [batchExceptions, setBatchExceptions] = useState([]); // Array of YYYY-MM-DD strings
  const [newExceptionDate, setNewExceptionDate] = useState('');
  const [savingBatch, setSavingBatch] = useState(false);
  const [batchError, setBatchError] = useState('');

  const isSavingRef = useRef(false);

  // Load selected class from localStorage on mount
  useEffect(() => {
    const classData = localStorage.getItem('selectedClassForManagement');
    if (classData) {
      const cls = JSON.parse(classData);
      setSelectedClass(cls);
      setClassStatus(cls.status || 'Waiting');
      
      // Initialize edit fields
      setEditClassName(cls.className || '');
      setEditDescription(cls.description || '');
      setEditStartDate(cls.startDate || '');
      setEditEndDate(cls.endDate || '');
      
      fetchClassSchedules(cls);
      fetchClassStudents(cls);
    } else {
      setErrorMsg('Không tìm thấy thông tin lớp học. Vui lòng quay lại danh sách lớp học.');
    }
  }, []);

  // Lock background scroll when modals are open
  useEffect(() => {
    if (showScheduleModal || showBatchModal || confirmModal.isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showScheduleModal, showBatchModal, confirmModal.isOpen]);

  const handleUpdateDetails = async (e) => {
    e.preventDefault();
    if (updatingDetails) return;

    setUpdatingDetails(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const targetClassId = selectedClass?.classId || selectedClass?.studyClassId || selectedClass?.id;
      
      const payload = {
        className: editClassName.trim(),
        description: editDescription.trim() || null,
        startDate: editStartDate,
        endDate: editEndDate,
        status: classStatus
      };

      await classService.updateClass(targetClassId, payload);
      sessionStorage.setItem('classes_needs_reload', 'true');
      setSuccessMsg('Cập nhật thông tin lớp học thành công!');
      
      // Update local storage and selectedClass state
      const updatedClass = {
        ...selectedClass,
        className: editClassName.trim(),
        description: editDescription.trim() || null,
        startDate: editStartDate,
        endDate: editEndDate,
        status: classStatus
      };
      setSelectedClass(updatedClass);
      localStorage.setItem('selectedClassForManagement', JSON.stringify(updatedClass));
    } catch (err) {
      console.error('Lỗi khi cập nhật thông tin lớp học:', err);
      // Format error messages nicely
      const msg = (err.message || '').toLowerCase();
      let displayError;
      if (msg.includes('đã tồn tại') || msg.includes('already exists') || msg.includes('duplicate')) {
        displayError = 'Tên lớp học này đã tồn tại trong hệ thống. Vui lòng chọn tên khác.';
      } else if (msg.includes('start') && msg.includes('end')) {
        displayError = 'Ngày kết thúc phải sau ngày bắt đầu.';
      } else {
        displayError = err.message || 'Lỗi khi cập nhật thông tin lớp học.';
      }
      setErrorMsg(displayError);
    } finally {
      setUpdatingDetails(false);
    }
  };

  const handleDeleteClass = () => {
    if (!selectedClass) return;
    const className = selectedClass.className || 'lớp học';
    
    setConfirmModal({
      isOpen: true,
      title: 'Xác nhận xóa lớp học',
      message: `Bạn có chắc chắn muốn xóa lớp học "${className}" không? Hành động này không thể hoàn tác.`,
      isDanger: true,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        setUpdatingDetails(true);
        setErrorMsg('');
        setSuccessMsg('');
        try {
          const classId = selectedClass.classId || selectedClass.studyClassId || selectedClass.id;
          await classService.deleteClass(classId);
          sessionStorage.setItem('classes_needs_reload', 'true');
          setSuccessMsg('Xóa lớp học thành công!');
          setTimeout(() => {
            onNavigate('classes');
          }, 1500);
        } catch (err) {
          console.error('Lỗi khi xóa lớp học:', err);
          setErrorMsg(err.message || 'Không thể xóa lớp học.');
          setUpdatingDetails(false);
        }
      }
    });
  };

  const fetchClassSchedules = async (cls) => {
    setLoadingSchedules(true);
    try {
      const targetClassId = cls?.classId || cls?.studyClassId || cls?.id;
      if (!targetClassId) return;

      const data = await scheduleService.getSchedulesByClass(targetClassId);
      const list = Array.isArray(data) ? data : (data?.data || []);
      
      // Sort schedules by date and start time
      list.sort((a, b) => {
        const dateDiff = new Date(a.date) - new Date(b.date);
        if (dateDiff !== 0) return dateDiff;
        return a.startTime.localeCompare(b.startTime);
      });

      setSchedules(list);
    } catch (err) {
      console.error('Lỗi khi tải lịch học:', err);
    } finally {
      setLoadingSchedules(false);
    }
  };

  const fetchClassStudents = async (cls) => {
    setLoadingStudents(true);
    try {
      const targetClassId = cls?.classId || cls?.studyClassId || cls?.id;
      if (!targetClassId) return;
      const res = await studentService.getStudentsByClass(targetClassId);
      const list = res?.items || (Array.isArray(res) ? res : []);
      setStudents(list);
    } catch (err) {
      console.error('Lỗi khi tải học sinh lớp:', err);
      setStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  };



  const handleOpenScheduleModal = (sched = null) => {
    setEditingSchedule(sched);
    setScheduleError('');
    if (sched) {
      setScheduleTitle(sched.title || '');
      setScheduleDate(sched.date || '');
      setScheduleStartTime(sched.startTime ? sched.startTime.slice(0, 5) : '08:00');
      setScheduleEndTime(sched.endTime ? sched.endTime.slice(0, 5) : '10:00');
      setScheduleRoom(sched.roomName || '');
    } else {
      setScheduleTitle('');
      setScheduleDate('');
      setScheduleStartTime('08:00');
      setScheduleEndTime('10:00');
      setScheduleRoom('');
    }
    setShowScheduleModal(true);
  };

  const handleOpenBatchModal = () => {
    setBatchTitle(selectedClass?.className || '');
    setBatchStartTime('08:00');
    setBatchEndTime('10:00');
    setBatchRoom('');
    setBatchDays([]);
    setBatchExceptions([]);
    setNewExceptionDate('');
    setBatchError('');
    setShowBatchModal(true);
  };

  const handleDayToggle = (dayNum) => {
    setBatchDays(prev => 
      prev.includes(dayNum) ? prev.filter(d => d !== dayNum) : [...prev, dayNum]
    );
  };

  const handleAddBatchException = () => {
    if (!newExceptionDate) return;
    if (batchExceptions.includes(newExceptionDate)) {
      setBatchError('Ngày ngoại lệ này đã được thêm.');
      return;
    }
    setBatchExceptions(prev => [...prev, newExceptionDate].sort());
    setNewExceptionDate('');
    setBatchError('');
  };

  const handleRemoveBatchException = (dateStr) => {
    setBatchExceptions(prev => prev.filter(d => d !== dateStr));
  };

  const handleSaveBatchSchedule = async (e) => {
    e.preventDefault();
    if (isSavingRef.current) return;

    setBatchError('');
    if (batchDays.length === 0) {
      setBatchError('Vui lòng chọn ít nhất một thứ trong tuần.');
      return;
    }

    isSavingRef.current = true;
    setSavingBatch(true);

    try {
      const targetClassId = selectedClass?.classId || selectedClass?.studyClassId || selectedClass?.id;
      const payload = {
        classId: targetClassId,
        title: batchTitle.trim(),
        startTime: batchStartTime.slice(0, 5),
        endTime: batchEndTime.slice(0, 5),
        roomName: batchRoom.trim(),
        pattern: {
          daysOfWeek: batchDays,
          exceptionDates: batchExceptions,
        }
      };

      await scheduleService.createSchedulesBatch(payload);
      setSuccessMsg('Tạo lịch học định kỳ thành công!');
      setShowBatchModal(false);
      fetchClassSchedules(selectedClass);
    } catch (err) {
      setBatchError(err.message || 'Lỗi khi lưu lịch học định kỳ.');
    } finally {
      setSavingBatch(false);
      isSavingRef.current = false;
    }
  };

  const handleSaveSchedule = async (e) => {
    e.preventDefault();
    if (isSavingRef.current) return;

    setScheduleError('');
    isSavingRef.current = true;
    setSavingSchedule(true);

    try {
      // Keep format as "HH:mm" (exactly 5 characters) as required by backend TimeOnlyJsonConverter
      const formattedStartTime = scheduleStartTime.slice(0, 5);
      const formattedEndTime = scheduleEndTime.slice(0, 5);

      const payload = {
        title: scheduleTitle.trim(),
        date: scheduleDate,
        startTime: formattedStartTime,
        endTime: formattedEndTime,
        roomName: scheduleRoom.trim(),
      };

      if (editingSchedule) {
        // Update existing schedule
        await scheduleService.updateSchedule(editingSchedule.scheduleId || editingSchedule.id, payload);
        setSuccessMsg('Cập nhật lịch học thành công!');
      } else {
        // Create new schedule
        const targetClassId = selectedClass?.classId || selectedClass?.studyClassId || selectedClass?.id;
        
        const finalPayload = {
          classId: targetClassId,
          ...payload
        };
        
        await scheduleService.createSchedule(finalPayload);
        setSuccessMsg('Thêm buổi học mới thành công!');
      }

      setShowScheduleModal(false);
      fetchClassSchedules(selectedClass);
    } catch (err) {
      setScheduleError(err.message || 'Lỗi khi lưu lịch học.');
    } finally {
      setSavingSchedule(false);
      isSavingRef.current = false;
    }
  };

  const handleDeleteSchedule = (scheduleId) => {
    setConfirmModal({
      isOpen: true,
      title: 'Xác nhận xóa buổi học',
      message: 'Bạn có chắc chắn muốn xóa buổi học này? Hành động này không thể hoàn tác.',
      isDanger: true,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        setErrorMsg('');
        setSuccessMsg('');

        try {
          await scheduleService.deleteSchedule(scheduleId);
          setSuccessMsg('Xóa buổi học thành công.');
          fetchClassSchedules(selectedClass);
        } catch (err) {
          setErrorMsg(err.message || 'Lỗi khi xóa buổi học.');
        }
      }
    });
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'Waiting': return 'Chờ khai giảng';
      case 'Active': return 'Đang học';
      case 'Inactive': return 'Tạm ngưng';
      case 'Finished': return 'Kết thúc';
      default: return status;
    }
  };

  return (
    <div className={styles.root}>
            
      <main className={styles.mainContent}>
        <div className={styles.container}>
          {/* Header */}
          <div className={styles.pageHeader}>
            <button className={styles.backBtn} onClick={() => onNavigate('classes')}>
              <span className="material-symbols-outlined notranslate" translate="no">arrow_back</span>
            </button>
            <div>
              <h2 className={styles.pageTitle}>Chỉnh sửa lớp học</h2>
              {selectedClass && (
                <p className={styles.pageSubtitle}>
                  Lớp học: <strong>{selectedClass.className}</strong> | Khóa học: {selectedClass.courseName || 'N/A'}
                </p>
              )}
            </div>
          </div>

          {/* Feedback messages */}
          {errorMsg && <div className={styles.alertError}>{errorMsg}</div>}
          {successMsg && <div className={styles.alertSuccess}>{successMsg}</div>}

          {selectedClass && (
            <div className={styles.grid}>
              {/* Left Column: Basic Class Details & Status Editor */}
              <div className={styles.leftCol}>
                <div className={styles.panel}>
                  <h3 className={styles.panelTitle}>Thông tin lớp học</h3>
                  <form onSubmit={handleUpdateDetails} className={styles.detailsForm}>
                    <div className={styles.inputGroup}>
                      <label className={styles.label}>Tên lớp học <span className={styles.textError}>*</span></label>
                      <input
                        type="text"
                        required
                        className={styles.inputField}
                        value={editClassName}
                        onChange={(e) => setEditClassName(e.target.value)}
                      />
                    </div>
                    <div className={styles.inputGroup} style={{ marginTop: '12px' }}>
                      <label className={styles.label}>Khóa học / Môn</label>
                      <input
                        type="text"
                        placeholder="Mô tả hoặc tên môn học"
                        className={styles.inputField}
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                      />
                    </div>
                    <div className={styles.inputGroup} style={{ marginTop: '12px' }}>
                      <label className={styles.label}>Ngày bắt đầu <span className={styles.textError}>*</span></label>
                      <input
                        type="date"
                        required
                        className={styles.inputField}
                        value={editStartDate}
                        onChange={(e) => setEditStartDate(e.target.value)}
                      />
                    </div>
                    <div className={styles.inputGroup} style={{ marginTop: '12px' }}>
                      <label className={styles.label}>Ngày kết thúc <span className={styles.textError}>*</span></label>
                      <input
                        type="date"
                        required
                        className={styles.inputField}
                        value={editEndDate}
                        onChange={(e) => setEditEndDate(e.target.value)}
                      />
                    </div>
                    <div className={styles.inputGroup} style={{ marginTop: '12px' }}>
                      <label className={styles.label}>Trạng thái lớp học</label>
                      <select
                        className={styles.selectField}
                        value={classStatus}
                        onChange={(e) => setClassStatus(e.target.value)}
                      >
                        <option value="Waiting">Chờ khai giảng (Waiting)</option>
                        <option value="Active">Đang học (Active)</option>
                        <option value="Inactive">Tạm ngưng (Inactive)</option>
                        <option value="Finished">Kết thúc (Finished)</option>
                      </select>
                    </div>
                    <div className={styles.inputGroup} style={{ marginTop: '12px' }}>
                      <label className={styles.label}>Giáo viên phụ trách</label>
                      <input
                        type="text"
                        disabled
                        className={styles.inputField}
                        value={selectedClass.teacherName || 'Chưa phân công'}
                        style={{ backgroundColor: 'var(--surface-container-low)', cursor: 'not-allowed' }}
                      />
                    </div>
                    <div className={styles.formActions}>
                      <button type="submit" className={styles.submitBtn} disabled={updatingDetails}>
                        <span className="material-symbols-outlined notranslate" translate="no">save</span>
                        {updatingDetails ? 'Đang lưu...' : 'Lưu thông tin'}
                      </button>
                      <button
                        type="button"
                        className={styles.deleteClassBtn}
                        onClick={handleDeleteClass}
                        disabled={updatingDetails}
                      >
                        <span className="material-symbols-outlined notranslate" translate="no">delete</span>
                        {updatingDetails ? 'Đang xử lý...' : 'Xóa lớp'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* Right Column: Tabbed Schedules & Enrolled Students */}
              <div className={styles.rightCol}>
                <div className={styles.panel}>
                  <div className={styles.tabHeader}>
                    <button
                      type="button"
                      className={`${styles.tabBtn} ${activeTab === 'schedules' ? styles.tabBtnActive : ''}`}
                      onClick={() => setActiveTab('schedules')}
                    >
                      Lịch học ({schedules.length})
                    </button>
                    <button
                      type="button"
                      className={`${styles.tabBtn} ${activeTab === 'students' ? styles.tabBtnActive : ''}`}
                      onClick={() => setActiveTab('students')}
                    >
                      Học sinh ({students.length})
                    </button>
                  </div>

                  {activeTab === 'schedules' && (
                    <>
                      <div className={styles.panelHeader}>
                        <h3 className={styles.panelTitle} style={{ marginBottom: 0 }}>Lịch học / Buổi học</h3>
                        <div className={styles.scheduleActions}>
                          <button
                            type="button"
                            className={styles.batchBtn}
                            onClick={handleOpenBatchModal}
                          >
                            <span className="material-symbols-outlined notranslate" translate="no">calendar_month</span>
                            Tạo lịch định kỳ
                          </button>
                          <button
                            type="button"
                            className={styles.addBtn}
                            onClick={() => handleOpenScheduleModal(null)}
                          >
                            <span className="material-symbols-outlined notranslate" translate="no">add</span>
                            Thêm buổi học
                          </button>
                        </div>
                      </div>

                      {loadingSchedules ? (
                        <div className={styles.loadingContainer}>
                          <p>Đang tải danh sách lịch học của lớp...</p>
                        </div>
                      ) : schedules.length === 0 ? (
                        <div className={styles.emptyContainer}>
                          <span className="material-symbols-outlined notranslate" translate="no">calendar_today</span>
                          <p>Lớp học này hiện tại chưa có lịch học nào được tạo.</p>
                        </div>
                      ) : (
                        <div className={styles.schedulesList}>
                          {schedules.map((sched, idx) => {
                            const schedId = sched.scheduleId || sched.id;
                            return (
                              <div key={schedId || idx} className={styles.scheduleItem}>
                                <div className={styles.scheduleDetails}>
                                  <h4 className={styles.scheduleTitle}>{sched.title || `Buổi học ${idx + 1}`}</h4>
                                  <div className={styles.scheduleMeta}>
                                    <div className={styles.metaRow}>
                                      <span className="material-symbols-outlined notranslate" translate="no">calendar_month</span>
                                      <span>{sched.date}</span>
                                    </div>
                                    <div className={styles.metaRow}>
                                      <span className="material-symbols-outlined notranslate" translate="no">schedule</span>
                                      <span>{sched.startTime ? sched.startTime.slice(0, 5) : ''} - {sched.endTime ? sched.endTime.slice(0, 5) : ''}</span>
                                    </div>
                                    <div className={styles.metaRow}>
                                      <span className="material-symbols-outlined notranslate" translate="no">meeting_room</span>
                                      <span>Phòng: {sched.roomName || 'N/A'}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className={styles.scheduleActions}>
                                  <button
                                    type="button"
                                    className={styles.editIconBtn}
                                    onClick={() => handleOpenScheduleModal(sched)}
                                    title="Chỉnh sửa buổi học"
                                  >
                                    <span className="material-symbols-outlined notranslate" translate="no">edit</span>
                                  </button>
                                  <button
                                    type="button"
                                    className={styles.deleteIconBtn}
                                    onClick={() => handleDeleteSchedule(schedId)}
                                    title="Xóa buổi học"
                                  >
                                    <span className="material-symbols-outlined notranslate" translate="no">delete</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}

                  {activeTab === 'students' && (
                    <>
                      <div className={styles.panelHeader}>
                        <h3 className={styles.panelTitle} style={{ marginBottom: 0 }}>Học sinh trong lớp</h3>
                      </div>

                      {loadingStudents ? (
                        <div className={styles.loadingContainer}>
                          <p>Đang tải danh sách học sinh...</p>
                        </div>
                      ) : students.length === 0 ? (
                        <div className={styles.emptyContainer}>
                          <span className="material-symbols-outlined notranslate" translate="no">person_off</span>
                          <p>Chưa có học sinh nào ghi danh vào lớp học này.</p>
                        </div>
                      ) : (
                        <div className={styles.studentsList}>
                          {students.map((st, idx) => {
                            const stId = st.studentId || st.id;
                            const initials = (st.fullName || st.name || 'HS')
                              .split(' ')
                              .map(w => w[0])
                              .slice(0, 2)
                              .join('')
                              .toUpperCase();
                            return (
                              <div key={stId || idx} className={styles.studentItem}>
                                <div className={styles.studentAvatar}>
                                  {initials}
                                </div>
                                <div className={styles.studentDetails}>
                                  <h4 className={styles.studentName}>{st.fullName || st.name}</h4>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Add/Edit Schedule Modal */}
      {showScheduleModal && (
        <div className={styles.modalOverlay} onClick={() => setShowScheduleModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                {editingSchedule ? 'Chỉnh sửa buổi học' : 'Thêm buổi học mới'}
              </h3>
              <button className={styles.modalClose} onClick={() => setShowScheduleModal(false)}>
                <span className="material-symbols-outlined notranslate" translate="no">close</span>
              </button>
            </div>

            <div className={styles.modalBody}>
              {scheduleError && <div className={styles.alertError}>{scheduleError}</div>}
              
              <form onSubmit={handleSaveSchedule} className={styles.modalForm}>
                <div className={styles.inputGroup}>
                  <label className={styles.label}>Tiêu đề buổi học</label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Buổi 1: Giới thiệu chung"
                    className={styles.inputField}
                    value={scheduleTitle}
                    onChange={(e) => setScheduleTitle(e.target.value)}
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.label}>Ngày học</label>
                  <input
                    type="date"
                    required
                    className={styles.inputField}
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                  />
                </div>

                <div className={styles.timeGrid}>
                  <div className={styles.inputGroup}>
                    <label className={styles.label}>Giờ bắt đầu</label>
                    <input
                      type="time"
                      required
                      className={styles.inputField}
                      value={scheduleStartTime}
                      onChange={(e) => setScheduleStartTime(e.target.value)}
                    />
                  </div>
                  <div className={styles.inputGroup}>
                    <label className={styles.label}>Giờ kết thúc</label>
                    <input
                      type="time"
                      required
                      className={styles.inputField}
                      value={scheduleEndTime}
                      onChange={(e) => setScheduleEndTime(e.target.value)}
                    />
                  </div>
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.label}>Phòng học</label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: P.302"
                    className={styles.inputField}
                    value={scheduleRoom}
                    onChange={(e) => setScheduleRoom(e.target.value)}
                  />
                </div>

                <div className={styles.modalActions}>
                  <button
                    type="button"
                    className={styles.cancelBtn}
                    onClick={() => setShowScheduleModal(false)}
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    className={styles.saveBtn}
                    disabled={savingSchedule}
                  >
                    {savingSchedule ? 'Đang lưu...' : 'Lưu lại'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Batch Create Schedule Modal */}
      {showBatchModal && (
        <div className={styles.modalOverlay} onClick={() => setShowBatchModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Tạo lịch học định kỳ</h3>
              <button className={styles.modalClose} onClick={() => setShowBatchModal(false)}>
                <span className="material-symbols-outlined notranslate" translate="no">close</span>
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.infoAlert}>
                <span className="material-symbols-outlined notranslate" translate="no">info</span>
                <p>
                  Lịch học sẽ được tạo tự động trong thời gian hoạt động của lớp: <strong>{selectedClass?.startDate}</strong> đến <strong>{selectedClass?.endDate}</strong>
                </p>
              </div>

              {batchError && <div className={styles.alertError}>{batchError}</div>}
              
              <form onSubmit={handleSaveBatchSchedule} className={styles.modalForm}>
                <div className={styles.inputGroup}>
                  <label className={styles.label}>Tiêu đề các buổi học</label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Buổi học định kỳ"
                    className={styles.inputField}
                    value={batchTitle}
                    onChange={(e) => setBatchTitle(e.target.value)}
                  />
                </div>

                <div className={styles.timeGrid}>
                  <div className={styles.inputGroup}>
                    <label className={styles.label}>Giờ bắt đầu</label>
                    <input
                      type="time"
                      required
                      className={styles.inputField}
                      value={batchStartTime}
                      onChange={(e) => setBatchStartTime(e.target.value)}
                    />
                  </div>
                  <div className={styles.inputGroup}>
                    <label className={styles.label}>Giờ kết thúc</label>
                    <input
                      type="time"
                      required
                      className={styles.inputField}
                      value={batchEndTime}
                      onChange={(e) => setBatchEndTime(e.target.value)}
                    />
                  </div>
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.label}>Phòng học</label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: P.302"
                    className={styles.inputField}
                    value={batchRoom}
                    onChange={(e) => setBatchRoom(e.target.value)}
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.label}>Thứ lặp lại trong tuần</label>
                  <div className={styles.checkboxGrid}>
                    {[
                      { label: 'Thứ 2', value: 1 },
                      { label: 'Thứ 3', value: 2 },
                      { label: 'Thứ 4', value: 3 },
                      { label: 'Thứ 5', value: 4 },
                      { label: 'Thứ 6', value: 5 },
                      { label: 'Thứ 7', value: 6 },
                      { label: 'Chủ Nhật', value: 7 },
                    ].map((day) => (
                      <label key={day.value} className={`${styles.checkboxLabel} ${batchDays.includes(day.value) ? styles.checkboxActive : ''}`}>
                        <input
                          type="checkbox"
                          checked={batchDays.includes(day.value)}
                          onChange={() => handleDayToggle(day.value)}
                          style={{ display: 'none' }}
                        />
                        {day.label}
                      </label>
                    ))}
                  </div>
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.label}>Ngày ngoại lệ (ngày lễ / nghỉ)</label>
                  <div className={styles.exceptionInputRow}>
                    <input
                      type="date"
                      className={styles.inputField}
                      value={newExceptionDate}
                      onChange={(e) => setNewExceptionDate(e.target.value)}
                    />
                    <button
                      type="button"
                      className={styles.addExceptionBtn}
                      onClick={handleAddBatchException}
                    >
                      Thêm
                    </button>
                  </div>
                  {batchExceptions.length > 0 && (
                    <div className={styles.exceptionList}>
                      {batchExceptions.map((dateStr) => (
                        <span key={dateStr} className={styles.exceptionTag}>
                          {dateStr}
                          <button
                            type="button"
                            className={styles.removeExceptionBtn}
                            onClick={() => handleRemoveBatchException(dateStr)}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className={styles.modalActions}>
                  <button
                    type="button"
                    className={styles.cancelBtn}
                    onClick={() => setShowBatchModal(false)}
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    className={styles.saveBtn}
                    disabled={savingBatch}
                  >
                    {savingBatch ? 'Đang tạo...' : 'Tạo lịch'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText="Xác nhận"
        cancelText="Hủy"
        isDanger={confirmModal.isDanger}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

export default EditClassPage;
