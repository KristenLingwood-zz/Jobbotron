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
// TODO:BONUS: if I build a frontend there's something else I have to do with bodyParser; check W6-FRI notes
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

/* 
  error handler - for a handler with four parameters, 
  the first is assumed to be an error passed by another
  handler's "next"
 */
// app.use((err, req, res, next) => {
//   res.status(err.status || 500);
//   console.log(err);
//   return res.json({
//     message: err.message,
//     /*
//      if we're in development mode, include stack trace (full error object)
//      otherwise, it's an empty object so the user doesn't see all of that
//     */
//     error: app.get('env') === 'development' ? err : {}
//   });
// });

//from Michael 7/12 lecture:
app.use((error, request, response, next) => {
  // format built-in errors
  if (!(error instanceof APIError)) {
    error = new APIError(500, error.type, error.message);
  }
  console.log(error);
  // log the error stack if we're in development

  console.error(error.stack); //eslint-disable-line no-console

  return response.status(error.status).json(error);
});

module.exports = app;
