//extend built in error class

class APIError extends Error {
  constructor(
    status = 500,
    title = 'Internal Server Error',
    message = 'Something bad happened.'
  ) {
    super(message); //call parent class constructor (error) with message
    this.status = status;
    this.title = title;
    this.message = message;
    Error.captureStackTrace(this); //include normal error stacktrace for API errors
  }
  toJSON() {
    return {
      error: {
        status: this.status,
        title: this.title,
        message: this.message
      }
    };
  }
}

//anytime you want an error, create a new instance of APIError and pass it into next
// next(new APIError(401, 'unauthorized', 'You must auth first.'));

module.exports = APIError;

//need to require APIError wherever you use it
// const APIError = require('./APIError')
