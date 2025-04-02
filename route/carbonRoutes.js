const express = require('express');
const db = require('../database/init');
const router = express.Router();

// Carbon footprint calculation
router.post('/calculate', (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });

  const { electricity, gas, transport } = req.body;
  const userId = req.session.user.id;
  const footprint = (electricity * 0.233) + (gas * 0.184) + (transport * 2.31);

  db.run(
    `INSERT INTO carbon_data (user_id, electricity, gas, transport, footprint) VALUES (?, ?, ?, ?, ?)`,
    [userId, electricity, gas, transport, footprint],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ footprint: footprint.toFixed(2), success: true });
    }
  );
});

// Profile route to fetch user data
router.get('/profile', (req, res) => {
  if (!req.session.user) return res.redirect('/');

  const userId = req.session.user.id;
  db.all(
    `SELECT electricity, gas, transport, footprint, timestamp FROM carbon_data WHERE user_id = ? ORDER BY timestamp DESC`,
    [userId],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.render('profile', { user: req.session.user, footprintData: results });
    }
  );
});

module.exports = router;
