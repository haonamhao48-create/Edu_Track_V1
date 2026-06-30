import React, { useEffect, useRef, useState } from 'react';
import { centerService } from '../../services/centerService';
import { notificationService } from '../../services/notificationService';
import { teacherService } from '../../services/teacherService';
import { normalizeDetailResponse, normalizeListResponse } from '../../utils/apiResponse';
import styles from './Header.module.css';

const getRoleTitle = (role) => {
  if (role === 'Teacher') return 'Giáo viên EduTrack';
  if (role === 'Admin') return 'Quản trị EduTrack';
  return 'Trung tâm EduTrack';
};

const getRoleLabel = (role) => {
  if (role === 'Teacher') return 'Giáo viên';
  if (role === 'Admin') return 'Quản trị viên';
  return 'Quản trị viên';
};

const getNotificationIcon = (type) => {
  const value = String(type || '').toLowerCase();
  if (value.includes('schedule') || value.includes('lich')) return 'calendar_month';
  if (value.includes('tuition') || value.includes('hoc phi') || value.includes('finance')) return 'payments';
  if (value.includes('attendance') || value.includes('diem danh')) return 'event_available';
  if (value.includes('enrollment') || value.includes('ghi danh')) return 'person_add';
  if (value.includes('comment') || value.includes('nhan xet')) return 'rate_review';
  if (value.includes('welcome') || value.includes('chao mung')) return 'handshake';
  return 'campaign';
};

const formatTime = (timeStr) => {
  if (!timeStr) return 'Vừa xong';
  try {
    const date = new Date(timeStr);
    return `${date.toLocaleDateString('vi-VN')} ${date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
  } catch {
    return timeStr;
  }
};

const Header = ({ onNavigate }) => {
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [showNotiDropdown, setShowNotiDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const userStr = localStorage.getItem('user');
  let user = null;
  try {
    user = userStr ? JSON.parse(userStr) : null;
  } catch (_) {
    user = null;
  }

  const role = user?.role;

  const [displayName, setDisplayName] = useState(() => {
    if (role === 'Center') {
      const cached = sessionStorage.getItem('cached_center_profile');
      if (cached) {
        try {
          const profile = JSON.parse(cached);
          return profile?.name || '';
        } catch (_) {}
      }
    } else if (role === 'Teacher') {
      const cached = sessionStorage.getItem('cached_teacher_profile');
      if (cached) {
        try {
          const profile = JSON.parse(cached);
          return profile?.fullName || '';
        } catch (_) {}
      }
    }
    return user?.fullName || user?.username || '';
  });

  const [displayLogo, setDisplayLogo] = useState(() => {
    if (role === 'Center') {
      const cached = sessionStorage.getItem('cached_center_profile');
      if (cached) {
        try {
          const profile = JSON.parse(cached);
          return profile?.logo || null;
        } catch (_) {}
      }
    } else if (role === 'Teacher') {
      const cached = sessionStorage.getItem('cached_teacher_profile');
      if (cached) {
        try {
          const profile = JSON.parse(cached);
          return profile?.imageUrl || profile?.avatar || null;
        } catch (_) {}
      }
    }
    return user?.imageUrl || user?.avatar || null;
  });

  useEffect(() => {
    fetchUnreadCount();
    fetchProfile();

    const interval = setInterval(fetchUnreadCount, 30000);
    window.addEventListener('unread_count_updated', fetchUnreadCount);

    const handleProfileUpdate = () => {
      fetchProfile();
    };
    window.addEventListener('center_profile_updated', handleProfileUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener('unread_count_updated', fetchUnreadCount);
      window.removeEventListener('center_profile_updated', handleProfileUpdate);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowNotiDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const response = await notificationService.getUnreadCount();
      const count = response?.unreadCount !== undefined ? response.unreadCount : response?.data || 0;
      setUnreadCount(count);
    } catch (error) {
      console.error('Loi khi lay so thong bao chua doc:', error);
    }
  };

  const fetchProfile = async () => {
    try {
      if (role === 'Teacher') {
        const data = await teacherService.getProfileMe();
        const profile = normalizeDetailResponse(data);
        setDisplayName(profile?.fullName || '');
        setDisplayLogo(profile?.imageUrl || profile?.avatar || null);
        if (profile) sessionStorage.setItem('cached_teacher_profile', JSON.stringify(profile));
        return;
      }

      if (role === 'Admin') {
        setDisplayName(user?.fullName || user?.username || 'Admin');
        setDisplayLogo(user?.imageUrl || user?.avatar || null);
        return;
      }

      const profile = normalizeDetailResponse(await centerService.getCenterProfile());
      setDisplayName(profile?.name || '');
      setDisplayLogo(profile?.logo || null);
      if (profile) sessionStorage.setItem('cached_center_profile', JSON.stringify(profile));
    } catch (error) {
      console.error('Loi khi tai thong tin header:', error);
      setDisplayName(user?.fullName || user?.username || '');
      setDisplayLogo(user?.imageUrl || user?.avatar || null);
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await notificationService.getNotificationHistory(null, 1, 5);
      const items = normalizeListResponse(response);
      setNotifications(items);
    } catch (error) {
      console.error('Loi khi tai lich su thong bao:', error);
    }
  };

  const handleToggleDropdown = () => {
    const nextState = !showNotiDropdown;
    setShowNotiDropdown(nextState);
    if (nextState) {
      fetchNotifications();
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await notificationService.markAsRead(notificationId);
      setNotifications((prev) => prev.map((item) => (item.id === notificationId ? { ...item, isRead: true, read: true } : item)));
      fetchUnreadCount();
    } catch (error) {
      console.error('Loi khi danh dau da doc:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Loi khi danh dau doc tat ca:', error);
    }
  };

  const initials = (displayName || 'ED')
    .split(' ')
    .map((word) => word[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <header className={styles.header}>
      <div className={styles.leftSection}>
        <h2 className={styles.title}>{getRoleTitle(role)}</h2>
        <div className={`${styles.searchWrapper} ${isSearchFocused ? styles.searchFocused : ''}`}>
          <span className={`material-symbols-outlined ${styles.searchIcon}`}>search</span>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Tìm kiếm học sinh, lớp học..."
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
          />
        </div>
      </div>

      <div className={styles.rightSection}>
        <button className={styles.iconButton} aria-label="Trợ giúp" title="Trợ giúp">
          <span className="material-symbols-outlined">help</span>
        </button>

        {role === 'Center' && (
          <button
            className={styles.iconButton}
            onClick={() => onNavigate?.('center-subscriptions')}
            title="Cập nhật gói đăng ký"
            aria-label="Cập nhật gói đăng ký"
          >
            <span className="material-symbols-outlined">system_update_alt</span>
          </button>
        )}

        <div className={styles.notificationContainer} ref={dropdownRef}>
          <button 
            className={styles.iconButton} 
            onClick={handleToggleDropdown}
            aria-label="Thông báo"
            aria-expanded={showNotiDropdown}
          >
            <span className="material-symbols-outlined">notifications</span>
            {unreadCount > 0 && (
              <span className={styles.notificationBadge}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotiDropdown && (
            <div className={styles.notiDropdown}>
              <div className={styles.notiHeader}>
                <span className={styles.notiTitle}>Thông báo mới nhận</span>
                {unreadCount > 0 && (
                  <button className={styles.markAllBtn} onClick={handleMarkAllAsRead}>
                    Đọc tất cả
                  </button>
                )}
              </div>

              <div className={styles.notiList}>
                {notifications.length === 0 ? (
                  <div className={styles.emptyNoti}>
                    <span className={`material-symbols-outlined ${styles.emptyIcon}`}>notifications_off</span>
                    <span>Không có thông báo mới nào</span>
                  </div>
                ) : (
                  notifications.map((noti) => {
                    const isUnread = !noti.isRead && !noti.read;
                    return (
                      <button
                        key={noti.id}
                        className={`${styles.notiItem} ${isUnread ? styles.notiUnread : ''}`}
                        onClick={() => handleMarkAsRead(noti.id)}
                      >
                        <span className={`material-symbols-outlined ${styles.notiIcon}`}>
                          {getNotificationIcon(noti.type)}
                        </span>
                        <div className={styles.notiContent}>
                          <p className={styles.notiSubject}>{noti.title || 'Thông báo hệ thống'}</p>
                          <p className={styles.notiBody}>{noti.message || noti.body}</p>
                          <span className={styles.notiTime}>{formatTime(noti.createdAt || noti.time)}</span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        <div
          className={styles.profileSection}
          onClick={() => {
            if (role === 'Center') {
              onNavigate?.('settings');
            } else if (role === 'Teacher') {
              onNavigate?.('teacher-profile');
            }
          }}
        >
          <div className={styles.profileInfo}>
            <p className={styles.profileName}>{displayName}</p>
            <p className={styles.profileRole}>{getRoleLabel(role)}</p>
          </div>

          {displayLogo ? (
            <img alt="Profile" className={styles.profileImage} src={displayLogo} />
          ) : (
            <div className={styles.profileInitialsAvatar}>{initials}</div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
