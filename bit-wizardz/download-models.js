const fs = require('fs');
const https = require('https');
const path = require('path');

const models = [
    'tiny_face_detector_model-weights_manifest.json',
    'tiny_face_detector_model-shard1',
    'face_landmark_68_model-weights_manifest.json',
    'face_landmark_68_model-shard1',
    'face_recognition_model-weights_manifest.json',
    'face_recognition_model-shard1',
    'face_recognition_model-shard2',
];

const baseUrl = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';
const outputDir = path.join(__dirname, 'public', 'models');

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

const downloadFile = (file) => {
    const url = `${baseUrl}/${file}`;
    const filePath = path.join(outputDir, file);
    const fileStream = fs.createWriteStream(filePath);

    https.get(url, (response) => {
        if (response.statusCode === 200) {
            response.pipe(fileStream);
            fileStream.on('finish', () => {
                fileStream.close();
                console.log(`Downloaded ${file}`);
            });
        } else {
            console.error(`Failed to download ${file}: ${response.statusCode}`);
            fileStream.close();
            fs.unlinkSync(filePath); // Delete empty file
        }
    }).on('error', (err) => {
        console.error(`Error downloading ${file}: ${err.message}`);
        fs.unlinkSync(filePath);
    });
};

models.forEach(downloadFile);
