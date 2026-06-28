import { apiClient } from './apiClient';

export const assessmentService = {
  /**
   * Tạo nhận xét mới cho học sinh
   * @param {Object} data
   * @param {string} data.scheduleId
   * @param {string} data.studentId
   * @param {string} data.content
   * @param {string} data.behaviorRating
   */
  createComment: async (data) => {
    return await apiClient('/assessments/comments', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  /**
   * Lấy danh sách nhận xét của học sinh dựa trên ID học sinh
   * @param {string} studentId
   * @param {string} [scheduleId]
   */
  getCommentsByStudent: async (studentId, scheduleId = null) => {
    let url = `/assessments/comments/student?studentId=${studentId}`;
    if (scheduleId) {
      url += `&scheduleId=${scheduleId}`;
    }
    return await apiClient(url, {
      method: 'GET'
    });
  },

  /**
   * Lấy danh sách nhận xét của cả lớp theo buổi học
   * @param {string} scheduleId
   */
  getCommentsBySchedule: async (scheduleId) => {
    return await apiClient(`/assessments/comments/schedule/${scheduleId}`, {
      method: 'GET'
    });
  }
};
