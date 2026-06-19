import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Books API
export const booksApi = {
  getAll: () => api.get('/api/books'),
  getById: (id: string) => api.get(`/api/books/${id}`),
  create: (data: any) => api.post('/api/books', data),
  update: (id: string, data: any) => api.put(`/api/books/${id}`, data),
  delete: (id: string) => api.delete(`/api/books/${id}`),
};

// Categories API
export const categoriesApi = {
  getAll: () => api.get('/api/categories'),
  getById: (id: string) => api.get(`/api/categories/${id}`),
  create: (data: any) => api.post('/api/categories', data),
  update: (id: string, data: any) => api.put(`/api/categories/${id}`, data),
  delete: (id: string) => api.delete(`/api/categories/${id}`),
};

// Auth API
export const authApi = {
  signUp: (data: any) => api.post('/api/auth/signup', data),
  signIn: (data: any) => api.post('/api/auth/signin', data),
  signOut: () => api.post('/api/auth/signout'),
  getSession: () => api.get('/api/auth/session'),
  resetPassword: (email: string) => api.post('/api/auth/reset-password', { email }),
};

// Orders API
export const ordersApi = {
  getAll: () => api.get('/api/orders'),
  getById: (id: string) => api.get(`/api/orders/${id}`),
  getByUser: (userId: string) => api.get(`/api/orders/user/${userId}`),
  create: (data: any) => api.post('/api/orders', data),
  update: (id: string, data: any) => api.put(`/api/orders/${id}`, data),
};

// Payment API
export const paymentApi = {
  verify: (reference: string) => api.post('/api/payment/verify', { reference }),
  createIntent: (amount: number) => api.post('/api/payment/create-intent', { amount }),
};

export default api;
