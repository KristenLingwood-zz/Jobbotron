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
      console.log('before query');
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
    console.log('data:');
    return res.json(data.rows);
  } catch (err) {
    err = new APIError(500, 'Bad Request', 'Invalid Query');
    return next(err);
  }
});

// GET /companies/:handle
router.get('/:handle', ensureLoggedIn, async (req, res, next) => {
  try {
    const companyData = await db.query(
      'SELECT * FROM companies WHERE handle=$1',
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
    const result = validate(req.body, companiesPostSchema);
    if (!result.valid) {
      return next(result.errors);
    }
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    const data = await db.query(
      `INSERT INTO companies (name, logo, handle, password) VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.body.name, req.body.logo, req.body.handle, hashedPassword]
    );
    return res.json(data.rows[0]);
  } catch (err) {
    return next(err);
  }
});

// PATCH /companies/:handle
router.patch('/:handle', ensureCorrectCompany, async (req, res, next) => {
  try {
    const result = validate(req.body, companiesPatchSchema);
    if (!result.valid) {
      return next(result.errors);
    }
    const oldData = await db.query('SELECT * FROM companies WHERE handle=$1', [
      req.params.handle
    ]);
    let name = req.body.name || oldData.rows[0].name;
    let logo = req.body.logo || oldData.rows[0].logo || null;
    let password =
      (await bcrypt.hash(req.body.password, 10)) || oldData.rows[0].password;
    const data = await db.query(
      'UPDATE companies SET name=$1, logo=$2, password=$3 WHERE handle=$4 RETURNING *',
      [name, logo, password, req.params.handle]
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
