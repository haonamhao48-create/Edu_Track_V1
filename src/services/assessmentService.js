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
   * Cập nhật nhận xét đã tồn tại
   * @param {string} commentId
   * @param {Object} data
   * @param {string} data.content
   * @param {string} data.behaviorRating
   */
  updateComment: async (commentId, data) => {
    return await apiClient(`/assessments/comments/${commentId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  /**
   * Tạo hoặc cập nhật nhận xét (upsert) — tự động phát hiện nếu đã tồn tại
   * @param {Object} data
   * @param {string} data.scheduleId
   * @param {string} data.studentId
   * @param {string} data.content
   * @param {string} data.behaviorRating
   * @param {string|null} [existingCommentId] - ID nhận xét cũ nếu đã có
   */
  upsertComment: async (data, existingCommentId = null) => {
    if (existingCommentId) {
      return await apiClient(`/assessments/comments/${existingCommentId}`, {
        method: 'PUT',
        body: JSON.stringify({
          content: data.content,
          behaviorRating: data.behaviorRating,
        })
      });
    }

    try {
      return await apiClient('/assessments/comments', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    } catch (err) {
      // 409: comment đã tồn tại nhưng không có ID → ném lại để xử lý bên ngoài
      throw err;
    }
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
