const jwt = require('express-jwt');
const jwksRsa = require('jwks-rsa');

const required = jwt({
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: `https://cognito-idp.${process.env.AWS_REGION}.amazonaws.com/${process.env.AWS_USER_POOL_ID}/.well-known/jwks.json`
  }),

  audience: process.env.AWS_APP_CLIENT_ID,
  issuer: `https://cognito-idp.${process.env.AWS_REGION}.amazonaws.com/${process.env.AWS_USER_POOL_ID}`,
  algorithms: ['RS256']
});

const optional = jwt({
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: `https://cognito-idp.${process.env.AWS_REGION}.amazonaws.com/${process.env.AWS_USER_POOL_ID}/.well-known/jwks.json`
  }),

  audience: process.env.AWS_APP_CLIENT_ID,
  issuer: `https://cognito-idp.${process.env.AWS_REGION}.amazonaws.com/${process.env.AWS_USER_POOL_ID}`,
  algorithms: ['RS256'],

  credentialsRequired: false
});

let auth = {
  required: required,
  optional: optional
};

module.exports = auth