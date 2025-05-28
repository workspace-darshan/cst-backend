const express = require("express");
const router = express.Router();
const { createContact, getContacts, getContactById } = require("./controller");
const isAuth = require("../../middleware/isAuth");

// Public routes
router.post("/", createContact);

router.get("/", isAuth, getContacts);

router.get("/:id", isAuth, getContactById);

module.exports = router;