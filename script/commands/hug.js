const axios = require("axios");
const { createCanvas, loadImage } = require("canvas");
const fs = require("fs-extra");
const path = require("path");

module.exports.config = {
    title: "عناق",
    release: "1.0.0",
    clearance: 0,
    author: "Hakim Tracks",
    summary: "إنشاء صورة عناق بين شخصين (مع صور دائرية)",
    section: "الــعــاب",
    syntax: ".عناق @منشن أو بالرد على رسالة",
    delay: 5,
};

module.exports.HakimRun = async function ({ api, event, args }) {
    const { threadID, messageID, senderID, mentions, messageReply } = event;

    let targetID;
    if (Object.keys(mentions).length > 0) {
        targetID = Object.keys(mentions)[0];
    } else if (messageReply) {
        targetID = messageReply.senderID;
    } else {
        return api.sendMessage("يرجى منشن شخص أو الرد على رسالته لعمل عناق.", threadID, messageID);
    }

    const cacheDir = path.join(__dirname, "cache");
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir);

    try {
        const avatarURL1 = `https://graph.facebook.com/${senderID}/picture?width=512&height=512&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;
        const avatarURL2 = `https://graph.facebook.com/${targetID}/picture?width=512&height=512&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;
        const templateURL = "https://i.ibb.co/3YN3T1r/q1y28eqblsr21.jpg";

        const [img1, img2, template] = await Promise.all([
            loadImage(avatarURL1).catch(() => null),
            loadImage(avatarURL2).catch(() => null),
            loadImage(templateURL)
        ]);

        if (!img1 || !img2) return api.sendMessage("تعذر جلب صور الحسابات. تأكد من أن الحسابات عامة.", threadID, messageID);

        const canvas = createCanvas(template.width, template.height);
        const ctx = canvas.getContext("2d");

        
        ctx.drawImage(template, 0, 0, canvas.width, canvas.height);

        
        ctx.save(); 
        ctx.beginPath();
        
        ctx.arc(300 + 150/2, 100 + 150/2, 150/2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip(); 
        ctx.drawImage(img1, 300, 100, 150, 150); 
        ctx.restore(); 

        
        ctx.save();
        ctx.beginPath();
        ctx.arc(250 + 130/2, 250 + 130/2, 130/2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(img2, 250, 250, 130, 130);
        ctx.restore();

        const imagePath = path.join(cacheDir, `hug_${senderID}_${targetID}.png`);
        const buffer = canvas.toBuffer();
        fs.writeFileSync(imagePath, buffer);

        api.sendMessage({
            body: "يا له من عناق دافئ! 🤗",
            attachment: fs.createReadStream(imagePath)
        }, threadID, () => fs.unlinkSync(imagePath), messageID);

    } catch (error) {
        console.error(error);
        api.sendMessage("حدث خطأ أثناء إنشاء الصورة.", threadID, messageID);
    }
};