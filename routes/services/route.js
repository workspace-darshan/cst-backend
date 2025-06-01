const express = require("express");
const router = express.Router();
const isAdmin = require("../../middleware/isAdmin");
const isAuth = require("../../middleware/isAuth");
const { createServices, getAllServices, getServiceById, updateService, deleteService } = require("./controller");
const { upload } = require("../../middleware/cloudinary-middleware");
// const { upload, optimizeAndSaveImage } = require("../../middleware/multer-middleware");

// Create a new service (Admin only)
router.post("/", isAuth, isAdmin, ...upload('services').any(), createServices);

// Get all services
router.get("/", getAllServices);

// Get a single service by ID
router.get("/:id", getServiceById);

// Update a service (Admin only)
router.put("/:id", isAuth, isAdmin, ...upload('services').any(), updateService);
// router.put("/:id", isAuth, isAdmin, upload.any(), optimizeAndSaveImage('services'), updateService);

// Delete a service (Admin only)
router.delete("/:id", isAuth, isAdmin, deleteService);

module.exports = router;
