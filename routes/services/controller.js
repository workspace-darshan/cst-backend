const Service = require("./model");
const fs = require("fs");
const { normalizeImagePath } = require("../../services/utils");

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
        const parsedSections = typeof sections === 'string' ? JSON.parse(sections) : sections;

        const service = await Service.findById(serviceId);
        if (!service) {
            return res.status(404).json({ message: "Service not found" });
        }

        // Handle new images
        let images = service.images;
        if (req.files && req.files.length > 0) {
            // Delete old images
            service.images.forEach(imagePath => {
                const fullPath = imagePath.replace("/uploads/", "");
                if (fs.existsSync(fullPath)) {
                    fs.unlinkSync(fullPath);
                }
            });
            // Add new images
            images = req.files.map(file => normalizeImagePath(file.path));
        }

        const updatedService = await Service.findByIdAndUpdate(
            serviceId,
            {
                title,
                description,
                sections: parsedSections,
                images,
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
        }

        // Delete associated images
        service.images.forEach(imagePath => {
            const fullPath = imagePath.replace("/uploads/", "");
            if (fs.existsSync(fullPath)) {
                fs.unlinkSync(fullPath);
            }
        });

        await Service.findByIdAndDelete(req.params.id);
        res.json({ message: "Service deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error deleting service", error: error.message });
    }
};
