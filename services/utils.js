const fs = require('fs');
const path = require('path');

const handleSuccess = (res, data, message = "Request was successful.", statusCode = 200) => {
    return res.status(statusCode).json({
        meta: {
            success: true,
            message,
        },
        result: data,
    });
};

const handleError = (res, message = "internal Server Error", statusCode = 500, errors = null) => {
    return res.status(statusCode).json({
        meta: {
            success: false,
            message,
            errors,
        },
    });
};

const capitalizeWords = (str) => {
    return str
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

const normalizeImagePath = (path) => {
    return "/" + path.replace(/\\/g, '/');
}

const parseJSON = (input, fallback = []) => {
    if (input == null) return fallback;
    try {
        return typeof input === "string" ? JSON.parse(input) : input || fallback;
    } catch {
        return fallback;
    }
};


const deleteUploadedFile = async (filePath) => {
    try {
        if (!filePath) {
            console.log('No file path provided');
            return false;
        }

        let normalizedPath = filePath;

        // Remove leading slash if present
        if (normalizedPath.startsWith("/")) {
            normalizedPath = normalizedPath.substring(1);
        }

        // Extract relative path after 'uploads/'
        const uploadsIndex = normalizedPath.indexOf('uploads/');
        if (uploadsIndex !== -1) {
            normalizedPath = normalizedPath.substring(uploadsIndex);
        }

        // If path doesn't start with uploads/, prepend it
        if (!normalizedPath.startsWith("uploads/")) {
            normalizedPath = path.join("uploads", normalizedPath);
        }

        const absolutePath = path.resolve(normalizedPath);

        // Extra safety check to ensure we're only deleting files in the uploads directory
        const uploadsDir = path.resolve('uploads');
        if (!absolutePath.startsWith(uploadsDir)) {
            console.error('Attempted to delete file outside uploads directory');
            return false;
        }

        // Check if file exists and delete
        if (fs.existsSync(absolutePath)) {
            await fs.promises.unlink(absolutePath);
            console.log(`Successfully deleted file: ${absolutePath}`);
            return true;
        } else {
            console.log(`File not found: ${absolutePath}`);
            return false;
        }
    } catch (error) {
        console.error(`Error deleting file ${filePath}:`, error);
        return false;
    }
};

const extractRelativeFilePath = (dbImagePath) => {
    if (!dbImagePath) return null;

    // If it's already a relative path starting with image/
    if (dbImagePath.startsWith('image/')) {
        return dbImagePath;
    }

    // Extract path after /uploads/
    const uploadsIndex = dbImagePath.indexOf('/uploads/');
    if (uploadsIndex !== -1) {
        return dbImagePath.substring(uploadsIndex + 9); // +9 to skip '/uploads/'
    }

    // Extract path after uploads/ (without leading slash)
    const uploadsIndexAlt = dbImagePath.indexOf('uploads/');
    if (uploadsIndexAlt !== -1) {
        return dbImagePath.substring(uploadsIndexAlt + 8); // +8 to skip 'uploads/'
    }

    return dbImagePath;
};

// Additional helper function to clean image paths
const cleanImagePath = (imagePath) => {
    if (!imagePath) return null;

    // Remove any duplicate path segments
    let cleanPath = imagePath.replace(/\/+/g, '/'); // Replace multiple slashes with single slash

    // Ensure consistent format
    if (cleanPath.startsWith('/uploads/')) {
        cleanPath = cleanPath.substring(1); // Remove leading slash
    }

    return cleanPath;
};

module.exports = {
    handleSuccess,
    handleError,
    capitalizeWords,
    normalizeImagePath,
    cleanImagePath,
    parseJSON, extractRelativeFilePath, deleteUploadedFile
};
