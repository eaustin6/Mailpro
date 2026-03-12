import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token interceptor
api.interceptors.request.use((config) => {
  const adminToken = localStorage.getItem('admin_token');
  const userToken = localStorage.getItem('user_token');
  
  // Use admin token for admin routes
  if (config.url?.startsWith('/admin')) {
    if (adminToken) {
      config.headers.Authorization = `Bearer ${adminToken}`;
    }
  } else {
    // Use user token for other routes
    if (userToken) {
      config.headers.Authorization = `Bearer ${userToken}`;
    }
  }
  
  return config;
});

// Handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      if (url.startsWith('/admin')) {
        localStorage.removeItem('admin_token');
        window.location.href = '/admin';
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const getAuthStatus = async () => {
  const response = await api.get('/auth/status');
  return response.data;
};

export const requestOTP = async (telegram_username) => {
  const response = await api.post('/auth/request-otp', { telegram_username });
  return response.data;
};

export const verifyOTP = async (telegram_username, otp_code) => {
  const response = await api.post('/auth/verify-otp', { telegram_username, otp_code });
  return response.data;
};

export const getCurrentUser = async () => {
  const response = await api.get('/auth/me');
  return response.data;
};

// Admin Auth API
export const adminLogin = async (password) => {
  const response = await api.post('/admin/login', { password });
  return response.data;
};

export const adminVerify = async () => {
  const response = await api.get('/admin/verify');
  return response.data;
};

// Email API
export const generateEmail = async (data = {}) => {
  const response = await api.post('/email/generate', data);
  return response.data;
};

export const listEmails = async (telegramChatId = null) => {
  const params = telegramChatId ? { telegram_chat_id: telegramChatId } : {};
  const response = await api.get('/email/list', { params });
  return response.data;
};

export const listDomains = async () => {
  const response = await api.get('/email/domains');
  return response.data;
};

export const getInbox = async (emailId) => {
  const response = await api.get(`/email/inbox/${emailId}`);
  return response.data;
};

export const getMessage = async (messageId) => {
  const response = await api.get(`/email/message/${messageId}`);
  return response.data;
};

export const sendEmail = async (data) => {
  const response = await api.post('/email/send', data);
  return response.data;
};

export const deleteEmail = async (emailId) => {
  const response = await api.delete(`/email/${emailId}`);
  return response.data;
};

// Admin API
export const getConfig = async () => {
  const response = await api.get('/admin/config');
  return response.data;
};

export const updateConfig = async (data) => {
  const response = await api.put('/admin/config', data);
  return response.data;
};

export const addDomain = async (domainData) => {
  const response = await api.post('/admin/domains', domainData);
  return response.data;
};

export const removeDomain = async (domain) => {
  const response = await api.delete(`/admin/domains/${domain}`);
  return response.data;
};

export const authorizeTelegramUser = async (chatId) => {
  const response = await api.post(`/admin/authorize-telegram-user/${chatId}`);
  return response.data;
};

export const revokeTelegramUser = async (chatId) => {
  const response = await api.delete(`/admin/authorize-telegram-user/${chatId}`);
  return response.data;
};

// Stats API
export const getStats = async () => {
  const response = await api.get('/stats');
  return response.data;
};
