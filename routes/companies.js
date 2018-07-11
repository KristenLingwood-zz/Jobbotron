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

// GET /companies
router.get('', ensureLoggedIn, async (req, res, next) => {
  try {
    const data = await db.query('SELECT * FROM companies');
    return res.json(data.rows);
  } catch (err) {
    return next(err);
  }
});

// GET /companies/:id
router.get('/:id', ensureLoggedIn, async (req, res, next) => {
  try {
    const companyData = await db.query('SELECT * FROM companies WHERE id=$1', [
      req.params.id
    ]);
    const userData = await db.query(
      'SELECT users.id FROM users WHERE users.current_company=$1',
      [req.params.id]
    );
    const userList = userData.rows.map(x => x.id);
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

// POST /companies/auth
router.post('/auth', async (req, res, next) => {
  try {
    const companyData = await db.query(
      'SELECT * FROM companies WHERE handle=$1',
      [req.body.handle]
    );
    if (companyData.rows.length === 0)
      return res.json({ message: 'Invalid company handle' });

    const result = await bcrypt.compare(
      req.body.password,
      companyData.rows[0].password
    );
    if (!result) return res.json({ message: 'Invalid password' });

    const token = jsonwebtoken.sign(
      {
        id: companyData.rows[0].id,
        acctType: 'company'
      },
      'CONTIGO'
    );
    return res.json({ token });
  } catch (err) {
    return next(err);
  }
});

// // PATCH /companies/:id
// router.patch('/:id', ensureCorrectCompany, async (req, res, next) => {
//   try {
//     const hashedPassword = await bcrypt.hash(req.body.password, 10);
//     const data = await db.query(
//       'UPDATE companies SET name=$1, logo=$2, password=$3 WHERE id=$4 RETURNING *',
//       [req.body.name, req.body.logo, hashedPassword, req.params.id]
//     );
//     return res.json(data.rows[0]);
//   } catch (err) {
//     return next(err);
//   }
// });

// PATCH /companies/:id
router.patch('/:id', ensureCorrectCompany, async (req, res, next) => {
  try {
    const result = validate(req.body, companiesPatchSchema);
    if (!result.valid) {
      return next(result.errors);
    }
    const oldData = await db.query('SELECT * FROM companies WHERE id=$1', [
      req.params.id
    ]);
    let name = req.body.name || oldData.rows[0].name;
    let logo = req.body.logo || oldData.rows[0].logo || null;
    let password =
      (await bcrypt.hash(req.body.password, 10)) || oldData.rows[0].password;
    const data = await db.query(
      'UPDATE companies SET name=$1, logo=$2, password=$3 WHERE id=$4 RETURNING *',
      [name, logo, password, req.params.id]
    );
    return res.json(data.rows[0]);
  } catch (err) {
    return next(err);
  }
});

// DELETE /companies/:id
router.delete('/:id', ensureCorrectCompany, async (req, res, next) => {
  try {
    await db.query('DELETE FROM companies WHERE id=$1 RETURNING *', [
      req.params.id
    ]);
    return res.json({ message: 'Company deleted' });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;

// need to test delete cascade, but delete otherwise works
