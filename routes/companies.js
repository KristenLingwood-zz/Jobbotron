const express = require('express');
const router = express.Router();
const db = require('../db/index');
const bcrypt = require('bcrypt');
const jsonwebtoken = require('jsonwebtoken');
const {
  ensureLoggedIn,
  ensureCorrectCompany
} = require('../middleware/auth.js');
const { validate } = require('jsonschema');
const companiesPostSchema = require('../schemas/companiesPostSchema.json');
const companiesPatchSchema = require('../schemas/companiesPatchSchema.json');
const APIError = require('../APIError');

// GET /companies
router.get('', ensureLoggedIn, async (req, res, next) => {
  try {
    const limit = !req.query.limit ? 50 : Math.min(req.query.limit, 50);
    const offset = req.query.offset || 0;
    let data;
    if (!req.query.search) {
      data = await db.query(
        `SELECT name, companies.email, handle, logo, array_agg(jobs.id) as jobs, array_agg(users.username) as employees
        FROM companies
        LEFT OUTER JOIN jobs
        ON (companies.handle = jobs.company)
        LEFT OUTER JOIN users
        ON (users.current_company = companies.handle)
        GROUP BY (handle, name, companies.email, logo)
        LIMIT $1 OFFSET $2;`,
        [limit, offset]
      );
    } else {
      data = await db.query(
        `SELECT name, companies.email, handle, logo, array_agg(jobs.id) as jobs, array_agg(users.username) as employees
        FROM companies
        LEFT OUTER JOIN jobs
        ON (companies.handle = jobs.company)
        LEFT OUTER JOIN users
        ON (users.current_company = companies.handle)
        WHERE handle ILIKE $1
        GROUP BY (handle, name, companies.email, logo)
        LIMIT $2 OFFSET $3;`,
        [req.query.search, limit, offset]
      );
    }
    return res.json(data.rows);
  } catch (err) {
    const apiErr = new APIError(500, 'Bad Request', 'Invalid Query');
    return next(apiErr);
  }
});

// GET /companies/:handle
router.get('/:handle', ensureLoggedIn, async (req, res, next) => {
  try {
    const companyData = await db.query(
      `SELECT name, companies.email, handle, logo, array_agg(jobs.id) as jobs, array_agg(users.username) as employees
      FROM companies
      LEFT OUTER JOIN jobs
      ON (companies.handle = jobs.company)
      LEFT OUTER JOIN users
      ON (users.current_company = companies.handle)
      WHERE handle=$1
      GROUP BY (handle, name, companies.email, logo);`,
      [req.params.handle]
    );
    const userData = await db.query(
      'SELECT users.username FROM users WHERE users.current_company=$1',
      [req.params.handle]
    );
    const userList = userData.rows.map(x => x.username);
    companyData.rows[0].users = userList;
    return res.json(companyData.rows[0]);
  } catch (err) {
    return next(err);
  }
});

// POST /companies
router.post('', async function(req, res, next) {
  try {
    const validation = validate(req.body, companiesPostSchema);
    if (!validation.valid) {
      return next(
        new APIError(
          400,
          'Bad Request',
          validation.errors.map(e => e.stack).join('. ')
        )
      );
    }
    const existingCompany = await db.query(
      'SELECT handle FROM companies WHERE handle=$1',
      [req.body.handle]
    );
    if (existingCompany.rows.length > 0) {
      return next(
        new APIError(
          409,
          'Conflict',
          validation.errors.map(e => e.stack).join('. ')
        )
      );
    }

    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    const data = await db.query(
      `INSERT INTO companies (name, logo, email, handle, password) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [
        req.body.name,
        req.body.logo,
        req.body.email,
        req.body.handle,
        hashedPassword
      ]
    );
    return res.json(data.rows[0]);
  } catch (err) {
    return next(err);
  }
});

// PATCH /companies/:handle
router.patch('/:handle', ensureCorrectCompany, async (req, res, next) => {
  try {
    const validation = validate(req.body, companiesPatchSchema);
    if (!validation.valid) {
      return next(
        new APIError(
          400,
          'Bad Request',
          validation.errors.map(e => e.stack).join('. ')
        )
      );
    }
    const existingCompany = await db.query(
      'SELECT handle FROM companies WHERE handle=$1',
      [req.body.handle]
    );
    if (existingCompany.rows.length > 0) {
      return next(
        new APIError(
          409,
          'Conflict',
          validation.errors.map(e => e.stack).join('. ')
        )
      );
    }
    const oldData = await db.query('SELECT * FROM companies WHERE handle=$1', [
      req.params.handle
    ]);
    let name = req.body.name || oldData.rows[0].name;
    let logo = req.body.logo || oldData.rows[0].logo || null;
    let handle = req.body.handle || oldData.rows[0].handle;
    let email = req.body.email || oldData.rows[0].email;
    let password = oldData.rows[0].password;
    if (req.body.password) {
      password = await bcrypt.hash(req.body.password, 10);
    }
    const data = await db.query(
      'UPDATE companies SET name=$1, logo=$2, password=$3, email=$4, handle=$5 WHERE handle=$6 RETURNING *',
      [name, logo, password, email, handle, oldData.rows[0].handle]
    );
    return res.json(data.rows[0]);
  } catch (err) {
    return next(err);
  }
});

// DELETE /companies/:handle
router.delete('/:handle', ensureCorrectCompany, async (req, res, next) => {
  try {
    await db.query('DELETE FROM companies WHERE handle=$1 RETURNING *', [
      req.params.handle
    ]);
    return res.json({ message: 'Company deleted' });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;

// need to test delete cascade, but delete otherwise works
