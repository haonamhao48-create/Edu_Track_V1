import { apiClient } from './apiClient';

export const teacherService = {
  /**
   * Lấy danh sách giáo viên của trung tâm (có phân trang và lọc)
   * @param {Object} params
   * @param {number} params.page
   * @param {number} params.pageSize
   * @param {string} params.teacherName
   * @param {string} params.expertise
   * @param {boolean} params.status
   */
  getTeachers: async ({ page = 1, pageSize = 10, teacherName = null, expertise = null, status = null } = {}) => {
    let url = `/profile/centers/teachers?page=${page}&pageSize=${pageSize}`;
    if (teacherName) {
      url += `&teacherName=${encodeURIComponent(teacherName)}`;
    }
    if (expertise && expertise !== 'all') {
      url += `&expertise=${encodeURIComponent(expertise)}`;
    }
    if (status !== null) {
      url += `&status=${status}`;
    }
    return await apiClient(url, {
      method: 'GET'
    });
  },

  /**
   * Lấy chi tiết thông tin một giáo viên
   * @param {string} teacherId 
   */
  getTeacherDetail: async (teacherId) => {
    return await apiClient(`/profile/centers/teachers/${teacherId}`, {
      method: 'GET'
    });
  },

  /**
   * Lấy danh sách tất cả các chuyên môn (Expertise) của giáo viên trong trung tâm
   */
  getExpertises: async () => {
    return await apiClient('/profile/centers/teachers/expertises', {
      method: 'GET'
    });
  },

  /**
   * Cập nhật trạng thái hoạt động (khóa/mở khóa) giáo viên
   * @param {string} teacherId 
   * @param {boolean} isActive 
   */
  updateActiveStatus: async (teacherId, isActive) => {
    return await apiClient(`/profile/centers/teachers/${teacherId}/active-status`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive })
    });
  },

  /**
   * Cập nhật thông tin chi tiết của giáo viên từ phía trung tâm
   * @param {string} teacherId 
   * @param {Object} data 
   */
  updateTeacherByCenter: async (teacherId, data) => {
    return await apiClient(`/profile/centers/teachers/${teacherId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  /**
   * Vô hiệu hóa giáo viên
   * @param {string} teacherId 
   */
  deactivateTeacher: async (teacherId) => {
    return await apiClient(`/profile/centers/teachers/${teacherId}`, {
      method: 'DELETE'
    });
  },

  /**
   * Lấy profile của giáo viên hiện tại đang đăng nhập
   */
  getProfileMe: async () => {
    return await apiClient('/profile/teachers/me', {
      method: 'GET'
    });
  },

  /**
   * Cập nhật profile của giáo viên hiện tại
   */
  updateProfileMe: async (data) => {
    return await apiClient('/profile/teachers/me', {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }
};
