import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true
});

// Remove manual token interceptor since we use HTTPOnly cookies now

// Auth
export const login = (data) => api.post('/auth/login', data);
export const register = (data) => api.post('/auth/register', data);
export const registerAdmin = (data) => api.post('/auth/register-admin', data);
export const logoutUser = () => api.post('/auth/logout');
export const verifyToken = () => api.post('/auth/verify');

// Global 403 handler — shows a toast for any forbidden response
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 403) {
      import('react-hot-toast').then(({ default: toast }) => {
        toast.error(
          error.response.data?.error || 'Access Denied: You do not have permission for this action',
          { id: 'forbidden-error' }
        );
      });
    }
    return Promise.reject(error);
  }
);

// Products
export const getProducts = (params) => api.get('/products', { params });
export const getProduct = (id) => api.get(`/products/${id}`);
export const getSimilarProducts = (id) => api.get(`/products/${id}/similar`);
export const getCategories = () => api.get('/categories');

// Search
export const searchProducts = (params) => api.get('/search', { params });
export const getFilters = () => api.get('/filters');

// Cart
export const getCart = (userId) => api.get(`/cart/${userId}`);
export const addToCart = (data) => api.post('/cart', data);
export const updateCart = (data) => api.put('/cart', data);
export const removeFromCart = (userId, productId) => api.delete(`/cart/${userId}/${productId}`);
export const clearCart = (userId) => api.delete(`/cart/${userId}`);

// Wishlist
export const getWishlist = (userId) => api.get(`/wishlist/${userId}`);
export const addToWishlist = (data) => api.post('/wishlist', data);
export const removeFromWishlist = (userId, productId) => api.delete(`/wishlist/${userId}/${productId}`);
export const checkWishlist = (userId, productId) => api.get(`/wishlist/${userId}/check/${productId}`);

// Orders
export const createOrder = (data) => api.post('/orders', data);
export const getOrders = (userId) => api.get(`/orders/${userId}`);
export const getOrderDetail = (orderId) => api.get(`/orders/detail/${orderId}`);

// Payment
export const processPayment = (data) => api.post('/payments/process', data);

// Invoice
export const generateInvoice = (data) => api.post('/invoices/generate', data);
export const getInvoice = (orderId) => api.get(`/invoices/${orderId}`);

// Shipping
export const getShipping = (orderId) => api.get(`/shipping/${orderId}`);

// Reviews
export const getReviews = (productId) => api.get(`/reviews/${productId}`);
export const getAverageRating = (productId) => api.get(`/reviews/average/${productId}`);
export const submitReview = (data) => api.post('/reviews', data);

// Recommendations
export const getRecommendations = (userId) => api.get(`/recommendations/${userId}`);
export const getTrending = () => api.get('/trending');

// Profile
export const getProfile = (userId) => api.get(`/profile/${userId}`);
export const updateProfile = (userId, data) => api.put(`/profile/${userId}`, data);

// Admin
export const getAdminDashboard = () => api.get('/admin/dashboard');
export const getAdminOrders = (params) => api.get('/admin/orders', { params });
export const updateOrderStatus = (orderId, data) => api.put(`/admin/orders/${orderId}/status`, data);
export const addProduct = (data) => api.post('/admin/products', data);
export const updateProduct = (id, data) => api.put(`/admin/products/${id}`, data);
export const deleteProduct = (id) => api.delete(`/admin/products/${id}`);
export const getAdminUsers = () => api.get('/admin/users');
export const getAdminInventory = () => api.get('/admin/inventory');
export const updateInventory = (productId, data) => api.put(`/admin/inventory/${productId}`, data);

export default api;
