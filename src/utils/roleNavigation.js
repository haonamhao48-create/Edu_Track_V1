export const PUBLIC_PAGES = [
  'login',
  'admin-login',
  'admin',
  'login/admin',
  'register',
  'forgot-password',
  'payment-success',
  'payment-cancel',
];

const CENTER_PAGES = new Set([
  'dashboard',
  'schedule',
  'classes',
  'create-class',
  'manage-class-students',
  'manage-class-teachers',
  'edit-class',
  'students',
  'create-student',
  'edit-student',
  'teachers',
  'create-teacher',
  'edit-teacher',
  'parents',
  'create-parent',
  'attendance',
  'finance',
  'center-subscriptions',
  'notifications',
  'settings',
  'payment-success',
  'payment-cancel',
]);

const TEACHER_PAGES = new Set([
  'teacher-dashboard',
  'teacher-classes',
  'teacher-schedule',
  'teacher-chat',
  'teacher-profile',
  'teacher-notifications',
  'teacher-account',
  'teacher-change-password',
  'teacher-notification-settings',
  'teacher-class-detail',
  'teacher-student-list',
  'teacher-student-detail',
  'teacher-session-detail',
  'teacher-attendance-method-selection',
  'teacher-manual-attendance',
  'teacher-qr-attendance',
  'teacher-attendance-note',
  'teacher-attendance-success',
  'payment-success',
  'payment-cancel',
]);

const ADMIN_PAGES = new Set([
  'admin-dashboard',
  'admin-centers',
  'admin-parents',
  'admin-subscriptions',
  'admin-revenue',
  'edit-center',
  'edit-parent',
  'payment-success',
  'payment-cancel',
]);

const ROLE_PAGE_ACCESS = {
  Center: CENTER_PAGES,
  Teacher: TEACHER_PAGES,
  Admin: ADMIN_PAGES,
};

export const getDefaultPageForRole = (role) => {
  if (role === 'Teacher') return 'teacher-dashboard';
  if (role === 'Admin') return 'admin-dashboard';
  if (role === 'Center') return 'dashboard';
  return 'login';
};

export const getPaymentReturnPageForRole = (role) => {
  if (role === 'Admin') return 'admin-subscriptions';
  if (role === 'Teacher') return 'teacher-dashboard';
  return 'center-subscriptions';
};

export const isPageAllowedForRole = (role, page) => {
  if (!role || !page) return false;
  if (PUBLIC_PAGES.includes(page)) return true;
  return ROLE_PAGE_ACCESS[role]?.has(page) ?? false;
};
