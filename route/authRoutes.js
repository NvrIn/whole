const express = require('express');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const { User } = require('../models/user');
const dotenv = require('dotenv');

dotenv.config();
const router = express.Router();

// Nodemailer setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Signup route
router.post('/signup', (req, res) => {
  const { name, email, password, confirmPassword, terms } = req.body;
  if (password !== confirmPassword || !terms) return res.redirect('/auth/signup');

  User.register(name, email, password, (err) => {
    if (err) return res.redirect('/auth/signup');
    res.redirect('/');
  });
});

// Login route
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  User.findByEmail(email, (err, user) => {
    if (err || !user) return res.redirect('/');
    
    bcrypt.compare(password, user.password, (err, result) => {
      if (result) {
        req.session.user = user;
        res.redirect('/profile');
      } else {
        res.redirect('/');
      }
    });
  });
});

// Logout route
router.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

module.exports = router;
