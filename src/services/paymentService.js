import { apiClient } from './apiClient';

export const paymentService = {
  createPaymentLink: async (invoiceId) => {
    return apiClient(`/finance/payments/create-link?invoiceId=${invoiceId}`, {
      method: 'POST',
    });
  },
};
