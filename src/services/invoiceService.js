import { apiClient } from './apiClient';

export const invoiceService = {
  getStudentInvoices: async (studentId) => {
    return apiClient(`/finance/students/${studentId}/invoices`, {
      method: 'GET',
    });
  },

  getInvoiceDetail: async (invoiceId) => {
    return apiClient(`/finance/invoices/${invoiceId}`, {
      method: 'GET',
    });
  },

  createInvoice: async (data) => {
    return apiClient('/finance/invoices', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  cancelInvoice: async (invoiceId) => {
    return apiClient(`/finance/invoices/${invoiceId}/cancel`, {
      method: 'PATCH',
    });
  },
};
