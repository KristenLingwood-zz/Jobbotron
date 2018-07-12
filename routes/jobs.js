const express = require('express');
const router = express.Router();
const db = require('../db/index');
const jsonwebtoken = require('jsonwebtoken');
const { ensureLoggedIn, ensureCompanyAcct } = require('../middleware/auth.js');
const { validate } = require('jsonschema');
const jobsPostSchema = require('../schemas/jobsPostSchema.json');
const jobsPatchSchema = require('../schemas/jobsPatchSchema.json');

// POST /jobs
router.post('', ensureCompanyAcct, async (req, res, next) => {
  try {
    const result = validate(req.body, jobsPostSchema);
    if (!result.valid) {
      return next(result.errors);
    }
    const token = req.headers.authorization;
    const decodedToken = jsonwebtoken.verify(token, 'CONTIGO');
    const data = await db.query(
      'INSERT INTO jobs (title, salary, equity, company) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.body.title, req.body.salary, req.body.equity, decodedToken.id]
    );
    return res.json(data.rows[0]);
  } catch (err) {
    return next(err);
  }
});

// GET /jobs
router.get('', ensureLoggedIn, async (req, res, next) => {
  try {
    const data = await db.query('SELECT * FROM jobs');
    return res.json(data.rows);
  } catch (err) {
    return next(err);
  }
});

// GET /jobs/:id
router.get('/:id', ensureLoggedIn, async (req, res, next) => {
  try {
    const data = await db.query('SELECT * FROM jobs WHERE id=$1', [
      req.params.id
    ]);
    return res.json(data.rows[0]);
  } catch (err) {
    return next(err);
  }
});

// PATCH /jobs/:id
router.patch('/:id', async (req, res, next) => {
  try {
    const result = validate(req.body, jobsPatchSchema);
    if (!result.valid) {
      return next(result.errors);
    }
    const currentCompany = await db.query(
      'SELECT company FROM jobs WHERE id=$1',
      [req.params.id]
    );
    const token = req.headers.authorization;
    const decodedToken = jsonwebtoken.verify(token, 'CONTIGO');
    if (currentCompany.rows[0].company !== decodedToken.handle) {
      return res.status(403).json({ message: 'Unauthorized -- wrong company' });
    }
    const oldData = await db.query('SELECT * FROM jobs WHERE id=$1', [
      req.params.id
    ]);
    let title = req.body.title || oldData.rows[0].title;
    let salary = req.body.salary || oldData.rows[0].salary;
    let equity = req.body.equity || oldData.rows[0].equity || null;
    const data = await db.query(
      'UPDATE jobs SET title=$1, salary=$2, equity=$3, company=$4 WHERE id=$5 RETURNING *',
      [title, salary, equity, decodedToken.handle, req.params.id]
    );
    return res.json(data.rows[0]);
  } catch (err) {
    return next(err);
  }
});

// DELETE /jobs/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const currentCompany = await db.query(
      'SELECT company FROM jobs WHERE id=$1',
      [req.params.id]
    );
    const token = req.headers.authorization;
    const decodedToken = jsonwebtoken.verify(token, 'CONTIGO');
    if (currentCompany.rows[0].company !== decodedToken.handle) {
      return res.status(403).json({ message: 'Unauthorized -- wrong company' });
    }
    await db.query('DELETE FROM jobs WHERE id=$1', [req.params.id]);
    return res.json({ message: 'Job deleted' });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
