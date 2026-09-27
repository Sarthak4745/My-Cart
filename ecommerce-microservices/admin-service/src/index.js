const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const PRODUCT_SERVICE = process.env.PRODUCT_SERVICE_URL || 'http://product-service:3003';
const ORDER_SERVICE = process.env.ORDER_SERVICE_URL || 'http://order-service:3008';
const INVENTORY_SERVICE = process.env.INVENTORY_SERVICE_URL || 'http://inventory-service:3005';
const USER_SERVICE = process.env.USER_SERVICE_URL || 'http://user-service:3001';
const SHIPPING_SERVICE = process.env.SHIPPING_SERVICE_URL || 'http://shipping-service:3011';
const PAYMENT_SERVICE = process.env.PAYMENT_SERVICE_URL || 'http://payment-service:3009';

// Defense-in-depth: verifies x-user-role header set by the gateway
const internalAdminOnly = (req, res, next) => {
  if (req.headers['x-user-role'] !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Admin role required' });
  }
  next();
};

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'admin-service' }));

app.get('/admin/dashboard', internalAdminOnly, async (req, res) => {
  try {
    const [productsResp, ordersResp, usersResp] = await Promise.allSettled([
      axios.get(`${PRODUCT_SERVICE}/products`, { params: { limit: 1 } }),
      axios.get(`${ORDER_SERVICE}/orders`, { params: { limit: 1 } }),
      axios.get(`${USER_SERVICE}/users`)
    ]);
    res.json({
      totalProducts: productsResp.status === 'fulfilled' ? productsResp.value.data.total : 0,
      totalOrders: ordersResp.status === 'fulfilled' ? ordersResp.value.data.total : 0,
      totalUsers: usersResp.status === 'fulfilled' ? usersResp.value.data.length : 0
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/admin/products', internalAdminOnly, async (req, res) => {
  try {
    const resp = await axios.post(`${PRODUCT_SERVICE}/products`, req.body);
    try { await axios.put(`${INVENTORY_SERVICE}/inventory/${resp.data._id}`, { stock: req.body.stock || 0 }); } catch (e) {}
    res.status(201).json(resp.data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/admin/products/:id', internalAdminOnly, async (req, res) => {
  try {
    const resp = await axios.put(`${PRODUCT_SERVICE}/products/${req.params.id}`, req.body);
    if (req.body.stock !== undefined) {
      try { await axios.put(`${INVENTORY_SERVICE}/inventory/${req.params.id}`, { stock: req.body.stock }); } catch (e) {}
    }
    res.json(resp.data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/admin/products/:id', internalAdminOnly, async (req, res) => {
  try {
    await axios.delete(`${PRODUCT_SERVICE}/products/${req.params.id}`);
    res.json({ message: 'Product deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/admin/orders', internalAdminOnly, async (req, res) => {
  try {
    const resp = await axios.get(`${ORDER_SERVICE}/orders`, { params: req.query });
    res.json(resp.data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/admin/orders/:id/status', internalAdminOnly, async (req, res) => {
  try {
    const resp = await axios.put(`${ORDER_SERVICE}/orders/${req.params.id}/status`, req.body);
    res.json(resp.data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/admin/inventory', internalAdminOnly, async (req, res) => {
  try {
    const resp = await axios.get(`${INVENTORY_SERVICE}/inventory`);
    res.json(resp.data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/admin/inventory/:productId', internalAdminOnly, async (req, res) => {
  try {
    const resp = await axios.put(`${INVENTORY_SERVICE}/inventory/${req.params.productId}`, req.body);
    // Sync stock back to product-service so storefront shows correct value
    if (req.body.stock !== undefined) {
      try { await axios.put(`${PRODUCT_SERVICE}/products/${req.params.productId}`, { stock: req.body.stock }); } catch (e) {}
    }
    res.json(resp.data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/admin/users', internalAdminOnly, async (req, res) => {
  try {
    const resp = await axios.get(`${USER_SERVICE}/users`);
    res.json(resp.data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/admin/shipping/:orderId', internalAdminOnly, async (req, res) => {
  try {
    const resp = await axios.put(`${SHIPPING_SERVICE}/shipping/${req.params.orderId}`, req.body);
    res.json(resp.data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

const PORT = process.env.PORT || 3014;
app.listen(PORT, () => console.log(`Admin Service running on port ${PORT}`));
