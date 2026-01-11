/**
 * XSRF Token Implementation (CSRF Protection)
 * Sets up CSRF protection using csurf middleware with cookie-based token storage
 */

const bodyParser = require("body-parser");
const csrf = require("csurf");

// CSRF protection with cookie-based token storage
const csrfProtection = csrf({ cookie: true });

// URL-encoded body parser for form submissions
const parseForm = bodyParser.urlencoded({ extended: false });

module.exports = {
    csrfProtection,
    parseForm
};
