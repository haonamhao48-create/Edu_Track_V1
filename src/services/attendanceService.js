import { apiClient } from './apiClient';

export const attendanceService = {
  // Tạo buổi điểm danh - POST /api/attendance/sessions
  createSession: async (data) => {
    return await apiClient('/attendance/sessions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Lấy DS buổi theo lớp - GET /api/attendance/sessions?classId=xxx
  getSessionsByClass: async (classId) => {
    return await apiClient(`/attendance/sessions?classId=${classId}`, {
      method: 'GET',
    });
  },

  // Điểm danh thủ công - POST /api/attendance/manual
  manualAttendance: async (data) => {
    attendanceService.clearStatsCache();
    return await apiClient('/attendance/manual', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Lấy kết quả điểm danh theo buổi - GET /api/attendance/sessions/{sessionId}/records
  getRecordsBySession: async (sessionId) => {
    return await apiClient(`/attendance/sessions/${sessionId}/records`, {
      method: 'GET',
    });
  },

  // Lấy toàn bộ records theo lớp - GET /api/attendance/classes/{classId}/records
  getRecordsByClass: async (classId) => {
    return await apiClient(`/attendance/classes/${classId}/records`, {
      method: 'GET',
    });
  },

  _statsCache: {},

  clearStatsCache: () => {
    attendanceService._statsCache = {};
  },

  // Thống kê điểm danh HS - GET /api/attendance/student/{studentId}/stats
  getStudentStats: async (studentId) => {
    if (attendanceService._statsCache[studentId]) {
      return attendanceService._statsCache[studentId];
    }
    const response = await apiClient(`/attendance/student/${studentId}/stats`, {
      method: 'GET',
    });
    attendanceService._statsCache[studentId] = response;
    return response;
  },

  // Lấy chi tiết lịch sử điểm danh của học sinh
  getAttendanceByStudent: async (studentId) => {
    return await apiClient(`/attendance/student/${studentId}`, {
      method: 'GET',
    });
  },

  // Tạo QR code - POST /api/attendance/sessions/{sessionId}/qr
  generateQR: async (sessionId) => {
    return await apiClient(`/attendance/sessions/${sessionId}/qr`, {
      method: 'POST',
    });
  },

  // Đóng buổi điểm danh - POST /api/attendance/sessions/{sessionId}/close
  closeSession: async (sessionId, expectedStudentIds) => {
    attendanceService.clearStatsCache();
    return await apiClient(`/attendance/sessions/${sessionId}/close`, {
      method: 'POST',
      body: JSON.stringify({ expectedStudentIds }),
    });
  },
};

