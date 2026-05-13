const axios = require('axios');

const baseApiUrl = async () => {
    const base = await axios.get("https://raw.githubusercontent.com/mahmudx7/HINATA/main/baseApiUrl.json");
    return base.data.mahmud;
};

const getStreamFromURL = async (url) => {
    const response = await axios({ url, method: 'GET', responseType: 'stream' });
    return response.data;
};

module.exports.config = {
    title: 'زواج',
    release: '1.7',
    clearance: 0,
    author: "Hakim Tracks",
    summary: 'اقتران عشوائي بين الأعضاء مع عرض الصور الشخصية',
    section: 'الــعــاب',
    syntax: "",
    delay: 10,
};

module.exports.HakimRun = async ({ api, event }) => {
    const { threadID, messageID, senderID } = event;

    try {
        const threadInfo = await api.getThreadInfo(threadID);
        const members = threadInfo.userInfo;
        const senderInfo = members.find(m => m.id === senderID);
        const gender1 = senderInfo?.gender;

        if (!gender1 || (gender1 !== 'MALE' && gender1 !== 'FEMALE')) {
            return api.sendMessage('❌ جنسك غير محدد في ملفك الشخصي', threadID, messageID);
        }

        const oppositeGender = gender1 === 'MALE' ? 'FEMALE' : 'MALE';
        const candidates = members.filter(m => m.gender === oppositeGender && m.id !== senderID);

        if (candidates.length === 0) {
            return api.sendMessage('❌ لا يوجد أعضاء من الجنس الآخر في هذه المجموعة', threadID, messageID);
        }

        api.setMessageReaction('⏳', messageID, () => {}, true);

        const matched = candidates[Math.floor(Math.random() * candidates.length)];
        const uid2 = matched.id;
        const name1 = senderInfo.name || 'User';
        const name2 = matched.name || 'Partner';
        const lovePercent = Math.floor(Math.random() * 36) + 65;

        const base = await baseApiUrl();
        const apiUrl1 = `${base}/api/pfp?mahmud=${senderID}`;
        const apiUrl2 = `${base}/api/pfp?mahmud=${uid2}`;

        const attachments = [
            await getStreamFromURL(apiUrl1),
            await getStreamFromURL(apiUrl2)
        ];

        api.sendMessage({
            body: `💞 𝐒𝐮𝐜𝐜𝐞𝐬𝐬𝐟𝐮𝐥 𝐏𝐚𝐢𝐫𝐢𝐧𝐠\n• ${name1}\n• ${name2}\n\n𝐋𝐨𝐯𝐞 𝐏𝐞𝐫𝐜𝐞𝐧𝐭𝐚𝐠𝐞: ${lovePercent}%`,
            attachment: attachments
        }, threadID, () => api.setMessageReaction('✅', messageID, () => {}, true), messageID);
    } catch (err) {
        api.setMessageReaction('❌', messageID, () => {}, true);
        api.sendMessage('❌ خطأ: ' + err.message, threadID, messageID);
    }
};