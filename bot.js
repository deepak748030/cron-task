const { Telegraf, Markup } = require('telegraf');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const NodeCache = require('node-cache');
const { Video } = require('./models/video'); // Assuming you have a Video model
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

// Function to generate captions using AI
const generateNewCaption = async (video) => {
    const prompt = `
        ${video.caption}

        Create a visually appealing video caption using the following format:
        - Only the movie/series name, no extra words or symbols.
        <b> Demon Slayer: Kimetsu no Yaiba - To the Hashira Training (2024) </b>
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━  
        <b> Language:</b> |   <b> Quality:</b>  |  <b> Format:</b>  |<b> Codec:</b>  |  S|  <b>File Type:</b>
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━

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
        return newCaption;
    } catch (aiError) {
        console.error('Error generating caption:', aiError);
        return null;
    }
};

// Fetch captions and update them
const getAndUpdateCaptions = async () => {
    try {
        // Ensure the database connection
        await connectToMongoDB();

        // Fetch all videos in batches to avoid memory overload
        const batchSize = 100; // Adjust as necessary based on your environment
        let skip = 0;
        let totalUpdated = 0;

        const totalVideos = await Video.countDocuments();
        console.log(`Total videos to process: ${totalVideos}`);

        while (skip < totalVideos) {
            // Fetch the next batch of videos
            const videos = await Video.find().skip(skip).limit(batchSize);

            // Process each video in the batch
            for (const video of videos) {
                const newCaption = await generateNewCaption(video);
                if (newCaption && typeof newCaption === 'string' && newCaption.trim().length > 0) {
                    // Update the video document with the new caption
                    await Video.findByIdAndUpdate(video._id, { caption: newCaption }, { new: true });
                    console.log(`Updated caption for video ID ${video._id}:`, newCaption);
                    totalUpdated++;
                } else {
                    console.warn(`No valid caption generated for video ID ${video._id}`);
                }
            }

            skip += batchSize;
            console.log(`Processed ${skip} out of ${totalVideos} videos...`);

            // Optional: You can introduce a delay between batches to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 2000)); // Delay 2 seconds between batches
        }

        console.log(`Finished processing. Updated ${totalUpdated} video captions.`);
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
getAndUpdateCaptions().then(() => {
    console.log('Captions update completed');
}).catch(error => {
    console.error('Error during caption update:', error);
});

module.exports = { getAndUpdateCaptions };
