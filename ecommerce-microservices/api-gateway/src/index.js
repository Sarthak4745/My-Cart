const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(cors({ origin: 'http://localhost', credentials: true }));
app.use(express.json());

const parseCookies = (req) => {
    const list = {};
    const rc = req.headers.cookie;
    rc && rc.split(';').forEach((cookie) => {
        const parts = cookie.split('=');
        list[parts.shift().trim()] = decodeURI(parts.join('='));
    });
    return list;
};

const SERVICES = {
  user: process.env.USER_SERVICE_URL || 'http://user-service:3001',
  auth: process.env.AUTH_SERVICE_URL || 'http://authentication-service:3002',
  product: process.env.PRODUCT_SERVICE_URL || 'http://product-service:3003',
  search: process.env.SEARCH_SERVICE_URL || 'http://search-service:3004',
  inventory: process.env.INVENTORY_SERVICE_URL || 'http://inventory-service:3005',
  cart: process.env.CART_SERVICE_URL || 'http://cart-service:3006',
  wishlist: process.env.WISHLIST_SERVICE_URL || 'http://wishlist-service:3007',
  order: process.env.ORDER_SERVICE_URL || 'http://order-service:3008',
  payment: process.env.PAYMENT_SERVICE_URL || 'http://payment-service:3009',
  invoice: process.env.INVOICE_SERVICE_URL || 'http://invoice-service:3010',
  shipping: process.env.SHIPPING_SERVICE_URL || 'http://shipping-service:3011',
  review: process.env.REVIEW_SERVICE_URL || 'http://review-rating-service:3012',
  recommendation: process.env.RECOMMENDATION_SERVICE_URL || 'http://recommendation-service:3013',
  admin: process.env.ADMIN_SERVICE_URL || 'http://admin-service:3014'
};

const ADMIN_REGISTRATION_SECRET = process.env.ADMIN_REGISTRATION_SECRET || 'admin_secret_2024';

// Verifies JWT from cookie or Authorization header; populates req.user & req.identityHeaders
const authenticate = async (req, res, next) => {
  let token = parseCookies(req).token;
  if (!token && req.headers.authorization) {
     token = req.headers.authorization.split(' ')[1] || req.headers.authorization;
  }
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  try {
    const resp = await axios.post(`${SERVICES.auth}/authenticate`, { authorization: token });
    req.user = resp.data.user;
    req.identityHeaders = {
      'x-user-id': String(req.user.userId),
      'x-user-role': req.user.role,
      'x-user-email': req.user.email || ''
    };
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// 403 if user's role is not in allowedRoles
const requireRole = (...allowedRoles) => (req, res, next) => {
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
  }
  next();
};

// 403 if user is accessing another user's resource (admins bypass)
const requireOwnership = (paramKey = 'userId') => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  if (req.user.role === 'admin') return next();
  const targetId = req.params[paramKey] || req.body[paramKey];
  if (targetId && String(req.user.userId) === String(targetId)) return next();
  return res.status(403).json({ error: 'Forbidden: Resource belongs to another user' });
};

// Passes identity headers to downstream services
const withIdentity = (req) => ({ headers: { ...(req.identityHeaders || {}) } });

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'api-gateway' }));

const cookieOptions = {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 1 day
};

// --- Public Routes ---

app.post('/api/auth/login', async (req, res) => {
  try {
    const resp = await axios.post(`${SERVICES.auth}/validate-login`, req.body);
    res.cookie('token', resp.data.token, cookieOptions);
    res.json(resp.data);
  } catch (err) { res.status(err.response?.status || 500).json(err.response?.data || { error: err.message }); }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const userResp = await axios.post(`${SERVICES.user}/register`, req.body);
    const user = userResp.data.user;
    const tokenResp = await axios.post(`${SERVICES.auth}/generate-token`, { userId: user.id, email: user.email, role: user.role });
    res.cookie('token', tokenResp.data.token, cookieOptions);
    res.status(201).json({ message: 'Registration successful', user, token: tokenResp.data.token });
  } catch (err) { res.status(err.response?.status || 500).json(err.response?.data || { error: err.message }); }
});

// Requires adminSecretKey in body to prevent unauthorized admin self-registration
app.post('/api/auth/register-admin', async (req, res) => {
  try {
    const { adminSecretKey, ...userData } = req.body;
    if (!adminSecretKey || adminSecretKey !== ADMIN_REGISTRATION_SECRET) {
      return res.status(403).json({ error: 'Forbidden: Invalid admin registration key' });
    }
    const userResp = await axios.post(`${SERVICES.user}/register-admin`, userData);
    const user = userResp.data.user;
    const tokenResp = await axios.post(`${SERVICES.auth}/generate-token`, { userId: user.id, email: user.email, role: user.role });
    res.cookie('token', tokenResp.data.token, cookieOptions);
    res.status(201).json({ message: 'Admin Registration successful', user, token: tokenResp.data.token });
  } catch (err) { res.status(err.response?.status || 500).json(err.response?.data || { error: err.message }); }
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
});

app.post('/api/auth/verify', async (req, res) => {
  try {
    let token = parseCookies(req).token;
    if (!token && req.headers.authorization) {
        token = req.headers.authorization.split(' ')[1] || req.headers.authorization;
    }
    if (!token && req.body.token) token = req.body.token;
    if (!token) return res.status(401).json({ error: 'No token' });
    const resp = await axios.post(`${SERVICES.auth}/verify-token`, { token });
    res.json(resp.data);
  } catch (err) { res.status(err.response?.status || 500).json(err.response?.data || { error: err.message }); }
});

app.get('/api/products', async (req, res) => {
  try { const r = await axios.get(`${SERVICES.product}/products`, { params: req.query }); res.json(r.data); } catch (err) { res.status(500).json({ error: err.message }); }
});
app.get('/api/products/:id', async (req, res) => {
  try { const r = await axios.get(`${SERVICES.product}/products/${req.params.id}`); res.json(r.data); } catch (err) { res.status(500).json({ error: err.message }); }
});
app.get('/api/products/:id/similar', async (req, res) => {
  try { const r = await axios.get(`${SERVICES.product}/products/${req.params.id}/similar`); res.json(r.data); } catch (err) { res.status(500).json({ error: err.message }); }
});
app.get('/api/categories', async (req, res) => {
  try { const r = await axios.get(`${SERVICES.product}/categories`); res.json(r.data); } catch (err) { res.status(500).json({ error: err.message }); }
});
app.get('/api/search', async (req, res) => {
  try { const r = await axios.get(`${SERVICES.search}/search`, { params: req.query }); res.json(r.data); } catch (err) { res.status(500).json({ error: err.message }); }
});
app.get('/api/filters', async (req, res) => {
  try { const r = await axios.get(`${SERVICES.search}/filters`); res.json(r.data); } catch (err) { res.status(500).json({ error: err.message }); }
});
app.get('/api/reviews/:productId', async (req, res) => {
  try { const r = await axios.get(`${SERVICES.review}/reviews/${req.params.productId}`); res.json(r.data); } catch (err) { res.status(500).json({ error: err.message }); }
});
app.get('/api/reviews/average/:productId', async (req, res) => {
  try { const r = await axios.get(`${SERVICES.review}/reviews/average/${req.params.productId}`); res.json(r.data); } catch (err) { res.status(500).json({ error: err.message }); }
});
app.get('/api/trending', async (req, res) => {
  try { const r = await axios.get(`${SERVICES.recommendation}/trending`); res.json(r.data); } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- Protected Routes (authenticated) ---

app.get('/api/profile/:id', authenticate, requireOwnership('id'), async (req, res) => {
  try { const r = await axios.get(`${SERVICES.user}/profile/${req.params.id}`, withIdentity(req)); res.json(r.data); } catch (err) { res.status(500).json({ error: err.message }); }
});
app.put('/api/profile/:id', authenticate, requireOwnership('id'), async (req, res) => {
  try { const r = await axios.put(`${SERVICES.user}/profile/${req.params.id}`, req.body, withIdentity(req)); res.json(r.data); } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/cart/:userId', authenticate, requireOwnership('userId'), async (req, res) => {
  try { const r = await axios.get(`${SERVICES.cart}/cart/${req.params.userId}`, withIdentity(req)); res.json(r.data); } catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/cart', authenticate, async (req, res) => {
  try {
    const body = { ...req.body, userId: req.user.userId }; // pin userId to token
    const r = await axios.post(`${SERVICES.cart}/cart`, body, withIdentity(req));
    res.json(r.data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.put('/api/cart', authenticate, async (req, res) => {
  try {
    const body = { ...req.body, userId: req.user.userId };
    const r = await axios.put(`${SERVICES.cart}/cart`, body, withIdentity(req));
    res.json(r.data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.delete('/api/cart/:userId/:productId', authenticate, requireOwnership('userId'), async (req, res) => {
  try { const r = await axios.delete(`${SERVICES.cart}/cart/${req.params.userId}/${req.params.productId}`, withIdentity(req)); res.json(r.data); } catch (err) { res.status(500).json({ error: err.message }); }
});
app.delete('/api/cart/:userId', authenticate, requireOwnership('userId'), async (req, res) => {
  try { const r = await axios.delete(`${SERVICES.cart}/cart/${req.params.userId}`, withIdentity(req)); res.json(r.data); } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/wishlist/:userId', authenticate, requireOwnership('userId'), async (req, res) => {
  try { const r = await axios.get(`${SERVICES.wishlist}/wishlist/${req.params.userId}`, withIdentity(req)); res.json(r.data); } catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/wishlist', authenticate, async (req, res) => {
  try {
    const body = { ...req.body, userId: req.user.userId };
    const r = await axios.post(`${SERVICES.wishlist}/wishlist`, body, withIdentity(req));
    res.json(r.data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.delete('/api/wishlist/:userId/:productId', authenticate, requireOwnership('userId'), async (req, res) => {
  try { const r = await axios.delete(`${SERVICES.wishlist}/wishlist/${req.params.userId}/${req.params.productId}`, withIdentity(req)); res.json(r.data); } catch (err) { res.status(500).json({ error: err.message }); }
});
app.get('/api/wishlist/:userId/check/:productId', authenticate, requireOwnership('userId'), async (req, res) => {
  try { const r = await axios.get(`${SERVICES.wishlist}/wishlist/${req.params.userId}/check/${req.params.productId}`, withIdentity(req)); res.json(r.data); } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/orders', authenticate, async (req, res) => {
  try {
    const body = { ...req.body, userId: req.user.userId }; // pin userId to token
    const r = await axios.post(`${SERVICES.order}/orders`, body, withIdentity(req));
    res.json(r.data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.get('/api/orders/:userId', authenticate, requireOwnership('userId'), async (req, res) => {
  try { const r = await axios.get(`${SERVICES.order}/orders/${req.params.userId}`, withIdentity(req)); res.json(r.data); } catch (err) { res.status(500).json({ error: err.message }); }
});
app.get('/api/orders/detail/:orderId', authenticate, async (req, res) => {
  try {
    const r = await axios.get(`${SERVICES.order}/orders/detail/${req.params.orderId}`, withIdentity(req));
    if (req.user.role !== 'admin' && r.data.userId && String(r.data.userId) !== String(req.user.userId)) {
      return res.status(403).json({ error: 'Forbidden: Order belongs to another user' });
    }
    res.json(r.data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/payments/process', authenticate, async (req, res) => {
  try { const r = await axios.post(`${SERVICES.payment}/payments/process`, req.body, withIdentity(req)); res.json(r.data); } catch (err) { res.status(500).json({ error: err.message }); }
});
app.get('/api/payments/:orderId', authenticate, async (req, res) => {
  try { const r = await axios.get(`${SERVICES.payment}/payments/${req.params.orderId}`, withIdentity(req)); res.json(r.data); } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/invoices/generate', authenticate, async (req, res) => {
  try { const r = await axios.post(`${SERVICES.invoice}/invoices/generate`, req.body, withIdentity(req)); res.json(r.data); } catch (err) { res.status(500).json({ error: err.message }); }
});
app.get('/api/invoices/:orderId', authenticate, async (req, res) => {
  try { const r = await axios.get(`${SERVICES.invoice}/invoices/${req.params.orderId}`, withIdentity(req)); res.json(r.data); } catch (err) { res.status(500).json({ error: err.message }); }
});
app.get('/api/invoices/:orderId/pdf', authenticate, async (req, res) => {
  try {
    const r = await axios.get(`${SERVICES.invoice}/invoices/${req.params.orderId}/pdf`, { responseType: 'stream', headers: req.identityHeaders });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${req.params.orderId}.pdf`);
    r.data.pipe(res);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/shipping/:orderId', authenticate, async (req, res) => {
  try { const r = await axios.get(`${SERVICES.shipping}/shipping/${req.params.orderId}`, withIdentity(req)); res.json(r.data); } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/reviews', authenticate, async (req, res) => {
  try { const r = await axios.post(`${SERVICES.review}/reviews`, req.body, withIdentity(req)); res.json(r.data); } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/recommendations/:userId', authenticate, requireOwnership('userId'), async (req, res) => {
  try { const r = await axios.get(`${SERVICES.recommendation}/recommendations/${req.params.userId}`, withIdentity(req)); res.json(r.data); } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- Admin-Only Routes ---

app.get('/api/admin/dashboard', authenticate, requireRole('admin'), async (req, res) => {
  try { const r = await axios.get(`${SERVICES.admin}/admin/dashboard`, withIdentity(req)); res.json(r.data); } catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/admin/products', authenticate, requireRole('admin'), async (req, res) => {
  try { const r = await axios.post(`${SERVICES.admin}/admin/products`, req.body, withIdentity(req)); res.json(r.data); } catch (err) { res.status(500).json({ error: err.message }); }
});
app.put('/api/admin/products/:id', authenticate, requireRole('admin'), async (req, res) => {
  try { const r = await axios.put(`${SERVICES.admin}/admin/products/${req.params.id}`, req.body, withIdentity(req)); res.json(r.data); } catch (err) { res.status(500).json({ error: err.message }); }
});
app.delete('/api/admin/products/:id', authenticate, requireRole('admin'), async (req, res) => {
  try { const r = await axios.delete(`${SERVICES.admin}/admin/products/${req.params.id}`, withIdentity(req)); res.json(r.data); } catch (err) { res.status(500).json({ error: err.message }); }
});
app.get('/api/admin/orders', authenticate, requireRole('admin'), async (req, res) => {
  try { const r = await axios.get(`${SERVICES.admin}/admin/orders`, { params: req.query, headers: req.identityHeaders }); res.json(r.data); } catch (err) { res.status(500).json({ error: err.message }); }
});
app.put('/api/admin/orders/:id/status', authenticate, requireRole('admin'), async (req, res) => {
  try { const r = await axios.put(`${SERVICES.admin}/admin/orders/${req.params.id}/status`, req.body, withIdentity(req)); res.json(r.data); } catch (err) { res.status(500).json({ error: err.message }); }
});
app.get('/api/admin/users', authenticate, requireRole('admin'), async (req, res) => {
  try { const r = await axios.get(`${SERVICES.admin}/admin/users`, withIdentity(req)); res.json(r.data); } catch (err) { res.status(500).json({ error: err.message }); }
});
app.get('/api/admin/inventory', authenticate, requireRole('admin'), async (req, res) => {
  try { const r = await axios.get(`${SERVICES.admin}/admin/inventory`, withIdentity(req)); res.json(r.data); } catch (err) { res.status(500).json({ error: err.message }); }
});
app.put('/api/admin/inventory/:productId', authenticate, requireRole('admin'), async (req, res) => {
  try { const r = await axios.put(`${SERVICES.admin}/admin/inventory/${req.params.productId}`, req.body, withIdentity(req)); res.json(r.data); } catch (err) { res.status(500).json({ error: err.message }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API Gateway running on port ${PORT}`));
