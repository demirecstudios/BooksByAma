const express = require('express');
const router = express.Router();
const { pool } = require('../server');

// Get all orders (admin only)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM orders ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get order by ID
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM orders WHERE id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get orders by user ID
router.get('/user/:userId', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC',
      [req.params.userId]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create order
router.post('/', async (req, res) => {
  try {
    const { user_id, items, total, status } = req.body;
    const result = await pool.query(
      'INSERT INTO orders (user_id, items, total, status) VALUES ($1, $2, $3, $4) RETURNING *',
      [user_id, JSON.stringify(items), total, status || 'pending']
    );
    
    // Notify admins of new order
    await notifyAdminsOfNewOrder(result.rows[0]);
    
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update order status (admin only)
router.put('/:id', async (req, res) => {
  try {
    const { status } = req.body;
    const result = await pool.query(
      'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
      [status, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper function to notify admins of new order
async function notifyAdminsOfNewOrder(order) {
  try {
    // Fetch all admin push tokens
    const tokenResult = await pool.query('SELECT token FROM admin_push_tokens');
    
    if (tokenResult.rows.length === 0) {
      return;
    }

    const tokens = tokenResult.rows.map((r) => r.token);

    // Format the notification
    const total = Number(order.total ?? 0).toLocaleString('en-NG', {
      style: 'currency',
      currency: 'NGN',
      maximumFractionDigits: 0,
    });

    const itemCount = Array.isArray(order.items) ? order.items.length : '?';

    const messages = tokens.map((token) => ({
      to: token,
      sound: 'default',
      title: '🛍️ New Order!',
      body: `${total} · ${itemCount} item${itemCount !== 1 ? 's' : ''}`,
      data: { orderId: order.id, screen: 'orders' },
      channelId: 'orders',
    }));

    // Send to Expo Push API
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });
  } catch (error) {
    console.error('Error notifying admins:', error);
  }
}

module.exports = router;
