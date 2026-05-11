const logger = require('../utils/logger.js');

module.exports = async function({ event, api, userData }) {
    const { HakimReply } = Mirror.client;
    const { messageReply, threadID, messageID } = event;


    const replyIndex = HakimReply.findIndex(i => i.messageID == messageReply.messageID);
    if (replyIndex === -1) return;

    const replyData = HakimReply[replyIndex];
    const command = Mirror.client.commands.get(replyData.title);

    if (!command || !command.HakimReply) return;

    try {

        const user = await userData.get(event.senderID);
        
        await command.HakimReply({ 
            api, 
            event, 
            HakimReply: replyData,
            userData,
            user
        });
    } catch (e) {
        logger.error(`خطأ في HakimReply للأمر ${replyData.name}:`, e);
        api.sendMessage(`❌ حدث خطأ أثناء معالجة الرد:\n${e.message}`, threadID, messageID);
    }
};
