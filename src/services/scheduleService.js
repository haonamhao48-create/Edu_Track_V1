import { apiClient } from './apiClient';

export const scheduleService = {
  // Lấy lịch theo giáo viên/center - GET /api/academic/schedules/teacher
  // Params: teacherId (optional), startDate (required, format YYYY-MM-DD), endDate (optional)
  getSchedules: async (startDate, endDate, teacherId) => {
    let url = `/academic/schedules/teacher?startDate=${startDate}`;
    if (endDate) url += `&endDate=${endDate}`;
    if (teacherId) url += `&teacherId=${teacherId}`;
    return await apiClient(url, { method: 'GET' });
  },

  // Lấy lịch theo lớp học - GET /api/academic/schedules/class/{classId}
  getSchedulesByClass: async (classId, month = null, year = null) => {
    let url = `/academic/schedules/class/${classId}`;
    const params = [];
    if (month) params.push(`month=${month}`);
    if (year) params.push(`year=${year}`);
    if (params.length > 0) {
      url += `?${params.join('&')}`;
    }
    return await apiClient(url, { method: 'GET' });
  },

  // Tạo lịch - POST /api/academic/schedules
  // Body: { classId, title, date (YYYY-MM-DD), startTime (HH:mm:ss), endTime (HH:mm:ss), roomName }
  createSchedule: async (data) => {
    return await apiClient('/academic/schedules', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Cập nhật lịch - PUT /api/academic/schedules/{scheduleId}
  updateSchedule: async (scheduleId, data) => {
    return await apiClient(`/academic/schedules/${scheduleId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Xóa lịch - DELETE /api/academic/schedules/{scheduleId}
  deleteSchedule: async (scheduleId) => {
    return await apiClient(`/academic/schedules/${scheduleId}`, {
      method: 'DELETE',
    });
  },

  // Lấy chi tiết 1 lịch - GET /api/academic/schedules/{scheduleId}
  getScheduleById: async (scheduleId) => {
    return await apiClient(`/academic/schedules/${scheduleId}`, {
      method: 'GET',
    });
  },

  // Lấy lịch của học sinh hiện tại (token) - GET /api/academic/schedules/student/my-schedules
  getMySchedules: async () => {
    return await apiClient('/academic/schedules/student/my-schedules', {
      method: 'GET',
    });
  },

  // Lấy lịch của một học sinh dựa trên ID - GET /api/academic/schedules/student/{studentId}
  getSchedulesByStudent: async (studentId) => {
    return await apiClient(`/academic/schedules/student/${studentId}`, {
      method: 'GET',
    });
  },

  // Tạo lịch hàng loạt - POST /api/academic/schedules/batch
  createSchedulesBatch: async (data) => {
    return await apiClient('/academic/schedules/batch', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};
