const { handleError, handleSuccess, normalizeImagePath, parseJSON, cleanImagePath, deleteUploadedFile } = require("../../services/utils");
const ProjectModel = require("./model");

// Create a new project
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
            posterImg: posterFile ? normalizeImagePath(posterFile.path) : undefined,
            images: imageFiles.filter(f => f.path).map(f => normalizeImagePath(f.path))
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
        // Check if projectTitle with same title already exists (excluding current projectTitle)
        const existingProjectName = await ProjectModel.findOne({
            projectTitle,
            _id: { $ne: req.params.id }
        });
        if (existingProjectName) {
            return handleError(res, "Project with this title already exists", 400);
        }
        // Get existing project to compare images
        const existingProject = await ProjectModel.findById(req.params.id);
        if (!existingProject) {
            return handleError(res, "Project not found", 404);
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
            updateData.posterImg = normalizeImagePath(posterFile.path);
            // Delete old poster if it exists
            if (existingProject.posterImg) {
                try {
                    const cleanedPath = cleanImagePath(existingProject.posterImg);
                    if (cleanedPath) {
                        await deleteUploadedFile(cleanedPath);
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
                    const cleanedPath = cleanImagePath(existingProject.posterImg);
                    if (cleanedPath) {
                        await deleteUploadedFile(cleanedPath);
                    }
                } catch (error) {
                    console.error(`Error deleting old poster image: ${error}`);
                }
            }
            updateData.posterImg = retainedPoster || null;
        }

        // Handle gallery Images (existing + newly uploaded)
        let retainedImages = [];
        try {
            const retained = req.body.images;
            if (retained) {
                retainedImages = parseJSON(retained, []);
                retainedImages = retainedImages
                    .map(img => cleanImagePath(img))
                    .filter(Boolean)
                    .map(img => img.startsWith('uploads/') ? img : `uploads/${img}`);
            }
        } catch (e) {
            console.warn("Invalid images field:", e);
        }

        // Add newly uploaded images
        const newImages = files
            .filter(f => f.fieldname === 'images')
            .map(f => normalizeImagePath(f.path))
            .map(cleanImagePath)
            .filter(Boolean);

        // Combine retained and new images
        const updatedImages = [...retainedImages, ...newImages];

        // Find images to delete (existing images not in retained list)
        const existingImagePaths = existingProject.images
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
        console.error(err);
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

        // Delete poster image if exists
        if (project.posterImg) {
            const cleanedPosterPath = cleanImagePath(project.posterImg);
            if (cleanedPosterPath) {
                const fullPosterPath = cleanedPosterPath.startsWith('uploads/') ? cleanedPosterPath : `uploads/${cleanedPosterPath}`;
                try {
                    const deleted = await deleteUploadedFile(fullPosterPath);
                    deletionResults.push({
                        image: project.posterImg,
                        path: fullPosterPath,
                        deleted: deleted,
                        type: 'poster'
                    });

                    if (deleted) {
                        console.log(`Successfully deleted poster image: ${fullPosterPath}`);
                    } else {
                        console.warn(`Failed to delete poster image: ${fullPosterPath}`);
                    }
                } catch (error) {
                    console.error(`Error deleting poster image ${fullPosterPath}:`, error);
                    deletionResults.push({
                        image: project.posterImg,
                        path: fullPosterPath,
                        deleted: false,
                        error: error.message,
                        type: 'poster'
                    });
                }
            }
        }

        // Delete gallery images
        for (const image of project.images) {
            if (image) {
                const cleanedPath = cleanImagePath(image);
                if (!cleanedPath) continue;

                const fullPath = cleanedPath.startsWith('uploads/') ? cleanedPath : `uploads/${cleanedPath}`;

                try {
                    const deleted = await deleteUploadedFile(fullPath);
                    deletionResults.push({
                        image: image,
                        path: fullPath,
                        deleted: deleted,
                        type: 'gallery'
                    });

                    if (deleted) {
                        console.log(`Successfully deleted gallery image: ${fullPath}`);
                    } else {
                        console.warn(`Failed to delete gallery image: ${fullPath}`);
                    }
                } catch (error) {
                    console.error(`Error deleting gallery image ${fullPath}:`, error);
                    deletionResults.push({
                        image: image,
                        path: fullPath,
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