// const { CloudinaryStorage } = require('multer-storage-cloudinary');
// const multer = require('multer');
// const cloudinary = require('cloudinary').v2;

// cloudinary.config({
//     cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//     api_key: process.env.CLOUDINARY_API_KEY,
//     api_secret: process.env.CLOUDINARY_API_SECRET,
// });

// const storage = new CloudinaryStorage({
//     cloudinary: cloudinary,
//     params: async (req, file) => {
//         console.log("🚀 ~ params: ~ file:", file)
//         let folderName = 'uploads'; // Default folder
//         if (file.fieldname === 'profilePicture') {
//             folderName = 'uploads/profilePictures';
//         } else if (file.fieldname === 'postImages') {
//             folderName = 'uploads/postImages';
//         }

//         return {
//             folder: folderName,
//             allowed_formats: ['jpg', 'png', 'jpeg'],
//         };
//     },
// });

// const upload = multer({ storage });

// module.exports = upload;