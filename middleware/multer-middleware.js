const multer = require("multer");
const fs = require("fs");

// Storage setup
const multerStorage = (uploadPath) =>
    multer.diskStorage({
        destination: (req, file, cb) => {
            console.log("🚀 from multer", file)
            let finalPath = "uploads/";

            finalPath += `image/${uploadPath}`;

            // Ensure the directory exists
            fs.mkdirSync(finalPath, { recursive: true });

            cb(null, finalPath); // Dynamic folder path
        },

        filename: (req, file, cb) => {
            const ext = file.originalname.split(".").pop();
            cb(
                null,
                Date.now() +
                "_" +
                Math.random().toString(36).substring(2, 6) +
                "." +
                ext // Unique filename
            );
        },
    });

// File filter to restrict uploads
const fileFilter = (req, file, cb) => {
    const allowedExcelTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
        'application/vnd.ms-excel', // xls
    ];

    const allowedImageTypes = [
        'image/jpeg', 'image/png', 'image/gif', // Allow image MIME types
    ];

    if (file.fieldname !== "uploadFile" && !allowedImageTypes.includes(file.mimetype)) {
        cb(new Error("Only image files are allowed"), false);
    } else {
        cb(null, true); // Accept the file
    }
};

// Multer setup
exports.upload = (path) =>
    multer({
        storage: multerStorage(path),
        fileFilter: fileFilter,
        limits: { fileSize: 10 * 1024 * 1024 }, // 10MB file size limit
    });
