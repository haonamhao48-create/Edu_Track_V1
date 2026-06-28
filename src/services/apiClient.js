const BASE_URL = '/api';

const translateField = (field) => {
  const dict = {
    'username': 'Tên đăng nhập',
    'password': 'Mật khẩu',
    'email': 'Email',
    'phoneNumber': 'Số điện thoại',
    'fullName': 'Họ và tên',
    'address': 'Địa chỉ',
    'name': 'Tên',
    'dateOfBirth': 'Ngày sinh',
    'gender': 'Giới tính',
    'expertise': 'Chuyên môn',
    'logo': 'Logo',
    'imageUrl': 'Ảnh đại diện',
  };
  const key = Object.keys(dict).find(k => k.toLowerCase() === field.toLowerCase());
  return key ? dict[key] : field;
};

const translateMessage = (msg) => {
  const lower = msg.toLowerCase();
  if (lower.includes('is required') || lower.includes('must not be empty')) {
    return 'không được để trống';
  }
  if (lower.includes('is invalid') || lower.includes('invalid format')) {
    return 'không đúng định dạng';
  }
  if (lower.includes('must be a valid email')) {
    return 'phải là địa chỉ email hợp lệ';
  }
  if (lower.includes('must be at least')) {
    const match = msg.match(/\d+/);
    return `phải có ít nhất ${match ? match[0] : ''} ký tự`;
  }
  return msg;
};

const translateApiError = (msg, status) => {
  const lower = msg.toLowerCase();

  // If it's a generic status-based error message and doesn't contain specific backend message
  if (msg.startsWith('Lỗi HTTP') || msg.includes('Internal Server Error')) {
    if (status === 401) return 'Phiên đăng nhập đã hết hạn hoặc bạn không có quyền truy cập. Vui lòng đăng nhập lại.';
    if (status === 403) return 'Bạn không có quyền thực hiện thao tác này.';
    if (status === 404) return 'Không tìm thấy dữ liệu yêu cầu.';
    if (status === 500) return 'Lỗi hệ thống từ máy chủ (500). Vui lòng thử lại sau.';
    return msg;
  }

  // Translate specific messages
  if (lower.includes('username already exists') || lower.includes('username is already taken')) {
    return 'Tên đăng nhập này đã tồn tại trên hệ thống.';
  }
  if (lower.includes('email already exists') || lower.includes('email is already taken')) {
    return 'Địa chỉ email này đã tồn tại trên hệ thống.';
  }
  if (lower.includes('phone number already exists')) {
    return 'Số điện thoại này đã tồn tại trên hệ thống.';
  }
  if (lower.includes('user with this email already exists')) {
    return 'Người dùng với email này đã tồn tại.';
  }
  if (lower.includes('teacher not found')) {
    return 'Không tìm thấy thông tin giảng viên.';
  }
  if (lower.includes('student not found')) {
    return 'Không tìm thấy thông tin học sinh.';
  }
  if (lower.includes('center not found')) {
    return 'Không tìm thấy thông tin trung tâm.';
  }
  if (lower.includes('parent not found')) {
    return 'Không tìm thấy thông tin phụ huynh.';
  }
  if (lower.includes('user not found') || lower.includes('user does not exist')) {
    return 'Không tìm thấy tài khoản người dùng.';
  }
  if (lower.includes('invalid password') || lower.includes('incorrect password')) {
    return 'Mật khẩu không chính xác.';
  }
  if (lower.includes('password criteria failed') || lower.includes('password is too weak')) {
    return 'Mật khẩu không đủ mạnh (phải chứa chữ hoa, chữ thường, số và ký tự đặc biệt).';
  }
  if (lower.includes('user is blocked') || lower.includes('account is inactive') || lower.includes('inactive') || lower.includes('blocked')) {
    return 'Tài khoản của bạn đã bị khóa hoặc ngừng hoạt động. Vui lòng liên hệ quản trị viên.';
  }
  if (lower.includes('unauthorized') || status === 401) {
    return 'Phiên đăng nhập đã hết hạn hoặc bạn không có quyền truy cập.';
  }
  if (lower.includes('forbidden') || status === 403) {
    return 'Bạn không có quyền thực hiện thao tác này.';
  }
  if (lower.includes('not found') || status === 404) {
    return 'Không tìm thấy dữ liệu yêu cầu.';
  }

  // Return the original message if it's already in Vietnamese or doesn't match above rules
  return msg;
};

const getCache = new Map();
const pendingRequests = new Map();
const CACHE_TTL = 3000; // 3 seconds in milliseconds

const getCacheKey = (endpoint, options) => {
  const token = localStorage.getItem('token') || '';
  const method = (options.method || 'GET').toUpperCase();
  return `${method}:${endpoint}:${token}`;
};

const executeRequest = async (endpoint, options = {}) => {
  const url = `${BASE_URL}${endpoint}`;
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (options.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  const token = localStorage.getItem('token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, { ...options, headers });
  
  if (!response.ok) {
    const contentType = response.headers.get('content-type') || '';
    let errorMessage = `Lỗi HTTP ${response.status}: Không thể kết nối.`;
    let errorDetail = null;
    let validationErrors = null;

    if (contentType.includes('application/json')) {
      try {
        const errorJson = await response.json();
        errorDetail = errorJson;

        // Support both camelCase and PascalCase
        const msg = errorJson.message || errorJson.Message;
        const detail = errorJson.detail || errorJson.Detail;
        const title = errorJson.title || errorJson.Title;
        const errors = errorJson.errors || errorJson.Errors;

        if (errors && typeof errors === 'object') {
          validationErrors = errors;
          errorMessage = Object.entries(errors)
            .map(([field, msgs]) => {
              const fieldName = translateField(field);
              // Backend có thể trả về string hoặc string[], normalize về mảng
              const msgsArr = Array.isArray(msgs) ? msgs : [String(msgs)];
              const translatedMsgs = msgsArr.map(m => translateMessage(m)).join(', ');
              return `${fieldName}: ${translatedMsgs}`;
            })
            .join('; ');
        } else {
          errorMessage = detail || msg || title || errorMessage;
        }
      } catch (e) {
        console.error('Failed to parse error json', e);
      }
    } else {
      try {
        const text = await response.text();
        if (text && !text.includes('<!DOCTYPE html>') && text.length < 500) {
          errorMessage = text;
        }
      } catch (e) {
        // Ignore
      }
    }

    // Dịch các thông báo tiếng Anh sang Tiếng Việt
    errorMessage = translateApiError(errorMessage, response.status);

    const error = new Error(errorMessage);
    error.status = response.status;
    error.data = errorDetail;
    error.validationErrors = validationErrors;
    throw error;
  }
  
  // Tránh lỗi khi API không trả về json (ví dụ status 204 No Content)
  return response.text().then(text => text ? JSON.parse(text) : {});
};

export const apiClient = async (endpoint, options = {}) => {
  const method = (options.method || 'GET').toUpperCase();

  if (method === 'GET') {
    const cacheKey = getCacheKey(endpoint, options);

    // 1. Check valid cache
    if (getCache.has(cacheKey)) {
      const { data, timestamp } = getCache.get(cacheKey);
      if (Date.now() - timestamp < CACHE_TTL) {
        return data;
      }
      getCache.delete(cacheKey);
    }

    // 2. Check pending requests
    if (pendingRequests.has(cacheKey)) {
      return pendingRequests.get(cacheKey);
    }

    // 3. Execute new request
    const requestPromise = (async () => {
      try {
        const result = await executeRequest(endpoint, options);
        getCache.set(cacheKey, {
          data: result,
          timestamp: Date.now()
        });
        return result;
      } finally {
        pendingRequests.delete(cacheKey);
      }
    })();

    pendingRequests.set(cacheKey, requestPromise);
    return requestPromise;
  } else {
    // Write/mutation request -> invalidate all cache
    getCache.clear();
    pendingRequests.clear();
    return executeRequest(endpoint, options);
  }
};
