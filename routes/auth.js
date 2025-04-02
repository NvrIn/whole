const express = require('express');
const nodemailer = require('nodemailer');
const { User } = require('../models/user');
const bcrypt = require('bcryptjs');
const router = express.Router();
const dotenv = require('dotenv');

dotenv.config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Signup Route
router.post('/signup', (req, res) => {
  const { name, email, password, confirmPassword, terms } = req.body;
  if (password !== confirmPassword) {
    return res.redirect('/auth/signup');
  }
  if (!terms) {
    return res.redirect('/auth/signup');
  }
  User.register(name, email, password, (err) => {
    if (err) return res.redirect('/auth/signup');
    res.redirect('/');
  });
});

// Login Route
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  User.findByEmail(email, (err, user) => {
    if (err || !user) return res.redirect('/auth/login');
    bcrypt.compare(password, user.password, (err, result) => {
      if (result) {
        req.session.user = user;
        res.redirect('/profile');
      } else {
        res.redirect('/auth/login');
      }
    });
  });
});

// Forget Password Route
router.post('/forget-password', (req, res) => {
  const { email } = req.body;
  User.findByEmail(email, (err, user) => {
    if (err || !user) return res.redirect('/auth/forget-password');
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Password Reset Request',
      text: `Click the following link to reset your password: http://localhost:3000/auth/reset-password/${email}`
    };
    transporter.sendMail(mailOptions, (err, info) => {
      if (err) return res.redirect('/auth/forget-password');
      res.redirect('/auth/login');
    });
  });
});

// Reset Password Route
router.get('/reset-password/:email', (req, res) => {
  res.render('reset-password', { email: req.params.email });
});

router.post('/reset-password', (req, res) => {
  const { email, newPassword } = req.body;
  User.updatePassword(email, newPassword, (err) => {
    if (err) return res.redirect('/auth/reset-password');
    res.redirect('/auth/login');
  });
});

module.exports = router;
