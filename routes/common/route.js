const express = require("express");
const router = express.Router();
const { getCommon } = require("./controller");
const isAuth = require("../../middleware/isAuth");
const isAdmin = require("../../middleware/isAdmin");

router.get("/", isAuth, isAdmin, getCommon);

module.exports = router;
