const express = require("express");
const router = express.Router();
const { createProject, getAllProjects, getProjectById, updateProject, deleteProject } = require("./controller");
const isAuth = require("../../middleware/isAuth");
const isAdmin = require("../../middleware/isAdmin");
const { optimizeImage } = require("../../middleware/multer-middleware");
const upload = require("../../middleware/multer-middleware").upload;

// Public routes
router.get("/", getAllProjects);
router.get("/:id", getProjectById);

router.post("/", isAuth, isAdmin, upload('projects').any(), optimizeImage, createProject);

router.put("/:id", isAuth, isAdmin, upload('projects').any(), optimizeImage, updateProject);

router.delete("/:id", isAuth, isAdmin, deleteProject);

module.exports = router;
