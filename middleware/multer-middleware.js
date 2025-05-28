const multer = require("multer");
const fs = require("fs");
const sharp = require('sharp');
const path = require('path');

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
        limits: { fileSize: 100 * 1024 * 1024 },
    });

// Sharp optimization middleware - FIXED VERSION
exports.optimizeImage = async (req, res, next) => {
    console.log("🔧 Starting image optimization...");

    if (!req.files || req.files.length === 0) {
        console.log("❌ No files found in req.files");
        return next();
    }

    try {
        // Process all uploaded files
        for (let i = 0; i < req.files.length; i++) {
            const file = req.files[i];
            const filePath = file.path;

            console.log(`📁 Processing file: ${file.originalname}`);
            console.log(`📍 File path: ${filePath}`);

            // Check if file exists
            if (!fs.existsSync(filePath)) {
                console.log(`❌ File not found: ${filePath}`);
                continue;
            }

            // Get original file size
            const originalStats = fs.statSync(filePath);
            const originalSizeMB = (originalStats.size / 1024 / 1024).toFixed(2);
            console.log(`📊 Original size: ${originalSizeMB} MB`);

            // Skip if file is already small enough (less than 1MB)
            if (originalStats.size < 1024 * 1024) {
                console.log(`✅ File already small enough, skipping compression`);
                continue;
            }
            const tempPath = filePath + '.tmp';
            // Compress the image
            await sharp(filePath)
                .resize({
                    width: 1024,
                    height: 1024,
                    fit: 'inside',
                    withoutEnlargement: true
                })
                .jpeg({
                    quality: 70,
                    progressive: true
                })
                .toFile(tempPath);

            // Check compressed file size
            const compressedStats = fs.statSync(tempPath);
            const compressedSizeMB = (compressedStats.size / 1024 / 1024).toFixed(2);
            console.log(`📊 Compressed size: ${compressedSizeMB} MB`);
            fs.unlinkSync(filePath); // Delete original
            fs.renameSync(tempPath, filePath); // Rename compressed to original name
            console.log(`✅ Compression complete: ${originalSizeMB}MB → ${compressedSizeMB}MB`);
        }
        console.log("🎉 All images optimized successfully");
        next();

    } catch (err) {
        console.error('❌ Image optimization error:', err);
        next(err);
    }
};