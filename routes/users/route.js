const express = require("express");
const routes = express.Router();
const { register, login, getAllUsers, getUserById, updateUser, deleteUser, logout, getMe } = require("./controller");
const isAuth = require("../../middleware/isAuth");
const isAdmin = require("../../middleware/isAdmin");

// Public routes
routes.post("/register", isAdmin, register);

routes.post("/login", login);

routes.post("/logout", logout);

routes.get("/me", isAuth, getMe);

routes.get("/", isAuth, isAdmin, getAllUsers);

routes.get("/:id", isAuth, isAdmin, getUserById);

routes.put("/:id", isAuth, isAdmin, updateUser);

routes.delete("/:id", isAuth, isAdmin, deleteUser);

module.exports = routes; 