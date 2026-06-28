export const parseBackendDateTime = (value) => {
  if (!value) return null;

  if (Array.isArray(value) && value.length >= 3) {
    const [
      year,
      month,
      day,
      hour = 0,
      minute = 0,
      second = 0,
      nanosecond = 0,
    ] = value;

    const parsed = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second),
      Math.floor(Number(nanosecond) / 1000000),
    );

    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const isSubscriptionEffective = (subscription) => {
  if (!subscription) return false;

  const status = String(subscription?.status || '').toUpperCase();
  const startDate = parseBackendDateTime(subscription?.startDate);
  const endDate = parseBackendDateTime(subscription?.endDate);
  const now = new Date();

  if (!['ACTIVE', 'PAID'].includes(status)) {
    return false;
  }

  if (startDate && startDate.getTime() > now.getTime()) {
    return false;
  }

  if (endDate && endDate.getTime() < now.getTime()) {
    return false;
  }

  return true;
};

export const normalizeCurrentSubscription = (subscription) => {
  const startDate = parseBackendDateTime(subscription?.startDate);
  const endDate = parseBackendDateTime(subscription?.endDate);
  const status = String(subscription?.status || '').toUpperCase();
  const isEffective = isSubscriptionEffective(subscription);

  if (!subscription || !isEffective) {
    return {
      packageId: '',
      packageName: 'Gói Free',
      status: 'FREE',
      startDate: null,
      endDate: null,
      maxUsers: null,
      maxClasses: null,
      maxStudentsPerClass: null,
      maxParentsPerClass: null,
      isFreePlan: true,
      originalStatus: status || '',
    };
  }

  return {
    packageId: String(subscription?.packageId || ''),
    packageName: subscription?.packageName || subscription?.name || 'Gói Free',
    status,
    startDate,
    endDate,
    maxUsers: subscription?.maxUsers ?? null,
    maxClasses: subscription?.maxClasses ?? null,
    maxStudentsPerClass: subscription?.maxStudentsPerClass ?? null,
    maxParentsPerClass: subscription?.maxParentsPerClass ?? null,
    isFreePlan: false,
    originalStatus: status,
  };
};
