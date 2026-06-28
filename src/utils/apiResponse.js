export const unwrapData = (response) => {
  if (response && typeof response === 'object' && !Array.isArray(response) && response.data !== undefined) {
    return response.data;
  }

  return response;
};

export const normalizeListResponse = (response) => {
  const payload = unwrapData(response);

  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.records)) return payload.records;
  if (Array.isArray(payload?.content)) return payload.content;
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.classes)) return payload.classes;
  if (Array.isArray(payload?.centers)) return payload.centers;

  return [];
};

export const normalizePagedResponse = (response) => {
  const payload = unwrapData(response);
  const items = normalizeListResponse(payload);

  const totalCount = Number(
    payload?.totalCount
    ?? payload?.totalItems
    ?? payload?.count
    ?? payload?.total
    ?? payload?.rowCount
    ?? items.length
    ?? 0,
  );

  return {
    ...payload,
    items,
    totalCount: Number.isFinite(totalCount) ? totalCount : items.length,
  };
};

export const normalizeDetailResponse = (response) => {
  const payload = unwrapData(response);

  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    if (payload.item && typeof payload.item === 'object') return payload.item;
    if (payload.result && typeof payload.result === 'object') return payload.result;
  }

  return payload;
};
