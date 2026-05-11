const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const { createCanvas, loadImage } = require('canvas'); 

module.exports.config = {
    title: "احداث",
    release: "2.1.0",
    clearance: 1,
    author: "Hakim Tracks",
    summary: "إرسال رسالة ترحيب مع صورة عند انضمام عضو جديد، وإشعارات للأحداث الأخرى.",
    section: "الــمـطـور",
    syntax: "on/off",
    delay: 5,
};


async function getAvatarUrl(userID) {
    try {
        const user = await axios.post(`https://www.facebook.com/api/graphql/`, null, {
            params: {
                doc_id: "5341536295888250",
                variables: JSON.stringify({ height: 512, scale: 1, userID, width: 512 })
            }
        });
        return user.data.data.profile.profile_picture.uri;
    } catch (err) {
        return "https://i.ibb.co/bBSpr5v/143086968-2856368904622192-1959732218791162458-n.png";
    }
}


async function downloadImage(url, filename) {
    const cacheDir = path.join(__dirname, 'cache');
    await fs.ensureDir(cacheDir);
    const filePath = path.join(cacheDir, filename);
    const writer = fs.createWriteStream(filePath);
    const response = await axios({ url, responseType: 'stream' });
    response.data.pipe(writer);
    return new Promise((resolve, reject) => {
        writer.on('finish', () => resolve(filePath));
        writer.on('error', reject);
    });
}

module.exports.HakimEvent = async function({ api, event }) {
    const { logMessageType, logMessageData, author, threadID } = event;
    const botID = api.getCurrentUserID();

    if (author === botID) return;

    try {
        switch (logMessageType) {
            case "log:subscribe": {
                
                if (logMessageData.addedParticipants.some(p => p.userFbId === botID)) {
                    try {
                        await api.changeNickname(`❴ . ❵ • ℳ𝒾𝓇𝓇ℴ𝓇 ℬℴ𝓉`, threadID, botID);
                    } catch (e) {
                        console.error("فشل تغيير الكنية:", e);
                    }

                    
                    const threadInfo = await api.getThreadInfo(threadID);
                    const groupName = threadInfo.threadName || "المجموعة";
                    const memberCount = threadInfo.participantIDs.length;
                    const adminCount = threadInfo.adminIDs.length;
                    const currentTime = new Date().toLocaleString('ar-EG', { timeZone: 'Africa/Cairo' });

                    const botName = "Mirror Bot";
                    const devName = "Hakim Tracks";

                    const msg = `◊•─┄┅═══❁  🌺  ❁═══┅┄─•◊
○ ¦  اشــعـــــار    تمت اضافة البوت بنجاح 
○ ¦  الــاســــــم  ${botName}
○ ¦  الـمـطــوࢪ   ${devName}
○ ¦  الـمجموعة  ${groupName}
○ ¦  الاعــضــاء  ${memberCount}
○ ¦  الادمـــــن  ${adminCount}
○ ¦  الــوقــت   ${currentTime}
╮─[ ◢◤ الأوامر المفيدة ◢◤ ]─╭
│  المطور – معلومات عن البوت 
│  ميرور – دردشة مع الذكاء الاصطناعي 
│  ابتايم – وقت تشغيل البوت 
╯──────────────────╰\n`;

                    const imagePath = await downloadImage(
                        "https://i.postimg.cc/63MKnXXp/received-912578775020631.jpg",
                        "bot_welcome.jpg"
                    );

                    await api.sendMessage(
                        { body: msg, attachment: fs.createReadStream(imagePath) },
                        threadID,
                        () => fs.unlinkSync(imagePath)
                    );
                    return;
                }

                
                for (const participant of logMessageData.addedParticipants) {
                    if (participant.userFbId === botID) continue; 

                    const { userFbId, fullName } = participant;
                    const threadInfo = await api.getThreadInfo(threadID);

                    
                    const groupName = threadInfo.threadName || "المجموعة";
                    const memberCount = threadInfo.participantIDs.length;
                    const currentTime = new Date().toLocaleString('ar-EG', { timeZone: 'Africa/Cairo' });

                    
                    const backgrounds = [
                        'https://i.imgur.com/dDSh0wc.jpeg',
                        'https://i.imgur.com/UucSRWJ.jpeg',
                        'https://i.imgur.com/OYzHKNE.jpeg',
                        'https://i.imgur.com/V5L9dPi.jpeg',
                        'https://i.imgur.com/M7HEAMA.jpeg', 
                        'https://i.postimg.cc/6Qg98z6c/afad52c0-2045-11f1-9b80-ed972216ff4e.jpg',
                        'https://i.postimg.cc/G3jZNq0G/129b1930-2046-11f1-9b80-ed972216ff4e.jpg',
                        'https://i.postimg.cc/BQ6wz3B9/16b24f20-2046-11f1-9b80-ed972216ff4e.jpg',        
                    ];
                    const randomBG = backgrounds[Math.floor(Math.random() * backgrounds.length)];
                    const background = await loadImage(randomBG);

                    
                    const avatarURL = await getAvatarUrl(userFbId);
                    const avatarData = await axios.get(avatarURL, { responseType: "arraybuffer" });
                    const avatar = await loadImage(avatarData.data);

                    
                    const canvas = createCanvas(background.width, background.height);
                    const ctx = canvas.getContext("2d");
                    ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

                    
                    const r = 90;
                    const x = canvas.width / 2;
                    const y = canvas.height / 2 - 80;
                    ctx.save();
                    ctx.beginPath();
                    ctx.arc(x, y, r, 0, Math.PI * 2);
                    ctx.clip();
                    ctx.drawImage(avatar, x - r, y - r, r * 2, r * 2);
                    ctx.restore();

                    
                    ctx.font = "bold 38px Arial";
                    ctx.fillStyle = "#ffffff";
                    ctx.textAlign = "center";
                    ctx.fillText(fullName, x, y + r + 40);

                    
                    const cacheDir = path.join(__dirname, 'cache');
                    await fs.ensureDir(cacheDir);
                    const imgPath = path.join(cacheDir, `join_${userFbId}.png`);
                    fs.writeFileSync(imgPath, canvas.toBuffer());

                    
                    const textMsg = `╮─◦─◦─◦─◦─◦─◦─◦─◦─◦─◦─◦─╭
○ ¦  اهلا بــك يــا  『 ${fullName} 』
○ ¦  في مجموعة  『 ${groupName} 』
○ ¦  الاعــضــــاء  『 ${memberCount} 』
○ ¦  الوقـت الآن  『 ${currentTime} 』
○ ¦  تـــــذكــيـــر  『 واذكـر الـلـه ذكـرا كـثيـرا 🤍 』
╯─◦─◦─◦─◦─◦─◦─◦─◦─◦─◦─◦─╰`;

                    await api.sendMessage(
                        { body: textMsg, attachment: fs.createReadStream(imgPath) },
                        threadID,
                        () => fs.unlinkSync(imgPath)
                    );
                }
                break;
            }

            case "log:unsubscribe": {
                const leftParticipantId = logMessageData.leftParticipantFbId;
                try {
                    const userInfo = await api.getUserInfo(leftParticipantId);
                    const userName = userInfo[leftParticipantId].name;
                    api.sendMessage(`وداعًا ${userName}، لقد غادر/ت المجموعة.`, threadID);
                } catch (e) {
                    api.sendMessage("أحد الأعضاء غادر المجموعة.", threadID);
                }
                break;
            }

            case "log:thread-admins": {
                const targetID = logMessageData.TARGET_ID;
                const adminAction = logMessageData.ADMIN_EVENT;
                try {
                    const userInfo = await api.getUserInfo(targetID);
                    const userName = userInfo[targetID].name;
                    let message = "";
                    if (adminAction === "add_admin") {
                        message = `◈ ¦ إشعار: تمت ترقية ${userName} ليصبح مشرفًا.`;
                    } else if (adminAction === "remove_admin") {
                        message = `◈ ¦ إشعار: تمت إزالة ${userName} من الإشراف.`;
                    }
                    if (message) api.sendMessage(message, threadID);
                } catch (e) {
                    api.sendMessage("تم تحديث قائمة المشرفين.", threadID);
                }
                break;
            }

            
        }
    } catch (error) {
        console.error("حدث خطأ في معالجة الحدث:", error);
    }
};

module.exports.HakimRun = async function({ api, event }) {
    api.sendMessage("هذا الأمر يعمل تلقائيًا مع أحداث المجموعة. لا حاجة لتفعيله يدويًا.", event.threadID, event.messageID);
};