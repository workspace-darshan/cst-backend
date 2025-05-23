require("dotenv").config();

exports.dbConfig = {
    url: process.env.MONGODB_URI_LIVE,
    dbName: process.env.DB_Name,
};

exports.secretKey = process.env.JWT_SECRET