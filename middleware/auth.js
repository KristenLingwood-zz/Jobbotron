const jsonwebtoken = require('jsonwebtoken');

function ensureLoggedIn(req, res, next) {
  try {
    const token = req.headers.authorization;
    const decodedToken = jsonwebtoken.verify(token, 'CONTIGO');
    return next();
  } catch (err) {
    return res.json({ message: 'Unauthorized -- not logged in' });
  }
}

function ensureCompanyAcct(req, res, next) {
  try {
    const token = req.headers.authorization;
    const decodedToken = jsonwebtoken.verify(token, 'CONTIGO');
    if (decodedToken.acctType === 'individual') {
      return res.json({ message: 'Unauthorized -- not a company account' });
    }
    return next();
  } catch (err) {
    return res.json({ message: 'Unauthorized -- not logged in' });
  }
}

function ensureCorrectUser(req, res, next) {
  try {
    const token = req.headers.authorization;
    const decodedToken = jsonwebtoken.verify(token, 'CONTIGO');
    if (decodedToken.acctType === 'company') {
      return res.json({
        message: 'Unauthorized -- not an individual user account'
      });
    }
    if (decodedToken.id === +req.params.id) {
      return next();
    } else return res.json({ message: 'Unauthorized -- incorrect user' });
  } catch (err) {
    return next(err);
  }
}

function ensureCorrectCompany(req, res, next) {
  try {
    const token = req.headers.authorization;
    const decodedToken = jsonwebtoken.verify(token, 'CONTIGO');
    if (decodedToken.acctType === 'individual') {
      return res.json({ message: 'Unauthorized -- not a company account' });
    }
    if (decodedToken.id === +req.params.id) {
      return next();
    } else return res.json({ message: 'Unauthorized -- incorrect company' });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  ensureLoggedIn,
  ensureCorrectUser,
  ensureCorrectCompany,
  ensureCompanyAcct
};
