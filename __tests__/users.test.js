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
    "INSERT INTO companies (name, handle, password, email) VALUES ('Test Co', 'testcompany', $1, 'email@email.com') RETURNING *",
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

  // login a user, get a token, store the user ID and token
  const hashedPassword = await bcrypt.hash('secret', 1);
  await db.query(
    "INSERT INTO users (username, first_name, last_name, email, password, current_company) VALUES ('test', 'Fred', 'Durst', 'fred@test.com', $1, $2)",
    [hashedPassword, companyData.rows[0].current_company]
  );
  const response = await request(app)
    .post('/user-auth')
    .send({
      username: 'test',
      password: 'secret'
    });
  auth.token = response.body.token;
  auth.current_username = jwt.decode(auth.token).username;
});

describe('GET /users', () => {
  test('gets a list of users', async () => {
    const response = await request(app)
      .get('/users')
      .set('authorization', auth.token);
    expect(response.body).toHaveLength(1);
  });
});

describe('GET /users/:username', () => {
  test('successfully get a single user', async () => {
    const response = await request(app)
      .get('/users/test')
      .set('authorization', auth.token);
    expect(response.body).toHaveProperty('first_name', 'Fred');
  });
});

describe('POST /users', () => {
  test('successfully creates new user', async () => {
    const response = await request(app)
      .post('/users')
      .send({
        username: 'bdug',
        first_name: 'Bobson',
        last_name: 'Dugnutt',
        password: 'password',
        email: 'email@ermail.com'
      });
    expect(response.body).toHaveProperty('first_name', 'Bobson');
  });
  test('returns 400 bad request', async () => {
    const response = await request(app)
      .post('/users')
      .send({
        username: 'wompwomp'
      });
    expect(response.status).toBe(400);
    expect(response.body.error).toHaveProperty('title', 'Bad Request');
  });
});

describe('PATCH /users/:username', () => {
  test('successfully patches own user', async () => {
    const response = await request(app)
      .patch('/users/test')
      .set('authorization', auth.token)
      .send({
        username: 'fdurst',
        first_name: 'Frid'
      });
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('username', 'fdurst');
    expect(response.body).toHaveProperty('first_name', 'Frid');
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
