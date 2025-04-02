const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');
const bcrypt = require('bcryptjs');

class User {
  static register(name, email, password, callback) {
    bcrypt.hash(password, 10, (err, hashedPassword) => {
      if (err) return callback(err);
      db.run('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', [name, email, hashedPassword], callback);
    });
  }

  static findByEmail(email, callback) {
    db.get('SELECT * FROM users WHERE email = ?', [email], callback);
  }

  static updatePassword(email, newPassword, callback) {
    bcrypt.hash(newPassword, 10, (err, hashedPassword) => {
      if (err) return callback(err);
      db.run('UPDATE users SET password = ? WHERE email = ?', [hashedPassword, email], callback);
    });
  }
}

module.exports = { User };
