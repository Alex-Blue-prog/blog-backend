const {S3Client, PutObjectCommand, DeleteObjectCommand} = require("@aws-sdk/client-s3");
const fs = require("fs");
const bucket = "myblog-app-100"; //bucket name

const client = new S3Client({
    region: "sa-east-1",
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY
    }
});

const uploadToS3 = async (path, originalFileName, mimetype) => {
    
    const parts = originalFileName.split(".");
    const ext = parts[parts.length - 1];
    const newFilename = Date.now() + "." + ext;

    await client.send(new PutObjectCommand({
        Bucket: bucket,
        Body: fs.readFileSync(path),
        Key: newFilename,
        ContentType: mimetype,
        ACL: "public-read"
    }));

    
    return `https://${bucket}.s3.amazonaws.com/${newFilename}`;
}

const deleteS3 = async (url) => {

    const filenameIndex = url.lastIndexOf("/");
    const filename = url.substring(filenameIndex + 1);
      
    try {
        await client.send(new DeleteObjectCommand({
            Bucket: bucket,
            Key: filename,
        }));

    } catch (err) {
        console.error(err);
    }   
}

module.exports = {uploadToS3, deleteS3};
