const express = require('express');
const router = express.Router();
const db = require('../db/index');
const bcrypt = require('bcrypt');
const jsonwebtoken = require('jsonwebtoken');

// POST /companies/auth
router.post('/company-auth', async (req, res, next) => {
  try {
    const companyData = await db.query(
      'SELECT * FROM companies WHERE handle=$1',
      [req.body.handle]
    );
    if (companyData.rows.length === 0)
      return res.status(400).json({ message: 'Invalid company handle' });

    const result = await bcrypt.compare(
      req.body.password,
      companyData.rows[0].password
    );
    if (!result) return res.status(400).json({ message: 'Invalid password' });

    const token = jsonwebtoken.sign(
      {
        handle: companyData.rows[0].handle,
        acctType: 'company'
      },
      'CONTIGO'
    );
    return res.json({ token });
  } catch (err) {
    return next(err);
  }
});

// POST /users/auth
router.post('/user-auth', async (req, res, next) => {
  try {
    const userData = await db.query('SELECT * FROM users WHERE username=$1', [
      req.body.username
    ]);
    if (userData.rows.length === 0)
      return res.status(400).json({ message: 'Invalid username' });

    const result = await bcrypt.compare(
      req.body.password,
      userData.rows[0].password
    );
    if (!result) return res.status(400).json({ message: 'Invalid password' });

    const token = jsonwebtoken.sign(
      {
        id: userData.rows[0].id,
        username: userData.rows[0].username,
        acctType: 'individual'
      },
      'CONTIGO'
    );
    return res.json({ token });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
