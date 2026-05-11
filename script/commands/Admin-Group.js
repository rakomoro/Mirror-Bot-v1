const axios = require('axios');

module.exports.config = {
    title: "مجموعة",
    release: "1.0.0",
    clearance: 1,
    author: "Hakim Tracks",
    summary: "إدارة المجموعة (صورة، اسم، ايموجي، طرد، اضافة، ترقية، تنزيل، قفل، فتح، معلومات، كنية، كنية-الكل)",
    section: "الادمــــن",
    syntax: "مجموعة [صورة|اسم|ايموجي|طرد|اضافة|ارفع|ازالة|عرض|كنية|كنية-الكل]",
    delay: 5,
};

module.exports.HakimRun = async function({ api, event, args }) {
    const { threadID, messageID, senderID, mentions, messageReply } = event;
    const subCommand = args[0]?.toLowerCase();

    // ==================== تغيير الصورة ====================
    if (subCommand === "صورة" || subCommand === "avatar" || subCommand === "image") {
        let imageUrl = null;
        
        if (messageReply?.attachments?.length > 0) {
            const attachment = messageReply.attachments[0];
            if (attachment.type === "photo" || attachment.type === "animated_image") {
                imageUrl = attachment.url;
            }
        }
        
        if (!imageUrl && event.attachments?.length > 0 && event.attachments[0].type === "photo") {
            imageUrl = event.attachments[0].url;
        }
        
        if (!imageUrl) {
            return api.sendMessage("⚠️ رد على صورة لتغيير صورة المجموعة", threadID, messageID);
        }
        
        try {
            const stream = (await axios({ url: imageUrl, responseType: 'stream' })).data;
            await api.changeGroupImage(stream, threadID);
            api.sendMessage("✅ تم تغيير صورة المجموعة بنجاح", threadID, messageID);
        } catch(e) {
            api.sendMessage(`❌ فشل تغيير الصورة: ${e.message}`, threadID, messageID);
        }
    }
    
    // ==================== تغيير الاسم ====================
    else if (subCommand === "اسم" || subCommand === "name") {
        const newName = args.slice(1).join(" ");
        if (!newName) return api.sendMessage("⚠️ اكتب الاسم الجديد بعد الأمر", threadID, messageID);
        
        try {
            await api.setTitle(newName, threadID);
            api.sendMessage(`✅ تم تغيير اسم المجموعة إلى: ${newName}`, threadID, messageID);
        } catch(e) {
            api.sendMessage("❌ فشل تغيير الاسم", threadID, messageID);
        }
    }
    
    // ==================== تغيير الإيموجي ====================
    else if (subCommand === "ايموجي" || subCommand === "emoji") {
        const newEmoji = args[1];
        if (!newEmoji) return api.sendMessage("⚠️ اكتب الإيموجي بعد الأمر\nمثال: مجموعة ايموجي 🤖", threadID, messageID);
        
        try {
            await api.changeThreadEmoji(newEmoji, threadID);
            api.sendMessage(`✅ تم تغيير إيموجي المجموعة إلى: ${newEmoji}`, threadID, messageID);
        } catch(e) {
            api.sendMessage("❌ فشل تغيير الإيموجي", threadID, messageID);
        }
    }
    
    // ==================== طرد عضو ====================
    else if (subCommand === "طرد" || subCommand === "kick") {
        let targetID = null;
        let targetName = "العضو";
        
        if (Object.keys(mentions).length > 0) {
            targetID = Object.keys(mentions)[0];
            targetName = mentions[targetID];
        } else if (messageReply?.senderID) {
            targetID = messageReply.senderID;
            try {
                const userInfo = await api.getUserInfo(targetID);
                targetName = userInfo[targetID].name;
            } catch(e) {}
        } else if (args[1] && !isNaN(args[1])) {
            targetID = args[1];
            try {
                const userInfo = await api.getUserInfo(targetID);
                targetName = userInfo[targetID].name;
            } catch(e) {}
        }
        
        if (!targetID) {
            return api.sendMessage("⚠️ منشن العضو أو رد على رسالته أو اكتب معرفه", threadID, messageID);
        }
        
        if (targetID === api.getCurrentUserID()) {
            return api.sendMessage("عيب تطردني من المجموعة 😢", threadID, messageID);
        }
        
        try {
            await api.removeUserFromGroup(targetID, threadID);
            api.sendMessage(`👋 ${targetName} اترمي برا`, threadID, messageID);
        } catch(e) {
            api.sendMessage("❌ فشل الطرد، تأكد من صلاحيات البوت", threadID, messageID);
        }
    }
    
    // ==================== إضافة عضو ====================
    else if (subCommand === "اضافة" || subCommand === "add") {
        let targetID = null;
        
        if (Object.keys(mentions).length > 0) {
            targetID = Object.keys(mentions)[0];
        } else if (messageReply?.senderID) {
            targetID = messageReply.senderID;
        } else if (args[1] && !isNaN(args[1])) {
            targetID = args[1];
        }
        
        if (!targetID) {
            return api.sendMessage("⚠️ اكتب معرف المستخدم أو منشن له", threadID, messageID);
        }
        
        try {
            await api.addUserToGroup(targetID, threadID);
            api.sendMessage("✅ تم إضافة العضو بنجاح", threadID, messageID);
        } catch(e) {
            api.sendMessage("❌ فشل الإضافة، تأكد من المعرف أو رابط الصداقة", threadID, messageID);
        }
    }
    
    // ==================== ترقية إلى أدمن ====================
    else if (subCommand === "ارفع" || subCommand === "promote") {
        let targetID = null;
        let targetName = "العضو";
        
        if (Object.keys(mentions).length > 0) {
            targetID = Object.keys(mentions)[0];
            targetName = mentions[targetID];
        } else if (messageReply?.senderID) {
            targetID = messageReply.senderID;
            try {
                const userInfo = await api.getUserInfo(targetID);
                targetName = userInfo[targetID].name;
            } catch(e) {}
        } else if (args[1] && !isNaN(args[1])) {
            targetID = args[1];
            try {
                const userInfo = await api.getUserInfo(targetID);
                targetName = userInfo[targetID].name;
            } catch(e) {}
        }
        
        if (!targetID) {
            return api.sendMessage("⚠️ منشن العضو أو رد على رسالته أو اكتب معرفه", threadID, messageID);
        }
        
        try {
            await api.changeAdminStatus(threadID, targetID, true);
            api.sendMessage(`👑 تم رفع ${targetName} إلى أدمن`, threadID, messageID);
        } catch(e) {
            api.sendMessage("❌ فشل الترقية", threadID, messageID);
        }
    }
    
    // ==================== تنزيل من الأدمن ====================
    else if (subCommand === "ازالة" || subCommand === "demote") {
        let targetID = null;
        let targetName = "العضو";
        
        if (Object.keys(mentions).length > 0) {
            targetID = Object.keys(mentions)[0];
            targetName = mentions[targetID];
        } else if (messageReply?.senderID) {
            targetID = messageReply.senderID;
            try {
                const userInfo = await api.getUserInfo(targetID);
                targetName = userInfo[targetID].name;
            } catch(e) {}
        } else if (args[1] && !isNaN(args[1])) {
            targetID = args[1];
            try {
                const userInfo = await api.getUserInfo(targetID);
                targetName = userInfo[targetID].name;
            } catch(e) {}
        }
        
        if (!targetID) {
            return api.sendMessage("⚠️ منشن العضو أو رد على رسالته أو اكتب معرفه", threadID, messageID);
        }
        
        try {
            await api.changeAdminStatus(threadID, targetID, false);
            api.sendMessage(`⬇️ تم تنزيل ${targetName} من الأدمن`, threadID, messageID);
        } catch(e) {
            api.sendMessage("❌ فشل التنزيل", threadID, messageID);
        }
    }
    
    // ==================== قفل المجموعة ====================
    else if (subCommand === "قفل" || subCommand === "lock") {
        return api.sendMessage("🔒 تم قفل المجموعة (الميزة قيد التطوير)", threadID, messageID);
    }
    
    // ==================== فتح المجموعة ====================
    else if (subCommand === "فتح" || subCommand === "unlock") {
        return api.sendMessage("🔓 تم فتح المجموعة (الميزة قيد التطوير)", threadID, messageID);
    }
    
    // ==================== معلومات المجموعة ====================
    else if (subCommand === "عرض" || subCommand === "info") {
        try {
            const threadInfo = await api.getThreadInfo(threadID);
            const msg = 
`╭━━━━━[ معلومات المجموعة ]━━━━━╮
│  الاسم: ${threadInfo.name}
│  المعرف: ${threadID}
│  الأعضاء: ${threadInfo.participantIDs.length}
│  الأدمن: ${threadInfo.adminIDs.length}
│ ${threadInfo.emoji ? ` الإيموجي: ${threadInfo.emoji}\n│ ` : ""}
╰━━━━━━━━━━━━━━━━━━━━━━━━━╯`;
            
            api.sendMessage(msg, threadID, messageID);
        } catch(e) {
            api.sendMessage("❌ فشل جلب معلومات المجموعة", threadID, messageID);
        }
    }
    
    // ==================== كنية (فردية) ====================
    else if (subCommand === "كنية" || subCommand === "nick") {
        let targetID = null;
        let nickname = "";
        
        if (Object.keys(mentions).length > 0) {
            targetID = Object.keys(mentions)[0];
            nickname = args.slice(1).join(" ").replace(new RegExp(`@${mentions[targetID]}`, 'g'), "").trim();
        } else if (messageReply?.senderID) {
            targetID = messageReply.senderID;
            nickname = args.slice(1).join(" ").trim();
        } else if (args[1] && !isNaN(args[1])) {
            targetID = args[1];
            nickname = args.slice(2).join(" ").trim();
        } else {
            targetID = senderID;
            nickname = args.slice(1).join(" ").trim();
        }

        if (!targetID) {
            return api.sendMessage("⚠️ منشن العضو أو اكتب معرفه", threadID, messageID);
        }

        try {
            await api.changeNickname(nickname, threadID, targetID);
            return api.sendMessage(`✅ ${nickname ? "تم تغيير" : "تم حذف"} الكنية بنجاح`, threadID, messageID);
        } catch(err) { 
            return api.sendMessage("❌ فشل تغيير الكنية", threadID, messageID); 
        }
    }

    // ==================== كنية-الكل ====================
    else if (subCommand === "كنية-الكل" || subCommand === "nickall") {
        const pattern = args.slice(1).join(" ");
        if (!pattern) {
            return api.sendMessage(
                "⚠️ اكتب نمط الكنية بعد الأمر\nمثال: مجموعة كنية-الكل ٭ [جنس] ✗ [اسم] ٭\nكلمة 'اسم' تستبدل باسم العضو، و'جنس' تستبدل بـ (مواطن/مواطنة)",
                threadID, messageID
            );
        }
        
        try {
            const threadInfo = await api.getThreadInfo(threadID);
            const members = threadInfo.userInfo;
            let successCount = 0;
            
            api.sendMessage(`⏳ جاري تغيير كنية لـ ${members.length} عضو...`, threadID);
            
            for (const member of members) {
                let newNickname = pattern;
                newNickname = newNickname.replace(/اسم/g, member.firstName || member.name?.split(" ")[0] || "عضو");
                const genderTerm = (member.gender === 1 || member.gender === "FEMALE") ? "مواطنة" : "مواطن";
                newNickname = newNickname.replace(/جنس/g, genderTerm);
                
                try {
                    await api.changeNickname(newNickname, threadID, member.id);
                    successCount++;
                    await new Promise(resolve => setTimeout(resolve, 500));
                } catch(e) {}
            }
            
            return api.sendMessage(
                `✅ اكتملت العملية\n👥 تم تغيير كنية ${successCount}/${members.length} عضو`,
                threadID, messageID
            );
        } catch(err) { 
            return api.sendMessage("❌ فشل تنفيذ الأمر الجماعي", threadID, messageID); 
        }
    }

    // ==================== القائمة الرئيسية ====================
    else {
        const msg = 
`╭━━━━━[ إدارة المجموعة ]━━━━━╮
│ الأوامر المتاحة:
│ ◆ صورة - تغيير الصورة (رد)
│ ◆ اسم [الاسم] - تغيير الاسم
│ ◆ ايموجي [الإيموجي] - تغيير الإيموجي
│ ◆ طرد [@منشن|رد|معرف] - طرد
│ ◆ اضافة [معرف|@منشن] - إضافة
│ ◆ ارفع [@منشن|رد|معرف] - ترقية
│ ◆ ازالة [@منشن|رد|معرف] - تنزيل
│ ◆ عرض - معلومات المجموعة
│ ◆ كنية [@منشن|رد] [الكنية] - كنية
│ ◆ كنية-الكل [النمط] - كنية الجميع
│
│ ※ أمثلة:
│ مجموعة كنية @العضو ملك
│ مجموعة كنية-الكل ٭ [جنس] ✗ [اسم] ٭
╰━━━━━━━━━━━━━━━━━━━━━━━━━╯`;
        
        api.sendMessage(msg, threadID, messageID);
    }
};