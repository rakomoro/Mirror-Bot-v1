const logger = require('../utils/logger.js');

module.exports = async function({ event, api, userData }) {
    const { HakimReaction } = Mirror.client;
    const { messageID, userID, reaction, threadID } = event;


    const reactionData = HakimReaction.find(i => i.messageID == messageID);
    if (!reactionData) return;


    if (reactionData.author && reactionData.author !== userID) return;

    const command = Mirror.client.commands.get(reactionData.title);
    if (!command || !command.HakimReaction) return;

    try {

        const user = await userData.get(userID);
        
        await command.HakimReaction({ 
            api, 
            event, 
            HakimReaction: reactionData,
            userData,
            user
        });
    } catch (e) {
        logger.error(`خطأ في HakimReaction للأمر ${reactionData.name}:`, e);
        api.sendMessage(`❌ حدث خطأ أثناء معالجة التفاعل:\n${e.message}`, threadID, messageID);
    }
};
