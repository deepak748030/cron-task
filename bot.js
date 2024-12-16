// Import required modules
const { Telegraf, Markup } = require('telegraf');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const NodeCache = require('node-cache');
const { Video } = require('./models/video'); // Assuming you have a Video model
const { getChatCompletion } = require('./api/api-services');
const ai = require('unlimited-ai');

dotenv.config();

// Initialize caches
const cache = new NodeCache(); // Cache with default TTL
const userCache = new NodeCache({ stdTTL: 86400 }); // User cache with 1-day TTL

// Allowed admin usernames
const allowedUsers = ["knox7489", "vixcasm", "Knoxbros"];

let dbConnection;

// Helper function to convert bytes to MB
const bytesToMB = (bytes) => (bytes / (1024 * 1024)).toFixed(2);

// MongoDB connection function
const connectToMongoDB = async () => {
    try {
        if (!dbConnection) {
            dbConnection = await mongoose.connect(process.env.MONGODB_URI, {
                useNewUrlParser: true,
                useUnifiedTopology: true
            });
            console.log('Connected to MongoDB');
        }
        return dbConnection;
    } catch (err) {
        console.error('Failed to connect to MongoDB:', err);
        process.exit(1); // Exit the process if the connection fails
    }
};

// Fetch captions and update them
const getAndUpdateCaptions = async () => {
    try {
        // Ensure the database connection
        await connectToMongoDB();

        // Fetch all videos from the database
        const videos = await Video.find();

        // Iterate over all videos and generate new captions
        for (const video of videos) {
            const videoSize = video.size || 0; // Use video.size if available
            const prompt = `
                ${video.caption}

                Create a visually appealing video caption using the following format:
                - Only the movie/series name, no extra words or symbols.
               Demon Slayer: Kimetsu no Yaiba - To the Hashira Training (2024) make this bold also for my telegram bot  
━━━━━━━━━━━━━━━━━━━━━━━━━━  
 Language: |  Quality:  |  Format:  | Codec:  |  S| File Type: and also add more make this for telegren dont use * star   
━━━━━━━━━━━━━━━━━━━━━━━━━━

                Use proper spacing, fancy icons, and a clean, visually appealing design. Do not add any extra words or unnecessary details.
            `;

            const model = 'gpt-4-turbo-2024-04-09';
            const messages = [
                { role: 'user', content: prompt },
                { role: 'system', content: 'You are a movie/series data provider website.' }
            ];

            try {
                // Generate new caption using AI
                const newCaption = await ai.generate(model, messages);

                // Update the video document with the new caption
                if (newCaption && typeof newCaption === 'string' && newCaption.trim().length > 0) {
                    await Video.findByIdAndUpdate(video._id, { caption: newCaption }, { new: true });
                    console.log(`Updated caption for video ID ${video._id}:`, newCaption);
                } else {
                    console.warn(`No valid caption generated for video ID ${video._id}`);
                }
            } catch (aiError) {
                console.error(`Error generating caption for video ID ${video._id}:`, aiError);
            }
        }
    } catch (dbError) {
        console.error('Error fetching or updating video data:', dbError);
    } finally {
        // Ensure the database connection is closed
        if (dbConnection) {
            mongoose.connection.close();
            console.log('Database connection closed');
        }
    }
};

// Run the function to fetch and update captions
getAndUpdateCaptions();

module.exports = { getAndUpdateCaptions };
