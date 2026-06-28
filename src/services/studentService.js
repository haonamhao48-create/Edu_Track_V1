import { apiClient } from './apiClient';

export const studentService = {
  /**
   * Lấy danh sách toàn bộ học sinh của trung tâm (phân trang và lọc)
   * @param {Object} params
   * @param {number} params.page
   * @param {number} params.pageSize
   * @param {string} params.studentName
   * @param {string} params.className
   */
  getStudentsByCenter: async ({ page = 1, pageSize = 10, studentName = null, className = null } = {}) => {
    let url = `/profile/centers/students?page=${page}&pageSize=${pageSize}`;
    if (studentName) {
      url += `&studentName=${encodeURIComponent(studentName)}`;
    }
    if (className) {
      url += `&className=${encodeURIComponent(className)}`;
    }
    return await apiClient(url, {
      method: 'GET'
    });
  },

  // Lấy danh sách học sinh theo lớp - GET /api/academic/enrollments/{classId}/students
  getStudentsByClass: async (classId) => {
    return await apiClient(`/academic/enrollments/${classId}/students`, {
      method: 'GET',
    });
  },

  // Ghi danh học sinh vào lớp - POST /api/academic/enrollments
  enrollStudent: async (classId, studentId) => {
    return await apiClient('/academic/enrollments', {
      method: 'POST',
      body: JSON.stringify({ classId, studentId }),
    });
  },

  // Xóa học sinh khỏi lớp - DELETE /api/academic/enrollments/{classId}/students/{studentId}
  removeStudent: async (classId, studentId) => {
    return await apiClient(`/academic/enrollments/${classId}/students/${studentId}`, {
      method: 'DELETE',
    });
  },

  // Lấy chi tiết thông tin học sinh - GET /api/profile/students/{studentId}/detail
  getStudentDetail: async (studentId) => {
    return await apiClient(`/profile/students/${studentId}/detail`, {
      method: 'GET',
    });
  },

  // Cập nhật thông tin học sinh từ phía trung tâm
  updateStudentByCenter: async (studentId, data) => {
    return await apiClient(`/profile/centers/students/${studentId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  // Vô hiệu hóa học sinh
  deactivateStudent: async (studentId) => {
    return await apiClient(`/profile/centers/students/${studentId}`, {
      method: 'DELETE'
    });
  },
};
