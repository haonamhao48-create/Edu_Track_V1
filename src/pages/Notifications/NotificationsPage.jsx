import React, { useState, useEffect } from 'react';
import { notificationService } from '../../services/notificationService';
import { classService } from '../../services/classService';
import { studentService } from '../../services/studentService';
import { parentService } from '../../services/parentService';
import { teacherService } from '../../services/teacherService';
import styles from './NotificationsPage.module.css';

const NotificationsPage = ({ onNavigate }) => {
  // Navigation tab for the page view: 'create' (Soạn thông báo) or 'inbox' (Hộp thư thông báo thật)
  const [pageTab, setPageTab] = useState('inbox');

  // Tab categories for composing notification
  const [activeTab, setActiveTab] = useState('Lịch học');
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');


  const composeTabs = ['Lịch học', 'Học phí', 'Điểm danh', 'Tin tức'];

  // Inbox variables
  const [inboxNotifications, setInboxNotifications] = useState(() => {
    const cached = sessionStorage.getItem('cached_notifications_page_1');
    return cached ? JSON.parse(cached) : [];
  });
  const [createSuccess, setCreateSuccess] = useState('');
  const [createError, setCreateError] = useState('');

  // Recipient selection states
  const [recipientType, setRecipientType] = useState('All');
  const [selectedClasses, setSelectedClasses] = useState([]);
  const [specificRole, setSpecificRole] = useState('Student');
  const [selectedSpecificId, setSelectedSpecificId] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);


  // Recipient data lists
  const [classesList, setClassesList] = useState([]);
  const [studentsList, setStudentsList] = useState([]);
  const [parentsList, setParentsList] = useState([]);
  const [teachersList, setTeachersList] = useState([]);
  const [loadingRecipientData, setLoadingRecipientData] = useState(false);
  const [classSearch, setClassSearch] = useState('');
  const [specificSearch, setSpecificSearch] = useState('');


  // Auto-clear compose states
  useEffect(() => {
    if (createSuccess) {
      const timer = setTimeout(() => setCreateSuccess(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [createSuccess]);

  useEffect(() => {
    if (createError) {
      const timer = setTimeout(() => setCreateError(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [createError]);

  useEffect(() => {
    setClassSearch('');
    setSpecificSearch('');
    setSelectedSpecificId('');
    setSelectedClasses([]);
  }, [recipientType]);

  useEffect(() => {
    setSpecificSearch('');
    setSelectedSpecificId('');
  }, [specificRole]);

  const [loadingInbox, setLoadingInbox] = useState(() => {
    const cached = sessionStorage.getItem('cached_notifications_page_1');
    const needsReload = sessionStorage.getItem('notifications_needs_reload') === 'true';
    return pageTab === 'inbox' && (!cached || needsReload);
  });
  const [inboxError, setInboxError] = useState('');
  const [inboxSuccess, setInboxSuccess] = useState('');
  const [inboxTypeFilter, setInboxTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(() => {
    const cached = sessionStorage.getItem('cached_notifications_total_pages');
    return cached ? parseInt(cached, 10) : 1;
  });
  const [totalCount, setTotalCount] = useState(() => {
    const cached = sessionStorage.getItem('cached_notifications_total_count');
    return cached ? parseInt(cached, 10) : 0;
  });

  // Detail Modal
  const [selectedNoti, setSelectedNoti] = useState(null);

  // Load notifications inbox
  useEffect(() => {
    if (pageTab === 'inbox') {
      fetchInboxNotifications();
    }
  }, [pageTab, inboxTypeFilter, page]);

  // Request push notification permission and register device token on mount
  useEffect(() => {
    const registerPush = async () => {
      try {
        if ('Notification' in window) {
          const permission = await Notification.requestPermission();
          if (permission === 'granted') {
            let deviceToken = localStorage.getItem('push_device_token');
            if (!deviceToken) {
              deviceToken = 'web_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
              localStorage.setItem('push_device_token', deviceToken);
            }
            await notificationService.saveDeviceToken(deviceToken, 'web');
            console.log('Đã đăng ký device token thành công:', deviceToken);
          }
        }
      } catch (err) {
        console.warn('Không thể đăng ký device token:', err);
      }
    };
    registerPush();
  }, []);

  // Fetch classes, students, parents, and teachers when entering compose tab
  useEffect(() => {
    if (pageTab !== 'create') return;

    const loadData = async () => {
      setLoadingRecipientData(true);
      try {
        // Fetch classes (for Class recipientType)
        const cachedClasses = sessionStorage.getItem('cached_classes');
        let cls = cachedClasses ? JSON.parse(cachedClasses) : [];
        if (cls.length === 0) {
          const res = await classService.getAllClasses();
          cls = Array.isArray(res) ? res : (res?.items || res?.data || res?.classes || []);
          sessionStorage.setItem('cached_classes', JSON.stringify(cls));
        }
        setClassesList(cls);

        // Fetch students (for Specific student selection)
        const cachedStudents = sessionStorage.getItem('cached_all_students_noti');
        let stds = cachedStudents ? JSON.parse(cachedStudents) : [];
        if (stds.length === 0) {
          const res = await studentService.getStudentsByCenter({ page: 1, pageSize: 1000 });
          stds = res?.items || (Array.isArray(res) ? res : []);
          sessionStorage.setItem('cached_all_students_noti', JSON.stringify(stds));
        }
        setStudentsList(stds);

        // Fetch parents (for Specific parent selection)
        const cachedParents = sessionStorage.getItem('cached_all_parents');
        let pts = cachedParents ? JSON.parse(cachedParents) : [];
        if (pts.length === 0) {
          const res = await parentService.getParents({ page: 1, pageSize: 1000 });
          pts = res?.items || (Array.isArray(res) ? res : []);
          sessionStorage.setItem('cached_all_parents', JSON.stringify(pts));
        }
        setParentsList(pts);

        // Fetch teachers (for Specific teacher selection)
        const cachedTeachers = sessionStorage.getItem('cached_teachers_noti');
        let tchs = cachedTeachers ? JSON.parse(cachedTeachers) : [];
        if (tchs.length === 0) {
          const res = await teacherService.getTeachers({ page: 1, pageSize: 1000 });
          tchs = res?.items || (Array.isArray(res) ? res : []);
          sessionStorage.setItem('cached_teachers_noti', JSON.stringify(tchs));
        }
        setTeachersList(tchs);
      } catch (err) {
        console.error('Lỗi khi tải thông tin danh sách người nhận:', err);
      } finally {
        setLoadingRecipientData(false);
      }
    };
    loadData();
  }, [pageTab]);

  const fetchInboxNotifications = async (force = false) => {
    const needsReload = sessionStorage.getItem('notifications_needs_reload') === 'true';
    const isCacheable = !inboxTypeFilter;

    if (needsReload || force) {
      Object.keys(sessionStorage).forEach(key => {
        if (key.startsWith('cached_notifications_page_') || 
            key === 'cached_notifications_total_pages' || 
            key === 'cached_notifications_total_count') {
          sessionStorage.removeItem(key);
        }
      });
    }

    const cacheKey = `cached_notifications_page_${page}`;
    const hasCache = sessionStorage.getItem(cacheKey);

    if (isCacheable && !force && !needsReload && hasCache) {
      const cached = sessionStorage.getItem(cacheKey);
      const cachedTotalPages = sessionStorage.getItem('cached_notifications_total_pages');
      const cachedTotalCount = sessionStorage.getItem('cached_notifications_total_count');
      if (cached) {
        setInboxNotifications(JSON.parse(cached));
      }
      if (cachedTotalPages) {
        setTotalPages(parseInt(cachedTotalPages, 10));
      }
      if (cachedTotalCount) {
        setTotalCount(parseInt(cachedTotalCount, 10));
      }
      setLoadingInbox(false);
      return;
    }

    setLoadingInbox(true);
    setInboxError('');
    try {
      const res = await notificationService.getNotificationHistory(inboxTypeFilter || null, page, 10);
      const list = res?.items || (Array.isArray(res) ? res : []);
      setInboxNotifications(list);
      
      const tPages = res?.totalPages || 1;
      const tCount = res?.totalCount || list.length;
      
      setTotalPages(tPages);
      setTotalCount(tCount);

      if (isCacheable) {
        sessionStorage.setItem(cacheKey, JSON.stringify(list));
        sessionStorage.setItem('cached_notifications_total_pages', tPages.toString());
        sessionStorage.setItem('cached_notifications_total_count', tCount.toString());
        sessionStorage.removeItem('notifications_needs_reload');
      }
    } catch (err) {
      console.error('Lỗi khi tải lịch sử thông báo:', err);
      setInboxError('Không thể tải lịch sử thông báo từ hệ thống.');
    } finally {
      setLoadingInbox(false);
    }
  };

  const handleMarkAsRead = async (noti) => {
    setSelectedNoti(noti);
    if (!noti.isRead && !noti.read) {
      try {
        await notificationService.markAsRead(noti.id);
        // Update local state
        const updatedList = inboxNotifications.map(n => (n.id === noti.id ? { ...n, isRead: true } : n));
        setInboxNotifications(updatedList);
        
        // Dispatch custom event to notify Header
        window.dispatchEvent(new Event('unread_count_updated'));
        
        // Also update cache if it is cacheable
        const isCacheable = !inboxTypeFilter;
        if (isCacheable) {
          sessionStorage.setItem(`cached_notifications_page_${page}`, JSON.stringify(updatedList));
        }
      } catch (err) {
        console.error('Lỗi khi đánh dấu đã đọc:', err);
      }
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead();
      const updatedList = inboxNotifications.map(n => ({ ...n, isRead: true }));
      setInboxNotifications(updatedList);
      setInboxSuccess('Đã đánh dấu đọc tất cả thông báo.');
      
      // Dispatch custom event to notify Header
      window.dispatchEvent(new Event('unread_count_updated'));
      
      // Update cache
      if (!inboxTypeFilter) {
        sessionStorage.setItem(`cached_notifications_page_${page}`, JSON.stringify(updatedList));
      }
    } catch (err) {
      console.error('Lỗi khi đánh dấu đọc tất cả:', err);
      setInboxError('Thao tác thất bại.');
    }
  };

  const handleSaveDraft = () => {
    setCreateSuccess('');
    setCreateError('');
    if (!title.trim() && !content.trim()) {
      setCreateError('Vui lòng nhập tiêu đề hoặc nội dung để lưu nháp.');
      return;
    }
    const draft = {
      title: title.trim(),
      content: content.trim(),
      recipientType,
      selectedClasses,
      specificRole,
      selectedSpecificId,
      pushEnabled,
      emailEnabled,
      activeTab,
      attachments,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem('edutrack_noti_draft', JSON.stringify(draft));
    setCreateSuccess('Đã lưu bản nháp thông báo thành công.');
  };

  const handleLoadDraft = () => {
    setCreateSuccess('');
    setCreateError('');
    const saved = localStorage.getItem('edutrack_noti_draft');
    if (saved) {
      try {
        const draft = JSON.parse(saved);
        setTitle(draft.title || '');
        setContent(draft.content || '');
        setRecipientType(draft.recipientType || 'All');
        setSelectedClasses(draft.selectedClasses || []);
        setSpecificRole(draft.specificRole || 'Student');
        setSelectedSpecificId(draft.selectedSpecificId || '');
        setPushEnabled(draft.pushEnabled !== false);
        setEmailEnabled(!!draft.emailEnabled);
        if (draft.activeTab) setActiveTab(draft.activeTab);
        setAttachments(draft.attachments || []);
        setCreateSuccess('Đã khôi phục bản nháp thành công.');
      } catch (err) {
        console.error('Lỗi khôi phục bản nháp:', err);
        setCreateError('Không thể khôi phục bản nháp.');
      }
    }
  };

  const handleClearDraft = () => {
    setCreateSuccess('');
    setCreateError('');
    localStorage.removeItem('edutrack_noti_draft');
    setCreateSuccess('Đã xóa bản nháp.');
  };

  const handleFileUpload = async (e) => {
    const fileSource = e.target.files || e.dataTransfer.files;
    const files = Array.from(fileSource || []);
    if (files.length === 0) return;

    setIsUploading(true);
    setCreateError('');
    setCreateSuccess('');

    const uploadedUrls = [...attachments];

    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        setCreateError(`Tệp ${file.name} vượt quá dung lượng tối đa 10MB.`);
        continue;
      }

      try {
        const res = await notificationService.uploadAttachment(file);
        const fileUrl = res.url || res.path || res.data?.url || res.data?.path || '';
        if (fileUrl) {
          uploadedUrls.push({ name: file.name, url: fileUrl, size: file.size });
        } else {
          const fakeUrl = URL.createObjectURL(file);
          uploadedUrls.push({ name: file.name, url: fakeUrl, size: file.size, isFallback: true });
        }
      } catch (err) {
        console.warn('Lỗi gọi API upload tệp:', err);
        const fakeUrl = URL.createObjectURL(file);
        uploadedUrls.push({ name: file.name, url: fakeUrl, size: file.size, isFallback: true });
      }
    }

    setAttachments(uploadedUrls);
    setIsUploading(false);
  };

  const triggerFileInput = () => {
    const inputEl = document.getElementById('fileInput');
    if (inputEl) inputEl.click();
  };



  const handleSend = async (e) => {
    if (e) e.preventDefault();
    setCreateSuccess('');
    setCreateError('');

    if (!title.trim()) {
      setCreateError('Vui lòng nhập tiêu đề thông báo.');
      return;
    }

    if (!content.trim()) {
      setCreateError('Vui lòng nhập nội dung thông báo.');
      return;
    }

    // Build channels
    const channels = [];
    if (pushEnabled) channels.push('Push');
    if (emailEnabled) channels.push('Email');

    if (channels.length === 0) {
      setCreateError('Vui lòng chọn ít nhất một kênh gửi thông báo.');
      return;
    }

    // Validate recipient fields based on recipientType
    let recipientIds = [];
    let specificRecipients = null;

    if (recipientType === 'Class') {
      if (selectedClasses.length === 0) {
        setCreateError('Vui lòng chọn ít nhất một lớp học nhận thông báo.');
        return;
      }
      recipientIds = selectedClasses;
    } else if (recipientType === 'Specific') {
      if (!selectedSpecificId) {
        setCreateError(`Vui lòng chọn một ${specificRole === 'Student' ? 'học sinh' : specificRole === 'Parent' ? 'phụ huynh' : 'giáo viên'} để gửi thông báo.`);
        return;
      }
      specificRecipients = [{
        id: selectedSpecificId,
        role: specificRole
      }];
    }

    // Build payload
    const typeMap = {
      'Lịch học': 'Schedule',
      'Học phí': 'Tuition',
      'Điểm danh': 'Attendance',
      'Tin tức': 'News'
    };
    
    const payload = {
      title: title.trim(),
      body: content.trim(),
      type: typeMap[activeTab] || 'News',
      recipientType: recipientType,
      recipientIds: recipientIds,
      specificRecipients: specificRecipients,
      channels: channels,
      attachments: attachments.map(a => a.url)
    };

    setIsSending(true);
    try {
      await notificationService.sendNotification(payload);
      setCreateSuccess('Gửi thông báo thành công!');
      
      // Clean form fields
      setTitle('');
      setContent('');
      setSelectedClasses([]);
      setSelectedSpecificId('');
      setRecipientType('All');
      setClassSearch('');
      setSpecificSearch('');
      setAttachments([]);


      
      // Trigger reload flag for notifications inbox
      sessionStorage.setItem('notifications_needs_reload', 'true');
    } catch (err) {
      console.error('Lỗi khi gửi thông báo:', err);
      setCreateError(err?.message || 'Không thể gửi thông báo. Vui lòng thử lại sau.');
    } finally {
      setIsSending(false);
    }
  };

  // Helper mapping icon for notification type
  const getNotificationIcon = (type) => {
    const t = (type || '').toLowerCase();
    if (t.includes('schedule') || t.includes('lịch')) return 'calendar_month';
    if (t.includes('tuition') || t.includes('học phí') || t.includes('finance')) return 'payments';
    if (t.includes('attendance') || t.includes('điểm danh')) return 'event_available';
    if (t.includes('enrollment') || t.includes('ghi danh')) return 'person_add';
    if (t.includes('comment') || t.includes('nhận xét')) return 'rate_review';
    if (t.includes('welcome') || t.includes('chào mừng')) return 'handshake';
    return 'campaign';
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '--:--';
    try {
      const d = new Date(timeStr);
      return d.toLocaleDateString('vi-VN') + ' ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return timeStr;
    }
  };

  return (
    <div className={styles.notificationsRoot}>
                  
      <main className={styles.mainContent}>
        <div className={styles.container}>
          {/* Tabs switch at the top */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--outline-variant)', marginBottom: '24px', gap: '24px' }}>
            <button 
              onClick={() => setPageTab('inbox')}
              style={{
                padding: '12px 8px', fontSize: '16px', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer',
                color: pageTab === 'inbox' ? 'var(--primary)' : 'var(--on-surface-variant)',
                borderBottom: pageTab === 'inbox' ? '3px solid var(--primary)' : '3px solid transparent',
              }}
            >
              Hộp thư đến (Hệ thống)
            </button>
            <button 
              onClick={() => setPageTab('create')}
              style={{
                padding: '12px 8px', fontSize: '16px', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer',
                color: pageTab === 'create' ? 'var(--primary)' : 'var(--on-surface-variant)',
                borderBottom: pageTab === 'create' ? '3px solid var(--primary)' : '3px solid transparent',
              }}
            >
              Soạn thông báo mới
            </button>
          </div>

          {pageTab === 'create' ? (
            /* Composing Notification Form (Original View) */
            <>
              <div className={styles.pageHeader}>
                <div>
                  <h2 className={styles.pageTitle}>Tạo thông báo</h2>
                  <p className={styles.pageSubtitle}>Soạn và gửi thông báo mới cho toàn bộ trung tâm hoặc từng lớp học.</p>
                </div>
                <div className={styles.headerActions}>
                  <button className={styles.btnDraft} onClick={handleSaveDraft} disabled={isSending}>Lưu nháp</button>
                  <button className={styles.btnSend} onClick={handleSend} disabled={isSending}>
                    {isSending ? 'Đang gửi...' : 'Gửi thông báo'}
                  </button>
                </div>
              </div>

              {createSuccess && (
                <div style={{ padding: '12px 16px', backgroundColor: '#E6FFFA', color: '#047857', borderRadius: '8px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '20px' }}>check_circle</span>
                  {createSuccess}
                </div>
              )}
              {createError && (
                <div style={{ padding: '12px 16px', backgroundColor: '#FEF2F2', color: '#DC2626', borderRadius: '8px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '20px' }}>error</span>
                  {createError}
                </div>
              )}

              {localStorage.getItem('edutrack_noti_draft') && (
                <div style={{ padding: '12px 16px', backgroundColor: 'var(--surface-container-low)', border: '1px solid var(--outline-variant)', borderRadius: '12px', fontSize: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="material-symbols-outlined" style={{ color: 'var(--primary)' }}>drafts</span>
                    <span>Bạn có một bản nháp thông báo đã lưu trước đó.</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      type="button" 
                      onClick={handleLoadDraft}
                      style={{ padding: '4px 12px', borderRadius: '6px', border: 'none', background: 'var(--primary)', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
                    >
                      Khôi phục
                    </button>
                    <button 
                      type="button" 
                      onClick={handleClearDraft}
                      style={{ padding: '4px 12px', borderRadius: '6px', border: '1px solid var(--outline-variant)', background: 'white', color: 'var(--on-surface-variant)', cursor: 'pointer', fontSize: '13px' }}
                    >
                      Xóa nháp
                    </button>
                  </div>
                </div>
              )}


              <div className={styles.mainGrid}>
                <div className={styles.formArea}>
                  <div className={`${styles.cardBase} ${styles.formGroup}`}>
                    {/* Recipient */}
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Người nhận</label>
                      
                      {/* Recipient Type Selection */}
                      <div className={styles.recipientTypeGroup}>
                        <button
                          type="button"
                          className={`${styles.recipientTypeBtn} ${recipientType === 'All' ? styles.recipientTypeActive : ''}`}
                          onClick={() => setRecipientType('All')}
                        >
                          <span className="material-symbols-outlined">group</span>
                          <span>Tất cả trung tâm</span>
                        </button>
                        <button
                          type="button"
                          className={`${styles.recipientTypeBtn} ${recipientType === 'Class' ? styles.recipientTypeActive : ''}`}
                          onClick={() => setRecipientType('Class')}
                        >
                          <span className="material-symbols-outlined">class</span>
                          <span>Theo lớp học</span>
                        </button>
                        <button
                          type="button"
                          className={`${styles.recipientTypeBtn} ${recipientType === 'Specific' ? styles.recipientTypeActive : ''}`}
                          onClick={() => setRecipientType('Specific')}
                        >
                          <span className="material-symbols-outlined">person</span>
                          <span>Cá nhân cụ thể</span>
                        </button>
                      </div>

                      {/* Recipient Type Details Selector */}
                      {recipientType === 'All' && (
                        <div className={styles.recipientInfoBanner}>
                          <span className="material-symbols-outlined">info</span>
                          <span>Thông báo sẽ được gửi tới toàn bộ học sinh, phụ huynh và giáo viên trong hệ thống.</span>
                        </div>
                      )}

                      {recipientType === 'Class' && (
                        <div className={styles.classesSelector}>
                          <div className={styles.selectorHeader}>
                            <span className={styles.selectorSubtitle}>Chọn các lớp học nhận thông báo:</span>
                            <div className={styles.headerButtonGroup}>
                              <button
                                type="button"
                                className={styles.smallActionBtn}
                                onClick={() => setSelectedClasses(classesList.map(c => c.classId || c.id))}
                              >
                                Chọn tất cả
                              </button>
                              <button
                                type="button"
                                className={styles.smallActionBtn}
                                onClick={() => setSelectedClasses([])}
                              >
                                Bỏ chọn hết
                              </button>
                            </div>
                          </div>

                          {/* Search Input for Classes */}
                          <div className={styles.searchContainer}>
                            <span className="material-symbols-outlined">search</span>
                            <input
                              type="text"
                              className={styles.searchInput}
                              placeholder="Tìm kiếm lớp học..."
                              value={classSearch}
                              onChange={(e) => setClassSearch(e.target.value)}
                            />
                          </div>

                          <div className={styles.classesGrid}>
                            {loadingRecipientData ? (
                              <div className={styles.loadingSpinnerMini}>
                                <span className="material-symbols-outlined spinner-icon">progress_activity</span>
                                <span>Đang tải danh sách lớp học...</span>
                              </div>
                            ) : classesList.length === 0 ? (
                              <div className={styles.emptyListText}>Không có dữ liệu lớp học nào.</div>
                            ) : (
                              (() => {
                                const filtered = classesList.filter(c => 
                                  (c.className || c.name || '').toLowerCase().includes(classSearch.toLowerCase()) ||
                                  (c.courseName || '').toLowerCase().includes(classSearch.toLowerCase())
                                );
                                if (filtered.length === 0) {
                                  return <div className={styles.emptyListText}>Không tìm thấy lớp học nào khớp.</div>;
                                }
                                return filtered.map(c => {
                                  const cid = c.classId || c.id;
                                  const isChecked = selectedClasses.includes(cid);
                                  return (
                                    <label key={cid} className={`${styles.classCheckboxItem} ${isChecked ? styles.classItemChecked : ''}`}>
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            setSelectedClasses([...selectedClasses, cid]);
                                          } else {
                                            setSelectedClasses(selectedClasses.filter(id => id !== cid));
                                          }
                                        }}
                                      />
                                      <div className={styles.classCheckboxLabel}>
                                        <span className={styles.classNameText}>{c.className || c.name}</span>
                                        {c.courseName && <span className={styles.courseNameText}>{c.courseName}</span>}
                                      </div>
                                    </label>
                                  );
                                });
                              })()
                            )}
                          </div>
                        </div>
                      )}

                      {recipientType === 'Specific' && (
                        <div className={styles.specificSelector}>
                          <span className={styles.selectorSubtitle}>Chọn vai trò và tìm kiếm người nhận:</span>
                          
                          {/* Role selectors */}
                          <div className={styles.roleSelectorGroup}>
                            <button
                              type="button"
                              className={`${styles.roleSelectBtn} ${specificRole === 'Student' ? styles.roleSelectActive : ''}`}
                              onClick={() => setSpecificRole('Student')}
                            >
                              <span className="material-symbols-outlined">school</span>
                              Học sinh
                            </button>
                            <button
                              type="button"
                              className={`${styles.roleSelectBtn} ${specificRole === 'Parent' ? styles.roleSelectActive : ''}`}
                              onClick={() => setSpecificRole('Parent')}
                            >
                              <span className="material-symbols-outlined">family_restroom</span>
                              Phụ huynh
                            </button>
                            <button
                              type="button"
                              className={`${styles.roleSelectBtn} ${specificRole === 'Teacher' ? styles.roleSelectActive : ''}`}
                              onClick={() => setSpecificRole('Teacher')}
                            >
                              <span className="material-symbols-outlined">assignment_ind</span>
                              Giáo viên
                            </button>
                          </div>

                          {/* Search Input */}
                          <div className={styles.searchContainer}>
                            <span className="material-symbols-outlined">search</span>
                            <input
                              type="text"
                              className={styles.searchInput}
                              placeholder={`Tìm kiếm tên hoặc số điện thoại ${specificRole === 'Student' ? 'học sinh' : specificRole === 'Parent' ? 'phụ huynh' : 'giáo viên'}...`}
                              value={specificSearch}
                              onChange={(e) => setSpecificSearch(e.target.value)}
                            />
                          </div>

                          {/* Individual dropdown list */}
                          <div className={styles.specificDropdownContainer}>
                            {loadingRecipientData ? (
                              <div className={styles.loadingSpinnerMini}>
                                <span className="material-symbols-outlined spinner-icon">progress_activity</span>
                                <span>Đang tải thông tin cá nhân...</span>
                              </div>
                            ) : (
                              (() => {
                                const query = specificSearch.toLowerCase();
                                let listToFilter = [];
                                if (specificRole === 'Student') listToFilter = studentsList;
                                else if (specificRole === 'Parent') listToFilter = parentsList;
                                else if (specificRole === 'Teacher') listToFilter = teachersList;

                                const filtered = listToFilter.filter(item => 
                                  (item.fullName || item.name || '').toLowerCase().includes(query) ||
                                  (item.phoneNumber || '').includes(query) ||
                                  (item.email || '').toLowerCase().includes(query)
                                );

                                return (
                                  <select
                                    className={styles.specificSelect}
                                    value={selectedSpecificId}
                                    onChange={(e) => setSelectedSpecificId(e.target.value)}
                                  >
                                    <option value="">-- Chọn một người nhận --</option>
                                    {filtered.map(item => {
                                      const itemId = item.studentId || item.parentId || item.teacherId || item.id;
                                      const label = item.fullName || item.name;
                                      const details = item.phoneNumber ? ` - ${item.phoneNumber}` : (item.email ? ` - ${item.email}` : '');
                                      return (
                                        <option key={itemId} value={itemId}>
                                          {label}{details}
                                        </option>
                                      );
                                    })}
                                  </select>
                                );
                              })()
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Categories */}
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Loại thông báo</label>
                      <div className={styles.categoryTabs}>
                        {composeTabs.map(tab => (
                          <button
                            key={tab}
                            type="button"
                            className={`${styles.tabBtn} ${activeTab === tab ? styles.tabActive : styles.tabInactive}`}
                            onClick={() => setActiveTab(tab)}
                          >
                            {tab}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Title */}
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Tiêu đề thông báo</label>
                      <input
                        className={styles.titleInput}
                        placeholder="Nhập tiêu đề hấp dẫn tại đây..."
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                      />
                    </div>

                    {/* Editor */}
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Nội dung chi tiết</label>
                      <div className={styles.editorContainer}>
                        <div className={styles.editorToolbar}>
                          <button className={styles.toolbarBtn} type="button"><span className="material-symbols-outlined text-[20px]">format_bold</span></button>
                          <button className={styles.toolbarBtn} type="button"><span className="material-symbols-outlined text-[20px]">format_italic</span></button>
                          <button className={styles.toolbarBtn} type="button"><span className="material-symbols-outlined text-[20px]">format_list_bulleted</span></button>
                          <button className={styles.toolbarBtn} type="button"><span className="material-symbols-outlined text-[20px]">link</span></button>
                          <div className={styles.toolbarDivider}></div>
                          <button className={styles.toolbarBtn} type="button"><span className="material-symbols-outlined text-[20px]">image</span></button>
                        </div>
                        <textarea
                          className={styles.editorTextarea}
                          placeholder="Viết nội dung thông báo của bạn..."
                          value={content}
                          onChange={(e) => setContent(e.target.value)}
                        ></textarea>
                      </div>
                    </div>

                    {/* File Upload */}
                    <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                      <label className={styles.formLabel}>Đính kèm tài liệu</label>
                      <input
                        type="file"
                        multiple
                        id="fileInput"
                        style={{ display: 'none' }}
                        onChange={handleFileUpload}
                      />
                      <div 
                        className={styles.uploadZone}
                        onClick={triggerFileInput}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          handleFileUpload(e);
                        }}
                      >
                        <span className={`material-symbols-outlined ${styles.uploadIcon} ${isUploading ? styles.uploadingSpinner : ''}`}>
                          {isUploading ? 'progress_activity' : 'upload_file'}
                        </span>
                        <p className={styles.uploadTitle}>
                          {isUploading ? 'Đang tải lên tệp tin...' : (
                            <>Kéo thả tệp vào đây hoặc <span className={styles.uploadLink}>chọn từ máy tính</span></>
                          )}
                        </p>
                        <p className={styles.uploadDesc}>Hỗ trợ PDF, JPG, PNG (Tối đa 10MB)</p>
                      </div>

                      {/* Attachment List */}
                      {attachments.length > 0 && (
                        <div className={styles.attachmentList}>
                          {attachments.map((file, idx) => (
                            <div key={idx} className={styles.attachmentItem}>
                              <span className="material-symbols-outlined">description</span>
                              <div className={styles.attachmentInfo}>
                                <span className={styles.attachmentName}>{file.name}</span>
                                <span className={styles.attachmentSize}>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                              </div>
                              {file.isFallback && <span className={styles.fallbackBadge}>Demo Link</span>}
                              <button 
                                type="button" 
                                className={styles.removeAttachmentBtn} 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setAttachments(attachments.filter((_, i) => i !== idx));
                                }}
                              >
                                <span className="material-symbols-outlined">close</span>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Channels */}
                  <div className={`${styles.cardBase} ${styles.channelCard}`}>
                    <h3 className={styles.channelTitle}>Kênh gửi thông báo</h3>
                    <div className={styles.channelList}>
                      <label className={styles.channelOption}>
                        <div className={styles.channelInfo}>
                          <div className={`${styles.channelIconBox} ${styles.iconPush}`}>
                            <span className="material-symbols-outlined">notifications_active</span>
                          </div>
                          <div>
                            <p className={styles.channelName}>Thông báo đẩy (App Push)</p>
                            <p className={styles.channelDesc}>Gửi trực tiếp đến ứng dụng của phụ huynh/học sinh</p>
                          </div>
                        </div>
                        <input 
                          type="checkbox" 
                          className={styles.toggleSwitch} 
                          checked={pushEnabled}
                          onChange={() => setPushEnabled(!pushEnabled)}
                        />
                      </label>

                      <label className={styles.channelOption}>
                        <div className={styles.channelInfo}>
                          <div className={`${styles.channelIconBox} ${styles.iconEmail}`}>
                            <span className="material-symbols-outlined">mail</span>
                          </div>
                          <div>
                            <p className={styles.channelName}>Gửi Email</p>
                            <p className={styles.channelDesc}>Gửi bản sao thông báo qua email đăng ký</p>
                          </div>
                        </div>
                        <input 
                          type="checkbox" 
                          className={styles.toggleSwitch} 
                          checked={emailEnabled}
                          onChange={() => setEmailEnabled(!emailEnabled)}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* Notifications Inbox (Real API Integration) */
            <div style={{ animation: 'fadeIn 0.2s ease-out' }}>
              <div className={styles.pageHeader}>
                <div>
                  <h2 className={styles.pageTitle}>Hộp thư thông báo hệ thống</h2>
                  <p className={styles.pageSubtitle}>Xem toàn bộ thông báo, cập nhật sự kiện điểm danh, học phí từ hệ thống.</p>
                </div>
                <button 
                  className={styles.btnDraft} 
                  style={{ backgroundColor: 'var(--primary)', color: 'white' }}
                  onClick={handleMarkAllRead}
                  disabled={inboxNotifications.length === 0}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', marginRight: '6px' }}>done_all</span>
                  Đánh dấu tất cả đã đọc
                </button>
              </div>

              {/* Status Messages */}
              {inboxError && <div style={{ color: '#dc2626', background: '#fef2f2', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>{inboxError}</div>}
              {inboxSuccess && <div style={{ color: '#047857', background: '#e6fffb', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>{inboxSuccess}</div>}

              {/* Filtering */}
              <div className={styles.cardBase} style={{ padding: '16px', marginBottom: '16px', display: 'flex', gap: '16px', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', fontWeight: 500 }}>Lọc theo loại:</span>
                <select 
                  value={inboxTypeFilter} 
                  onChange={(e) => { setInboxTypeFilter(e.target.value); setPage(1); }}
                  style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--outline-variant)', outline: 'none' }}
                >
                  <option value="">Tất cả thông báo</option>
                  <option value="Attendance">Điểm danh</option>
                  <option value="Tuition">Học phí</option>
                  <option value="Schedule">Lịch học</option>
                  <option value="Enrollment">Ghi danh</option>
                  <option value="Welcome">Chào mừng</option>
                  <option value="Comment">Nhận xét</option>
                </select>
                <button 
                  onClick={fetchInboxNotifications} 
                  style={{ marginLeft: 'auto', background: 'none', border: '1px solid #ccc', borderRadius: '8px', padding: '8px 12px', cursor: 'pointer' }}
                >
                  Tải lại
                </button>
              </div>

              {/* Notifications List */}
              <div className={styles.cardBase} style={{ overflow: 'hidden' }}>
                {loadingInbox ? (
                  <div style={{ padding: '48px', textAlign: 'center' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '48px', display: 'block', marginBottom: '16px', animation: 'spin 1s linear infinite' }}>progress_activity</span>
                    <p>Đang tải hộp thư thông báo...</p>
                  </div>
                ) : inboxNotifications.length === 0 ? (
                  <div style={{ padding: '48px', textAlign: 'center', color: '#666' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '48px', display: 'block', marginBottom: '16px', opacity: 0.5 }}>notifications_off</span>
                    <p>Hộp thư trống</p>
                  </div>
                ) : (
                  <div>
                    {inboxNotifications.map((noti) => {
                      const isUnread = !noti.isRead && !noti.read;
                      return (
                        <div 
                          key={noti.id}
                          onClick={() => handleMarkAsRead(noti)}
                          style={{
                            display: 'flex', gap: '16px', padding: '16px 24px', borderBottom: '1px solid var(--outline-variant)', cursor: 'pointer',
                            backgroundColor: isUnread ? '#f0f9ff' : 'white', transition: 'background-color 0.2s',
                          }}
                        >
                          <div style={{
                            width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--primary-fixed, #dae2ff)', color: 'var(--primary, #002b74)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px'
                          }}>
                            <span className="material-symbols-outlined">{getNotificationIcon(noti.type)}</span>
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                              <strong style={{ fontSize: '15px' }}>{noti.title}</strong>
                              <span style={{ fontSize: '12px', color: '#666' }}>{formatTime(noti.createdAt || noti.time)}</span>
                            </div>
                            <p style={{ fontSize: '14px', color: '#444', margin: 0 }}>{noti.message || noti.body}</p>
                          </div>
                        </div>
                      );
                    })}

                    {/* Pagination */}
                    {totalCount > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px' }}>
                        <span style={{ fontSize: '13px', color: '#666' }}>Hiển thị trang {page}/{totalPages} (Tổng {totalCount} thông báo)</span>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button 
                            disabled={page === 1} 
                            onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                            style={{ padding: '6px 12px', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer' }}
                          >
                            Trước
                          </button>
                          <button 
                            disabled={page === totalPages} 
                            onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                            style={{ padding: '6px 12px', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer' }}
                          >
                            Sau
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Notification Detail Modal */}
      {selectedNoti && (
        <div 
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => setSelectedNoti(null)}
        >
          <div 
            style={{ backgroundColor: 'white', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '500px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--primary)' }}>{getNotificationIcon(selectedNoti.type)}</span>
                <span style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', color: '#666' }}>{selectedNoti.type || 'Hệ thống'}</span>
              </div>
              <button onClick={() => setSelectedNoti(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666' }}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px', color: 'var(--primary)' }}>{selectedNoti.title}</h3>
            <p style={{ fontSize: '12px', color: '#888', marginBottom: '16px' }}>Thời gian nhận: {formatTime(selectedNoti.createdAt || selectedNoti.time)}</p>
            
            <div style={{ borderTop: '1px solid #eee', paddingTop: '16px', minHeight: '100px', fontSize: '15px', color: '#333', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
              {selectedNoti.message || selectedNoti.body}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px', borderTop: '1px solid #eee', paddingTop: '16px' }}>
              <button 
                onClick={() => setSelectedNoti(null)} 
                style={{ padding: '8px 24px', borderRadius: '8px', border: 'none', background: 'var(--primary)', color: 'white', cursor: 'pointer' }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
