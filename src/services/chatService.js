import { apiClient } from './apiClient';

export const chatService = {
  /**
   * Lấy danh sách các phòng chat của người dùng hiện tại
   */
  getRooms: async (userId) => {
    return await apiClient(`/communication/rooms?userId=${userId}`, {
      method: 'GET'
    });
  },

  /**
   * Lấy lịch sử tin nhắn của một phòng chat
   * @param {string} roomId
   * @param {string} userId
   * @param {string} [cursor]
   * @param {number} [limit=50]
   */
  getRoomMessages: async (roomId, userId, cursor = null, limit = 50) => {
    let url = `/communication/rooms/${roomId}/messages?userId=${userId}&limit=${limit}`;
    if (cursor) {
      url += `&cursor=${cursor}`;
    }
    return await apiClient(url, {
      method: 'GET'
    });
  },

  /**
   * Đánh dấu đã đọc tin nhắn trong phòng
   * @param {string} roomId
   * @param {string} userId
   */
  markAsRead: async (roomId, userId) => {
    return await apiClient(`/communication/rooms/${roomId}/read?userId=${userId}`, {
      method: 'POST'
    });
  }
};
