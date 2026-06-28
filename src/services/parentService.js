import { apiClient } from './apiClient';

export const parentService = {
  /**
   * Lấy danh sách phụ huynh của trung tâm
   * @param {Object} params
   * @param {number} params.page
   * @param {number} params.pageSize
   * @param {string} params.parentName
   * @param {string} params.phoneNumber
   * @param {string} params.email
   */
  getParents: async ({ page = 1, pageSize = 10, parentName = null, phoneNumber = null, email = null } = {}) => {
    let url = `/profile/centers/parents?page=${page}&pageSize=${pageSize}`;
    if (parentName) {
      url += `&parentName=${encodeURIComponent(parentName)}`;
    }
    if (phoneNumber) {
      url += `&phoneNumber=${encodeURIComponent(phoneNumber)}`;
    }
    if (email) {
      url += `&email=${encodeURIComponent(email)}`;
    }
    return await apiClient(url, {
      method: 'GET'
    });
  },

  /**
   * Đăng ký tài khoản phụ huynh mới
   * @param {Object} data
   */
  createParent: async (data) => {
    const payload = {
      username: data.email, // Tên đăng nhập mặc định là Email
      password: data.password || 'Nhodoimatkhaunhe@@', // Mật khẩu mặc định
      fullName: data.fullName,
      email: data.email || null,
      address: data.address || '',
      phoneNumber: data.phoneNumber,
      provider: 'Local',
      idToken: null
    };

    return await apiClient('/auth/register/parent', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  /**
   * Liên kết phụ huynh với học sinh
   * @param {string} linkCode 
   * @param {string} relationship 
   */
  addStudentToParent: async (linkCode, relationship) => {
    return await apiClient('/profile/parents/add-student', {
      method: 'POST',
      body: JSON.stringify({
        linkCode,
        relationship
      })
    });
  },

  getProfileMe: async () => {
    return await apiClient('/profile/parents/me', {
      method: 'GET'
    });
  },

  getMyStudents: async () => {
    return await apiClient('/profile/parents/my-students', {
      method: 'GET'
    });
  },
};
