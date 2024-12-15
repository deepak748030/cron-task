const axios = require('axios');
require('dotenv').config();
const token = process.env.TELEGRAM_BOT_TOKEN;
const url = `https://${process.env.VERCEL_URL}/api/telegram-bot`;
console.log(process.env.VERCEL_URL)

const setWebhook = async () => {
    try {
        const response = await axios.post(`https://api.telegram.org/bot${token}/setWebhook`, {
            url: url
        });
        console.log('Set Webhook Response:', response.data);
    } catch (error) {
        console.error('Error setting webhook:', error);
    }
};

const getWebhookInfo = async () => {
    try {
        const response = await axios.get(`https://api.telegram.org/bot${token}/getWebhookInfo`);
        console.log('Webhook Info:', response.data);
    } catch (error) {
        console.error('Error getting webhook info:', error);
    }
};

setWebhook().then(() => getWebhookInfo());
