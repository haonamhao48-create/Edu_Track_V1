import { apiClient } from './apiClient';

export const authService = {
  /**
   * Đăng nhập
   * @param {string} username 
   * @param {string} password 
   */
  login: async (username, password) => {
    return apiClient('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },
  
  /**
   * Đăng ký trung tâm
   * @param {Object} data - Dữ liệu đăng ký
   */
  registerCenter: async (data) => {
    return apiClient('/auth/register/center', {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        provider: 'Local',
        idToken: null
      }),
    });
  },

  /**
   * Tạo tài khoản học sinh (Center role)
   * @param {Object} data - Dữ liệu tạo tài khoản học sinh
   */
  createStudentAccount: async (data) => {
    // Map frontend form data to the exact API Request Command expected by Backend
    const payload = {
      userId: '00000000-0000-0000-0000-000000000000', // Controller will overwrite this with Center User ID
      fullName: data.fullName || data.name,
      dateOfBirth: data.dateOfBirth,
      gender: data.gender || 'Nam',
      email: data.email || data.studentEmail,
      phoneNumber: data.phoneNumber || data.phone || null
    };

    return apiClient('/auth/accounts/student/create', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Tạo tài khoản giáo viên (Center role)
   * @param {Object} data - Dữ liệu tạo tài khoản giáo viên
   */
  createTeacherAccount: async (data) => {
    // Map frontend form data to the exact API Request Command expected by Backend
    const payload = {
      userId: '00000000-0000-0000-0000-000000000000', // Controller will overwrite this with Center User ID
      fullName: data.fullName || data.name,
      email: data.email,
      gender: data.gender || 'Nam',
      expertise: data.expertise || data.subject || 'Toán học',
      address: data.address || null,
      phoneNumber: data.phoneNumber || data.phone || null
    };

    return apiClient('/auth/accounts/teacher/create', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Yêu cầu đặt lại mật khẩu - Gửi OTP qua Email
   * @param {string} email 
   */
  forgotPassword: async (email) => {
    return apiClient('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  /**
   * Xác thực mã OTP để lấy Reset Token
   * @param {string} email 
   * @param {string} otpCode 
   */
  verifyOtp: async (email, otpCode) => {
    return apiClient('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otpCode }),
    });
  },

  /**
   * Thực hiện đặt lại mật khẩu mới bằng Reset Token
   * @param {string} resetToken 
   * @param {string} newPassword 
   */
  resetPassword: async (resetToken, newPassword) => {
    return apiClient('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ resetToken, newPassword }),
    });
  },

  /**
   * Đăng xuất
   */
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.clear();
    window.location.href = '/login';
  },

  /**
   * Cập nhật thông tin tài khoản (Email, SĐT)
   */
  updateInformation: async (data) => {
    return apiClient('/auth/update', {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  },

  /**
   * Đăng nhập bằng Google ID Token
   * @param {string} idToken 
   */
  loginByGoogle: async (idToken) => {
    return apiClient('/auth/google/login', {
      method: 'POST',
      body: JSON.stringify({ idToken }),
    });
  }
};
