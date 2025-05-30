const Service = require("./model");
const { handleError, handleSuccess, normalizeImagePath, cleanImagePath, deleteUploadedFile } = require("../../services/utils");

// Helper function to handle image cleanup
const cleanupImages = async (images) => {
    if (!images) return;
    const imagesToDelete = Array.isArray(images) ? images : [images];

    for (const image of imagesToDelete) {
        if (!image) continue;
        try {
            const cleanedPath = cleanImagePath(image);
            if (cleanedPath) {
                await deleteUploadedFile(cleanedPath);
            }
        } catch (error) {
            console.error(`Error deleting image ${image}:`, error);
        }
    }
};

// Create a new service
exports.createServices = async (req, res) => {
    try {
        const { title, description, sections } = req.body;

        // Check existing service
        const existingService = await Service.findOne({ title });
        if (existingService) {
            return handleError(res, "Service with this title already exists", 400);
        }

        // Process sections and files
        let parsedSections = typeof sections === 'string' ? JSON.parse(sections) : sections;
        let serviceData = { title, description, sections: parsedSections };

        if (req.files?.length > 0) {
            const filesByField = req.files.reduce((acc, file) => {
                if (!acc[file.fieldname]) acc[file.fieldname] = [];
                acc[file.fieldname].push(normalizeImagePath(file.path));
                return acc;
            }, {});

            // Handle main poster image
            if (filesByField['posterImg']?.[0]) {
                serviceData.posterImg = filesByField['posterImg'][0];
            }

            // Map section images
            serviceData.sections = parsedSections.map((section, idx) => ({
                ...section,
                images: filesByField[`sections[${idx}].images`] || section.images || []
            }));
        }

        const service = await Service.create(serviceData);
        return handleSuccess(res, service, "Service created successfully", 201);
    } catch (error) {
        return handleError(res, "Error creating service", 500, error.message);
    }
};

// Get all services
exports.getAllServices = async (req, res) => {
    try {
        const services = await Service.find().sort({ createdAt: -1 });
        return handleSuccess(res, services, "Services fetched successfully");
    } catch (error) {
        return handleError(res, "Error fetching services", 500, error.message);
    }
};

// Get service by ID
exports.getServiceById = async (req, res) => {
    try {
        const service = await Service.findById(req.params.id);
        if (!service) return handleError(res, "Service not found", 404);
        return handleSuccess(res, service, "Service fetched successfully");
    } catch (error) {
        return handleError(res, "Error fetching service", 500, error.message);
    }
};

// Update service
exports.updateService = async (req, res) => {
    try {
        const { title, description, sections } = req.body;
        const serviceId = req.params.id;

        // Check existing and current service
        const existingService = await Service.findOne({ title, _id: { $ne: serviceId } });
        if (existingService) {
            return handleError(res, "Service with this title already exists", 400);
        }

        const currentService = await Service.findById(serviceId);
        if (!currentService) {
            return handleError(res, "Service not found", 404);
        }

        // Process sections and new files
        let parsedSections = typeof sections === 'string' ? JSON.parse(sections) : sections;
        let updateData = { title, description };

        if (req.files?.length > 0) {
            const filesByField = req.files.reduce((acc, file) => {
                if (!acc[file.fieldname]) acc[file.fieldname] = [];
                acc[file.fieldname].push(normalizeImagePath(file.path));
                return acc;
            }, {});

            // Handle main poster image
            if (filesByField['posterImg']?.[0]) {
                await cleanupImages(currentService.posterImg);
                updateData.posterImg = filesByField['posterImg'][0];
            }

            // Handle section images
            updateData.sections = parsedSections.map((section, idx) => {
                const currentSection = currentService.sections[idx];
                const newImages = filesByField[`sections[${idx}].images`] || [];

                // If current section exists, handle image cleanup for removed images
                if (currentSection && currentSection.images) {
                    const keepingImages = section.images || [];
                    const removedImages = currentSection.images.filter(img => !keepingImages.includes(img));
                    cleanupImages(removedImages);
                }

                return {
                    ...section,
                    images: [...(section.images || []), ...newImages]
                };
            });
        } else {
            updateData.sections = parsedSections;
        }

        const updatedService = await Service.findByIdAndUpdate(
            serviceId,
            updateData,
            { new: true }
        );

        return handleSuccess(res, updatedService, "Service updated successfully");
    } catch (error) {
        return handleError(res, "Error updating service", 500, error.message);
    }
};

// Delete service
exports.deleteService = async (req, res) => {
    try {
        const service = await Service.findById(req.params.id);
        if (!service) {
            return handleError(res, "Service not found", 404);
        }

        // Clean up all images
        await cleanupImages(service.posterImg);
        for (const section of service.sections) {
            await cleanupImages(section.images);
        }

        await Service.findByIdAndDelete(req.params.id);
        return handleSuccess(res, null, "Service deleted successfully");
    } catch (error) {
        return handleError(res, "Error deleting service", 500, error.message);
    }
};
