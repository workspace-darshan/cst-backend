const jwt = require('jsonwebtoken');
require('dotenv').config();
const UserModel = require("../routes/users/model");
const { secretKey } = require("../config/constant");
const { handleError } = require('../services/utils');

const isAuth = async (req, res, next) => {
    // for cookie
    // const token = req.cookies?.token;

    // for localstorage
    const token = req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.split(' ')[1]
        : null;
    if (!token) {
        return handleError(res, "Authentication token is missing", 401);
    }
    try {
        const decoded = jwt.verify(token, secretKey);
        const user = await UserModel.findById(decoded?.userId)
        if (!user) {
            return handleError(res, "User no longer exists", 401);
        }
        req.user = decoded;
        next();
    } catch (error) {
        let message = "Invalid token";
        if (error.name === "TokenExpiredError") {
            message = "Token has expired";
        } else if (error.name === "JsonWebTokenError") {
            message = "Malformed token";
        }

        return handleError(res, message, 401);
    }
};

module.exports = isAuth;
