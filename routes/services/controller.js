const Service = require("./model");
const { handleError, handleSuccess } = require("../../services/utils");
const { cloudinary } = require("../../middleware/cloudinary-middleware");

// Helper function to delete images from Cloudinary
const deleteCloudinaryImages = async (images) => {
    if (!images) return;
    const imagesToDelete = Array.isArray(images) ? images : [images];

    for (const image of imagesToDelete) {
        if (!image) continue;
        try {
            // Extract public_id from Cloudinary URL or use direct public_id
            let publicId = image;
            if (typeof image === 'string' && image.includes('cloudinary.com')) {
                // Extract public_id from URL: https://res.cloudinary.com/.../uploads/services/123456_abcd.jpg
                const urlParts = image.split('/');
                const filename = urlParts[urlParts.length - 1];
                const folderIndex = urlParts.indexOf('uploads');
                if (folderIndex !== -1) {
                    const pathAfterUploads = urlParts.slice(folderIndex).join('/');
                    publicId = pathAfterUploads.replace(/\.[^/.]+$/, ""); // Remove extension
                }
            }

            await cloudinary.uploader.destroy(publicId);
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
                acc[file.fieldname].push(file.path); // Cloudinary URL
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

// Update service - FIXED VERSION
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
                acc[file.fieldname].push(file.path); // Cloudinary URL
                return acc;
            }, {});

            // Handle main poster image
            if (filesByField['posterImg']?.[0]) {
                await deleteCloudinaryImages(currentService.posterImg);
                updateData.posterImg = filesByField['posterImg'][0];
            }

            // Handle section images - FIXED LOGIC
            const imagesToDelete = [];

            const sectionsWithImages = parsedSections.map((section, idx) => {
                const currentSection = currentService.sections[idx];
                const newImages = filesByField[`sections[${idx}].images`] || [];

                let finalImages = [];

                if (currentSection && currentSection.images && currentSection.images.length > 0) {
                    // If section.images is provided, it means we want to update this section's images
                    if (section.images !== undefined) {
                        // Keep only the images specified in section.images (user's intention)
                        const keepingImages = Array.isArray(section.images) ? section.images : [];

                        // Better URL normalization and comparison
                        const normalizeUrl = (url) => {
                            if (!url || typeof url !== 'string') return '';
                            return url.trim().toLowerCase();
                        };

                        // Create a Set for faster lookup
                        const keepingSet = new Set(keepingImages.map(normalizeUrl));

                        const removedImages = currentSection.images.filter((img) => {
                            const normalizedImg = normalizeUrl(img);
                            return normalizedImg && !keepingSet.has(normalizedImg);
                        });

                        // Collect images to delete
                        if (removedImages.length > 0) {
                            imagesToDelete.push(...removedImages);
                        }

                        // Combine kept images with new uploads
                        finalImages = [...keepingImages.filter(img => img && img.trim()), ...newImages];
                    } else {
                        // If section.images is undefined, preserve existing images and add new ones
                        finalImages = [...currentSection.images, ...newImages];
                    }
                } else {
                    // New section or section without existing images
                    finalImages = [...(section.images || []).filter(img => img && img.trim()), ...newImages];
                }

                return {
                    ...section,
                    images: finalImages
                };
            });

            // Delete all collected images from Cloudinary
            if (imagesToDelete.length > 0) {
                console.log('🗑️ Deleting images from Cloudinary:', imagesToDelete);
                await deleteCloudinaryImages(imagesToDelete);
                console.log('✅ Deleted images from Cloudinary');
            }

            updateData.sections = sectionsWithImages;
        } else {
            // No new files uploaded, just update the sections data
            const imagesToDeleteNoFiles = [];

            const sectionsUpdated = parsedSections.map((section, idx) => {
                const currentSection = currentService.sections[idx];

                // If section.images is explicitly provided, handle image cleanup
                if (section.images !== undefined && currentSection && currentSection.images && currentSection.images.length > 0) {
                    const keepingImages = Array.isArray(section.images) ? section.images : [];

                    // Better URL normalization and comparison for no-file scenario
                    const normalizeUrl = (url) => {
                        if (!url || typeof url !== 'string') return '';
                        return url.trim().toLowerCase();
                    };

                    // Create a Set for faster lookup
                    const keepingSet = new Set(keepingImages.map(normalizeUrl));

                    const removedImages = currentSection.images.filter((img) => {
                        const normalizedImg = normalizeUrl(img);
                        return normalizedImg && !keepingSet.has(normalizedImg);
                    });

                    if (removedImages.length > 0) {
                        imagesToDeleteNoFiles.push(...removedImages);
                    }

                    return {
                        ...section,
                        images: keepingImages.filter(img => img && img.trim())
                    };
                }

                // If section.images is undefined, preserve existing images
                return {
                    ...section,
                    images: currentSection?.images || []
                };
            });

            // Delete all collected images from Cloudinary
            if (imagesToDeleteNoFiles.length > 0) {
                console.log('🗑️ Deleting images from Cloudinary (no-files):', imagesToDeleteNoFiles);
                await deleteCloudinaryImages(imagesToDeleteNoFiles);
                console.log('✅ Deleted images from Cloudinary (no-file scenario)');
            }

            updateData.sections = sectionsUpdated;
        }

        const updatedService = await Service.findByIdAndUpdate(
            serviceId,
            updateData,
            { new: true }
        );

        return handleSuccess(res, updatedService, "Service updated successfully");
    } catch (error) {
        console.error('❌ Error in updateService:', error);
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

        // Clean up all images from Cloudinary
        await deleteCloudinaryImages(service.posterImg);
        for (const section of service.sections) {
            await deleteCloudinaryImages(section.images);
        }

        await Service.findByIdAndDelete(req.params.id);
        return handleSuccess(res, null, "Service deleted successfully");
    } catch (error) {
        return handleError(res, "Error deleting service", 500, error.message);
    }
};