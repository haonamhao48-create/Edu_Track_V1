import React, { useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import AdminLoginPage from './pages/AdminLogin/AdminLoginPage';
import AttendancePage from './pages/Attendance/AttendancePage';
import AdminCentersPage from './pages/Admin/AdminCentersPage';
import AdminDashboardPage from './pages/Admin/AdminDashboardPage';
import AdminParentsPage from './pages/Admin/AdminParentsPage';
import AdminSubscriptionsPage from './pages/Admin/AdminSubscriptionsPage';
import AdminRevenuePage from './pages/Admin/AdminRevenuePage';
import CenterProfilePage from './pages/CenterProfile/CenterProfilePage';
import CenterSubscriptionsPage from './pages/CenterSubscriptions/CenterSubscriptionsPage';
import CreateClassPage from './pages/Classes/CreateClassPage';
import ClassesPage from './pages/Classes/ClassesPage';
import EditClassPage from './pages/Classes/EditClassPage';
import ManageClassStudentsPage from './pages/Classes/ManageClassStudentsPage';
import ManageClassTeachersPage from './pages/Classes/ManageClassTeachersPage';
import DashboardPage from './pages/Dashboard/DashboardPage';
import EditCenterPage from './pages/Admin/EditCenterPage';
import EditParentPage from './pages/Admin/EditParentPage';
import FinancePage from './pages/Finance/FinancePage';
import ForgotPasswordPage from './pages/ForgotPassword/ForgotPasswordPage';
import LandingPage from './pages/Landing/LandingPage';
import LoginPage from './pages/Login/LoginPage';
import NotificationsPage from './pages/Notifications/NotificationsPage';
import CreateParentPage from './pages/Parents/CreateParentPage';
import ParentsPage from './pages/Parents/ParentsPage';
import PaymentCancelPage from './pages/Payment/PaymentCancelPage';
import PaymentSuccessPage from './pages/Payment/PaymentSuccessPage';
import RegisterPage from './pages/Register/RegisterPage';
import SchedulePage from './pages/Schedule/SchedulePage';
import CreateStudentPage from './pages/Students/CreateStudentPage';
import EditStudentPage from './pages/Students/EditStudentPage';
import StudentsPage from './pages/Students/StudentsPage';
import TeacherAccountPage from './pages/TeacherPortal/TeacherAccountPage';
import TeacherAttendanceMethodSelectionPage from './pages/TeacherPortal/TeacherAttendanceMethodSelectionPage';
import TeacherAttendanceNotePage from './pages/TeacherPortal/TeacherAttendanceNotePage';
import TeacherAttendanceSuccessPage from './pages/TeacherPortal/TeacherAttendanceSuccessPage';
import TeacherChangePasswordPage from './pages/TeacherPortal/TeacherChangePasswordPage';
import TeacherChatPage from './pages/TeacherPortal/TeacherChatPage';
import TeacherClassDetailPage from './pages/TeacherPortal/TeacherClassDetailPage';
import TeacherClassesPage from './pages/TeacherPortal/TeacherClassesPage';
import TeacherDashboardPage from './pages/TeacherPortal/TeacherDashboardPage';
import TeacherManualAttendancePage from './pages/TeacherPortal/TeacherManualAttendancePage';
import TeacherNotificationSettingsPage from './pages/TeacherPortal/TeacherNotificationSettingsPage';
import TeacherNotificationsPage from './pages/TeacherPortal/TeacherNotificationsPage';
import TeacherProfilePage from './pages/TeacherPortal/TeacherProfilePage';
import TeacherQrAttendancePage from './pages/TeacherPortal/TeacherQrAttendancePage';
import TeacherSchedulePage from './pages/TeacherPortal/TeacherSchedulePage';
import TeacherSessionDetailPage from './pages/TeacherPortal/TeacherSessionDetailPage';
import TeacherStudentDetailPage from './pages/TeacherPortal/TeacherStudentDetailPage';
import TeacherStudentListPage from './pages/TeacherPortal/TeacherStudentListPage';
import CreateTeacherPage from './pages/Teachers/CreateTeacherPage';
import EditTeacherPage from './pages/Teachers/EditTeacherPage';
import TeachersPage from './pages/Teachers/TeachersPage';
import TeacherReviewsPage from './pages/TeacherReviews/TeacherReviewsPage';
import CenterReviewsPage from './pages/CenterReviews/CenterReviewsPage';
import Header from './components/Layout/Header';
import Sidebar from './components/Layout/Sidebar';
import {
  PUBLIC_PAGES,
  getDefaultPageForRole,
  isPageAllowedForRole,
} from './utils/roleNavigation';

const getSidebarActivePage = (page) => {
  if (['classes', 'create-class', 'manage-class-students', 'manage-class-teachers', 'edit-class'].includes(page)) return 'classes';
  if (['students', 'create-student', 'edit-student'].includes(page)) return 'students';
  if (['teachers', 'create-teacher', 'edit-teacher'].includes(page)) return 'teachers';
  if (['parents', 'create-parent', 'edit-parent'].includes(page)) return 'parents';
  if (page === 'center-subscriptions') return 'center-subscriptions';
  if (page === 'admin-subscriptions') return 'admin-subscriptions';
  if (page === 'settings') return 'settings';

  if ([
    'teacher-classes',
    'teacher-class-detail',
    'teacher-student-list',
    'teacher-student-detail',
    'teacher-session-detail',
    'teacher-attendance-method-selection',
    'teacher-manual-attendance',
    'teacher-qr-attendance',
    'teacher-attendance-note',
    'teacher-attendance-success',
  ].includes(page)) return 'teacher-classes';

  if (['teacher-profile', 'teacher-account', 'teacher-change-password', 'teacher-notification-settings'].includes(page)) return 'teacher-profile';
  if (['admin-centers', 'edit-center'].includes(page)) return 'admin-centers';
  if (['admin-parents', 'edit-parent'].includes(page)) return 'admin-parents';

  return page;
};

const getInitialPage = () => {
  const path = window.location.pathname;

  if (path.includes('landing')) return 'landing';
  if (path.includes('payment/success') || path.includes('payment-success')) return 'payment-success';
  if (path.includes('payment/cancel') || path.includes('payment-cancel')) return 'payment-cancel';
  if (path === '/admin' || path === '/admin/') return 'admin-login';
  if (path === '/login/admin' || path === '/login/admin/') return 'admin-login';
  if (path.includes('admin-login')) return 'admin-login';
  if (path.includes('center-subscriptions')) return 'center-subscriptions';
  if (path.includes('admin-subscriptions')) return 'admin-subscriptions';
  if (path.includes('admin-revenue')) return 'admin-revenue';
  if (path.includes('admin-dashboard')) return 'admin-dashboard';
  if (path.includes('admin-centers')) return 'admin-centers';
  if (path.includes('admin-parents')) return 'admin-parents';
  if (path.includes('admin-teacher-reviews')) return 'admin-teacher-reviews';
  if (path.includes('admin-center-reviews')) return 'admin-center-reviews';
  if (path.includes('teacher-reviews')) return 'teacher-reviews';
  if (path.includes('center-reviews')) return 'center-reviews';
  if (path.includes('teacher-dashboard')) return 'teacher-dashboard';
  if (path.includes('teacher-classes')) return 'teacher-classes';
  if (path.includes('teacher-schedule')) return 'teacher-schedule';
  if (path.includes('teacher-chat')) return 'teacher-chat';
  if (path.includes('teacher-profile')) return 'teacher-profile';
  if (path.includes('teacher-notifications')) return 'teacher-notifications';
  if (path.includes('teacher-account')) return 'teacher-account';
  if (path.includes('teacher-change-password')) return 'teacher-change-password';
  if (path.includes('teacher-notification-settings')) return 'teacher-notification-settings';
  if (path.includes('teacher-class-detail')) return 'teacher-class-detail';
  if (path.includes('teacher-student-list')) return 'teacher-student-list';
  if (path.includes('teacher-student-detail')) return 'teacher-student-detail';
  if (path.includes('teacher-session-detail')) return 'teacher-session-detail';
  if (path.includes('teacher-class-attendance-history')) return 'teacher-class-attendance-history';
  if (path.includes('teacher-attendance-method-selection')) return 'teacher-attendance-method-selection';
  if (path.includes('teacher-manual-attendance')) return 'teacher-manual-attendance';
  if (path.includes('teacher-qr-attendance')) return 'teacher-qr-attendance';
  if (path.includes('teacher-attendance-note')) return 'teacher-attendance-note';
  if (path.includes('teacher-attendance-success')) return 'teacher-attendance-success';
  if (path.includes('teacher-add-feedback')) return 'teacher-add-feedback';
  if (path.includes('login')) return 'login';
  if (path.includes('register')) return 'register';
  if (path.includes('create-class')) return 'create-class';
  if (path.includes('create-student')) return 'create-student';
  if (path.includes('create-teacher')) return 'create-teacher';
  if (path.includes('create-parent')) return 'create-parent';
  if (path.includes('attendance')) return 'attendance';
  if (path.includes('finance')) return 'finance';
  if (path.includes('notifications')) return 'notifications';
  if (path.includes('schedule')) return 'schedule';
  if (path.includes('dashboard')) return 'dashboard';
  if (path.includes('classes')) return 'classes';
  if (path.includes('students')) return 'students';
  if (path.includes('teachers')) return 'teachers';
  if (path.includes('parents')) return 'parents';
  if (path.includes('manage-class-students')) return 'manage-class-students';
  if (path.includes('manage-class-teachers')) return 'manage-class-teachers';
  if (path.includes('edit-class')) return 'edit-class';
  if (path.includes('edit-teacher')) return 'edit-teacher';
  if (path.includes('edit-student')) return 'edit-student';
  if (path.includes('edit-center')) return 'edit-center';
  if (path.includes('edit-parent')) return 'edit-parent';
  if (path.includes('settings')) return 'settings';
  return 'landing';
};

const resolveAuthorizedPage = (requestedPage, token, role) => {
  if (!token) {
    return PUBLIC_PAGES.includes(requestedPage) ? requestedPage : 'landing';
  }

  if (PUBLIC_PAGES.includes(requestedPage) && !['forgot-password', 'payment-success', 'payment-cancel'].includes(requestedPage)) {
    return getDefaultPageForRole(role);
  }

  if (!PUBLIC_PAGES.includes(requestedPage) && !isPageAllowedForRole(role, requestedPage)) {
    return getDefaultPageForRole(role);
  }

  return requestedPage;
};

function App() {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  let user = null;
  try {
    user = userStr ? JSON.parse(userStr) : null;
  } catch (_) {
    user = null;
  }

  const initialPage = getInitialPage();
  const startPage = resolveAuthorizedPage(initialPage, token, user?.role);

  if (startPage !== initialPage) {
    window.history.replaceState({ page: startPage }, '', `/${startPage}`);
  }

  const [currentPage, setCurrentPage] = useState(startPage);
  const [displayedPage, setDisplayedPage] = useState(startPage);
  const [pageKey, setPageKey] = useState(0);

  const navigate = (page) => {
    const nextToken = localStorage.getItem('token');
    const nextUserStr = localStorage.getItem('user');
    let nextUser = null;
    try {
      nextUser = nextUserStr ? JSON.parse(nextUserStr) : null;
    } catch (_) {
      nextUser = null;
    }

    const rawPage = String(page || '');
    const [basePath, queryString = ''] = rawPage.split('?');
    const targetPage = resolveAuthorizedPage(basePath, nextToken, nextUser?.role);
    const nextUrl = `/${targetPage}${queryString ? `?${queryString}` : ''}`;
    const currentUrl = `${window.location.pathname}${window.location.search}`;

    if (nextUrl === currentUrl) return;

    window.history.pushState({ page: targetPage }, '', nextUrl);
    setCurrentPage(targetPage);
    setDisplayedPage(targetPage);
    setPageKey((value) => value + 1);
  };

  useEffect(() => {
    const handlePopState = (event) => {
      const tokenValue = localStorage.getItem('token');
      const localUserStr = localStorage.getItem('user');
      let localUser = null;
      try {
        localUser = localUserStr ? JSON.parse(localUserStr) : null;
      } catch (_) {
        localUser = null;
      }

      const requestedPage = event.state?.page || getInitialPage();
      const authorizedPage = resolveAuthorizedPage(requestedPage, tokenValue, localUser?.role);

      if (authorizedPage !== requestedPage) {
        window.history.replaceState({ page: authorizedPage }, '', `/${authorizedPage}`);
      }

      if (authorizedPage !== currentPage) {
        setCurrentPage(authorizedPage);
        setDisplayedPage(authorizedPage);
        setPageKey((value) => value + 1);
      }
    };

    window.addEventListener('popstate', handlePopState);

    if (!window.history.state) {
      window.history.replaceState({ page: currentPage }, '', `${window.location.pathname}${window.location.search}`);
    }

    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentPage]);

  const isDashboardLayout = [
    'dashboard',
    'admin-dashboard',
    'admin-centers',
    'admin-parents',
    'admin-subscriptions',
    'admin-revenue',
    'teacher-reviews',
    'admin-teacher-reviews',
    'center-reviews',
    'admin-center-reviews',
    'schedule',
    'classes',
    'create-class',
    'students',
    'create-student',
    'teachers',
    'create-teacher',
    'parents',
    'create-parent',
    'attendance',
    'finance',
    'center-subscriptions',
    'notifications',
    'manage-class-students',
    'manage-class-teachers',
    'edit-class',
    'edit-teacher',
    'edit-student',
    'edit-center',
    'edit-parent',
    'settings',
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
    'teacher-class-attendance-history',
    'teacher-attendance-method-selection',
    'teacher-manual-attendance',
    'teacher-qr-attendance',
    'teacher-attendance-note',
    'teacher-attendance-success',
    'teacher-add-feedback',
  ].includes(displayedPage);

  if (displayedPage === 'landing') {
    return (
      <>
        <Toaster position="top-right" />
        <LandingPage onNavigate={navigate} />
      </>
    );
  }

  return (
    <>
      <Toaster position="top-right" />
      {!isDashboardLayout && (
        <div className="bg-decoration">
          <div className="bg-blob-1"></div>
          <div className="bg-blob-2"></div>
        </div>
      )}

      {isDashboardLayout ? (
        <div className="dashboard-layout-container">
          <Sidebar activePage={getSidebarActivePage(currentPage)} onNavigate={navigate} />
          <Header onNavigate={navigate} />
          <div key={displayedPage} className="dashboard-transition">
            {displayedPage === 'dashboard' && <DashboardPage onNavigate={navigate} />}
            {displayedPage === 'classes' && <ClassesPage key={pageKey} onNavigate={navigate} />}
            {displayedPage === 'create-class' && <CreateClassPage onNavigate={navigate} />}
            {displayedPage === 'students' && <StudentsPage key={pageKey} onNavigate={navigate} />}
            {displayedPage === 'create-student' && <CreateStudentPage onNavigate={navigate} />}
            {displayedPage === 'teachers' && <TeachersPage key={pageKey} onNavigate={navigate} />}
            {displayedPage === 'teacher-reviews' && <TeacherReviewsPage role="Center" onNavigate={navigate} />}
            {displayedPage === 'admin-teacher-reviews' && <TeacherReviewsPage role="Admin" onNavigate={navigate} />}
            {displayedPage === 'center-reviews' && <CenterReviewsPage role="Center" onNavigate={navigate} />}
            {displayedPage === 'admin-center-reviews' && <CenterReviewsPage role="Admin" onNavigate={navigate} />}
            {displayedPage === 'create-teacher' && <CreateTeacherPage onNavigate={navigate} />}
            {displayedPage === 'parents' && <ParentsPage key={pageKey} onNavigate={navigate} />}
            {displayedPage === 'create-parent' && <CreateParentPage onNavigate={navigate} />}
            {displayedPage === 'attendance' && <AttendancePage onNavigate={navigate} />}
            {displayedPage === 'finance' && <FinancePage onNavigate={navigate} />}
            {displayedPage === 'center-subscriptions' && <CenterSubscriptionsPage key={pageKey} onNavigate={navigate} />}
            {displayedPage === 'notifications' && <NotificationsPage onNavigate={navigate} />}
            {displayedPage === 'schedule' && <SchedulePage onNavigate={navigate} />}
            {displayedPage === 'manage-class-students' && <ManageClassStudentsPage onNavigate={navigate} />}
            {displayedPage === 'manage-class-teachers' && <ManageClassTeachersPage onNavigate={navigate} />}
            {displayedPage === 'edit-class' && <EditClassPage onNavigate={navigate} />}
            {displayedPage === 'edit-teacher' && <EditTeacherPage onNavigate={navigate} />}
            {displayedPage === 'edit-student' && <EditStudentPage onNavigate={navigate} />}
            {displayedPage === 'settings' && <CenterProfilePage onNavigate={navigate} />}
            {displayedPage === 'teacher-dashboard' && <TeacherDashboardPage key={pageKey} onNavigate={navigate} />}
            {displayedPage === 'teacher-classes' && <TeacherClassesPage key={pageKey} onNavigate={navigate} />}
            {displayedPage === 'teacher-schedule' && <TeacherSchedulePage key={pageKey} onNavigate={navigate} />}
            {displayedPage === 'teacher-chat' && <TeacherChatPage key={pageKey} onNavigate={navigate} />}
            {displayedPage === 'teacher-profile' && <TeacherProfilePage key={pageKey} onNavigate={navigate} />}
            {displayedPage === 'teacher-notifications' && <TeacherNotificationsPage key={pageKey} onNavigate={navigate} />}
            {displayedPage === 'teacher-account' && <TeacherAccountPage key={pageKey} onNavigate={navigate} />}
            {displayedPage === 'teacher-change-password' && <TeacherChangePasswordPage key={pageKey} onNavigate={navigate} />}
            {displayedPage === 'teacher-notification-settings' && <TeacherNotificationSettingsPage key={pageKey} onNavigate={navigate} />}
            {displayedPage === 'teacher-class-detail' && <TeacherClassDetailPage key={pageKey} onNavigate={navigate} />}
            {displayedPage === 'teacher-student-list' && <TeacherStudentListPage key={pageKey} onNavigate={navigate} />}
            {displayedPage === 'teacher-student-detail' && <TeacherStudentDetailPage key={pageKey} onNavigate={navigate} />}
            {displayedPage === 'teacher-session-detail' && <TeacherSessionDetailPage key={pageKey} onNavigate={navigate} />}
            {displayedPage === 'teacher-attendance-method-selection' && <TeacherAttendanceMethodSelectionPage key={pageKey} onNavigate={navigate} />}
            {displayedPage === 'teacher-manual-attendance' && <TeacherManualAttendancePage key={pageKey} onNavigate={navigate} />}
            {displayedPage === 'teacher-qr-attendance' && <TeacherQrAttendancePage key={pageKey} onNavigate={navigate} />}
            {displayedPage === 'teacher-attendance-note' && <TeacherAttendanceNotePage key={pageKey} onNavigate={navigate} />}
            {displayedPage === 'teacher-attendance-success' && <TeacherAttendanceSuccessPage key={pageKey} onNavigate={navigate} />}
            {displayedPage === 'admin-dashboard' && <AdminDashboardPage key={pageKey} onNavigate={navigate} />}
            {displayedPage === 'admin-centers' && <AdminCentersPage key={pageKey} onNavigate={navigate} />}
            {displayedPage === 'admin-parents' && <AdminParentsPage key={pageKey} onNavigate={navigate} />}
            {displayedPage === 'admin-subscriptions' && <AdminSubscriptionsPage key={pageKey} onNavigate={navigate} />}
            {displayedPage === 'admin-revenue' && <AdminRevenuePage key={pageKey} onNavigate={navigate} />}
            {displayedPage === 'edit-center' && <EditCenterPage key={pageKey} onNavigate={navigate} />}
            {displayedPage === 'edit-parent' && <EditParentPage key={pageKey} onNavigate={navigate} />}
          </div>
        </div>
      ) : (
        <div key={displayedPage} className="page-transition-container">
          {displayedPage === 'login' && <LoginPage onNavigate={navigate} />}
          {displayedPage === 'admin-login' && <AdminLoginPage onNavigate={navigate} />}
          {displayedPage === 'forgot-password' && <ForgotPasswordPage onNavigate={navigate} />}
          {displayedPage === 'register' && <RegisterPage onNavigate={navigate} />}
          {displayedPage === 'payment-success' && <PaymentSuccessPage onNavigate={navigate} />}
          {displayedPage === 'payment-cancel' && <PaymentCancelPage onNavigate={navigate} />}
        </div>
      )}
    </>
  );
}

export default App;
