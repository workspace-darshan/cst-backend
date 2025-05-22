require("dotenv").config();

exports.dbConfig = {
    url: process.env.MONGODB_URI_LOCAL,
    dbName: "cst",
};

exports.secretKey = process.env.JWT_SECRET