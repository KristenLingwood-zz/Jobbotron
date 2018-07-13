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

  await db.query(
    "INSERT INTO jobs (title, salary, equity, company) VALUES ('well-compensated narcissist', 100000, 99, 'testcompany')"
  );
});

describe('GET /jobs', () => {
  test('gets a list of jobs', async () => {
    const response = await request(app)
      .get('/jobs')
      .set('authorization', auth.token);
    expect(response.body).toHaveLength(1);
  });
});

describe('GET /jobs/:id', () => {
  test('successfully get a single job', async () => {
    const response = await request(app)
      .get('/jobs/2')
      .set('authorization', auth.token);
    expect(response.body).toHaveProperty('salary', 100000);
  });
});

describe('POST /jobs', () => {
  test('successfully creates a new job', async () => {
    const response = await request(app)
      .post('/jobs')
      .set('authorization', auth.company_token)
      .send({
        title: 'mook',
        salary: 5,
        company: 'testcompany'
      });
    expect(response.body).toHaveProperty('title', 'mook');
  });
  test('returns 400 bad request', async () => {
    const response = await request(app)
      .post('/jobs')
      .set('authorization', auth.company_token)
      .send({
        title: 'trombone player'
      });
    expect(response.status).toBe(400);
    expect(response.body.error).toHaveProperty('title', 'Bad Request');
  });
});

describe('PATCH /jobs/:id', () => {
  test('successfully patches own job', async () => {
    const response = await request(app)
      .patch('/jobs/6')
      .set('authorization', auth.company_token)
      .send({
        salary: 6
      });
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty(
      'title',
      'well-compensated narcissist'
    );
    expect(response.body).toHaveProperty('salary', 6);
  });
  test('returns 400 bad request', async () => {
    const response = await request(app)
      .patch('/jobs/6')
      .set('authorization', auth.company_token)
      .send({
        foo: 'bar'
      });
    expect(response.status).toBe(400);
    expect(response.body.error).toHaveProperty('title', 'Bad Request');
  });
});

describe('DELETE /jobs/:id', () => {
  test('successfully deletes own job', async () => {
    const response = await request(app)
      .delete(`/jobs/8`)
      .set('authorization', auth.company_token);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: 'Job deleted' });
  });
});

describe('POST/GET /jobs/:id/applications', () => {
  test('successfully adds job application', async () => {
    const response = await request(app)
      .post(`/jobs/9/applications`)
      .set('authorization', auth.token);
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty(
      'message',
      'Application received for job #9'
    );
    const getResponse = await request(app)
      .get(`/jobs/9/applications`)
      .set('authorization', auth.company_token);
    // expect(response.status).toBe(200);
    expect(getResponse.body[0]).toHaveProperty('job_id', 9);
    const getUserResponse = await request(app)
      .get(`/jobs/9/applications`)
      .set('authorization', auth.token);
    // expect(response.status).toBe(200);
    console.log('FIND ME', getUserResponse);
    expect(getUserResponse.body[0]).toHaveProperty('job_id', 9);
  });
});

describe('GET /jobs/:id/applications/:app_id', () => {
  test('see own job', async () => {
    const response = await request(app)
      .post(`/jobs/10/applications`)
      .set('authorization', auth.token);
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty(
      'message',
      'Application received for job #10'
    );
    const userResponse = await request(app)
      .get('/jobs/10/applications/2')
      .set('authorization', auth.token);
    expect(userResponse.status).toBe(200);
    expect(userResponse.body).toHaveProperty('id', 2);
    const companyResponse = await request(app)
      .get('/jobs/10/applications/2')
      .set('authorization', auth.company_token);
    expect(companyResponse.status).toBe(200);
    expect(companyResponse.body).toHaveProperty('id', 2);
    const delResponse = await request(app)
      .delete('/jobs/10/applications/2')
      .set('authorization', auth.token);
    expect(delResponse.status).toBe(200);
    expect(delResponse.body).toHaveProperty('message', 'Application deleted');
  });
});

afterEach(async () => {
  //delete the users and company users
  await db.query('DELETE FROM users');
  await db.query('DELETE FROM companies');
  await db.query('DELETE FROM jobs');
});

afterAll(async () => {
  await db.query('DROP TABLE IF EXISTS jobs_users');
  await db.query('DROP TABLE IF EXISTS jobs');
  await db.query('DROP TABLE IF EXISTS users');
  await db.query('DROP TABLE IF EXISTS companies');
  db.end();
});
