import React from 'react';
import { authService } from '../../services/authService';
import styles from './Sidebar.module.css';

const centerNavItems = [
  { id: 'dashboard', icon: 'dashboard', label: 'Tổng quan' },
  { id: 'classes', icon: 'school', label: 'Lớp học' },
  { id: 'students', icon: 'group', label: 'Học sinh' },
  { id: 'teachers', icon: 'person', label: 'Giáo viên' },
  { id: 'teacher-reviews', icon: 'rate_review', label: 'Đánh giá giáo viên' },
  { id: 'center-reviews', icon: 'domain', label: 'Đánh giá trung tâm' },
  { id: 'parents', icon: 'family_restroom', label: 'Phụ huynh' },
  { id: 'schedule', icon: 'calendar_month', label: 'Lịch biểu' },
  { id: 'attendance', icon: 'how_to_reg', label: 'Điểm danh' },
  { id: 'finance', icon: 'payments', label: 'Quản lý doanh thu' },
  { id: 'notifications', icon: 'notifications', label: 'Thông báo' },
];

const teacherNavItems = [
  { id: 'teacher-dashboard', icon: 'dashboard', label: 'Tổng quan' },
  { id: 'teacher-classes', icon: 'school', label: 'Lớp học của tôi' },
  { id: 'teacher-schedule', icon: 'calendar_month', label: 'Lịch giảng dạy' },
  { id: 'teacher-chat', icon: 'chat', label: 'Tin nhắn' },
  { id: 'teacher-profile', icon: 'person', label: 'Tài khoản' },
  { id: 'teacher-notifications', icon: 'notifications', label: 'Thông báo' },
];

const adminNavItems = [
  { id: 'admin-dashboard', icon: 'dashboard', label: 'Tổng quan' },
  { id: 'admin-centers', icon: 'school', label: 'Quản lý trung tâm' },
  { id: 'admin-parents', icon: 'family_restroom', label: 'Quản lý phụ huynh' },
  { id: 'admin-subscriptions', icon: 'workspace_premium', label: 'Gói đăng ký' },
  { id: 'admin-revenue', icon: 'payments', label: 'Quản lý doanh thu' },
  { id: 'admin-teacher-reviews', icon: 'rate_review', label: 'Đánh giá giáo viên' },
  { id: 'admin-center-reviews', icon: 'domain', label: 'Đánh giá trung tâm' },
];

const getNavItemsForRole = (role) => {
  if (role === 'Teacher') return teacherNavItems;
  if (role === 'Admin') return adminNavItems;
  return centerNavItems;
};

const Sidebar = ({ activePage = 'dashboard', onNavigate }) => {
  const userStr = localStorage.getItem('user');
  let user = null;
  try {
    user = userStr ? JSON.parse(userStr) : null;
  } catch (_) {
    user = null;
  }

  const role = user?.role;
  const currentNavItems = getNavItemsForRole(role);

  return (
    <aside className={styles.sidebar}>
      <div
        className={styles.logoSection}
        onClick={() => {
          const dashboardPage = role === 'Teacher' ? 'teacher-dashboard' : role === 'Admin' ? 'admin-dashboard' : 'dashboard';
          onNavigate?.(dashboardPage);
        }}
      >
        <img
          alt="EduTrack Logo"
          className={styles.logoImg}
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuC4jP4Fz61T9gKh79LN7jR7rZ2-SSr4fCZH9cILzuqnHW9ZlA342_QD61eBE8BM4Typ13xtih74yp9xEpbnHOmJsm30EEoVUGYbIisGbPU1I3rbURV_fwJkyAsrHgwCDmciinO8HhjQE2Rogqw-RJPbKrwchswD-kiS0nDvpx7Nko7AiosN77ZgYt1J2YiNSnJ_aHDFU73VLUAS5d9VF9n8HKOxjRkXhN37-UjpbGfj3KhcuapZngrBMXh4z0ZwW4IbJH7rZI0HVv8"
        />
        <div>
          <h1 className={styles.logoTitle}>EduTrack</h1>
          <p className={styles.logoSubtitle}>Quản lý học tập</p>
        </div>
      </div>

      <nav className={`${styles.nav} custom-scrollbar`}>
        {currentNavItems.map((item) => (
          <a
            key={item.id}
            href="#"
            className={`${styles.navItem} ${activePage === item.id ? styles.active : ''}`}
            onClick={(event) => {
              event.preventDefault();
              onNavigate?.(item.id);
            }}
          >
            <span className="material-symbols-outlined notranslate" translate="no">{item.icon}</span>
            <span>{item.label}</span>
          </a>
        ))}
      </nav>

      <div className={styles.settingsSection}>
        {role === 'Center' && (
          <a
            href="#"
            className={styles.navItem}
            onClick={(event) => {
              event.preventDefault();
              onNavigate?.('settings');
            }}
          >
            <span className="material-symbols-outlined notranslate" translate="no">settings</span>
            <span>Cài đặt</span>
          </a>
        )}
        <a
          href="#"
          className={`${styles.navItem} ${styles.logoutItem}`}
          onClick={(event) => {
            event.preventDefault();
            authService.logout();
          }}
          aria-label="Đăng xuất"
        >
          <span className="material-symbols-outlined notranslate" translate="no">logout</span>
          <span>Đăng xuất</span>
        </a>
      </div>
    </aside>
  );
};

export default Sidebar;
