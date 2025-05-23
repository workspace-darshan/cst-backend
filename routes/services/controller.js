const Service = require("./model");
const fs = require("fs");
const { normalizeImagePath, cleanImagePath, deleteUploadedFile, parseJSON } = require("../../services/utils");

// Create a new service (Admin only)
exports.createServices = async (req, res) => {
    try {
        const { title, description, sections } = req.body;

        // Check if service with same title already exists
        const existingService = await Service.findOne({ title });
        if (existingService) {
            return res.status(400).json({ message: "Service with this title already exists" });
        }

        // Parse sections if it's sent as a string
        const parsedSections = typeof sections === 'string' ? JSON.parse(sections) : sections;

        const images = req.files ? req.files.map(file => normalizeImagePath(file.path)) : [];

        const service = new Service({
            title,
            description,
            sections: parsedSections,
            images
        });

        await service.save();
        res.status(201).json(service);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error creating service", error: error.message });
    }
};

// Get all services
exports.getAllServices = async (req, res) => {
    try {
        const services = await Service.find().sort({ createdAt: -1 });
        res.json(services);
    } catch (error) {
        res.status(500).json({ message: "Error fetching services", error: error.message });
    }
};

// Get a single service by ID
exports.getServiceById = async (req, res) => {
    try {
        const service = await Service.findById(req.params.id);
        if (!service) {
            return res.status(404).json({ message: "Service not found" });
        }
        res.json(service);
    } catch (error) {
        res.status(500).json({ message: "Error fetching service", error: error.message });
    }
};

// Update a service (Admin only)
exports.updateService = async (req, res) => {
    try {
        const { title, description, sections } = req.body;
        const serviceId = req.params.id;

        // Check if service with same title already exists (excluding current service)
        const existingService = await Service.findOne({
            title,
            _id: { $ne: serviceId }
        });
        if (existingService) {
            return res.status(400).json({ message: "Service with this title already exists" });
        }

        // Parse sections if it's sent as a string
        const parsedSections = typeof sections === 'string' ? JSON.parse(sections) : sections; const service = await Service.findById(serviceId);
        if (!service) {
            return res.status(404).json({ message: "Service not found" });
        }        // Handle Images (existing + newly uploaded)
        let retainedImages = [];
        try {
            const retained = req.body.images;
            if (retained) {
                retainedImages = parseJSON(retained, []);
                // Clean and normalize the retained image paths
                retainedImages = retainedImages
                    .map(img => cleanImagePath(img))
                    .filter(Boolean)
                    .map(img => img.startsWith('uploads/') ? img : `uploads/${img}`);
            }
        } catch (e) {
            console.warn("Invalid images field:", e);
        }

        // Add newly uploaded images
        const newImages = (req.files || [])
            .map(f => normalizeImagePath(f.path))
            .map(cleanImagePath)
            .filter(Boolean);

        // Combine retained and new images
        const updatedImages = [...retainedImages, ...newImages];

        // Find images to delete (existing images not in retained list)
        const existingImagePaths = service.images
            .map(img => cleanImagePath(img))
            .filter(Boolean)
            .map(img => img.startsWith('uploads/') ? img : `uploads/${img}`);

        const retainedImagePaths = new Set(retainedImages);

        const imagesToDelete = existingImagePaths.filter(existingImg => !retainedImagePaths.has(existingImg));
        for (const imageToDelete of imagesToDelete) {
            try {
                const deleted = await deleteUploadedFile(imageToDelete);
                if (deleted) {
                    console.log(`Successfully deleted image: ${imageToDelete}`);
                } else {
                    console.warn(`Failed to delete image: ${imageToDelete}`);
                }
            } catch (error) {
                console.error(`Error deleting image ${imageToDelete}:`, error);
            }
        } const updatedService = await Service.findByIdAndUpdate(
            serviceId,
            {
                title,
                description,
                sections: parsedSections,
                images: updatedImages,
            },
            { new: true }
        );

        res.json(updatedService);
    } catch (error) {
        res.status(500).json({ message: "Error updating service", error: error.message });
    }
};

// Delete a service (Admin only)
exports.deleteService = async (req, res) => {
    try {
        const service = await Service.findById(req.params.id);
        if (!service) {
            return res.status(404).json({ message: "Service not found" });
        }        // Delete associated images
        const deletionResults = [];
        for (const image of service.images) {
            if (image) {
                const cleanedPath = cleanImagePath(image);
                if (cleanedPath) {
                    const deleted = await deleteUploadedFile(cleanedPath);
                    deletionResults.push({
                        image,
                        path: cleanedPath,
                        deleted
                    });
                }
            }
        }

        await Service.findByIdAndDelete(req.params.id);
        res.json({
            message: "Service deleted successfully",
            deletedImages: deletionResults
        });
    } catch (error) {
        res.status(500).json({ message: "Error deleting service", error: error.message });
    }
};
