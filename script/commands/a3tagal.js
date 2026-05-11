const { createCanvas, loadImage } = require("canvas");
const fs = require("fs-extra");
const path = require("path");

module.exports.config = {
    title: "اعتقال",
    release: "1.0.0",
    clearance: 0,
    author: "Hakim Tracks",
    summary: "إنشاء صورة اعتقال لشخص ما",
    section: "الــعــاب",
    syntax: ".اعتقال @منشن أو بالرد على رسالة",
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
        return api.sendMessage("يرجى منشن شخص أو الرد على رسالته لاعتقاله 🚓", threadID, messageID);
    }

    const cacheDir = path.join(__dirname, "cache");
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir);

    try {
        const templateURL = "https://i.imgur.com/ep1gG3r.png";
        const avatarURL1 = `https://graph.facebook.com/${senderID}/picture?width=512&height=512&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;
        const avatarURL2 = `https://graph.facebook.com/${targetID}/picture?width=512&height=512&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;

        const [template, img1, img2] = await Promise.all([
            loadImage(templateURL),
            loadImage(avatarURL1).catch(() => null),
            loadImage(avatarURL2).catch(() => null)
        ]);

        if (!img1 || !img2) return api.sendMessage("تعذر جلب صور الحسابات.", threadID, messageID);

        const canvas = createCanvas(template.width, template.height);
        const ctx = canvas.getContext("2d");

        
        ctx.drawImage(template, 0, 0, canvas.width, canvas.height);

        
        function drawCircularImage(img, x, y, size) {
            ctx.save(); 
            ctx.beginPath();
            ctx.arc(x + size/2, y + size/2, size/2, 0, Math.PI * 2); 
            ctx.closePath();
            ctx.clip(); 
            ctx.drawImage(img, x, y, size, size);
            ctx.restore(); 
        }

        
        drawCircularImage(img1, 375, 9, 100);

        
        drawCircularImage(img2, 160, 92, 100);

        const imagePath = path.join(cacheDir, `arrest_${senderID}_${targetID}.png`);
        const buffer = canvas.toBuffer();
        fs.writeFileSync(imagePath, buffer);

        api.sendMessage({
            body: "🚓 تم اعتقال المجرم بنجاح!",
            attachment: fs.createReadStream(imagePath)
        }, threadID, () => fs.unlinkSync(imagePath), messageID);

    } catch (error) {
        console.error(error);
        api.sendMessage("حدث خطأ أثناء إنشاء الصورة.", threadID, messageID);
    }
};