const Service = require("./model");
const { handleError, handleSuccess, normalizeImagePath, cleanImagePath, deleteUploadedFile, parseJSON } = require("../../services/utils");

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
        let parsedSections = typeof sections === 'string' ? JSON.parse(sections) : sections;
        let serviceData = {
            title,
            description,
            sections: parsedSections
        };

        // Process uploaded files and map them to sections
        if (req.files && req.files.length > 0) {
            // Group files by fieldname
            const filesByField = {};
            req.files.forEach(file => {
                if (!filesByField[file.fieldname]) {
                    filesByField[file.fieldname] = [];
                }
                filesByField[file.fieldname].push(normalizeImagePath(file.path));
            });

            // Handle main posterImg
            if (filesByField['posterImg'] && filesByField['posterImg'].length > 0) {
                serviceData.posterImg = filesByField['posterImg'][0];
            }

            // Map files to sections
            serviceData.sections = parsedSections.map((section, sectionIndex) => {
                const updatedSection = { ...section };

                // Handle section images
                const imagesFieldName = `sections[${sectionIndex}].images`;
                if (filesByField[imagesFieldName] && filesByField[imagesFieldName].length > 0) {
                    updatedSection.images = filesByField[imagesFieldName];
                }

                return updatedSection;
            });
        }

        const service = new Service(serviceData);

        await service.save();
        return handleSuccess(res, service, "service created successfully", 201);
    } catch (error) {
        console.error(error);
        return handleError(res, "Error creating service", 500, error.message);
    }
};

// Get all services
exports.getAllServices = async (req, res) => {
    try {
        const services = await Service.find().sort({ createdAt: -1 });
        return handleSuccess(res, services, "services fetched successfully");
    } catch (error) {
        return handleError(res, "Error fetching services", 500, err.message);
    }
};

// Get a single service by ID
exports.getServiceById = async (req, res) => {
    try {
        const service = await Service.findById(req.params.id);
        if (!service) {
            return handleError(res, "Service not found", 404);
        }
        return handleSuccess(res, service, "service fetched successfully");
    } catch (error) {
        return handleError(res, "Error fetching service", 500, err.message);
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
            return handleError(res, "Service with this title already exists", 400);
        }

        // Parse sections if it's sent as a string
        let parsedSections = typeof sections === 'string' ? JSON.parse(sections) : sections;

        const service = await Service.findById(serviceId);
        if (!service) {
            return handleError(res, "Service not found", 404);
        }

        // Process uploaded files and map them to sections
        if (req.files && req.files.length > 0) {
            // Group files by fieldname
            const filesByField = {};
            req.files.forEach(file => {
                if (!filesByField[file.fieldname]) {
                    filesByField[file.fieldname] = [];
                }
                filesByField[file.fieldname].push(normalizeImagePath(file.path));
            });            // Handle main posterImg
            if (filesByField['posterImg'] && filesByField['posterImg'].length > 0) {
                // If there's an existing poster image, it will be handled in the image deletion section below
                service.posterImg = filesByField['posterImg'][0];
            }

            // Map files to sections
            parsedSections = parsedSections.map((section, sectionIndex) => {
                const updatedSection = { ...section };

                // Handle section images - merge with existing if any
                const imagesFieldName = `sections[${sectionIndex}].images`;
                if (filesByField[imagesFieldName] && filesByField[imagesFieldName].length > 0) {
                    // If section already has images, append new ones, otherwise use new ones
                    const existingImages = updatedSection.images || [];
                    updatedSection.images = [...existingImages, ...filesByField[imagesFieldName]];
                }

                return updatedSection;
            });
        }        // Handle image deletion for sections that were updated
        const serviceWithSections = await Service.findById(serviceId);
        if (serviceWithSections) {
            // Handle main poster image deletion if changed
            if (serviceWithSections.posterImg && serviceWithSections.posterImg !== service.posterImg) {
                try {
                    const cleanedPath = cleanImagePath(serviceWithSections.posterImg);
                    if (cleanedPath) {
                        await deleteUploadedFile(cleanedPath);
                    }
                } catch (error) {
                    console.error(`Error deleting main poster image ${serviceWithSections.posterImg}:`, error);
                }
            }

            // Handle sections
            for (const oldSection of serviceWithSections.sections) {
                const updatedSection = parsedSections.find(s => s._id?.toString() === oldSection._id?.toString());

                // Handle section deletion
                if (!updatedSection) {
                    // Section was removed, delete all its images

                    if (oldSection.images && oldSection.images.length > 0) {
                        for (const image of oldSection.images) {
                            try {
                                const cleanedPath = cleanImagePath(image);
                                if (cleanedPath) {
                                    await deleteUploadedFile(cleanedPath);
                                }
                            } catch (error) {
                                console.error(`Error deleting image ${image}:`, error);
                            }
                        }
                    }
                } else {
                    // Handle poster image changes
                    if (oldSection.posterImg && oldSection.posterImg !== updatedSection.posterImg) {
                        try {
                            const cleanedPath = cleanImagePath(oldSection.posterImg);
                            if (cleanedPath) {
                                await deleteUploadedFile(cleanedPath);
                            }
                        } catch (error) {
                            console.error(`Error deleting old poster image ${oldSection.posterImg}:`, error);
                        }
                    }

                    // Handle gallery images changes
                    if (oldSection.images && oldSection.images.length > 0) {
                        const updatedImages = new Set(updatedSection.images || []);
                        for (const image of oldSection.images) {
                            if (!updatedImages.has(image)) {
                                try {
                                    const cleanedPath = cleanImagePath(image);
                                    if (cleanedPath) {
                                        await deleteUploadedFile(cleanedPath);
                                    }
                                } catch (error) {
                                    console.error(`Error deleting image ${image}:`, error);
                                }
                            }
                        }
                    }
                }
            }
        }

        const updatedService = await Service.findByIdAndUpdate(
            serviceId,
            {
                title,
                description,
                sections: parsedSections,
            },
            { new: true }
        );
        return handleSuccess(res, updatedService, "Service updated successfully");
    } catch (error) {
        return handleError(res, "Error updating Service", 500, error.message);
    }
};

// Delete a service (Admin only)
exports.deleteService = async (req, res) => {
    try {
        const service = await Service.findById(req.params.id);
        if (!service) {
            return handleError(res, "Service not found", 404);
        } const deletionResults = [];

        // Delete main poster image if exists
        if (service.posterImg) {
            const cleanedPath = cleanImagePath(service.posterImg);
            if (cleanedPath) {
                const deleted = await deleteUploadedFile(cleanedPath);
                deletionResults.push({
                    image: service.posterImg,
                    path: cleanedPath,
                    deleted,
                    type: 'main-poster'
                });
            }
        }

        // Delete images from each section
        for (const section of service.sections) {

            // Delete gallery images if they exist
            if (section.images && section.images.length > 0) {
                for (const image of section.images) {
                    if (image) {
                        const cleanedPath = cleanImagePath(image);
                        if (cleanedPath) {
                            const deleted = await deleteUploadedFile(cleanedPath);
                            deletionResults.push({
                                image,
                                path: cleanedPath,
                                deleted,
                                type: 'gallery'
                            });
                        }
                    }
                }
            }
        }

        await Service.findByIdAndDelete(req.params.id);
        return handleSuccess(res, {
            deletedImages: deletionResults
        }, "Service deleted successfully");
    } catch (error) {
        return handleError(res, "Error deleting service", 500, error.message);
    }
};
