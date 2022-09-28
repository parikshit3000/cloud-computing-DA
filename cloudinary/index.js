const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:process.env.CLOUDINARY_KEY,
    api_secret:process.env.CLOUDINARY_SECRET
});
const storage= new CloudinaryStorage({
    cloudinary,
    params:{
        folder:'book_store',
        allowedFormats: ['jpeg','jpg','png']
    }
});

// cloudinary.config({ 
//     cloud_name: 'duhafdf32', 
//     api_key: '232211451535257', 
//     api_secret: '_r8Cbme8WCeorgWPb8YXVvesn_A' 
//   });

module.exports={
    cloudinary,
    storage
}