const jsonwebtoken = require('jsonwebtoken');

function ensureLoggedIn(req, res, next) {
  try {
    const token = req.headers.authorization;
    const decodedToken = jsonwebtoken.verify(token, 'CONTIGO');
    return next();
  } catch (err) {
    return res.status(401).json({ message: 'Unauthorized -- not logged in' });
  }
}

function ensureCompanyAcct(req, res, next) {
  try {
    const token = req.headers.authorization;
    const decodedToken = jsonwebtoken.verify(token, 'CONTIGO');
    if (decodedToken.acctType === 'individual') {
      return res
        .status(403)
        .json({ message: 'Unauthorized -- not a company account' });
    }
    return next();
  } catch (err) {
    return res.status(401).json({ message: 'Unauthorized -- not logged in' });
  }
}

function ensureCorrectUser(req, res, next) {
  try {
    const token = req.headers.authorization;
    const decodedToken = jsonwebtoken.verify(token, 'CONTIGO');
    if (decodedToken.acctType === 'company') {
      return res.status(403).json({
        message: 'Unauthorized -- not an individual user account'
      });
    }
    if (decodedToken.username === req.params.username) {
      return next();
    } else {
      console.log(
        'decoded username:',
        decodedToken.username,
        'params username:',
        req.params.username
      );
      return res
        .status(403)
        .json({ message: 'Unauthorized -- incorrect user' });
    }
  } catch (err) {
    console.log(err);
    return next(err);
  }
}

function ensureCorrectCompany(req, res, next) {
  try {
    const token = req.headers.authorization;
    const decodedToken = jsonwebtoken.verify(token, 'CONTIGO');
    if (decodedToken.acctType === 'individual') {
      return res
        .status(403)
        .json({ message: 'Unauthorized -- not a company account' });
    }
    if (decodedToken.handle === req.params.handle) {
      return next();
    } else
      return res
        .status(403)
        .json({ message: 'Unauthorized -- incorrect company' });
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
