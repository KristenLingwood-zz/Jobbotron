const express = require('express');
const router = express.Router();
const db = require('../db/index');
const jsonwebtoken = require('jsonwebtoken');
const {
  ensureLoggedIn,
  ensureCompanyAcct,
  ensureUserAcct
} = require('../middleware/auth.js');
const { validate } = require('jsonschema');
const jobsPostSchema = require('../schemas/jobsPostSchema.json');
const jobsPatchSchema = require('../schemas/jobsPatchSchema.json');
const APIError = require('../APIError');

// POST /jobs
router.post('', ensureCompanyAcct, async (req, res, next) => {
  try {
    const validation = validate(req.body, jobsPostSchema);
    if (!validation.valid) {
      return next(
        new APIError(
          400,
          'Bad Request',
          validation.errors.map(e => e.stack).join('. ')
        )
      );
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
    const validation = validate(req.body, jobsPatchSchema);
    if (!validation.valid) {
      return next(
        new APIError(
          400,
          'Bad Request',
          validation.errors.map(e => e.stack).join('. ')
        )
      );
    }
    const token = req.headers.authorization;
    const decodedToken = jsonwebtoken.verify(token, 'CONTIGO');
    const found_job = await db.query('SELECT * FROM jobs WHERE id = $1', [
      req.params.id
    ]);
    if (decodedToken.handle !== found_job.rows[0].company) {
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

// post apply to a job
router.post('/:id/applications', ensureUserAcct, async (req, res, next) => {
  try {
    const token = req.headers.authorization;
    const decodedToken = jsonwebtoken.verify(token, 'CONTIGO');
    const user_id = decodedToken.id;
    await db.query('INSERT INTO jobs_users (user_id, job_id) VALUES ($1, $2)', [
      user_id,
      req.params.id
    ]);
    return res.json({
      message: `Application received for job #${req.params.id}`
    });
  } catch (err) {
    return next(err);
  }
});

// company can see applications for specific job
router.get('/:id/applications', async (req, res, next) => {
  try {
    const token = req.headers.authorization;
    const decodedToken = jsonwebtoken.verify(token, 'CONTIGO');
    if (decodedToken.acctType === 'company') {
      const currentCompany = await db.query(
        'SELECT company FROM jobs WHERE id=$1',
        [req.params.id]
      );
      if (currentCompany.rows[0].company !== decodedToken.handle) {
        return res
          .status(403)
          .json({ message: 'Unauthorized -- wrong company' });
      }
      const data = await db.query('SELECT * FROM jobs_users WHERE job_id=$1', [
        req.params.id
      ]);
      return res.json(data.rows);
    } else {
      const data = await db.query(
        'SELECT * FROM jobs_users WHERE job_id=$1 AND user_id=$2',
        [req.params.id, decodedToken.id]
      );
      if (data.rows.length < 1) {
        return res.json({ message: 'User has no applications for this job.' });
      } else {
        return res.json(data.rows);
      }
    }
  } catch (err) {
    return next(err);
  }
});

// GET single application
router.get('/:id/applications/:app_id', async (req, res, next) => {
  try {
    const token = req.headers.authorization;
    const decodedToken = jsonwebtoken.verify(token, 'CONTIGO');
    if (decodedToken.acctType === 'company') {
      const data = await db.query(`SELECT company FROM jobs WHERE id=$1`, [
        req.params.id
      ]);
      if (data.rows[0].company !== decodedToken.handle) {
        return res
          .status(403)
          .json({ message: 'Unauthorized -- incorrect company' });
      }
    } else {
      //if acct individual
      const data = await db.query(
        `SELECT user_id FROM jobs_users WHERE id=$1`,
        [req.params.app_id]
      );
      if (data.rows[0].user_id !== decodedToken.id) {
        return res
          .status(403)
          .json({ message: 'Unauthorized -- incorrect user' });
      }
    }
    const appData = await db.query(`SELECT * FROM jobs_users WHERE id=$1`, [
      req.params.app_id
    ]);
    return res.json(appData.rows[0]);
  } catch (err) {
    return next(err);
  }
});

// DELETE single application
router.delete('/:id/applications/:app_id', async (req, res, next) => {
  try {
    const token = req.headers.authorization;
    const decodedToken = jsonwebtoken.verify(token, 'CONTIGO');
    if (decodedToken.acctType === 'company') {
      const data = await db.query(`SELECT company FROM jobs WHERE id=$1`, [
        req.params.id
      ]);
      if (data.rows[0].company !== decodedToken.handle) {
        return res
          .status(403)
          .json({ message: 'Unauthorized -- incorrect company' });
      }
    } else {
      //if acct individual
      const data = await db.query(
        `SELECT user_id FROM jobs_users WHERE id=$1`,
        [req.params.app_id]
      );
      if (data.rows[0].user_id !== decodedToken.id) {
        return res
          .status(403)
          .json({ message: 'Unauthorized -- incorrect user' });
      }
    }
    await db.query(`DELETE FROM jobs_users WHERE id=$1`, [req.params.app_id]);
    return res.json({ message: 'Application deleted' });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
