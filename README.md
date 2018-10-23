Jobbotron is a Node.js backend for a Linked In/Angel List clone.

## To run locally:

1. Fork/clone the repository
2. cd into repo's folder
3. `npm install`
4. `psql < schema.sql`
5. `nodemon server.js` or `node server.js`

## Endpoints

### /users

GET: returns a list of all users

POST: creates a new user

### /users/:id

GET: returns a single user info by its id

PATCH: updates existing user by id and returns updated user info

DELETE: removes an existing user and returns the deleted user

user object (JSON):

```
{
"id": 1,
"first_name": "Michael",
"last_name": "Hueter",
"email": "michael@rithmschool.com",
"photo": "https://avatars0.githubusercontent.com/u/13444851?s=460&v=4",
"company_id": 1, // MANY-TO-ONE with Companies
"jobs": [2, 3] // MANY-TO-MANY with Jobs
}
```

### /companies

GET: returns a list of all companies

POST: creates a new company

### /companies/:id

GET: returns a single company info by its id

PATCH: updates existing company by id and returns updated company info

DELETE: removes an existing company and returns the deleted company

company object (JSON):

```
{
  "id": 1,
  "name": "Rithm School",
  "logo":
    "https://avatars3.githubusercontent.com/u/2553776?s=400&u=18c328dafb508c5189bda56889b03b8b722d5f22&v=4",
  "users": [1, 2], // array of user IDs who work there. ONE-TO-MANY with Users
  "jobs": [2, 3] // array of job IDs listed by the company. ONE-TO-MANY with Jobs
}
```

### /jobs

GET: returns a list of all jobs
POST: creates a new job

### /jobs/:id

GET: returns a single job info by its id

PATCH: updates existing job by id and returns updated job info

DELETE: removes an existing job and returns the deleted job

job object (JSON):

```
{
    "title": "Software Engineer",
    "salary": "100000",
    "equity": 4.5,
    "company_id": 1
}
```
