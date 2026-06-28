import { apiClient } from './apiClient';

export const centerDashboardService = {
  getRevenueDashboard: async (centerId) => {
    return apiClient(`/finance/center/${centerId}/dashboard/revenue`, {
      method: 'GET',
    });
  },

  getInvoiceDashboard: async (centerId) => {
    return apiClient(`/finance/center/${centerId}/dashboard/invoices`, {
      method: 'GET',
    });
  },

  getCurrentSubscription: async (centerId) => {
    return apiClient(`/finance/subscriptions/center/${centerId}`, {
      method: 'GET',
    });
  },
};
