const express = require('express');
const router = express.Router();
const db = require('../db/index');
const bcrypt = require('bcrypt');
const jsonwebtoken = require('jsonwebtoken');
const { ensureLoggedIn, ensureCorrectUser } = require('../middleware/auth');
const { validate } = require('jsonschema');
const usersPostSchema = require('../schemas/usersPostSchema');
const usersPatchSchema = require('../schemas/usersPatchSchema');
const APIError = require('../APIError');

// POST /users
router.post('', async (req, res, next) => {
  try {
    const validation = validate(req.body, usersPostSchema);
    if (!validation.valid) {
      return next(
        new APIError(
          400,
          'Bad Request',
          validation.errors.map(e => e.stack).join('. ')
        )
      );
    }
    const existingUser = await db.query(
      'SELECT username FROM users WHERE username=$1',
      [req.body.username]
    );
    if (existingUser.rows.length > 0) {
      return next(
        new APIError(
          409,
          'Conflict',
          validation.errors.map(e => e.stack).join('. ')
        )
      );
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

// GET /users
router.get('/', ensureLoggedIn, async (req, res, next) => {
  try {
    const limit = !req.query.limit ? 50 : Math.min(req.query.limit, 50);
    const offset = req.query.offset || 0;
    let data;
    if (!req.query.search) {
      data = await db.query(
        `SELECT username, first_name, last_name, email, photo, current_company, array_agg(job_id) as applied_to 
      FROM users 
      LEFT OUTER JOIN jobs_users 
      ON (users.id = jobs_users.user_id) 
      GROUP BY users.id LIMIT $1 OFFSET $2`,
        [limit, offset]
      );
    } else {
      data = await db.query(
        `SELECT username, first_name, last_name, email, photo, current_company, array_agg(job_id) as applied_to 
        FROM users 
        LEFT OUTER JOIN jobs_users 
        ON (users.id = jobs_users.user_id) 
        WHERE username ILIKE $1
        GROUP BY users.id LIMIT $2 OFFSET $3`,
        [req.query.search, limit, offset]
      );
    }
    return res.json(data.rows);
  } catch (err) {
    return next(err);
  }
});

// GET /users/:username
router.get('/:username', ensureLoggedIn, async (req, res, next) => {
  try {
    const data = await db.query(
      `SELECT username, first_name, last_name, email, photo, current_company, array_agg(job_id) as applied_to 
    FROM users 
    LEFT OUTER JOIN jobs_users 
    ON (users.id = jobs_users.user_id) 
    WHERE username=$1
    GROUP BY users.id`,
      [req.params.username]
    );
    return res.json(data.rows[0]);
  } catch (err) {
    return next(err);
  }
});

// PATCH /users/:username
router.patch('/:username', ensureCorrectUser, async (req, res, next) => {
  try {
    const validation = validate(req.body, usersPatchSchema);
    if (!validation.valid) {
      return next(
        new APIError(
          400,
          'Bad Request',
          validation.errors.map(e => e.stack).join('. ')
        )
      );
    }
    const existingUser = await db.query(
      'SELECT username FROM users WHERE username=$1',
      [req.body.username]
    );
    if (existingUser.rows.length > 0) {
      return next(
        new APIError(
          409,
          'Conflict',
          validation.errors.map(e => e.stack).join('. ')
        )
      );
    }

    const oldData = await db.query('SELECT * FROM users WHERE username=$1', [
      req.params.username
    ]);
    let current_company =
      req.body.current_company || oldData.rows[0].current_company;
    let username = req.body.username || oldData.rows[0].username;
    let first_name = req.body.first_name || oldData.rows[0].first_name;
    let last_name = req.body.last_name || oldData.rows[0].last_name;
    let email = req.body.email || oldData.rows[0].email;
    let photo = req.body.photo || oldData.rows[0].photo || null;
    let password = oldData.rows[0].password;
    if (req.body.password) {
      password = await bcrypt.hash(req.body.password, 10);
    }
    const data = await db.query(
      'UPDATE users SET first_name=$1, last_name=$2, email=$3, photo=$4, password=$5, username=$6, current_company=$7 WHERE username=$8 RETURNING *',
      [
        first_name,
        last_name,
        email,
        photo,
        password,
        username,
        current_company,
        oldData.rows[0].username
      ]
    );
    return res.json(data.rows[0]);
  } catch (err) {
    return next(err);
  }
});

// DELETE /users/:username
router.delete('/:username', ensureCorrectUser, async (req, res, next) => {
  try {
    await db.query('DELETE FROM users WHERE username=$1', [
      req.params.username
    ]);
    return res.json({ message: 'User deleted' });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
