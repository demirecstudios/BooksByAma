const express = require('express');
const router = express.Router();

// Verify Paystack transaction
router.post('/verify', async (req, res) => {
  try {
    const { reference } = req.body;

    if (!reference || typeof reference !== 'string') {
      return res.status(400).json({ error: 'Missing transaction reference' });
    }

    const secretKey = process.env.PAYSTACK_SECRET_KEY;

    const paystackRes = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        headers: {
          Authorization: `Bearer ${secretKey}`,
        },
      },
    );

    const result = await paystackRes.json();

    // Paystack returns data.status === "success" for a completed payment
    const success = result?.data?.status === 'success';

    res.json({
      success,
      amount: result?.data?.amount,
      currency: result?.data?.currency,
      reference: result?.data?.reference,
    });
  } catch (error) {
    console.error('verify-transaction error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Create payment intent (for Stripe - if needed in future)
router.post('/create-intent', async (req, res) => {
  try {
    const { amount } = req.body;

    // Basic validation — amount must be a positive integer (in cents)
    if (!Number.isInteger(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    // If you want to use Stripe in the future, uncomment this:
    // const Stripe = require('stripe');
    // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    // const paymentIntent = await stripe.paymentIntents.create({
    //   amount,
    //   currency: 'usd',
    //   automatic_payment_methods: { enabled: true },
    // });
    // res.json({ clientSecret: paymentIntent.client_secret });

    // For now, return a mock response for Paystack
    res.json({ message: 'Use Paystack instead' });
  } catch (error) {
    console.error('create-payment-intent error:', error);
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
