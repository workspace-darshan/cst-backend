const multer = require("multer");
const sharp = require('sharp');
const cloudinary = require('cloudinary').v2;

// Cloudinary configuration
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Memory storage for processing
const multerStorage = multer.memoryStorage();

// File filter
const fileFilter = (req, file, cb) => {
    const allowedImageTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp'
    ];

    if (!allowedImageTypes.includes(file.mimetype)) {
        cb(new Error("Only image files are allowed"), false);
    } else {
        cb(null, true);
    }
};

// Main upload function - sweet and simple
const upload = (folderName) => {
    const uploadMiddleware = multer({
        storage: multerStorage,
        fileFilter: fileFilter,
        limits: { fileSize: 100 * 1024 * 1024 }
    });

    // Return middleware that handles optimization and Cloudinary upload
    return {
        single: (fieldName) => [
            uploadMiddleware.single(fieldName),
            optimizeAndUpload(folderName)
        ],
        any: () => [
            uploadMiddleware.any(),
            optimizeAndUpload(folderName)
        ],
        array: (fieldName, maxCount) => [
            uploadMiddleware.array(fieldName, maxCount),
            optimizeAndUpload(folderName)
        ]
    };
};

// Optimization and upload middleware
const optimizeAndUpload = (folderName) => {
    return async (req, res, next) => {
        if (!req.files && !req.file) {
            return next();
        }

        try {
            const files = req.files || [req.file];
            const processedFiles = [];

            for (const file of files) {
                console.log(`📁 Processing: ${file.originalname}`);

                let processedBuffer;

                // Optimize image
                if (file.buffer.length < 1024 * 1024) {
                    processedBuffer = await sharp(file.buffer)
                        .jpeg({ quality: 85 })
                        .toBuffer();
                } else {
                    processedBuffer = await sharp(file.buffer)
                        .resize({
                            width: 1024,
                            height: 1024,
                            fit: 'inside',
                            withoutEnlargement: true
                        })
                        .jpeg({ quality: 70, progressive: true })
                        .toBuffer();
                }

                // Upload to Cloudinary
                const result = await new Promise((resolve, reject) => {
                    const uploadStream = cloudinary.uploader.upload_stream(
                        {
                            folder: `uploads/${folderName}`,
                            format: 'jpg',
                            public_id: `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
                        },
                        (error, result) => {
                            if (error) reject(error);
                            else resolve(result);
                        }
                    );
                    uploadStream.end(processedBuffer);
                });

                // Update file object
                Object.assign(file, {
                    filename: result.public_id + '.jpg',
                    path: result.secure_url,
                    cloudinary_id: result.public_id,
                    size: processedBuffer.length
                });

                processedFiles.push(file);
            }

            // Update req.files/req.file
            if (req.files) {
                req.files = processedFiles;
            } else {
                req.file = processedFiles[0];
            }

            next();
        } catch (error) {
            console.error('Upload error:', error);
            next(error);
        }
    };
};

module.exports = { upload };