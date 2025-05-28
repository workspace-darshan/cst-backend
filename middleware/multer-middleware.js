const multer = require("multer");
const fs = require("fs");
const sharp = require('sharp');
const path = require('path');

// Memory storage - files stored in memory as Buffer
const multerStorage = multer.memoryStorage();

// File filter to restrict uploads
const fileFilter = (req, file, cb) => {
    const allowedImageTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp'
    ];

    if (file.fieldname !== "uploadFile" && !allowedImageTypes.includes(file.mimetype)) {
        cb(new Error("Only image files are allowed"), false);
    } else {
        cb(null, true);
    }
};

// Multer setup with memory storage
exports.upload = multer({
    storage: multerStorage,
    fileFilter: fileFilter,
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
});

// Optimize and save images middleware
exports.optimizeAndSaveImage = (uploadPath) => {
    return async (req, res, next) => {
        console.log("🔧 Starting image optimization and save...");

        if (!req.files || req.files.length === 0) {
            console.log("❌ No files found in req.files");
            return next();
        }

        try {
            const processedFiles = [];

            // Create upload directory
            const finalPath = `uploads/image/${uploadPath}`;
            fs.mkdirSync(finalPath, { recursive: true });

            // Process all uploaded files
            for (let i = 0; i < req.files.length; i++) {
                const file = req.files[i];

                console.log(`📁 Processing file: ${file.originalname}`);
                console.log(`📊 Original size: ${(file.buffer.length / 1024 / 1024).toFixed(2)} MB`);

                // Generate unique filename
                const ext = file.originalname.split(".").pop();
                const filename = Date.now() + "_" + Math.random().toString(36).substring(2, 6) + ".jpg"; // Always save as jpg
                const filePath = path.join(finalPath, filename);

                let processedBuffer;

                // Skip compression if file is already small (less than 1MB)
                if (file.buffer.length < 1024 * 1024) {
                    console.log(`✅ File already small enough, minimal processing`);
                    // Still convert to jpg for consistency
                    processedBuffer = await sharp(file.buffer)
                        .jpeg({ quality: 85 })
                        .toBuffer();
                } else {
                    // Optimize the image
                    processedBuffer = await sharp(file.buffer)
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
                        .toBuffer();
                }

                // Save optimized image to disk
                fs.writeFileSync(filePath, processedBuffer);

                const compressedSizeMB = (processedBuffer.length / 1024 / 1024).toFixed(2);
                const originalSizeMB = (file.buffer.length / 1024 / 1024).toFixed(2);

                console.log(`✅ Optimization complete: ${originalSizeMB}MB → ${compressedSizeMB}MB`);

                // Update file object with new path and details
                const processedFile = {
                    ...file,
                    filename: filename,
                    path: filePath,
                    destination: finalPath,
                    size: processedBuffer.length
                };

                processedFiles.push(processedFile);
            }

            // Replace req.files with processed files info
            req.files = processedFiles;

            console.log("🎉 All images optimized and saved successfully");
            next();

        } catch (err) {
            console.error('❌ Image optimization error:', err);
            next(err);
        }
    };
};