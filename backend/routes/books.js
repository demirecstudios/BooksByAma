const express = require('express');
const router = express.Router();
const pool = require('../db');

// Get all books
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM books ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get book by ID
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM books WHERE id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create book (admin only)
router.post('/', async (req, res) => {
  try {
    const { title, description, age, category, color, price, cover_image, author } = req.body;
    const result = await pool.query(
      'INSERT INTO books (title, description, age, category, color, price, cover_image, author) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [title, description, age, category, color, price, cover_image, author]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update book (admin only)
router.put('/:id', async (req, res) => {
  try {
    const { title, description, age, category, color, price, cover_image, author } = req.body;
    const result = await pool.query(
      'UPDATE books SET title = $1, description = $2, age = $3, category = $4, color = $5, price = $6, cover_image = $7, author = $8 WHERE id = $9 RETURNING *',
      [title, description, age, category, color, price, cover_image, author, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete book (admin only)
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM books WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }
    res.json({ message: 'Book deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
