import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adicionar token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para tratar erros
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const auth = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (data) => api.post('/auth/register', data),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data),
};

// Documents
export const documents = {
  upload: (formData) => api.post('/documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  list: (params) => api.get('/documents', { params }),
  stats: () => api.get('/documents/stats'),
  reindexAll: () => api.post('/documents/reindex-all'),
  get: (id) => api.get(`/documents/${id}`),
  download: (id) => api.get(`/documents/${id}/download`),
  update: (id, data) => api.put(`/documents/${id}`, data),
  reprocess: (id) => api.post(`/documents/${id}/reprocess`),
  delete: (id) => api.delete(`/documents/${id}`),
  search: (query, params) => api.get('/documents/search', { params: { query, ...params } }),
  ask: (question, caseId) => api.post('/documents/ask', { question, caseId }),
};

// Cases
export const cases = {
  create: (data) => api.post('/cases', data),
  list: (params) => api.get('/cases', { params }),
  get: (id) => api.get(`/cases/${id}`),
  update: (id, data) => api.put(`/cases/${id}`, data),
  delete: (id) => api.delete(`/cases/${id}`),
  generateSummary: (id) => api.post(`/cases/${id}/summary`),
  addTeamMember: (id, userId, role) => api.post(`/cases/${id}/team`, { userId, role }),
  removeTeamMember: (id, userId) => api.delete(`/cases/${id}/team/${userId}`),
};

// Questionnaires
export const questionnaires = {
  generate: (data) => api.post('/questionnaires/generate', data),
  create: (data) => api.post('/questionnaires', data),
  list: (params) => api.get('/questionnaires', { params }),
  get: (id) => api.get(`/questionnaires/${id}`),
  update: (id, data) => api.put(`/questionnaires/${id}`, data),
  delete: (id) => api.delete(`/questionnaires/${id}`),
  answerQuestion: (id, questionIndex, data) =>
    api.post(`/questionnaires/${id}/questions/${questionIndex}/answer`, data),
};

export default api;
