import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

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

// Stats API
export const getStats = async () => {
  const response = await api.get('/stats');
  return response.data;
};
