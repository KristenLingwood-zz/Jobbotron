// my beforeEach user/company inserts will need more fields as I had more required fields

process.env.NODE_ENV - 'test';
const db = require('../db');
const request = require('supertest');
const app = require('../index');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

// global auth variable to store things for all the tests
const auth = {};

beforeAll(async () => {
  await db.query(`CREATE TABLE companies (id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    logo TEXT,
    handle TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    email TEXT NOT NULL)`);

  await db.query(`CREATE TABLE users (id SERIAL PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    photo TEXT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    current_company TEXT REFERENCES companies (handle) ON DELETE CASCADE)`);

  await db.query(`CREATE TABLE jobs (id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    salary INTEGER NOT NULL,
    equity FLOAT,
    company TEXT REFERENCES companies (handle) ON DELETE CASCADE)`);

  await db.query(`CREATE TABLE jobs_users (id SERIAL PRIMARY KEY,
    job_id INTEGER REFERENCES jobs (id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users (id) ON DELETE CASCADE);`);
});

beforeEach(async () => {
  // do the same for company "companies"
  const hashedCompanyPassword = await bcrypt.hash('secret', 1);
  const companyData = await db.query(
    "INSERT INTO companies (name, handle, email, password) VALUES ('Test Co', 'testcompany', 'email@email.com', $1) RETURNING *",
    [hashedCompanyPassword]
  );
  const companyResponse = await request(app)
    .post('/company-auth')
    .send({
      handle: 'testcompany',
      password: 'secret'
    });
  auth.company_token = companyResponse.body.token;
  auth.current_current_company = jwt.decode(auth.company_token).current_company;
});

describe('GET /companies', () => {
  test('Gets a list of companies', async () => {
    const response = await request(app)
      .get('/companies')
      .set('authorization', auth.company_token);
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
  });
  test('get unauth error without token', async () => {
    const response = await request(app).get('/companies');
    expect(response.status).toBe(401);
  });
});

afterEach(async () => {
  //delete the companies
  await db.query('DELETE FROM companies');
});

afterAll(async () => {
  await db.query('DROP TABLE IF EXISTS jobs_users');
  await db.query('DROP TABLE IF EXISTS jobs');
  await db.query('DROP TABLE IF EXISTS users');
  await db.query('DROP TABLE IF EXISTS companies');
  db.end();
});
