const mongoose = require("mongoose");
const { dbConfig } = require("./constant");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(dbConfig?.url, {
      dbName: dbConfig?.dbName,
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`✅ MongoDB Connected to dbName: ${dbConfig?.dbName}`);
    return conn;
  } catch (error) {
    console.error(`❌ Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
