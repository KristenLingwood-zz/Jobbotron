const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const morgan = require('morgan');

const userRoutes = require('./routes/users');
const companyRoutes = require('./routes/companies');
const jobRoutes = require('./routes/jobs');
const authRoutes = require('./routes/authRoutes');
const APIError = require('./APIError');

app.use(bodyParser.json());
app.use(morgan('dev'));

app.use('/users', userRoutes);
app.use('/companies', companyRoutes);
app.use('/jobs', jobRoutes);
app.use('', authRoutes);

app.use((req, res, next) => {
  const err = new Error('Not Found');
  err.status = 404;
  return next(err); // pass the error to the next piece of middleware
});

app.use((error, request, response, next) => {
  // format built-in errors
  if (!(error instanceof APIError)) {
    error = new APIError(500, error.type, error.message);
  }
  console.log(error);

  return response.status(error.status).json(error);
});

module.exports = app;
