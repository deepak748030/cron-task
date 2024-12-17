const dotenv = require('dotenv');
const mongoose = require('mongoose');
const NodeCache = require('node-cache');
const fs = require('fs');
const path = require('path');
const { Video } = require('./models/video'); // Assuming you have a Video model
const ai = require('unlimited-ai');

dotenv.config();

// Initialize caches
const cache = new NodeCache({ stdTTL: 86400 }); // Cache with 1-day TTL

// File path for video backup
const backupFilePath = path.join(__dirname, 'videoBackup.json');

// MongoDB connection function
let dbConnection;

const connectToMongoDB = async () => {
    try {
        if (!dbConnection) {
            dbConnection = await mongoose.connect(process.env.MONGODB_URI, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
            });
            console.log('Connected to MongoDB');
        }
        return dbConnection;
    } catch (err) {
        console.error('Failed to connect to MongoDB:', err);
        process.exit(1); // Exit the process if connection fails
    }
};

// Helper function to generate captions using AI
const generateNewCaption = async (video) => {
    const prompt = `
        ${video.caption}

        Create a visually appealing video caption using the following format:
        <b>${video.title}</b>  
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━  
        <b>Language:</b> ${video.language} | <b>Quality:</b> ${video.quality} | <b>Format:</b> ${video.format} | <b>Codec:</b> ${video.codec} | <b>File Type:</b> ${video.fileType}  
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━  

        Use proper spacing, fancy icons, and a clean design.
    `;
    const model = 'gpt-4-turbo-2024-04-09';
    const messages = [
        { role: 'system', content: 'You are a movie/series data formatting assistant.' },
        { role: 'user', content: prompt },
    ];

    try {
        const newCaption = await ai.generate(model, messages);
        return newCaption.trim();
    } catch (err) {
        console.error('Error generating caption:', err);
        return null;
    }
};

// Function to backup video data to a file
const backupVideoData = async () => {
    try {
        const allVideos = await Video.find();
        fs.writeFileSync(backupFilePath, JSON.stringify(allVideos, null, 2));
        console.log(`Video data backup saved to ${backupFilePath}`);
    } catch (err) {
        console.error('Failed to backup video data:', err);
    }
};

// Function to load videos into cache
const loadVideosToCache = async () => {
    try {
        const allVideos = await Video.find();
        allVideos.forEach((video) => {
            cache.set(video._id.toString(), video);
        });
        console.log(`Loaded ${allVideos.length} videos into cache.`);
    } catch (err) {
        console.error('Failed to load videos into cache:', err);
    }
};

// Function to update captions one by one using AI
const updateCaptions = async () => {
    try {
        await connectToMongoDB();
        const keys = cache.keys();

        for (const key of keys) {
            const video = cache.get(key);

            if (!video) {
                console.warn(`Video with ID ${key} not found in cache.`);
                continue;
            }

            console.log(`Processing video ID: ${video._id}`);

            const newCaption = await generateNewCaption(video);

            if (newCaption) {
                await Video.findByIdAndUpdate(video._id, { caption: newCaption }, { new: true });
                cache.set(video._id.toString(), { ...video, caption: newCaption }); // Update cache
                console.log(`Updated caption for video ID ${video._id}`);
            } else {
                console.warn(`Failed to generate a caption for video ID ${video._id}`);
            }

            // Optional delay between updates
            await new Promise((resolve) => setTimeout(resolve, 2000)); // 2 seconds delay
        }
        console.log('Finished updating captions.');
    } catch (err) {
        console.error('Error while updating captions:', err);
    }
};

// Scheduled task: Run at regular intervals
const startCaptionUpdater = () => {
    setInterval(async () => {
        console.log('Starting caption update task...');
        await updateCaptions();
        console.log('Caption update task completed.');
    }, 60 * 60 * 1000); // Runs every 1 hour
};

// Main function to initialize everything
const main = async () => {
    await connectToMongoDB();
    await backupVideoData();
    await loadVideosToCache();
    startCaptionUpdater();
};

main().catch((err) => console.error('Error in main execution:', err));
