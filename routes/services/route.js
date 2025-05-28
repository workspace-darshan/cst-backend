const express = require("express");
const router = express.Router();
const isAdmin = require("../../middleware/isAdmin");
const isAuth = require("../../middleware/isAuth");
const upload = require("../../middleware/multer-middleware").upload;
const { createServices, getAllServices, getServiceById, updateService, deleteService } = require("./controller");
const { optimizeImage } = require("../../middleware/multer-middleware");

// Create a new service (Admin only)
router.post("/", isAuth, isAdmin, upload("services").any(), optimizeImage, createServices);

// Get all services
router.get("/", getAllServices);

// Get a single service by ID
router.get("/:id", getServiceById);

// Update a service (Admin only)
router.put("/:id", isAuth, isAdmin, upload("services").any(), optimizeImage, updateService);

// Delete a service (Admin only)
router.delete("/:id", isAuth, isAdmin, deleteService);

module.exports = router;
