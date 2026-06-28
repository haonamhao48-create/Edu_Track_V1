import React, { useState, useEffect } from 'react';
import { notificationService } from '../../services/notificationService';
import styles from './TeacherNotificationsPage.module.css';

const filterOptions = [
  { label: 'Tất cả', value: null },
  { label: 'Điểm danh', value: 'Attendance' },
  { label: 'Lịch dạy', value: 'Schedule' },
  { label: 'Hệ thống', value: 'System' },
];

const TeacherNotificationsPage = ({ onNavigate }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedFilter, setSelectedFilter] = useState(0);

  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();
  }, [selectedFilter]);

  const fetchUnreadCount = async () => {
    try {
      const res = await notificationService.getNotificationHistory(null, 1, 100);
      const list = Array.isArray(res?.items) ? res.items : (Array.isArray(res) ? res : []);
      const unread = list.filter(n => !n.isRead && !n.read).length;
      setUnreadCount(unread);
    } catch (err) {}
  };

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const type = filterOptions[selectedFilter].value;
      const res = await notificationService.getNotificationHistory(type, 1, 50);
      const list = Array.isArray(res?.items) ? res.items : (Array.isArray(res) ? res : []);
      setNotifications(list);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (noti, index) => {
    if (!noti.isRead && !noti.read) {
      try {
        await notificationService.markAsRead(noti.id);
        const newList = [...notifications];
        newList[index].isRead = true;
        setNotifications(newList);
        setUnreadCount(prev => Math.max(0, prev - 1));
        window.dispatchEvent(new Event('unread_count_updated'));
      } catch (err) {}
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
      window.dispatchEvent(new Event('unread_count_updated'));
    } catch (err) {}
  };

  const getStyle = (typeStr) => {
    const t = (typeStr || '').toLowerCase();
    if (t.includes('attendance') || t.includes('điểm danh')) return { cls: styles.attendance, icon: 'how_to_reg' };
    if (t.includes('schedule') || t.includes('lịch')) return { cls: styles.schedule, icon: 'calendar_month' };
    return { cls: styles.system, icon: 'info' };
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    try {
      const d = new Date(timeStr);
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} · ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    } catch {
      return timeStr;
    }
  };

  return (
    <div className={styles.notificationsRoot}>
                  <main className={styles.mainContent}>
        <div className={styles.container}>
          <div className={styles.pageHeader}>
            <div className={styles.headerLeft}>
              <h3>Thông báo {unreadCount > 0 && <span className={styles.unreadBadge}>{unreadCount}</span>}</h3>
            </div>
            {unreadCount > 0 && (
              <button className={styles.markReadBtn} onClick={markAllAsRead}>
                <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '18px' }}>done_all</span>
                Đọc tất cả
              </button>
            )}
          </div>

          <div className={styles.filterTabs}>
            {filterOptions.map((opt, idx) => (
              <button 
                key={idx} 
                className={`${styles.filterTab} ${selectedFilter === idx ? styles.active : ''}`}
                onClick={() => setSelectedFilter(idx)}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className={styles.loadingSpinner}>Đang tải thông báo...</div>
          ) : notifications.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIconBox}>
                <div className={styles.emptyIconInner}>
                  <span className="material-symbols-outlined notranslate" translate="no">notifications_off</span>
                </div>
              </div>
              <h5>Chưa có thông báo nào</h5>
              <p>Các thông báo về điểm danh, lịch dạy<br/>và hệ thống sẽ hiển thị tại đây</p>
            </div>
          ) : (
            <div className={styles.notificationsList}>
              {notifications.map((noti, idx) => {
                const isUnread = !noti.isRead && !noti.read;
                const styleInfo = getStyle(noti.type);
                return (
                  <div 
                    key={noti.id || idx} 
                    className={`${styles.notificationCardOuter} ${isUnread ? styles.unread : ''}`}
                    onClick={() => markAsRead(noti, idx)}
                  >
                    <div className={styles.notificationCardInner}>
                      <div className={`${styles.iconBox} ${styleInfo.cls}`}>
                        <span className="material-symbols-outlined notranslate" translate="no">{styleInfo.icon}</span>
                      </div>
                      <div className={styles.contentBox}>
                        <div className={styles.cardHeader}>
                          <h6>{noti.title || 'Thông báo'}</h6>
                          <span className={styles.timeText}>{formatTime(noti.createdAt)}</span>
                        </div>
                        <p className={styles.cardDesc}>{noti.content || noti.body || noti.message}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default TeacherNotificationsPage;
