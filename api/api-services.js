// CommonJS
const getGPT4js = require("gpt4js");

async function getChatCompletion(prompt) {
    let GPT4js = await getGPT4js();

    const messages = [{ role: "user", content: prompt }];
    const options = {
        provider: "Nextway",
        model: "gpt-4o-free",
    };

    const provider = GPT4js.createProvider(options.provider);
    try {
        const text = await provider.chatCompletion(messages, options, (data) => {
            console.log(data);
        });
        return text;
    } catch (error) {
        console.error("Error:", error);
        throw error;
    }
}
// getChatCompletion()

module.exports = { getChatCompletion };