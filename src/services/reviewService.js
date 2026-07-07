import { apiClient } from './apiClient';

export const reviewService = {
  /**
   * Lấy danh sách đánh giá của giáo viên (phân trang)
   * @param {string} teacherId - ID của giáo viên
   * @param {number} page - Trang hiện tại
   * @param {number} pageSize - Kích thước trang
   */
  getTeacherReviews: async (teacherId, page = 1, pageSize = 10) => {
    return await apiClient(`/reviews/teacher/${teacherId}?page=${page}&pageSize=${pageSize}`, {
      method: 'GET',
    });
  },

  /**
   * Lấy thống kê/tổng hợp đánh giá của giáo viên
   * @param {string} teacherId - ID của giáo viên
   */
  getTeacherReviewSummary: async (teacherId) => {
    return await apiClient(`/reviews/teacher/${teacherId}/summary`, {
      method: 'GET',
    });
  },
};
