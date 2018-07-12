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
    password TEXT NOT NULL)`);

  await db.query(`CREATE TABLE users (id SERIAL PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    photo TEXT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    current_company INTEGER REFERENCES companies (id) ON DELETE CASCADE)`);

  await db.query(`CREATE TABLE jobs (id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    salary INTEGER NOT NULL,
    equity FLOAT,
    current_company INTEGER REFERENCES companies (id) ON DELETE CASCADE)`);

  await db.query(`CREATE TABLE jobs_users (id SERIAL PRIMARY KEY,
    job_id INTEGER REFERENCES jobs (id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users (id) ON DELETE CASCADE);`);
});

beforeEach(async () => {
  // do the same for company "companies"
  const hashedCompanyPassword = await bcrypt.hash('secret', 1);
  const companyData = await db.query(
    "INSERT INTO companies (name, handle, password) VALUES ('Test Co', 'testcompany', $1) RETURNING *",
    [hashedCompanyPassword]
  );
  const companyResponse = await request(app)
    .post('/companies/auth')
    .send({
      handle: 'testcompany',
      password: 'secret'
    });
  auth.company_token = companyResponse.body.token;
  auth.current_current_company = jwt.decode(auth.company_token).current_company;

  // login a user, get a token, store the user ID and token
  const hashedPassword = await bcrypt.hash('secret', 1);
  await db.query(
    "INSERT INTO users (username, first_name, last_name, email, password, current_company) VALUES ('test', 'Fred', 'Durst', 'fred@test.com', $1, $2)",
    [hashedPassword, companyData.rows[0].current_company]
  );
  const response = await request(app)
    .post('/users/auth')
    .send({
      username: 'test',
      password: 'secret'
    });
  auth.token = response.body.token;
  auth.current_username = jwt.decode(auth.token).username;
});

describe('GET /users', () => {
  test('gets a list of 1 user', async () => {
    const response = await request(app)
      .get('/users')
      .set('authorization', auth.token);
    expect(response.body).toHaveLength(1);
  });
});

describe('DELETE /users/:username', () => {
  test('successfully deletes own user', async () => {
    const response = await request(app)
      .delete(`/users/${auth.current_username}`)
      .set('authorization', auth.token);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: 'User deleted' });
  });
});

afterEach(async () => {
  //delete the users and company users
  await db.query('DELETE FROM users');
  await db.query('DELETE FROM companies');
});

afterAll(async () => {
  await db.query('DROP TABLE IF EXISTS jobs_users');
  await db.query('DROP TABLE IF EXISTS jobs');
  await db.query('DROP TABLE IF EXISTS users');
  await db.query('DROP TABLE IF EXISTS companies');
  db.end();
});
