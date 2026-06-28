import React, { useState, useEffect, useRef } from 'react';
import styles from './CreateClassPage.module.css';
import { classService } from '../../services/classService';
import { teacherService } from '../../services/teacherService';
import { scheduleService } from '../../services/scheduleService';

const CreateClassPage = ({ onNavigate }) => {
  // Form states matching API: className, description, startDate, endDate, teacherId
  const [className, setClassName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [teachers, setTeachers] = useState([]);
  const [specialtyQuery, setSpecialtyQuery] = useState('');
  const [expertises, setExpertises] = useState([]);
  const [loadingTeachers, setLoadingTeachers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const isSubmittingRef = useRef(false);

  // Batch scheduling states for Scenario 2
  const [setupScheduleNow, setSetupScheduleNow] = useState(false);
  const [batchTitle, setBatchTitle] = useState('');
  const [batchStartTime, setBatchStartTime] = useState('08:00');
  const [batchEndTime, setBatchEndTime] = useState('10:00');
  const [batchRoom, setBatchRoom] = useState('');
  const [batchDays, setBatchDays] = useState([]); // Array of integers 1-7
  const [batchExceptions, setBatchExceptions] = useState([]); // Array of YYYY-MM-DD strings
  const [newExceptionDate, setNewExceptionDate] = useState('');

  // Filter teachers based on specialty search query
  const filteredTeachers = teachers.filter((t) => {
    if (!specialtyQuery.trim()) return true;
    return t.expertise?.toLowerCase().includes(specialtyQuery.toLowerCase().trim());
  });

  // Ensure the selected teacher is always preserved in the rendering list even if filtered out
  const isSelectedTeacherVisible = !teacherId || filteredTeachers.some((t) => (t.teacherId || t.id) === teacherId);
  const selectedTeacher = teachers.find((t) => (t.teacherId || t.id) === teacherId);

  const displayTeachers = [...filteredTeachers];
  if (!isSelectedTeacherVisible && selectedTeacher) {
    displayTeachers.push(selectedTeacher);
  }

  // Fetch teachers and expertises on mount
  useEffect(() => {
    const fetchTeachersList = async () => {
      setLoadingTeachers(true);
      try {
        const res = await teacherService.getTeachers({ page: 1, pageSize: 100 });
        setTeachers(res?.items || []);
      } catch (err) {
        console.error('Lỗi khi tải danh sách giáo viên:', err);
      } finally {
        setLoadingTeachers(false);
      }
    };
    const fetchExpertisesList = async () => {
      try {
        const res = await teacherService.getExpertises();
        const list = Array.isArray(res) ? res : (res?.data || res?.items || []);
        setExpertises(list);
      } catch (err) {
        console.error('Lỗi khi tải danh sách chuyên môn:', err);
      }
    };
    fetchTeachersList();
    fetchExpertisesList();
  }, []);

  const handleDayToggle = (dayNum) => {
    setBatchDays(prev => 
      prev.includes(dayNum) ? prev.filter(d => d !== dayNum) : [...prev, dayNum]
    );
  };

  const handleAddBatchException = () => {
    if (!newExceptionDate) return;
    if (batchExceptions.includes(newExceptionDate)) {
      setErrorMsg('Ngày ngoại lệ này đã được thêm.');
      return;
    }
    setBatchExceptions(prev => [...prev, newExceptionDate].sort());
    setNewExceptionDate('');
    setErrorMsg('');
  };

  const handleRemoveBatchException = (dateStr) => {
    setBatchExceptions(prev => prev.filter(d => d !== dateStr));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmittingRef.current) return;

    setErrorMsg('');
    setSuccessMsg('');

    if (!className || !startDate || !endDate) {
      setErrorMsg('Vui lòng điền đầy đủ các trường bắt buộc (*).');
      return;
    }

    // Validate ngày: startDate phải sau hôm nay (backend yêu cầu ngày tương lai)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    if (startDateObj <= today) {
      setErrorMsg('Ngày bắt đầu phải là ngày trong tương lai (từ ngày mai trở đi).');
      return;
    }
    if (endDateObj <= startDateObj) {
      setErrorMsg('Ngày kết thúc phải sau ngày bắt đầu.');
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    try {
      const payload = {
        className,
        description: description || null,
        startDate,
        endDate
      };

      // Chỉ gửi teacherId nếu người dùng đã nhập
      if (teacherId.trim()) {
        payload.teacherId = teacherId.trim();
      }

      if (setupScheduleNow && batchDays.length === 0) {
        throw new Error('Vui lòng chọn ít nhất một thứ trong tuần để xếp lịch định kỳ.');
      }

      const result = await classService.createClass(payload);
      const newClassId = result.studyClassId || result.id || result.classId;

      if (setupScheduleNow) {
        const batchPayload = {
          classId: newClassId,
          title: batchTitle.trim() || className.trim(),
          startTime: batchStartTime.slice(0, 5),
          endTime: batchEndTime.slice(0, 5),
          roomName: batchRoom.trim(),
          pattern: {
            daysOfWeek: batchDays,
            exceptionDates: batchExceptions,
          }
        };
        await scheduleService.createSchedulesBatch(batchPayload);
      }

      sessionStorage.setItem('classes_needs_reload', 'true');
      setSuccessMsg(`Tạo lớp học ${setupScheduleNow ? 'và xếp lịch học định kỳ ' : ''}thành công!`);
      
      // Chuyển về trang danh sách sau 1.5 giây
      setTimeout(() => onNavigate('classes'), 1500);
    } catch (error) {
      isSubmittingRef.current = false;
      console.error('Error creating class:', error);
      
      // Dịch thông báo lỗi phù hợp ngữ cảnh tạo lớp học
      const msg = (error.message || '').toLowerCase();
      let displayError;
      if (msg.includes('đã tồn tại') || msg.includes('already exists') || msg.includes('duplicate')) {
        displayError = 'Tên lớp học này đã tồn tại. Vui lòng chọn tên khác.';
      } else if (msg.includes('teacher') && (msg.includes('not found') || msg.includes('không tìm'))) {
        displayError = 'Không tìm thấy giáo viên được chọn. Vui lòng chọn lại hoặc bỏ trống.';
      } else if (msg.includes('ngày bắt đầu') && msg.includes('tương lai')) {
        displayError = 'Ngày bắt đầu phải là ngày trong tương lai (từ ngày mai trở đi).';
      } else if (msg.includes('ngày kết thúc') || (msg.includes('start') && msg.includes('end'))) {
        displayError = 'Ngày kết thúc phải sau ngày bắt đầu.';
      } else if (msg.includes('startdate') || msg.includes('enddate')) {
        displayError = error.message || 'Thông tin ngày học không hợp lệ.';
      } else if (msg.includes('validation') || msg.includes('kiểm tra')) {
        displayError = 'Vui lòng kiểm tra lại thông tin nhập vào.';
      } else {
        displayError = error.message || 'Không thể tạo lớp học. Vui lòng thử lại sau.';
      }
      
      setErrorMsg(displayError);
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.createRoot}>
                  
      <main className={styles.mainContent}>
        <header className={styles.pageHeader}>
          <button className={styles.backBtn} onClick={() => onNavigate('classes')} type="button">
            <span className="material-symbols-outlined notranslate" translate="no">arrow_back</span>
          </button>
          <div>
            <h2 className={styles.pageTitle}>Tạo lớp học</h2>
            <nav className={styles.breadcrumb}>
              <span>Quản lý lớp học</span>
              <span className={styles.breadcrumbSeparator}>/</span>
              <span className={styles.breadcrumbActive}>Tạo lớp mới</span>
            </nav>
          </div>
        </header>

        {/* Form */}
        <form className={styles.form} onSubmit={handleSubmit}>
          {errorMsg && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', marginBottom: '16px', backgroundColor: 'var(--error-bg)', color: 'var(--error)', borderRadius: '12px', border: '1px solid var(--outline-variant)', fontSize: '14px' }}>
              <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '20px' }}>error</span>
              <span>{errorMsg}</span>
            </div>
          )}
          {successMsg && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', marginBottom: '16px', backgroundColor: 'var(--success-bg)', color: 'var(--success)', borderRadius: '12px', border: '1px solid var(--outline-variant)', fontSize: '14px' }}>
              <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '20px' }}>check_circle</span>
              <span>{successMsg}</span>
            </div>
          )}

          {/* 1. Thông tin lớp học */}
          <section className={styles.formSection}>
            <div className={styles.sectionHeader}>
              <span className={`material-symbols-outlined notranslate ${styles.iconPrimary}`} translate="no">info</span>
              <h3>Thông tin lớp học</h3>
            </div>
            <div className={styles.grid}>
              <div className={`${styles.col6} ${styles.inputGroup}`}>
                <label>Tên lớp học <span className={styles.textError}>*</span></label>
                <input
                  type="text"
                  placeholder="VD: Toán nâng cao 10 - T2"
                  required
                  className={styles.inputField}
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                />
              </div>
              <div className={`${styles.col6} ${styles.inputGroup}`}>
                <label>Mô tả lớp học</label>
                <input
                  type="text"
                  placeholder="VD: Lớp toán nâng cao dành cho học sinh lớp 10"
                  className={styles.inputField}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className={`${styles.col3} ${styles.inputGroup}`}>
                <label>Ngày bắt đầu <span className={styles.textError}>*</span></label>
                <div className={styles.inputWithIcon}>
                  <input
                    type="date"
                    required
                    className={`${styles.inputField} ${styles.dateInput}`}
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
              </div>
              <div className={`${styles.col3} ${styles.inputGroup}`}>
                <label>Ngày kết thúc (Dự kiến) <span className={styles.textError}>*</span></label>
                <div className={styles.inputWithIcon}>
                  <input
                    type="date"
                    required
                    className={`${styles.inputField} ${styles.dateInput}`}
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* 2. Giáo viên phụ trách (tùy chọn) */}
          <section className={styles.formSection}>
            <div className={styles.sectionHeader}>
              <span className={`material-symbols-outlined notranslate ${styles.iconPrimary}`} translate="no">person_add</span>
              <h3>Giáo viên phụ trách (tùy chọn)</h3>
            </div>
            <div className={styles.teacherGroup}>
              <div className={styles.teacherAssignGrid}>
                <div className={styles.inputGroup}>
                  <label>Lọc chuyên môn</label>
                  <select
                    className={`${styles.inputField} ${styles.selectField}`}
                    value={specialtyQuery}
                    onChange={(e) => setSpecialtyQuery(e.target.value)}
                    style={{ paddingRight: '40px' }}
                  >
                    <option value="">-- Tất cả chuyên môn --</option>
                    {expertises.map((exp, idx) => (
                      <option key={idx} value={exp}>{exp}</option>
                    ))}
                  </select>
                </div>
                <div className={styles.inputGroup}>
                  <label>Giáo viên giảng dạy</label>
                  <select
                    className={`${styles.inputField} ${styles.selectField}`}
                    value={teacherId}
                    onChange={(e) => setTeacherId(e.target.value)}
                    disabled={loadingTeachers}
                    style={{ paddingRight: '40px' }}
                  >
                    <option value="">-- Chưa phân công (có thể chọn sau) --</option>
                    {displayTeachers.map((t) => (
                      <option key={t.teacherId || t.id} value={t.teacherId || t.id}>
                        {t.fullName} ({t.expertise || 'Không rõ chuyên môn'} - {t.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--on-surface-variant)', marginTop: '8px' }}>
                Bạn có thể bỏ trống trường này và phân công giáo viên sau từ trang Quản lý lớp học.
              </p>
            </div>
          </section>

          {/* 3. Lịch học định kỳ (tùy chọn) */}
          <section className={styles.formSection}>
            <div className={styles.sectionHeader} style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: 0 }}>
              <span className={`material-symbols-outlined notranslate ${styles.iconPrimary}`} translate="no">calendar_month</span>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }}>
                Lịch học định kỳ (tùy chọn)
                <label className={styles.switchLabel} style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 'normal', textTransform: 'none' }}>
                  <input
                    type="checkbox"
                    checked={setupScheduleNow}
                    onChange={(e) => setSetupScheduleNow(e.target.checked)}
                  />
                  Thiết lập lịch học định kỳ ngay
                </label>
              </h3>
            </div>

            {setupScheduleNow && (
              <div className={styles.scheduleSetupArea} style={{ marginTop: '20px', borderTop: '1px solid var(--outline-variant)', paddingTop: '20px' }}>
                <div className={styles.grid}>
                  <div className={`${styles.col6} ${styles.inputGroup}`}>
                    <label>Tiêu đề các buổi học</label>
                    <input
                      type="text"
                      placeholder="Mặc định lấy tên lớp học"
                      className={styles.inputField}
                      value={batchTitle}
                      onChange={(e) => setBatchTitle(e.target.value)}
                    />
                  </div>
                  <div className={`${styles.col6} ${styles.inputGroup}`}>
                    <label>Phòng học <span className={styles.textError}>*</span></label>
                    <input
                      type="text"
                      placeholder="VD: Phòng 101"
                      required={setupScheduleNow}
                      className={styles.inputField}
                      value={batchRoom}
                      onChange={(e) => setBatchRoom(e.target.value)}
                    />
                  </div>
                  <div className={`${styles.col3} ${styles.inputGroup}`}>
                    <label>Giờ bắt đầu <span className={styles.textError}>*</span></label>
                    <input
                      type="time"
                      required={setupScheduleNow}
                      className={styles.inputField}
                      value={batchStartTime}
                      onChange={(e) => setBatchStartTime(e.target.value)}
                    />
                  </div>
                  <div className={`${styles.col3} ${styles.inputGroup}`}>
                    <label>Giờ kết thúc <span className={styles.textError}>*</span></label>
                    <input
                      type="time"
                      required={setupScheduleNow}
                      className={styles.inputField}
                      value={batchEndTime}
                      onChange={(e) => setBatchEndTime(e.target.value)}
                    />
                  </div>
                </div>

                <div className={styles.inputGroup} style={{ marginTop: '20px' }}>
                  <label>Thứ lặp lại trong tuần <span className={styles.textError}>*</span></label>
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

                <div className={styles.inputGroup} style={{ marginTop: '20px' }}>
                  <label>Ngày ngoại lệ (ngày lễ / nghỉ)</label>
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
                      Thêm ngày
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
              </div>
            )}
          </section>

          {/* Footer Actions */}
          <footer className={styles.formFooter}>
            <button type="button" className={styles.cancelBtn} onClick={() => onNavigate('classes')} disabled={isSubmitting}>Hủy bỏ</button>
            <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
              <span className="material-symbols-outlined notranslate" translate="no">save</span>
              {isSubmitting ? 'Đang lưu...' : 'Lưu'}
            </button>
          </footer>
        </form>
      </main>
    </div>
  );
};

export default CreateClassPage;
