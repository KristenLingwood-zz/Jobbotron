const express = require('express');
const router = express.Router();
const db = require('../db/index');
const bcrypt = require('bcrypt');
const jsonwebtoken = require('jsonwebtoken');
const { ensureLoggedIn, ensureCorrectUser } = require('../middleware/auth.js');
const { validate } = require('jsonschema');
const usersPostSchema = require('../schemas/usersPostSchema.json');
const usersPatchSchema = require('../schemas/usersPatchSchema.json');

// POST /users
router.post('', async (req, res, next) => {
  try {
    const result = validate(req.body, usersPostSchema);
    if (!result.valid) {
      return next(result.errors);
    }
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    const userData = await db.query(
      `INSERT INTO users (first_name, last_name, email, photo, username, password, current_company) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        req.body.first_name,
        req.body.last_name,
        req.body.email,
        req.body.photo,
        req.body.username,
        hashedPassword,
        req.body.current_company
      ]
    );
    return res.json(userData.rows[0]);
  } catch (err) {
    return next(err);
  }
});

// POST /users/auth
router.post('/auth', async (req, res, next) => {
  try {
    const userData = await db.query('SELECT * FROM users WHERE username=$1', [
      req.body.username
    ]);
    if (userData.rows.length === 0)
      return res.json({ message: 'Invalid username' });

    const result = await bcrypt.compare(
      req.body.password,
      userData.rows[0].password
    );
    if (!result) return res.json({ message: 'Invalid password' });

    const token = jsonwebtoken.sign(
      {
        id: userData.rows[0].id,
        acctType: 'individual'
      },
      'CONTIGO'
    );
    return res.json({ token });
  } catch (err) {
    return next(err);
  }
});

// GET /users
router.get('', ensureLoggedIn, async (req, res, next) => {
  try {
    const data = await db.query('SELECT * FROM users');
    return res.json(data.rows);
  } catch (err) {
    return next(err);
  }
});

// GET /users/:id
router.get('/:id', ensureLoggedIn, async (req, res, next) => {
  try {
    const data = await db.query('SELECT * FROM users WHERE id=$1', [
      req.params.id
    ]);
    return res.json(data.rows[0]);
  } catch (err) {
    return next(err);
  }
});

// PATCH /users/:id
router.patch('/:id', ensureCorrectUser, async (req, res, next) => {
  try {
    const result = validate(req.body, usersPatchSchema);
    if (!result.valid) {
      return next(result.errors);
    }
    const oldData = await db.query('SELECT * FROM users WHERE id=$1', [
      req.params.id
    ]);
    let first_name = req.body.first_name || oldData.rows[0].first_name;
    let last_name = req.body.last_name || oldData.rows[0].last_name;
    let email = req.body.email || oldData.rows[0].email;
    let photo = req.body.photo || oldData.rows[0].photo || null;
    let password =
      (await bcrypt.hash(req.body.password, 10)) || oldData.rows[0].password;
    const data = await db.query(
      'UPDATE users SET first_name=$1, last_name=$2, email=$3, photo=$4, password=$5 WHERE id=$6 RETURNING *',
      [first_name, last_name, email, photo, password, req.params.id]
    );
    return res.json(data.rows[0]);
  } catch (err) {
    return next(err);
  }
});

// DELETE /useres/:id
router.delete('/:id', ensureCorrectUser, async (req, res, next) => {
  try {
    await db.query('DELETE FROM users WHERE id=$1', [req.params.id]);
    return res.json({ message: 'User deleted' });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
