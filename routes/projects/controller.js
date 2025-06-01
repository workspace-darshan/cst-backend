const { handleError, handleSuccess, normalizeImagePath, parseJSON, cleanImagePath, deleteUploadedFile } = require("../../services/utils");
const ProjectModel = require("./model");

exports.createProject = async (req, res) => {
    try {
        const { client, projectTitle, description } = req.body;

        const files = req.files || [];
        const posterFile = files.find(f => f.fieldname === 'posterImg');
        const imageFiles = files.filter(f => f.fieldname === 'images');

        const project = new ProjectModel({
            client,
            projectTitle,
            description,
            posterImg: posterFile ? posterFile.path : undefined, // Cloudinary URL
            images: imageFiles.filter(f => f.path).map(f => f.path) // Cloudinary URLs
        });

        await project.save();
        return handleSuccess(res, project, "Project created successfully", 201);
    } catch (err) {
        console.error(err);
        return handleError(res, "Error creating project", 500, err.message);
    }
};

// Get all projects
exports.getAllProjects = async (req, res) => {
    try {
        const projects = await ProjectModel.find()
            .sort({ createdAt: -1 });
        return handleSuccess(res, projects, "Projects fetched successfully");
    } catch (err) {
        console.error(err);
        return handleError(res, "Error fetching projects", 500, err.message);
    }
};

// Get project by ID
exports.getProjectById = async (req, res) => {
    try {
        const project = await ProjectModel.findById(req.params.id);
        if (!project) {
            return handleError(res, "Project not found", 404);
        }
        return handleSuccess(res, project, "Project fetched successfully");
    } catch (err) {
        console.error(err);
        return handleError(res, "Error fetching project", 500, err.message);
    }
};

// Update project
exports.updateProject = async (req, res) => {
    try {
        const { client, projectTitle, description } = req.body;

        // Get existing project first
        const existingProject = await ProjectModel.findById(req.params.id);
        if (!existingProject) {
            return handleError(res, "Project not found", 404);
        }

        // Only check for duplicate title if the title is actually changing
        if (projectTitle && projectTitle !== existingProject.projectTitle) {
            const existingProjectName = await ProjectModel.findOne({
                projectTitle: { $regex: new RegExp(`^${projectTitle.trim()}$`, 'i') }, // Case-insensitive exact match
                _id: { $ne: req.params.id }
            });

            if (existingProjectName) {
                return handleError(res, "Project with this title already exists", 400);
            }
        }

        const updateData = {
            client,
            projectTitle,
            description
        };

        // Handle poster image
        const files = req.files || [];
        const posterFile = files.find(f => f.fieldname === 'posterImg');
        const retainedPoster = req.body.posterImg;

        // If there's a new poster file, use it
        if (posterFile) {
            updateData.posterImg = posterFile.path; // Cloudinary URL

            // Delete old poster from Cloudinary if it exists
            if (existingProject.posterImg) {
                try {
                    const deleted = await deleteCloudinaryImage(existingProject.posterImg);
                    if (deleted) {
                        console.log(`Successfully deleted old poster from Cloudinary`);
                    } else {
                        console.warn(`Failed to delete old poster from Cloudinary`);
                    }
                } catch (error) {
                    console.error(`Error deleting old poster image: ${error}`);
                }
            }
        }
        // If poster is explicitly set in the body, use it
        else if (retainedPoster !== undefined) {
            // If retainedPoster is empty/null and there was an old poster, delete the old one
            if (!retainedPoster && existingProject.posterImg) {
                try {
                    const deleted = await deleteCloudinaryImage(existingProject.posterImg);
                    if (deleted) {
                        console.log(`Successfully deleted old poster from Cloudinary`);
                    }
                } catch (error) {
                    console.error(`Error deleting old poster image: ${error}`);
                }
            }
            updateData.posterImg = retainedPoster || null;
        }
        // If no new poster file and retainedPoster is undefined, keep existing poster
        else {
            updateData.posterImg = existingProject.posterImg;
        }

        // Handle gallery Images (existing + newly uploaded)
        let retainedImages = [];
        try {
            const retained = req.body.images;
            if (retained) {
                retainedImages = parseJSON(retained, []);
                // For Cloudinary, we store full URLs, so no need to clean paths
                retainedImages = retainedImages.filter(Boolean);
            }
        } catch (e) {
            console.warn("Invalid images field:", e);
        }

        // Add newly uploaded images (Cloudinary URLs)
        const newImages = files
            .filter(f => f.fieldname === 'images')
            .map(f => f.path)
            .filter(Boolean);

        const updatedImages = [...retainedImages, ...newImages];
        const retainedImageSet = new Set(retainedImages);
        const imagesToDelete = existingProject.images.filter(existingImg =>
            existingImg && !retainedImageSet.has(existingImg)
        );
        for (const imageToDelete of imagesToDelete) {
            try {
                const deleted = await deleteCloudinaryImage(imageToDelete);
                if (deleted) {
                    console.log(`Successfully deleted image from Cloudinary: ${imageToDelete}`);
                } else {
                    console.warn(`Failed to delete image from Cloudinary: ${imageToDelete}`);
                }
            } catch (error) {
                console.error(`Error deleting image ${imageToDelete}:`, error);
            }
        }
        updateData.images = updatedImages;
        const project = await ProjectModel.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        );

        if (!project) {
            return handleError(res, "Project not found", 404);
        }

        return handleSuccess(res, project, "Project updated successfully");
    } catch (err) {
        console.error('Update project error:', err);
        return handleError(res, "Error updating project", 500, err.message);
    }
};

exports.deleteProject = async (req, res) => {
    try {
        const project = await ProjectModel.findById(req.params.id);
        if (!project) {
            return handleError(res, "Project not found", 404);
        }

        const deletionResults = [];

        // Delete poster image from Cloudinary if exists
        if (project.posterImg) {
            try {
                const deleted = await deleteCloudinaryImage(project.posterImg);
                deletionResults.push({
                    image: project.posterImg,
                    deleted: deleted,
                    type: 'poster'
                });

                if (deleted) {
                    console.log(`Successfully deleted poster image from Cloudinary`);
                } else {
                    console.warn(`Failed to delete poster image from Cloudinary`);
                }
            } catch (error) {
                console.error(`Error deleting poster image:`, error);
                deletionResults.push({
                    image: project.posterImg,
                    deleted: false,
                    error: error.message,
                    type: 'poster'
                });
            }
        }

        // Delete gallery images from Cloudinary
        for (const image of project.images) {
            if (image) {
                try {
                    const deleted = await deleteCloudinaryImage(image);
                    deletionResults.push({
                        image: image,
                        deleted: deleted,
                        type: 'gallery'
                    });

                    if (deleted) {
                        console.log(`Successfully deleted gallery image from Cloudinary`);
                    } else {
                        console.warn(`Failed to delete gallery image from Cloudinary`);
                    }
                } catch (error) {
                    console.error(`Error deleting gallery image:`, error);
                    deletionResults.push({
                        image: image,
                        deleted: false,
                        error: error.message,
                        type: 'gallery'
                    });
                }
            }
        }

        // Delete the project from database
        await ProjectModel.findByIdAndDelete(req.params.id);

        return handleSuccess(res, {
            project: project,
            deletedImages: deletionResults
        }, "Project deleted successfully");
    } catch (err) {
        console.error('Error in deleteProject:', err);
        return handleError(res, "Error deleting project", 500, err.message);
    }
};

// Optional: Add a cleanup function to remove orphaned files
exports.cleanupOrphanedImages = async (req, res) => {
    try {
        const fs = require('fs');
        const path = require('path');

        // Get all projects and their images
        const projects = await ProjectModel.find({}, 'images posterImg');
        const usedImages = new Set();

        projects.forEach(project => {
            // Add poster image if exists
            if (project.posterImg) {
                usedImages.add(cleanImagePath(project.posterImg));
            }
            // Add gallery images
            project.images.forEach(image => {
                if (image) {
                    usedImages.add(cleanImagePath(image));
                }
            });
        });

        // Get all files in uploads/image directory
        const imageDir = path.join('uploads', 'image');
        const allFiles = [];

        const scanDirectory = (dir, baseDir = '') => {
            if (fs.existsSync(dir)) {
                const files = fs.readdirSync(dir);
                files.forEach(file => {
                    const filePath = path.join(dir, file);
                    const relativePath = path.join(baseDir, file);

                    if (fs.statSync(filePath).isDirectory()) {
                        scanDirectory(filePath, relativePath);
                    } else {
                        allFiles.push(path.join('image', relativePath).replace(/\\/g, '/'));
                    }
                });
            }
        };

        scanDirectory(imageDir);

        // Find orphaned files
        const orphanedFiles = allFiles.filter(file => !usedImages.has(`uploads/${file}`));

        // Delete orphaned files
        const deletedFiles = [];
        for (const orphanedFile of orphanedFiles) {
            const deleted = await deleteUploadedFile(orphanedFile);
            if (deleted) {
                deletedFiles.push(orphanedFile);
            }
        }

        return handleSuccess(res, {
            totalFiles: allFiles.length,
            usedFiles: usedImages.size,
            orphanedFiles: orphanedFiles.length,
            deletedFiles: deletedFiles
        }, "Cleanup completed successfully");

    } catch (err) {
        console.error('Error in cleanupOrphanedImages:', err);
        return handleError(res, "Error during cleanup", 500, err.message);
    }
};