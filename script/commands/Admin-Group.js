const axios = require('axios');

module.exports.config = {
    title: "مجموعة",
    release: "1.0.0",
    clearance: 1,
    author: "Hakim Tracks",
    summary: "ادارة المجموعة (صورة، اسم، ايموجي، طرد، اضافة، ترقية، تنزيل، قفل، فتح، معلومات، كنية، كنية-الكل، حظر، الغاء_حظر، محظورين)",
    section: "الادمــــن",
    syntax: "مجموعة [صورة|اسم|ايموجي|طرد|اضافة|ارفع|ازالة|عرض|كنية|كنية-الكل|بان|نوبان|محظورين]",
    delay: 5,
};

module.exports.HakimRun = async function({ api, event, args, userData }) {
    const { threadID, messageID, senderID, mentions, messageReply } = event;
    const subCommand = args[0]?.toLowerCase();

    if (subCommand === "بان" || subCommand === "ban") {
        let targetID = null;
        let targetName = "العضو";
        let reason = args.slice(1).join(" ");
        
        if (Object.keys(mentions).length > 0) {
            targetID = Object.keys(mentions)[0];
            targetName = mentions[targetID];
            reason = reason.replace(new RegExp(`@${mentions[targetID]}`, 'g'), "").trim();
        } else if (messageReply?.senderID) {
            targetID = messageReply.senderID;
            try {
                const userInfo = await api.getUserInfo(targetID);
                targetName = userInfo[targetID].name;
            } catch(e) {}
        } else if (args[1] && !isNaN(args[1])) {
            targetID = args[1];
            reason = args.slice(2).join(" ");
            try {
                const userInfo = await api.getUserInfo(targetID);
                targetName = userInfo[targetID].name;
            } catch(e) {}
        }
        
        if (!targetID) {
            return api.sendMessage(" منشن العضو او رد على رسالته او اكتب معرفه لحظره", threadID, messageID);
        }
        
        if (targetID === api.getCurrentUserID()) {
            return api.sendMessage("✘ لا يمكنك حظر البوت", threadID, messageID);
        }
        
        try {
            const threadInfo = await api.getThreadInfo(threadID);
            const isTargetAdmin = threadInfo.adminIDs.some(admin => admin.id === targetID);
            if (isTargetAdmin && senderID !== targetID) {
                return api.sendMessage("◆ لا يمكن حظر ادمن المجموعة", threadID, messageID);
            }
        } catch(e) {}
        
        const existingBan = userData.isLocallyBanned(targetID, threadID);
        if (existingBan) {
            return api.sendMessage(` ${targetName} محظور بالفعل في هذه المجموعة`, threadID, messageID);
        }
        
        const banReason = reason || "لا يوجد سبب";
        userData.localBan(targetID, threadID, senderID, banReason);
        
        try {
            await api.removeUserFromGroup(targetID, threadID);
            api.sendMessage(`● ${targetName} تم حظره وطرده من المجموعة\n■ السبب: ${banReason}`, threadID, messageID);
        } catch(e) {
            api.sendMessage(`● ${targetName} تم حظره في هذه المجموعة\n■ السبب: ${banReason}\n لم يتم طرده بسبب صلاحيات البوت`, threadID, messageID);
        }
        
        return;
    }
    
    if (subCommand === "نوبان" || subCommand === "unban") {
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
            return api.sendMessage(" منشن العضو او اكتب معرفه لالغاء حظره", threadID, messageID);
        }
        
        const existingBan = userData.isLocallyBanned(targetID, threadID);
        if (!existingBan) {
            return api.sendMessage(` ${targetName} غير محظور في هذه المجموعة`, threadID, messageID);
        }
        
        userData.localUnban(targetID, threadID);
        api.sendMessage(`✔ تم الغاء حظر ${targetName} في هذه المجموعة`, threadID, messageID);
        
        try {
            await api.addUserToGroup(targetID, threadID);
            api.sendMessage(`✔ تمت اعادة ${targetName} إلى المجموعة`, threadID);
        } catch(e) {}
        
        return;
    }
    
    if (subCommand === "محظورين" || subCommand === "banned") {
        const bannedList = userData.getLocalBannedList(threadID);
        
        if (bannedList.length === 0) {
            return api.sendMessage("◆ لا يوجد اعضاء محظورون في هذه المجموعة", threadID, messageID);
        }
        
        let msg = `● قائمة المحظورين في هذه المجموعة\n◇━━━━━━━━━━━━━◇\n\n`;
        
        for (let i = 0; i < bannedList.length; i++) {
            const ban = bannedList[i];
            let userName = "غير معروف";
            try {
                const userInfo = await api.getUserInfo(ban.user_id);
                userName = userInfo[ban.user_id]?.name || ban.user_id;
            } catch(e) {}
            
            msg += `${i + 1}. ${userName}\n`;
            msg += `   ◆ ايدي: ${ban.user_id}\n`;
            msg += `   ■ السبب: ${ban.reason}\n`;
            msg += `   ● تاريخ: ${new Date(ban.banned_at).toLocaleString()}\n\n`;
        }
        
        msg += ` لالغاء حظر: مجموعة الغاء_حظر [ايدي المستخدم]`;
        api.sendMessage(msg, threadID, messageID);
        return;
    }

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
            return api.sendMessage(" رد على صورة لتغيير صورة المجموعة", threadID, messageID);
        }
        
        try {
            const stream = (await axios({ url: imageUrl, responseType: 'stream' })).data;
            await api.changeGroupImage(stream, threadID);
            api.sendMessage("✔ تم تغيير صورة المجموعة بنجاح", threadID, messageID);
        } catch(e) {
            api.sendMessage(`✘ فشل تغيير الصورة: ${e.message}`, threadID, messageID);
        }
    }
    
    else if (subCommand === "اسم" || subCommand === "name") {
        const newName = args.slice(1).join(" ");
        if (!newName) return api.sendMessage(" اكتب الاسم الجديد بعد الامر", threadID, messageID);
        
        try {
            await api.setTitle(newName, threadID);
            api.sendMessage(`✔ تم تغيير اسم المجموعة إلى: ${newName}`, threadID, messageID);
        } catch(e) {
            api.sendMessage("✘ فشل تغيير الاسم", threadID, messageID);
        }
    }
    
    else if (subCommand === "ايموجي" || subCommand === "emoji") {
        const newEmoji = args[1];
        if (!newEmoji) return api.sendMessage(" اكتب الايموجي بعد الامر\nمثال: مجموعة ايموجي 🤖", threadID, messageID);
        
        try {
            await api.changeThreadEmoji(newEmoji, threadID);
            api.sendMessage(`✔ تم تغيير ايموجي المجموعة إلى: ${newEmoji}`, threadID, messageID);
        } catch(e) {
            api.sendMessage("✘ فشل تغيير الايموجي", threadID, messageID);
        }
    }
    
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
            return api.sendMessage(" منشن العضو او رد على رسالته او اكتب معرفه", threadID, messageID);
        }
        
        if (targetID === api.getCurrentUserID()) {
            return api.sendMessage("✘ لا يمكنك طرد البوت", threadID, messageID);
        }
        
        try {
            await api.removeUserFromGroup(targetID, threadID);
            api.sendMessage(`● ${targetName} تم طرده من المجموعة`, threadID, messageID);
        } catch(e) {
            api.sendMessage("✘ فشل الطرد، تاكد من صلاحيات البوت", threadID, messageID);
        }
    }
    
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
            return api.sendMessage(" اكتب معرف المستخدم او منشن له", threadID, messageID);
        }
        
        try {
            await api.addUserToGroup(targetID, threadID);
            api.sendMessage("✔ تم اضافة العضو بنجاح", threadID, messageID);
        } catch(e) {
            api.sendMessage("✘ فشل الاضافة، تاكد من المعرف او رابط الصداقة", threadID, messageID);
        }
    }
    
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
            return api.sendMessage(" منشن العضو او رد على رسالته او اكتب معرفه", threadID, messageID);
        }
        
        try {
            await api.changeAdminStatus(threadID, targetID, true);
            api.sendMessage(`✔ تم رفع ${targetName} إلى ادمن`, threadID, messageID);
        } catch(e) {
            api.sendMessage("✘ فشل الترقية", threadID, messageID);
        }
    }
    
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
            return api.sendMessage(" منشن العضو او رد على رسالته او اكتب معرفه", threadID, messageID);
        }
        
        try {
            await api.changeAdminStatus(threadID, targetID, false);
            api.sendMessage(`● تم تنزيل ${targetName} من الادمن`, threadID, messageID);
        } catch(e) {
            api.sendMessage("✘ فشل التنزيل", threadID, messageID);
        }
    }
    
    else if (subCommand === "عرض" || subCommand === "info") {
        try {
            const threadInfo = await api.getThreadInfo(threadID);
            const bannedCount = userData.getLocalBannedList(threadID).length;
            
            const msg = 
`■━━━━━[ معلومات المجموعة ]━━━━━■
│  الاسم: ${threadInfo.name}
│  المعرف: ${threadID}
│  الاعضاء: ${threadInfo.participantIDs.length}
│  الادمن: ${threadInfo.adminIDs.length}
│  محظورين: ${bannedCount}
│ ${threadInfo.emoji ? ` الايموجي: ${threadInfo.emoji}\n│ ` : ""}
□━━━━━━━━━━━━━━━━━━━━━━━━━□`;
            
            api.sendMessage(msg, threadID, messageID);
        } catch(e) {
            api.sendMessage("✘ فشل جلب معلومات المجموعة", threadID, messageID);
        }
    }
    
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
            return api.sendMessage(" منشن العضو او اكتب معرفه", threadID, messageID);
        }

        try {
            await api.changeNickname(nickname, threadID, targetID);
            return api.sendMessage(`✔ ${nickname ? "تم تغيير" : "تم حذف"} الكنية بنجاح`, threadID, messageID);
        } catch(err) { 
            return api.sendMessage("✘ فشل تغيير الكنية", threadID, messageID); 
        }
    }
    
    else if (subCommand === "كنية-الكل" || subCommand === "nickall") {
        const pattern = args.slice(1).join(" ");
        if (!pattern) {
            return api.sendMessage(
                " اكتب نمط الكنية بعد الامر\nمثال: مجموعة كنية-الكل ٭ [جنس] ✗ [اسم] ٭\nكلمة 'اسم' تستبدل باسم العضو، و'جنس' تستبدل بـ (مواطن/مواطنة)",
                threadID, messageID
            );
        }
        
        try {
            const threadInfo = await api.getThreadInfo(threadID);
            const members = threadInfo.userInfo;
            let successCount = 0;
            
            api.sendMessage(`◆ جاري تغيير كنية لـ ${members.length} عضو...`, threadID);
            
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
                `✔ اكتملت العملية\n◆ تم تغيير كنية ${successCount}/${members.length} عضو`,
                threadID, messageID
            );
        } catch(err) { 
            return api.sendMessage("✘ فشل تنفيذ الامر الجماعي", threadID, messageID); 
        }
    }
    
    else {
        const msg = 
`◆━━━━━[ ادارة المجموعة ]━━━━━◆
│ الاوامر المتاحة:
│ ■ صورة - تغيير الصورة (رد)
│ ■ اسم [الاسم] - تغيير الاسم
│ ■ ايموجي [الايموجي] - تغيير الايموجي
│ ■ طرد [@منشن|رد|معرف] - طرد
│ ■ اضافة [معرف|@منشن] - اضافة
│ ■ ارفع [@منشن|رد|معرف] - ترقية
│ ■ ازالة [@منشن|رد|معرف] - تنزيل
│ ■ عرض - معلومات المجموعة
│ ■ كنية [@منشن|رد] [الكنية] - كنية
│ ■ كنية-الكل [النمط] - كنية الجميع
│ ■ حظر [@منشن|رد|معرف] [سبب] - حظر عضو
│ ■ الغاء_حظر [@منشن|معرف] - الغاء حظر
│ ■ محظورين - عرض المحظورين
│
│ ◆ امثلة:
│ مجموعة حظر @العضو سب الشتائم
│ مجموعة الغاء_حظر @العضو
│ مجموعة كنية-الكل ٭ [جنس] ✗ [اسم] ٭
━━━━━━━━━━━━━━━━━━━━━━━━━`;
        
        api.sendMessage(msg, threadID, messageID);
    }
};