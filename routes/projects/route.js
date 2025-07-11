const express = require("express");
const router = express.Router();
const { createProject, getAllProjects, getProjectById, updateProject, deleteProject } = require("./controller");
const isAuth = require("../../middleware/isAuth");
const isAdmin = require("../../middleware/isAdmin");
const { upload } = require("../../middleware/cloudinary-middleware");
// const { upload, optimizeAndSaveImage } = require("../../middleware/multer-middleware");

router.get("/", getAllProjects);
router.get("/:id", getProjectById);

router.post("/", isAuth, isAdmin, ...upload('projects').any(), createProject);

router.put("/:id", isAuth, isAdmin, ...upload('projects').any(), updateProject);
// router.put("/:id", isAuth, isAdmin, upload.any(), optimizeAndSaveImage('projects'), updateProject);

router.delete("/:id", isAuth, isAdmin, deleteProject);

module.exports = router;
