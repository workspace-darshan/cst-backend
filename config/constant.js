require("dotenv").config();

exports.dbConfig = {
    url: process.env.MONGODB_URI_LOCAL,
    dbName: process.env.DB_NAME,
};

exports.secretKey = process.env.JWT_SECRET