import React, { useState, useEffect, useCallback } from 'react';
import { scheduleService } from '../../services/scheduleService';
import { classService } from '../../services/classService';
import { teacherService } from '../../services/teacherService';
import styles from './SchedulePage.module.css';

// ──── helpers ────────────────────────────────────────────────────────────────

/** Return the Monday of the week that contains `date`. */
const getMonday = (date) => {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun … 6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

/** Format a Date to YYYY-MM-DD (local). */
const formatDate = (d) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

/** Format a Date to DD/MM. */
const formatDayMonth = (d) =>
  `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;

/** Get the 7 dates (Mon→Sun) for the week starting at `monday`. */
const getWeekDates = (monday) =>
  Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return d;
  });

/** Map API status string to a colour‑theme key used by the CSS module. */
const statusToType = (status) => {
  if (!status) return 'primary';
  const s = status.toLowerCase();
  if (s.includes('hoàn thành') || s.includes('completed')) return 'tertiary';
  if (s.includes('đang') || s.includes('in_progress') || s.includes('ongoing')) return 'secondary';
  if (s.includes('hủy') || s.includes('cancel')) return 'error';
  return 'primary'; // sắp diễn ra / scheduled / default
};

/** Parse "HH:mm:ss" or "HH:mm" → fractional hours (e.g. 14.5). */
const parseTime = (t) => {
  if (!t) return 0;
  const parts = t.split(':');
  return Number(parts[0]) + Number(parts[1] || 0) / 60;
};

/** Format fractional hours → "HH:mm". */
const formatHour = (h) => {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
};

const DAY_NAMES = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];
const TIME_HOURS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];

const EMPTY_FORM = {
  classId: '',
  title: '',
  date: '',
  startTime: '',
  endTime: '',
  roomName: '',
};

// ──── component ──────────────────────────────────────────────────────────────

const SchedulePage = ({ onNavigate }) => {


  // week navigation – store the Monday of the currently viewed week
  const [weekMonday, setWeekMonday] = useState(() => getMonday(new Date()));

  // API data
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [modalError, setModalError] = useState(null);

  // Filter states
  const [classList, setClassList] = useState([]);
  const [teacherList, setTeacherList] = useState([]);
  const [selectedClassFilter, setSelectedClassFilter] = useState('');
  const [selectedTeacherFilter, setSelectedTeacherFilter] = useState('');
  const [selectedRoomFilter, setSelectedRoomFilter] = useState('');

  // Auto-clear page error and modal error
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (modalError) {
      const timer = setTimeout(() => setModalError(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [modalError]);

  // Fetch classes and teachers on mount
  useEffect(() => {
    const loadFiltersData = async () => {
      // 1. Classes list caching
      const cachedClasses = sessionStorage.getItem('cached_classes');
      const needsClassesReload = sessionStorage.getItem('classes_needs_reload') === 'true';
      let classesList = [];

      if (!needsClassesReload && cachedClasses) {
        classesList = JSON.parse(cachedClasses);
      } else {
        try {
          const classesData = await classService.getAllClasses();
          classesList = Array.isArray(classesData) ? classesData : (classesData?.items || classesData?.data || classesData?.classes || []);
          sessionStorage.setItem('cached_classes', JSON.stringify(classesList));
          sessionStorage.removeItem('classes_needs_reload');
        } catch (err) {
          console.error('Lỗi khi tải dữ liệu bộ lọc lớp học:', err);
        }
      }
      setClassList(classesList);

      // 2. Teachers list caching
      const cachedTeachers = sessionStorage.getItem('cached_all_teachers');
      const needsTeachersReload = sessionStorage.getItem('teachers_needs_reload') === 'true';
      let teachersList = [];

      if (!needsTeachersReload && cachedTeachers) {
        teachersList = JSON.parse(cachedTeachers);
      } else {
        try {
          const teachersData = await teacherService.getTeachers({ page: 1, pageSize: 1000 });
          teachersList = teachersData?.items || [];
          sessionStorage.setItem('cached_all_teachers', JSON.stringify(teachersList));
          sessionStorage.removeItem('teachers_needs_reload');
        } catch (err) {
          console.error('Lỗi khi tải dữ liệu bộ lọc giảng viên:', err);
        }
      }
      setTeacherList(teachersList);
    };
    loadFiltersData();
  }, []);

  // modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit' | 'view'
  const [formData, setFormData] = useState({ ...EMPTY_FORM });
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // delete confirm
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // derived
  const weekDates = getWeekDates(weekMonday);
  const weekSunday = weekDates[6];

  // ── fetch cache helper ───────────────────────────────────────────────────

  const clearScheduleCache = () => {
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith('cached_schedule_')) {
        sessionStorage.removeItem(key);
      }
    });
  };

  const fetchSchedules = useCallback(async (force = false) => {
    const needsReload = sessionStorage.getItem('schedule_needs_reload') === 'true';
    const mondayStr = formatDate(weekMonday);

    // If no filter is chosen, show empty schedule list and do not query APIs
    if (!selectedClassFilter && !selectedTeacherFilter) {
      setEvents([]);
      setLoading(false);
      return;
    }

    const filterKey = `class_${selectedClassFilter}_teacher_${selectedTeacherFilter}`;
    const cacheKey = `cached_schedule_${mondayStr}_${filterKey}`;
    const hasCache = sessionStorage.getItem(cacheKey);

    // Cache logic for results
    if (!force && !needsReload && hasCache) {
      setEvents(JSON.parse(hasCache));
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const startDate = formatDate(weekMonday);
      const endDate = formatDate(weekSunday);

      let list = [];
      if (selectedClassFilter) {
        const data = await scheduleService.getSchedulesByClass(selectedClassFilter);
        const rawList = Array.isArray(data) ? data : data?.items ?? data?.data ?? [];
        list = rawList
          .map(ev => ({ ...ev, status: ev.classStatus || ev.status }))
          .filter(ev => ev.date >= startDate && ev.date <= endDate);
        
        // Client-side filter by teacher if selected
        if (selectedTeacherFilter) {
          const selectedTeacher = teacherList.find(t => (t.teacherId || t.id) === selectedTeacherFilter);
          const teacherName = selectedTeacher?.fullName || selectedTeacher?.name;
          if (teacherName) {
            list = list.filter(ev => ev.teacherName === teacherName);
          }
        }
      } else if (selectedTeacherFilter) {
        const data = await scheduleService.getSchedules(startDate, endDate, selectedTeacherFilter);
        const rawList = Array.isArray(data) ? data : data?.items ?? data?.data ?? [];
        list = rawList.map(ev => ({ ...ev, status: ev.classStatus || ev.status }));
      }

      setEvents(list);

      // Cache the filtered results for the current week and current filters
      sessionStorage.setItem(cacheKey, JSON.stringify(list));
      sessionStorage.removeItem('schedule_needs_reload');
    } catch (err) {
      setError(err.message || 'Không thể tải dữ liệu lịch học.');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [weekMonday, weekSunday, selectedClassFilter, selectedTeacherFilter, teacherList]);

  useEffect(() => {
    fetchSchedules();
  }, [weekMonday, selectedClassFilter, selectedTeacherFilter]);

  // ── week nav ─────────────────────────────────────────────────────────────

  const goToday = () => setWeekMonday(getMonday(new Date()));
  const goPrev = () => {
    const d = new Date(weekMonday);
    d.setDate(d.getDate() - 7);
    setWeekMonday(d);
  };
  const goNext = () => {
    const d = new Date(weekMonday);
    d.setDate(d.getDate() + 7);
    setWeekMonday(d);
  };

  // ── modal helpers ────────────────────────────────────────────────────────

  const openCreate = () => {
    setFormData({ ...EMPTY_FORM });
    setEditingId(null);
    setModalMode('create');
    setModalOpen(true);
  };

  const openEdit = (ev) => {
    setFormData({
      classId: ev.classId || '',
      title: ev.title || '',
      date: ev.date || '',
      startTime: (ev.startTime || '').slice(0, 5),
      endTime: (ev.endTime || '').slice(0, 5),
      roomName: ev.roomName || '',
    });
    setEditingId(ev.scheduleId);
    setModalMode('edit');
    setModalOpen(true);
  };

  const openView = (ev) => {
    setFormData({
      classId: ev.classId || '',
      title: ev.title || ev.className || '',
      date: ev.date || '',
      startTime: (ev.startTime || '').slice(0, 5),
      endTime: (ev.endTime || '').slice(0, 5),
      roomName: ev.roomName || '',
    });
    setEditingId(ev.scheduleId);
    setModalMode('view');
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setFormData({ ...EMPTY_FORM });
    setModalError(null);
  };

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setModalError(null);
    try {
      const payload = {
        ...formData,
        startTime: formData.startTime.slice(0, 5),
        endTime: formData.endTime.slice(0, 5),
      };

      if (modalMode === 'create') {
        await scheduleService.createSchedule(payload);
      } else {
        await scheduleService.updateSchedule(editingId, payload);
      }
      clearScheduleCache();
      sessionStorage.setItem('schedule_needs_reload', 'true');
      sessionStorage.setItem('classes_needs_reload', 'true');
      closeModal();
      await fetchSchedules(true);
    } catch (err) {
      setModalError(err.message || 'Thao tác thất bại. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (scheduleId) => {
    try {
      await scheduleService.deleteSchedule(scheduleId);
      clearScheduleCache();
      sessionStorage.setItem('schedule_needs_reload', 'true');
      sessionStorage.setItem('classes_needs_reload', 'true');
      setDeleteConfirmId(null);
      closeModal();
      await fetchSchedules(true);
    } catch (err) {
      setError(err.message || 'Không thể xóa lịch học.');
    }
  };

  // Extract unique room names from current events
  const roomList = Array.from(new Set(events.map(ev => ev.roomName).filter(Boolean)));

  // Client-side filtering by room
  const displayedEvents = events.filter(event => {
    if (selectedRoomFilter && event.roomName !== selectedRoomFilter) {
      return false;
    }
    return true;
  });

  // Helper to determine if we should only show class name on calendar cards (e.g. before filters are applied)
  const onlyShowClassName = !selectedClassFilter && !selectedTeacherFilter;

  // ── calendar positioning ─────────────────────────────────────────────────

  const calculateTop = (startHour) => (startHour - TIME_HOURS[0]) * 96;
  const calculateHeight = (durationHours) => Math.max(durationHours * 96, 48);

  /** Turn API events into calendar‑positioned objects for a specific dayIdx. */
  const eventsForDay = (dayIdx) => {
    const dayStr = formatDate(weekDates[dayIdx]);
    const dayEvents = displayedEvents
      .filter((ev) => ev.date === dayStr)
      .map((ev) => {
        const start = parseTime(ev.startTime);
        const end = parseTime(ev.endTime);
        const duration = end - start || 1;
        return { ...ev, start, end, duration, type: statusToType(ev.status) };
      })
      .sort((a, b) => a.start - b.start || b.duration - a.duration);

    // Group events that overlap in time and calculate side-by-side columns
    const columns = [];
    dayEvents.forEach(event => {
      let placed = false;
      for (let i = 0; i < columns.length; i++) {
        const col = columns[i];
        const hasOverlap = col.some(e => (event.start < e.end && event.end > e.start));
        if (!hasOverlap) {
          col.push(event);
          event.colIdx = i;
          placed = true;
          break;
        }
      }
      if (!placed) {
        columns.push([event]);
        event.colIdx = columns.length - 1;
      }
    });

    const totalCols = columns.length || 1;

    return dayEvents.map(event => {
      const colWidth = 100 / totalCols;
      const leftPercent = (event.colIdx || 0) * colWidth;
      return {
        ...event,
        isOverlapping: totalCols > 1,
        widthStyle: `calc(${colWidth}% - 12px)`,
        leftStyle: `calc(${leftPercent}% + 8px)`
      };
    });
  };

  // ── today checking ──────────────────────────────────────────────────────

  const todayStr = formatDate(new Date());
  const todayDayIdx = weekDates.findIndex((d) => formatDate(d) === todayStr);

  // ── render helpers ──────────────────────────────────────────────────────

  const renderDateRange = () =>
    `${formatDayMonth(weekMonday)} - ${formatDayMonth(weekSunday)}/${weekSunday.getFullYear()}`;

  // ── JSX ──────────────────────────────────────────────────────────────────

  return (
    <div className={styles.scheduleRoot}>
            
      <main className={styles.mainContent}>
        <div className={styles.container}>
          {/* Header */}
          <div className={styles.headerRow}>
            <div>
              <h2 className={styles.title}>Quản lý lịch học</h2>
              <nav className={styles.breadcrumb}>
                <a href="#">Dashboard</a>
                <span className={styles.breadcrumbSeparator}>/</span>
                <span className={styles.breadcrumbCurrent}>Lịch học</span>
              </nav>
            </div>
            <div className={styles.actionButtons}>
              <button className={styles.btnPrimary} onClick={openCreate}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>add</span>
                Tạo lịch học
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className={styles.filterCard}>
            <div className={styles.filterGroup}>
              <select 
                className={styles.select}
                value={selectedClassFilter}
                onChange={(e) => {
                  setSelectedClassFilter(e.target.value);
                }}
              >
                <option value="">Lớp học (Tất cả)</option>
                {classList.map(c => {
                  const cid = c.classId || c.studyClassId || c.id;
                  return (
                    <option key={cid} value={cid}>
                      {c.className}
                    </option>
                  );
                })}
              </select>

              <select 
                className={styles.select}
                value={selectedTeacherFilter}
                onChange={(e) => {
                  setSelectedTeacherFilter(e.target.value);
                }}
              >
                <option value="">Giảng viên (Tất cả)</option>
                {teacherList.map(t => {
                  const tid = t.teacherId || t.id;
                  return (
                    <option key={tid} value={tid}>
                      {t.fullName || t.name}
                    </option>
                  );
                })}
              </select>

              <select 
                className={styles.select}
                value={selectedRoomFilter}
                onChange={(e) => setSelectedRoomFilter(e.target.value)}
              >
                <option value="">Phòng học (Tất cả)</option>
                {roomList.map(room => (
                  <option key={room} value={room}>
                    {room}
                  </option>
                ))}
              </select>

              {/* Week navigation */}
              <button className={styles.iconBtn} onClick={goPrev} title="Tuần trước">
                <span className="material-symbols-outlined">chevron_left</span>
              </button>
              <button className={styles.dateBtn} onClick={goToday}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px', verticalAlign: 'middle', marginRight: '4px' }}>calendar_today</span>
                {renderDateRange()}
              </button>
              <button className={styles.iconBtn} onClick={goNext} title="Tuần sau">
                <span className="material-symbols-outlined">chevron_right</span>
              </button>

              <button className={styles.iconBtn} onClick={fetchSchedules} title="Tải lại">
                <span className="material-symbols-outlined">refresh</span>
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className={styles.errorBanner}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>error</span>
              {error}
              <button onClick={fetchSchedules} className={styles.retryBtn}>Thử lại</button>
            </div>
          )}

          {/* Content */}
          <div className={styles.contentCard}>
            {loading && (
              <div className={styles.loadingOverlay}>
                <div className={styles.spinner} />
                <span>Đang tải lịch học...</span>
              </div>
            )}

            {!selectedClassFilter && !selectedTeacherFilter ? (
              <div className={styles.emptyPlaceholder}>
                <span className="material-symbols-outlined">info</span>
                <p>Vui lòng chọn lớp học hoặc giáo viên để xem lịch học</p>
              </div>
            ) : (
              <div className={styles.weekView}>
                <div className={styles.calendarHeader}>
                  <div className={styles.headerCell} style={{ fontSize: '10px', color: 'var(--outline)' }}>THỜI GIAN</div>
                  {weekDates.map((d, idx) => {
                    const isToday = idx === todayDayIdx;
                    const isSunday = idx === 6;
                    const cls = [styles.headerCell, isToday && styles.today, isSunday && styles.sunday].filter(Boolean).join(' ');
                    return (
                      <div key={idx} className={cls}>
                        <div className={styles.dayName}>{DAY_NAMES[idx]}</div>
                        <div className={styles.dayDate}>
                          <span className={isToday ? styles.todayCircle : ''}>
                            {String(d.getDate()).padStart(2, '0')}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className={styles.calendarBody}>
                  <div className={styles.calendarGrid}>
                    {/* Time Column */}
                    <div className={styles.timeColumn}>
                      {TIME_HOURS.map((hour) => (
                        <div key={hour} className={styles.timeSlot}>
                          {hour.toString().padStart(2, '0')}:00
                        </div>
                      ))}
                    </div>

                    {/* Day Columns */}
                    {weekDates.map((_, dayIdx) => (
                      <div
                        key={dayIdx}
                        className={styles.dayColumn}
                        style={{
                          backgroundColor:
                            dayIdx === todayDayIdx
                              ? 'rgba(17, 17, 17, 0.02)'
                              : dayIdx === 6
                              ? 'rgba(159, 47, 45, 0.015)'
                              : '#ffffff',
                        }}
                      >
                        {eventsForDay(dayIdx).map((event) => (
                          <div
                            key={event.scheduleId}
                            className={`${styles.eventCard} ${styles[event.type]}`}
                            style={{
                              top: calculateTop(event.start) + 12 + 'px',
                              height: calculateHeight(event.duration) - 24 + 'px',
                              left: event.leftStyle,
                              width: event.widthStyle,
                            }}
                            onClick={() => openView(event)}
                          >
                            {onlyShowClassName || event.isOverlapping ? (
                              <h4 className={styles.eventTitle} style={{ fontSize: '13px', margin: 0, whiteSpace: 'normal', wordBreak: 'break-word' }}>
                                {event.className || event.title}
                              </h4>
                            ) : (
                              <>
                                <div className={styles.eventHeader}>
                                  <span className={styles.badge}>{event.status || 'Lịch học'}</span>
                                  <span
                                    className="material-symbols-outlined"
                                    style={{ fontSize: '16px', color: 'var(--outline)', cursor: 'pointer' }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openEdit(event);
                                    }}
                                  >
                                    more_vert
                                  </span>
                                </div>
                                <h4 className={styles.eventTitle}>{event.title || event.className}</h4>
                                {event.duration > 1 && (
                                  <p className={styles.eventSubtitle}>{event.className}</p>
                                )}
                                {event.duration > 1 ? (
                                  <div className={styles.eventDetails}>
                                    <div className={styles.eventDetailRow}>
                                      <span className="material-symbols-outlined">schedule</span>
                                      {formatHour(event.start)} - {formatHour(event.end)}
                                    </div>
                                    <div className={styles.eventDetailRow}>
                                      <span className="material-symbols-outlined">room</span>
                                      {event.roomName}
                                    </div>
                                  </div>
                                ) : (
                                  <div className={styles.eventDetailRow} style={{ marginTop: '4px' }}>
                                    {formatHour(event.start)} | {event.roomName}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    ))}

                    {/* Grid Lines */}
                    <div className={styles.gridLines}>
                      {TIME_HOURS.map((_, i) => (
                        <div key={i} className={styles.gridLine} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ──── Create / Edit / View Modal ──── */}
      {modalOpen && (
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>
                {modalMode === 'create' && 'Tạo lịch học mới'}
                {modalMode === 'edit' && 'Chỉnh sửa lịch học'}
                {modalMode === 'view' && 'Chi tiết lịch học'}
              </h3>
              <button className={styles.modalClose} onClick={closeModal}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className={styles.modalBody}>
                {modalError && (
                  <div style={{
                    padding: '8px 12px',
                    marginBottom: '16px',
                    backgroundColor: '#FEF2F2',
                    color: '#DC2626',
                    borderRadius: '6px',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>error</span>
                    <span>{modalError}</span>
                  </div>
                )}
                <div className={styles.formGroup}>
                  <label>Lớp học</label>
                  {modalMode === 'view' ? (
                    <input
                      type="text"
                      value={classList.find(c => (c.classId || c.studyClassId || c.id) === formData.classId)?.className || formData.classId || 'Chưa xác định'}
                      disabled
                    />
                  ) : (
                    <select
                      name="classId"
                      value={formData.classId}
                      onChange={handleChange}
                      required
                    >
                      <option value="">-- Chọn lớp học --</option>
                      {classList.map(c => {
                        const cid = c.classId || c.studyClassId || c.id;
                        return (
                          <option key={cid} value={cid}>
                            {c.className}
                          </option>
                        );
                      })}
                    </select>
                  )}
                </div>
                <div className={styles.formGroup}>
                  <label>Tiêu đề</label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    required
                    disabled={modalMode === 'view'}
                    placeholder="Nhập tiêu đề buổi học"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Ngày</label>
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    required
                    disabled={modalMode === 'view'}
                  />
                </div>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Giờ bắt đầu</label>
                    <input
                      type="time"
                      name="startTime"
                      value={formData.startTime}
                      onChange={handleChange}
                      required
                      disabled={modalMode === 'view'}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Giờ kết thúc</label>
                    <input
                      type="time"
                      name="endTime"
                      value={formData.endTime}
                      onChange={handleChange}
                      required
                      disabled={modalMode === 'view'}
                    />
                  </div>
                </div>
                <div className={styles.formGroup}>
                  <label>Phòng học</label>
                  <input
                    type="text"
                    name="roomName"
                    value={formData.roomName}
                    onChange={handleChange}
                    disabled={modalMode === 'view'}
                    placeholder="Nhập phòng học"
                  />
                </div>
              </div>

              <div className={styles.modalFooter}>
                {modalMode === 'view' ? (
                  <>
                    <button type="button" className={styles.btnOutline} onClick={() => { setModalMode('edit'); }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>edit</span>
                      Chỉnh sửa
                    </button>
                    <button
                      type="button"
                      className={styles.btnDanger}
                      onClick={() => setDeleteConfirmId(editingId)}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete</span>
                      Xóa
                    </button>
                  </>
                ) : (
                  <>
                    {modalMode === 'edit' && (
                      <button
                        type="button"
                        className={styles.btnDanger}
                        style={{ marginRight: 'auto' }}
                        onClick={() => setDeleteConfirmId(editingId)}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete</span>
                        Xóa
                      </button>
                    )}
                    <button type="button" className={styles.btnOutline} onClick={closeModal}>
                      Hủy
                    </button>
                    <button type="submit" className={styles.btnPrimary} disabled={submitting}>
                      {submitting ? 'Đang lưu...' : modalMode === 'create' ? 'Tạo mới' : 'Cập nhật'}
                    </button>
                  </>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ──── Delete Confirm Dialog ──── */}
      {deleteConfirmId && (
        <div className={styles.modalOverlay} onClick={() => setDeleteConfirmId(null)}>
          <div className={styles.modalContent} style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Xác nhận xóa</h3>
              <button className={styles.modalClose} onClick={() => setDeleteConfirmId(null)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className={styles.modalBody}>
              <p style={{ textAlign: 'center', margin: '8px 0 0' }}>
                Bạn có chắc chắn muốn xóa lịch học này? Hành động này không thể hoàn tác.
              </p>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.btnOutline} onClick={() => setDeleteConfirmId(null)}>Hủy</button>
              <button className={styles.btnDanger} onClick={() => handleDelete(deleteConfirmId)}>Xóa</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SchedulePage;
