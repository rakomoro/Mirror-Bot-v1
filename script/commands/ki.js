const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

const baseApiUrl = async () => {
    const base = await axios.get("https://raw.githubusercontent.com/mahmudx7/HINATA/main/baseApiUrl.json");
    return base.data.mahmud;
};

module.exports.config = {
    title: 'قبلة',
    release: '1.7',
    clearance: 0,
    author: "Hakim Tracks",
    summary: 'توليد صورة قبلة رومانسية بين عضوين',
    section: 'الــعــاب',
    syntax: '[@mention]',
    delay: 5,
};

module.exports.HakimRun = async ({ api, event }) => {
    const { threadID, messageID, senderID, mentions } = event;
    if (messageReply && messageReply.senderID!== senderID) {
      targetID = messageReply.senderID;
} else if (mentions && Object.keys(mentions).length> 0) {
      targetID = Object.keys(mentions)[0];
} else {
      return api.sendMessage("👥︙ لازم تعمل منشن أو ترد على شخص!", threadID);
}

    const targetID = mentionKeys[0];
    const cacheDir = path.join(__dirname, 'cache');
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir);
    const imgPath = path.join(cacheDir, `kiss_${senderID}_${targetID}.png`);

    api.setMessageReaction('😘', messageID, () => {}, true);
    const waitMsg = await api.sendMessage('⏳ جاري التوليد...', threadID, messageID);

    try {
        const base = await baseApiUrl();
        const response = await axios.post(`${base}/api/kiss`,
            { senderID, targetID },
            { responseType: 'arraybuffer' }
        );

        fs.writeFileSync(imgPath, Buffer.from(response.data));

        if (waitMsg.messageID) api.unsendMessage(waitMsg.messageID);

        api.sendMessage({
            body: '🙈 هنا صورة القبلة',
            attachment: fs.createReadStream(imgPath)
        }, threadID, () => {
            api.setMessageReaction('✅', messageID, () => {}, true);
            if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
        }, messageID);
    } catch (err) {
        api.setMessageReaction('❌', messageID, () => {}, true);
        if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
        api.sendMessage('❌ خطأ: ' + err.message, threadID, messageID);
    }
};