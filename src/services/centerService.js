import { apiClient } from './apiClient';

export const centerService = {
  // Lấy profile của Center hiện tại - GET /api/profile/centers/me
  getCenterProfile: async () => {
    return await apiClient('/profile/centers/me', {
      method: 'GET',
    });
  },

  // Cập nhật profile của Center - PATCH /api/profile/centers/me
  // Body: { name, address }
  updateCenterProfile: async (data) => {
    return await apiClient('/profile/centers/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  // Cập nhật logo của Center - PATCH /api/profile/centers/logo
  // Param: file (File object)
  updateCenterLogo: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return await apiClient('/profile/centers/logo', {
      method: 'PATCH',
      body: formData,
    });
  },
};
