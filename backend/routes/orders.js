const express = require('express');
const router = express.Router();
const { supabase } = require('../server');

// Get all orders (admin only)
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get order by ID
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get orders by user ID
router.get('/user/:userId', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', req.params.userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create order
router.post('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .insert([req.body])
      .select();

    if (error) throw error;
    
    // Notify admins of new order (migrated from Supabase Edge Function)
    await notifyAdminsOfNewOrder(data[0]);
    
    res.json(data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update order status (admin only)
router.put('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .update(req.body)
      .eq('id', req.params.id)
      .select();

    if (error) throw error;
    res.json(data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper function to notify admins of new order
async function notifyAdminsOfNewOrder(order) {
  try {
    // Fetch all admin push tokens
    const { data: tokenRows, error: tokenError } = await supabase
      .from('admin_push_tokens')
      .select('token');

    if (tokenError || !tokenRows || tokenRows.length === 0) {
      return;
    }

    const tokens = tokenRows.map((r) => r.token);

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
