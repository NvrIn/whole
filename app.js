const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const session = require('express-session');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
const { User } = require('./models/user');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const db = new sqlite3.Database('./database.db');

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Session middleware
app.use(session({
  secret: 'secret-key',
  resave: false,
  saveUninitialized: true,
}));

// Initialize database
db.serialize(() => {
  db.run('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT, email TEXT, password TEXT)');
  db.run(`CREATE TABLE IF NOT EXISTS carbon_data (
      id INTEGER PRIMARY KEY,
      user_id INTEGER,
      electricity REAL,
      gas REAL,
      transport REAL,
      footprint REAL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS consultations (
      id INTEGER PRIMARY KEY,
      user_id INTEGER,
      first_name TEXT,
      last_name TEXT,
      email TEXT,
      phone TEXT,
      date TEXT,
      notes TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
  )`);
});

// Nodemailer setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Routes

// Home (Login page)
app.get('/auth/login', (req, res) => {
  res.render('login');
});

// Consultation page route
app.get('/consultation', (req, res) => {
    if (req.session.user) {
      res.render('consultation'); // The page where users can fill out their consultation form
    } else {
      res.redirect('/');
    }
  });
  

// Signup page
app.get('/auth/signup', (req, res) => {
  res.render('signup');
});

// Forget password page
app.get('/auth/forget-password', (req, res) => {
  res.render('forget-password');
});

// Profile page
app.get('/profile', (req, res) => {
  if (req.session.user) {
    const userId = req.session.user.id;
    
    // Fetch the user's latest carbon footprint data
    db.all('SELECT * FROM carbon_data WHERE user_id = ? ORDER BY timestamp DESC LIMIT 1', [userId], (err, carbonRows) => {
      if (err) {
        console.error('Error fetching carbon data:', err);
        return res.redirect('/');
      }

      // Fetch the most recent consultation data for the user
      db.all('SELECT * FROM consultations WHERE user_id = ? ORDER BY timestamp DESC LIMIT 1', [userId], (err, consultationRows) => {
        if (err) {
          console.error('Error fetching consultation data:', err);
          return res.redirect('/');
        }

        // Render the profile page with user data, carbon data, and consultation data
        res.render('profile', { 
          user: req.session.user, 
          carbonData: carbonRows[0], 
          consultationData: consultationRows[0] 
        });
      });
    });
  } else {
    res.redirect('/');
  }
});

// Signup route (POST request)
app.post('/auth/signup', (req, res) => {
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

// Login route (POST request)
app.post('/auth/login', (req, res) => {
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

// Forget password route (POST request)
app.post('/auth/forget-password', (req, res) => {
  const { email } = req.body;
  User.findByEmail(email, (err, user) => {
    if (err || !user) return res.redirect('/auth/forget-password');
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Password Reset Request',
      text: `Click the following link to reset your password: http://localhost:3000/auth/reset-password/${email}`,
    };
    transporter.sendMail(mailOptions, (err, info) => {
      if (err) return res.redirect('/auth/forget-password');
      res.redirect('/');
    });
  });
});

// Reset password route (GET request)
app.get('/auth/reset-password/:email', (req, res) => {
  res.render('reset-password', { email: req.params.email });
});

// Reset password route (POST request)
app.post('/auth/reset-password', (req, res) => {
  const { email, newPassword } = req.body;
  User.updatePassword(email, newPassword, (err) => {
    if (err) return res.redirect('/auth/reset-password');
    res.redirect('/');
  });
});

// Logout route
app.get('/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    res.redirect('/');
  });
});

// Carbon footprint data store route
app.post('/carbon/store', (req, res) => {
  const { electricity, gas, transport, footprint } = req.body;

  if (!electricity || !gas || !transport || !footprint) {
    return res.status(400).json({ success: false, message: 'Invalid data.' });
  }

  const userId = req.session.user ? req.session.user.id : null;

  const query = `INSERT INTO carbon_data (user_id, electricity, gas, transport, footprint) VALUES (?, ?, ?, ?, ?)`;

  db.run(query, [userId, electricity, gas, transport, footprint], function(err) {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ success: false, message: 'Database error.' });
    }
    res.json({ success: true, message: 'Data stored successfully.' });
  });
});

// Consultation store route
app.post('/consultation/store', (req, res) => {
  const { firstName, lastName, email, phone, date, notes } = req.body;

  if (!firstName || !lastName || !email || !phone || !date) {
    return res.status(400).json({ success: false, message: 'All fields are required.' });
  }

  const userId = req.session.user ? req.session.user.id : null;

  const query = `INSERT INTO consultations (user_id, first_name, last_name, email, phone, date, notes) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`;

  db.run(query, [userId, firstName, lastName, email, phone, date, notes], function (err) {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ success: false, message: 'Database error.' });
    }
    res.json({ success: true, message: 'Consultation request stored successfully.' });
  });
});

// Start the server
app.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});
