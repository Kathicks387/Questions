const config = require('config');
const { request } = require('express');
const jwt = require('jsonwebtoken');


module.exports = (req, res, next) => {
    const token = req.header('authentication-token');
    const decoded = jwt.verify(token, config.get('jsonWebTokenSecret'));
    console.log(decoded);
    request.user = decoded.user;
    next();
}