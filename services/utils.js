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
        let normalizedPath = filePath;

        if (normalizedPath.startsWith("/")) {
            normalizedPath = normalizedPath.substring(1);
        }
        if (!normalizedPath.startsWith("uploads/")) {
            normalizedPath = path.join("uploads", normalizedPath);
        }
        if (fs.existsSync(normalizedPath)) {
            await fs.promises.unlink(normalizedPath);
            // console.log(`Successfully deleted file: ${normalizedPath}`);
            return true;
        } else {
            // console.log(`File not found: ${normalizedPath}`);
            return false;
        }
    } catch (error) {
        console.error(`Error deleting file ${filePath}:`, error);
        return false;
    }
};

const extractRelativeFilePath = (dbImagePath) => {
    if (!dbImagePath) return null;
    if (dbImagePath.startsWith('image/') || dbImagePath.startsWith('excel/')) {
        return dbImagePath;
    }
    const uploadsIndex = dbImagePath.indexOf('/uploads/');
    if (uploadsIndex !== -1) {
        return dbImagePath.substring(uploadsIndex + 9);
    }
    return dbImagePath;
};

module.exports = {
    handleSuccess,
    handleError,
    capitalizeWords,
    normalizeImagePath,
    parseJSON, extractRelativeFilePath, deleteUploadedFile
};
