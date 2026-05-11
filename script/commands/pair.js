const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

const baseApiUrl = async () => {
    const base = await axios.get("https://raw.githubusercontent.com/mahmudx7/exe/main/baseApiUrl.json");
    return base.data.mahmud;
};

module.exports.config = {
    title: 'زوجني',
    release: '1.7',
    clearance: 0,
    author: "Hakim Tracks",
    summary: 'اقتران عشوائي مع صورة مدمجة',
    section: 'الــعــاب',
    syntax: "",
    delay: 10,
};

module.exports.HakimRun = async ({ api, event }) => {
    const { threadID, messageID, senderID } = event;
    const outputPath = path.join(__dirname, 'cache', `pair_${senderID}_${Date.now()}.png`);
    if (!fs.existsSync(path.dirname(outputPath))) fs.mkdirSync(path.dirname(outputPath), { recursive: true });

    api.setMessageReaction('😘', messageID, () => {}, true);

    try {
        const threadInfo = await api.getThreadInfo(threadID);
        const users = threadInfo.userInfo;
        const myData = users.find(u => u.id === senderID);

        if (!myData || !myData.gender) return api.sendMessage('❌ جنسك غير محدد', threadID, messageID);

        const myGender = myData.gender.toUpperCase();
        let matchCandidates = [];

        if (myGender === 'MALE') {
            matchCandidates = users.filter(u => u.gender === 'FEMALE' && u.id !== senderID);
        } else if (myGender === 'FEMALE') {
            matchCandidates = users.filter(u => u.gender === 'MALE' && u.id !== senderID);
        } else {
            matchCandidates = users.filter(u => u.id !== senderID);
        }

        if (matchCandidates.length === 0) {
            return api.sendMessage('❌ لا يوجد مرشحين', threadID, messageID);
        }

        const selectedMatch = matchCandidates[Math.floor(Math.random() * matchCandidates.length)];
        const apiUrl = await baseApiUrl();

        const { data } = await axios.get(`${apiUrl}/api/pair/mahmud?user1=${senderID}&user2=${selectedMatch.id}&style=1`, {
            responseType: 'arraybuffer'
        });

        fs.writeFileSync(outputPath, Buffer.from(data));

        const name1 = myData.name || 'User';
        const name2 = selectedMatch.name || 'Partner';
        const percentage = Math.floor(Math.random() * 100) + 1;

        api.sendMessage({
            body: `💞 مبروك للمظط الكيوتات\n• ${name1}\n• ${name2}\n\nنسبة توافقكم 🫂: ${percentage}%`,
            attachment: fs.createReadStream(outputPath)
        }, threadID, () => {
            api.setMessageReaction('✅', messageID, () => {}, true);
            if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        }, messageID);
    } catch (err) {
        api.setMessageReaction('❌', messageID, () => {}, true);
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        api.sendMessage('❌ خطأ: ' + err.message, threadID, messageID);
    }
};