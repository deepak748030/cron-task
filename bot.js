const dotenv = require('dotenv');
const mongoose = require('mongoose');
const NodeCache = require('node-cache');
const fs = require('fs');
const path = require('path');
const { Video } = require('./models/video'); // Assuming you have a Video model
const ai = require('unlimited-ai');

dotenv.config();

// Initialize cache
const cache = new NodeCache({ stdTTL: 86400 }); // 1-day TTL for cache

// File path for video backup
const backupFilePath = path.join(__dirname, 'videoBackup.json');

// MongoDB connection
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
        process.exit(1);
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
    try {
        const response = await ai.generate('gpt-4-turbo-2024-04-09', [
            { role: 'system', content: 'You are a movie/series caption assistant.' },
            { role: 'user', content: prompt },
        ]);
        if (response && response.trim()) {
            return response.trim();
        }
        console.warn('Empty caption generated for video:', video._id);
        return null;
    } catch (err) {
        console.error('AI error while generating caption:', err);
        return null;
    }
};

// Backup videos to file
const backupVideoData = async () => {
    try {
        const allVideos = await Video.find();
        fs.writeFileSync(backupFilePath, JSON.stringify(allVideos, null, 2));
        console.log(`Video data backed up to ${backupFilePath}`);
    } catch (err) {
        console.error('Failed to backup video data:', err);
    }
};

// Load videos into cache
const loadVideosToCache = async () => {
    try {
        const allVideos = await Video.find();
        allVideos.forEach((video) => cache.set(video._id.toString(), video));
        console.log(`Loaded ${allVideos.length} videos into cache.`);
    } catch (err) {
        console.error('Error loading videos into cache:', err);
    }
};

// Update captions and sync with MongoDB
const updateCaptions = async () => {
    try {
        const keys = cache.keys();
        console.log(`Starting to update captions for ${keys.length} videos...`);

        for (const key of keys) {
            const video = cache.get(key);

            if (!video) {
                console.warn(`Video with ID ${key} not found in cache.`);
                continue;
            }

            console.log(`Generating caption for video ID: ${video._id}`);
            const newCaption = await generateNewCaption(video);

            if (newCaption) {
                // Update MongoDB
                const updatedVideo = await Video.findByIdAndUpdate(
                    video._id,
                    { caption: newCaption },
                    { new: true }
                );

                if (updatedVideo) {
                    // Update cache
                    cache.set(video._id.toString(), { ...updatedVideo._doc });
                    console.log(`Caption updated for video ID: ${video._id}`);
                } else {
                    console.warn(`Failed to update caption in DB for video ID: ${video._id}`);
                }
            } else {
                console.warn(`No valid caption generated for video ID: ${video._id}`);
            }

            // Optional delay
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        console.log('Finished updating captions.');
    } catch (err) {
        console.error('Error updating captions:', err);
    }
};

// Schedule updates every hour
const startCaptionUpdater = () => {
    console.log('Starting caption updater interval...');
    setInterval(async () => {
        console.log('Running caption update task...');
        await updateCaptions();
        console.log('Caption update task finished.');
    }, 60 * 60 * 1000); // Runs every 1 hour
};

// Main function
const main = async () => {
    await connectToMongoDB();
    await backupVideoData();
    await loadVideosToCache();
    await updateCaptions(); // Initial run
    startCaptionUpdater();
};

main().catch((err) => console.error('Error in main execution:', err));
