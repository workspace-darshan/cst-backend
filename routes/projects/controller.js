const { handleError, handleSuccess, normalizeImagePath, parseJSON, deleteUploadedFile, extractRelativeFilePath } = require("../../services/utils");
const ProjectModel = require("./model");

// Create a new project
exports.createProject = async (req, res) => {
    try {
        const { client, projectTitle, description } = req.body;

        const images = (req.files || [])
            .filter(f => f.path)
            .map(f => normalizeImagePath(f.path));

        const project = new ProjectModel({
            client,
            projectTitle,
            description,
            images
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

        // Handle Images (existing + newly uploaded)
        let retainedImages = [];
        try {
            const retained = req.body.images;
            if (retained) {
                retainedImages = parseJSON(retained, []);
            }
        } catch (e) {
            console.warn("Invalid images field:", e);
        }

        // Add newly uploaded images
        const newImages = (req.files || []).map(f => normalizeImagePath(f.path));
        const updatedImages = [...retainedImages, ...newImages];

        // Delete images that are not in retained list
        const imagesToDelete = existingProject.images.filter(img => !retainedImages.includes(img));
        for (const imageToDelete of imagesToDelete) {
            await deleteUploadedFile(extractRelativeFilePath(imageToDelete));
        }

        updateData.images = updatedImages;

        const project = await ProjectModel.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        );

        if (!project) {
            return handleError(res, "Project not found", 404);
        } return handleSuccess(res, project, "Project updated successfully");
    } catch (err) {
        console.error(err);
        return handleError(res, "Error updating project", 500, err.message);
    }
};

// Delete project
exports.deleteProject = async (req, res) => {
    try {
        const project = await ProjectModel.findById(req.params.id);
        if (!project) {
            return handleError(res, "Project not found", 404);
        }

        // Delete all associated images
        for (const image of project.images) {
            await deleteUploadedFile(extractRelativeFilePath(image));
        }

        // Delete the project
        await ProjectModel.findByIdAndDelete(req.params.id);
        return handleSuccess(res, project, "Project deleted successfully");
    } catch (err) {
        console.error(err);
        return handleError(res, "Error deleting project", 500, err.message);
    }
};
