import { apiClient } from './apiClient';

const FALLBACK_ERROR_STATUSES = new Set([400, 404, 405]);

const tryRequestVariants = async (requestFactories) => {
  let latestError = null;

  for (const createRequest of requestFactories) {
    try {
      return await createRequest();
    } catch (error) {
      latestError = error;
      if (!FALLBACK_ERROR_STATUSES.has(Number(error?.status))) {
        throw error;
      }
    }
  }

  throw latestError || new Error('Khong the ket noi den dich vu subscription.');
};

export const subscriptionService = {
  getAdminPackages: async () => {
    return apiClient('/admin/subscription-packages', {
      method: 'GET',
    });
  },

  getAdminPackageDetail: async (packageId) => {
    return apiClient(`/admin/subscription-packages/${packageId}`, {
      method: 'GET',
    });
  },

  createAdminPackage: async (data) => {
    return apiClient('/admin/subscription-packages', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateAdminPackage: async (packageId, data) => {
    return apiClient(`/admin/subscription-packages/${packageId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deactivateAdminPackage: async (packageId) => {
    return apiClient(`/admin/subscription-packages/${packageId}`, {
      method: 'DELETE',
    });
  },

  getCenterPackages: async () => {
    return tryRequestVariants([
      () => apiClient('/finance/subscriptions/packages', { method: 'GET' }),
      () => apiClient('/center/subscription-packages', { method: 'GET' }),
      () => apiClient('/subscriptions/packages', { method: 'GET' }),
      () => apiClient('/subscription-packages', { method: 'GET' }),
      () => apiClient('/admin/subscription-packages', { method: 'GET' }),
    ]);
  },

  createCenterSubscriptionCheckout: async (packageId) => {
    return tryRequestVariants([
      () => apiClient('/finance/subscriptions/checkout', {
        method: 'POST',
        body: JSON.stringify(packageId),
      }),
      () => apiClient('/center/subscriptions/checkout', {
        method: 'POST',
        body: JSON.stringify(packageId),
      }),
    ]);
  },
};
