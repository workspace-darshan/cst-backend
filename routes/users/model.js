require('dotenv').config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  try {
    if (this.isModified("password") && this.password) {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    }
    next();
  } catch (error) {
    console.error("Error in pre-save hook:", error);
    next(error);
  }
});

userSchema.pre('findOneAndUpdate', function (next) {
  var user = this;
  if (user._update.password) {
    bcrypt.genSalt(10, function (err, salt) {
      if (err) {
        return next(err);
      }
      bcrypt.hash(user._update.password, salt, function (err, hash) {
        if (err) {
          return next(err);
        }
        user._update.password = hash;
        next();
      });
    });
  } else {
    return next();
  }
});

userSchema.methods.generateToken = async function () {
  try {
    return jwt.sign(
      {
        userId: this._id.toString(),
        email: this.email,
        isAdmin: this.isAdmin
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "30d",
      }
    )

  } catch (error) {
    console.error("Token generation error:", error);
  }
}

userSchema.methods.comparePassword = function (passw) {
  return bcrypt.compare(passw, this.password);
};

module.exports = mongoose.model("User", userSchema);