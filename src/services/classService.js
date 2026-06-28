import { apiClient } from './apiClient';

export const classService = {
  /**
   * Lấy danh sách lớp học của trung tâm (có phân trang và lọc)
   * @param {Object} params
   * @param {number} params.page
   * @param {number} params.pageSize
   * @param {string} params.className
   * @param {string} params.status
   */
  getClasses: async ({ page = 1, pageSize = 10, className = null, status = null } = {}) => {
    let url = `/academic/classes?page=${page}&pageSize=${pageSize}`;
    if (className) {
      url += `&className=${encodeURIComponent(className)}`;
    }
    if (status && status !== 'all') {
      url += `&status=${encodeURIComponent(status)}`;
    }
    return await apiClient(url, {
      method: 'GET'
    });
  },

  /**
   * Lấy danh sách lớp học của giáo viên hiện tại
   */
  getMyClasses: async () => {
    return await apiClient('/academic/classes/my-classes', {
      method: 'GET'
    });
  },

  /**
   * Lấy tất cả lớp học (không phân trang) - dùng cho dropdown bộ lọc
   */
  getAllClasses: async () => {
    return await apiClient('/academic/classes?page=1&pageSize=1000', {
      method: 'GET'
    });
  },

  /**
   * Lấy chi tiết một lớp học
   */
  getClassById: async (classId) => {
    return await apiClient(`/academic/classes/${classId}`, {
      method: 'GET'
    });
  },

  createClass: async (data) => {
    return await apiClient('/academic/classes', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  assignTeacher: async (classId, teacherId) => {
    return await apiClient(`/academic/classes/${classId}/assign-teacher`, {
      method: 'PATCH',
      body: JSON.stringify({ teacherId })
    });
  },

  unassignTeacher: async (classId) => {
    return await apiClient(`/academic/classes/${classId}/teacher`, {
      method: 'DELETE'
    });
  },

  updateClassStatus: async (classId, status) => {
    return await apiClient(`/academic/classes/${classId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
  },

  updateClass: async (classId, data) => {
    return await apiClient(`/academic/classes/${classId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  deleteClass: async (classId) => {
    return await apiClient(`/academic/classes/${classId}`, {
      method: 'DELETE'
    });
  }
};
