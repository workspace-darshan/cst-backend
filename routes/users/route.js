const express = require("express");
const routes = express.Router();
const { register, login, getAllUsers, getUserById, updateUser, deleteUser, logout, getMe } = require("./controller");
const isAuth = require("../../middleware/isAuth");

// Public routes
routes.post("/register", register);

routes.post("/login", login);

routes.post("/logout", logout);

routes.get("/me", isAuth, getMe);

routes.get("/", isAuth, getAllUsers);

routes.get("/:id", isAuth, getUserById);

routes.put("/:id", isAuth, updateUser);

routes.delete("/:id", isAuth, deleteUser);

module.exports = routes; 