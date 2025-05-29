const Service = require("./model");
const {
    parseJSON,
    handleSuccess,
    handleError,
    deleteUploadedFile,
    extractRelativeFilePath,
    cleanImagePath,
    normalizeImagePath
} = require("../../services/utils");

// Create a new service
const createServices = async (req, res) => {
    try {
        const { title, description, sections } = req.body;

        // Check if service with same title already exists
        const existingService = await Service.findOne({ title });
        if (existingService) {
            return handleError(res, "Service with this title already exists", 400);
        }

        // Parse sections if it's a string
        let parsedSections = parseJSON(sections, []);

        // Handle uploaded files
        const uploadedFiles = req.files || [];

        // Find poster image
        const posterFile = uploadedFiles.find(file => file.fieldname === 'posterImg');
        let posterImg = null;
        if (posterFile) {
            posterImg = cleanImagePath(posterFile.path);
        }

        // Process sections and assign images
        if (parsedSections && parsedSections.length > 0) {
            parsedSections = parsedSections.map((section, sectionIndex) => {
                // Find images for this section
                const sectionImages = uploadedFiles.filter(file =>
                    file.fieldname === `sections[${sectionIndex}][images]`
                );

                return {
                    heading: section.heading,
                    description: section.description || '',
                    points: parseJSON(section.points, []),
                    images: sectionImages.map(img => cleanImagePath(img.path))
                };
            });
        }

        // Create new service
        const newService = new Service({
            title,
            description,
            posterImg,
            sections: parsedSections
        });

        await newService.save();

        return handleSuccess(res, newService, "Service created successfully", 201);

    } catch (error) {
        console.error("Error creating service:", error);
        return handleError(res, "Failed to create service", 500);
    }
};

// Get all services
const getAllServices = async (req, res) => {
    try {
        const { page = 1, limit = 10, search } = req.query;
        const skip = (page - 1) * limit;

        // Build search query
        let query = {};
        if (search) {
            query = {
                $or: [
                    { title: { $regex: search, $options: 'i' } },
                    { description: { $regex: search, $options: 'i' } }
                ]
            };
        }

        // Get services with pagination
        const services = await Service.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        // Get total count for pagination
        const totalServices = await Service.countDocuments(query);
        const totalPages = Math.ceil(totalServices / limit);

        // Normalize image paths
        const normalizedServices = services.map(service => ({
            ...service.toObject(),
            posterImg: service.posterImg ? normalizeImagePath(service.posterImg) : null,
            sections: service.sections.map(section => ({
                ...section,
                images: section.images.map(img => normalizeImagePath(img))
            }))
        }));

        return handleSuccess(res, {
            services: normalizedServices,
            pagination: {
                currentPage: parseInt(page),
                totalPages,
                totalServices,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            }
        }, "Services retrieved successfully");

    } catch (error) {
        console.error("Error fetching services:", error);
        return handleError(res, "Failed to fetch services", 500);
    }
};

// Get service by ID
const getServiceById = async (req, res) => {
    try {
        const { id } = req.params;

        const service = await Service.findById(id);

        if (!service) {
            return handleError(res, "Service not found", 404);
        }

        // Normalize image paths
        const normalizedService = {
            ...service.toObject(),
            posterImg: service.posterImg ? normalizeImagePath(service.posterImg) : null,
            sections: service.sections.map(section => ({
                ...section,
                images: section.images.map(img => normalizeImagePath(img))
            }))
        };

        return handleSuccess(res, normalizedService, "Service retrieved successfully");

    } catch (error) {
        console.error("Error fetching service:", error);
        return handleError(res, "Failed to fetch service", 500);
    }
};

// Update service
const updateService = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, sections, removedImages } = req.body;

        // Find existing service
        const existingService = await Service.findById(id);
        if (!existingService) {
            return handleError(res, "Service not found", 404);
        }

        // Check if title is being changed and if new title already exists
        if (title && title !== existingService.title) {
            const titleExists = await Service.findOne({ title, _id: { $ne: id } });
            if (titleExists) {
                return handleError(res, "Service with this title already exists", 400);
            }
        }

        // Handle removed images
        const imagesToDelete = parseJSON(removedImages, []);
        for (const imagePath of imagesToDelete) {
            const relativePath = extractRelativeFilePath(imagePath);
            if (relativePath) {
                await deleteUploadedFile(relativePath);
            }
        }

        // Handle uploaded files
        const uploadedFiles = req.files || [];

        // Handle poster image update
        let posterImg = existingService.posterImg;
        const posterFile = uploadedFiles.find(file => file.fieldname === 'posterImg');
        if (posterFile) {
            // Delete old poster image if exists
            if (existingService.posterImg) {
                const oldPosterPath = extractRelativeFilePath(existingService.posterImg);
                if (oldPosterPath) {
                    await deleteUploadedFile(oldPosterPath);
                }
            }
            posterImg = cleanImagePath(posterFile.path);
        }

        // Process sections
        let updatedSections = existingService.sections;
        if (sections) {
            let parsedSections = parseJSON(sections, []);

            if (parsedSections && parsedSections.length > 0) {
                updatedSections = parsedSections.map((section, sectionIndex) => {
                    // Get existing section images
                    let existingImages = [];
                    if (existingService.sections[sectionIndex]) {
                        existingImages = existingService.sections[sectionIndex].images || [];
                    }

                    // Find new images for this section
                    const newSectionImages = uploadedFiles.filter(file =>
                        file.fieldname === `sections[${sectionIndex}][images]`
                    );

                    // Keep existing images that weren't removed
                    const keptImages = existingImages.filter(img =>
                        !imagesToDelete.includes(img) &&
                        !imagesToDelete.includes(normalizeImagePath(img))
                    );

                    // Add new images
                    const newImages = newSectionImages.map(img => cleanImagePath(img.path));

                    return {
                        heading: section.heading,
                        description: section.description || '',
                        points: parseJSON(section.points, []),
                        images: [...keptImages, ...newImages]
                    };
                });
            }
        }

        // Update service
        const updateData = {
            title: title || existingService.title,
            description: description || existingService.description,
            posterImg,
            sections: updatedSections
        };

        const updatedService = await Service.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        );

        // Normalize image paths for response
        const normalizedService = {
            ...updatedService.toObject(),
            posterImg: updatedService.posterImg ? normalizeImagePath(updatedService.posterImg) : null,
            sections: updatedService.sections.map(section => ({
                ...section,
                images: section.images.map(img => normalizeImagePath(img))
            }))
        };

        return handleSuccess(res, normalizedService, "Service updated successfully");

    } catch (error) {
        console.error("Error updating service:", error);
        return handleError(res, "Failed to update service", 500);
    }
};

// Delete service
const deleteService = async (req, res) => {
    try {
        const { id } = req.params;

        // Find service to get image paths before deletion
        const service = await Service.findById(id);
        if (!service) {
            return handleError(res, "Service not found", 404);
        }

        // Collect all image paths to delete
        const imagesToDelete = [];

        // Add poster image
        if (service.posterImg) {
            imagesToDelete.push(service.posterImg);
        }

        // Add section images
        service.sections.forEach(section => {
            if (section.images && section.images.length > 0) {
                imagesToDelete.push(...section.images);
            }
        });

        // Delete all associated images
        for (const imagePath of imagesToDelete) {
            const relativePath = extractRelativeFilePath(imagePath);
            if (relativePath) {
                await deleteUploadedFile(relativePath);
            }
        }

        // Delete service from database
        await Service.findByIdAndDelete(id);

        return handleSuccess(res, null, "Service deleted successfully");

    } catch (error) {
        console.error("Error deleting service:", error);
        return handleError(res, "Failed to delete service", 500);
    }
};

module.exports = {
    createServices,
    getAllServices,
    getServiceById,
    updateService,
    deleteService
};