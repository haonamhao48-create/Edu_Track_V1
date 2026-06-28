import { apiClient } from './apiClient';

export const notificationService = {
  // Lấy lịch sử thông báo - GET /api/notifications/history
  getNotificationHistory: async (type = null, page = 1, pageSize = 10) => {
    let url = `/notifications/history?page=${page}&pageSize=${pageSize}`;
    if (type) url += `&type=${type}`;
    return await apiClient(url, {
      method: 'GET',
    });
  },

  // Đếm thông báo chưa đọc - GET /api/notifications/unread-count
  getUnreadCount: async () => {
    return await apiClient('/notifications/unread-count', {
      method: 'GET',
    });
  },

  // Đánh dấu đã đọc 1 thông báo - PUT /api/notifications/{id}/read
  markAsRead: async (id) => {
    return await apiClient(`/notifications/${id}/read`, {
      method: 'PUT',
    });
  },

  // Đánh dấu đã đọc tất cả - PUT /api/notifications/read-all
  markAllAsRead: async () => {
    return await apiClient('/notifications/read-all', {
      method: 'PUT',
    });
  },

  // Lưu device token để push noti - POST /api/notifications/device-token
  saveDeviceToken: async (token, platform = 'web') => {
    return await apiClient('/notifications/device-token', {
      method: 'POST',
      body: JSON.stringify({ token, platform }),
    });
  },

  // Center gửi thông báo - POST /api/notifications/send
  sendNotification: async (payload) => {
    return await apiClient('/notifications/send', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Upload tài liệu đính kèm - POST /api/profile/media/upload
  uploadAttachment: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return await apiClient('/profile/media/upload', {
      method: 'POST',
      body: formData,
    });
  },
};

