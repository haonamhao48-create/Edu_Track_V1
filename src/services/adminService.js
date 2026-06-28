import { apiClient } from './apiClient';

const getPayload = (response) => {
  if (response && typeof response === 'object' && response.data !== undefined) {
    return response.data;
  }

  return response;
};

const getCollectionItems = (response) => {
  const payload = getPayload(response);

  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.records)) return payload.records;
  if (Array.isArray(payload?.content)) return payload.content;
  if (Array.isArray(payload?.results)) return payload.results;

  return null;
};

const shouldRetryWithFallback = (error) => {
  const status = Number(error?.status);
  return status === 400 || status === 404 || status >= 500;
};

const paginateItems = (items, page, pageSize) => {
  const safePage = Math.max(Number(page) || 1, 1);
  const safePageSize = Math.max(Number(pageSize) || 10, 1);
  const startIndex = (safePage - 1) * safePageSize;

  return {
    items: items.slice(startIndex, startIndex + safePageSize),
    totalCount: items.length,
    page: safePage,
    pageSize: safePageSize,
  };
};

const fetchAdminCollection = async ({
  endpoint,
  page = 1,
  pageSize = 10,
  filters = [],
  applyLocalFilters,
}) => {
  const filterQuery = filters
    .filter((entry) => entry.value !== null && entry.value !== undefined && entry.value !== '')
    .map((entry) => `${entry.key}=${encodeURIComponent(entry.value)}`);

  const queryVariants = [
    [`page=${page}`, `pageSize=${pageSize}`, ...filterQuery],
    [`pageNumber=${page}`, `pageSize=${pageSize}`, ...filterQuery],
    [`page=${page}`, `limit=${pageSize}`, ...filterQuery],
    filterQuery,
    [],
  ];

  let lastError = null;

  for (const queryParts of queryVariants) {
    const url = queryParts.length ? `${endpoint}?${queryParts.join('&')}` : endpoint;

    try {
      const response = await apiClient(url, { method: 'GET' });
      const directItems = getCollectionItems(response);

      if (directItems) {
        if (queryParts.length === 0 || queryParts.join('&') === filterQuery.join('&')) {
          const locallyFiltered = applyLocalFilters ? applyLocalFilters(directItems) : directItems;
          return paginateItems(locallyFiltered, page, pageSize);
        }

        return response;
      }

      return response;
    } catch (error) {
      lastError = error;
      if (!shouldRetryWithFallback(error)) {
        throw error;
      }
    }
  }

  throw lastError;
};

export const adminService = {
  // Centers Management
  getAllCenters: async ({ page = 1, pageSize = 10, name = null, isActive = null } = {}) => {
    return await fetchAdminCollection({
      endpoint: '/profile/admin/centers',
      page,
      pageSize,
      filters: [
        { key: 'name', value: name },
        { key: 'isActive', value: isActive },
      ],
      applyLocalFilters: (items) => items.filter((center) => {
        const centerName = String(center?.name || center?.centerName || '').toLowerCase();
        const matchesName = !name || centerName.includes(String(name).trim().toLowerCase());

        let matchesStatus = true;
        if (isActive !== null) {
          const centerStatus = typeof center?.isActive === 'boolean'
            ? center.isActive
            : String(center?.status || '').toLowerCase() === 'active';
          matchesStatus = centerStatus === isActive;
        }

        return matchesName && matchesStatus;
      }),
    });
  },

  getCenterDetail: async (centerId) => {
    return await apiClient(`/profile/admin/centers/${centerId}`, { method: 'GET' });
  },

  updateCenter: async (centerId, data) => {
    return await apiClient(`/profile/admin/centers/${centerId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  updateCenterStatus: async (centerId, isActive) => {
    return await apiClient(`/profile/admin/centers/${centerId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    });
  },

  deleteCenter: async (centerId) => {
    return await apiClient(`/profile/admin/centers/${centerId}`, { method: 'DELETE' });
  },

  // Parents Management
  getAllParents: async ({ page = 1, pageSize = 10, fullName = null, phoneNumber = null, email = null } = {}) => {
    return await fetchAdminCollection({
      endpoint: '/profile/admin/parents',
      page,
      pageSize,
      filters: [
        { key: 'fullName', value: fullName },
        { key: 'phoneNumber', value: phoneNumber },
        { key: 'email', value: email },
      ],
      applyLocalFilters: (items) => items.filter((parent) => {
        const normalizedName = String(parent?.fullName || parent?.name || '').toLowerCase();
        const normalizedPhone = String(parent?.phoneNumber || parent?.phone || '').toLowerCase();
        const normalizedEmail = String(parent?.email || '').toLowerCase();

        const matchesName = !fullName || normalizedName.includes(String(fullName).trim().toLowerCase());
        const matchesPhone = !phoneNumber || normalizedPhone.includes(String(phoneNumber).trim().toLowerCase());
        const matchesEmail = !email || normalizedEmail.includes(String(email).trim().toLowerCase());

        return matchesName && matchesPhone && matchesEmail;
      }),
    });
  },

  getParentDetail: async (parentId) => {
    return await apiClient(`/profile/admin/parents/${parentId}`, { method: 'GET' });
  },

  updateParent: async (parentId, data) => {
    return await apiClient(`/profile/admin/parents/${parentId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  updateParentStatus: async (parentId, isActive) => {
    return await apiClient(`/profile/admin/parents/${parentId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    });
  },

  deleteParent: async (parentId) => {
    return await apiClient(`/profile/admin/parents/${parentId}`, { method: 'DELETE' });
  },

  // Users Status (Auth service level)
  updateUserStatus: async (userId, isActive) => {
    return await apiClient(`/auth/admin/users/${userId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    });
  },

  // Create Admin
  createAdmin: async (data) => {
    return await apiClient('/auth/accounts/admin/create', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};
