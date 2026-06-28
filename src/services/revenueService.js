import { apiClient } from './apiClient';

export const revenueService = {
  /**
   * Lấy thống kê biểu đồ doanh thu (Admin Dashboard)
   * GET /api/admin/dashboard/revenue
   */
  getAdminRevenue: async () => {
    return apiClient('/admin/dashboard/revenue', {
      method: 'GET',
    });
  },

  /**
   * Lấy thống kê trạng thái đăng ký của Center (Admin Dashboard)
   * GET /api/admin/dashboard/subscriptions
   */
  getAdminSubscriptionStats: async () => {
    return apiClient('/admin/dashboard/subscriptions', {
      method: 'GET',
    });
  },

  /**
   * Lấy danh sách các giao dịch mua gói cước thành công (Admin Dashboard)
   * GET /api/admin/dashboard/subscriptions/transactions
   */
  getAdminRecentTransactions: async () => {
    return apiClient('/admin/dashboard/subscriptions/transactions', {
      method: 'GET',
    });
  },

  /**
   * Lấy thống kê doanh thu theo từng gói cước đăng ký (Admin Dashboard)
   * GET /api/admin/dashboard/revenue/packages
   */
  getAdminPackageRevenueStats: async () => {
    return apiClient('/admin/dashboard/revenue/packages', {
      method: 'GET',
    });
  },
};
