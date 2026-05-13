const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");

module.exports.config = {
    title: "ادارة",
    release: "3.0.0",
    clearance: 2,
    author: "Hakim Tracks",
    summary: "أوامر إدارية للتحكم بالبوت",
    section: "المطور",
    syntax: "ادارة [حظر|الغاء_حظر|حظر_جروب|الغاء_حظر_جروب|لاست|غادر|اشعار|طلبات|تشغيل|ايقاف|احصائيات]",
    delay: 5,
};

// دالة للحصول على ID المستهدف
function getTargetUser(event, args) {
    // 1. منشن
    if (event.mentions && Object.keys(event.mentions).length > 0) {
        return Object.keys(event.mentions)[0];
    }
    // 2. رد على رسالة
    if (event.messageReply && event.messageReply.senderID) {
        return event.messageReply.senderID;
    }
    // 3. ID من النص
    if (args[1] && /^[0-9]+$/.test(args[1])) {
        return args[1];
    }
    return null;
}

module.exports.HakimRun = async ({ api, event, args, config, userData }) => {
    const { threadID, messageID, senderID } = event;
    const action = args[0]?.toLowerCase();

    // التحقق من الصلاحية
    if (!config.ADMINBOT.includes(senderID)) {
        return api.sendMessage("❌ ليس لديك الصلاحية لاستخدام هذا الأمر.", threadID, messageID);
    }

    // ============= حظر مستخدم عالمياً =============
    if (action === "حظر") {
        const targetID = getTargetUser(event, args);
        
        if (!targetID) {
            return api.sendMessage(
                "📌 الاستخدام:\n" +
                "• ادارة حظر [ايدي المستخدم] [السبب]\n" +
                "• ادارة حظر @منشن [السبب]\n" +
                "• (رد على رسالة الشخص) ادارة حظر [السبب]\n\n" +
                "مثال: ادارة حظر 123456789 التحرش",
                threadID, messageID
            );
        }
        
        const reason = args.slice(2).join(" ") || "لا يوجد سبب";
        
        // منع حظر المطورين
        if (config.ADMINBOT.includes(targetID)) {
            return api.sendMessage("❌ لا يمكن حظر مطور آخر!", threadID, messageID);
        }
        
        // التحقق من الحظر الموجود
        const isBanned = userData.isGloballyBanned(targetID);
        if (isBanned) {
            return api.sendMessage(`⚠️ المستخدم ${targetID} محظور بالفعل`, threadID, messageID);
        }
        
        // تنفيذ الحظر
        userData.globalBan(targetID, senderID, reason);
        
        // جلب اسم المستخدم
        let userName = targetID;
        try {
            const info = await api.getUserInfo(targetID);
            userName = info[targetID]?.name || targetID;
        } catch(e) {}
        
        return api.sendMessage(
            `✅ تم حظر المستخدم عالمياً\n\n` +
            `👤 المستخدم: ${userName}\n` +
            `🆔 المعرف: ${targetID}\n` +
            `📝 السبب: ${reason}`,
            threadID, messageID
        );
    }

    // ============= إلغاء الحظر العالمي =============
    if (action === "الغاء_حظر") {
        const targetID = getTargetUser(event, args);
        
        if (!targetID) {
            return api.sendMessage(
                "📌 الاستخدام:\n" +
                "• ادارة الغاء_حظر [ايدي المستخدم]\n" +
                "• ادارة الغاء_حظر @منشن\n" +
                "• (رد على رسالة الشخص) ادارة الغاء_حظر",
                threadID, messageID
            );
        }
        
        const isBanned = userData.isGloballyBanned(targetID);
        if (!isBanned) {
            return api.sendMessage(`⚠️ المستخدم ${targetID} غير محظور`, threadID, messageID);
        }
        
        userData.globalUnban(targetID);
        
        let userName = targetID;
        try {
            const info = await api.getUserInfo(targetID);
            userName = info[targetID]?.name || targetID;
        } catch(e) {}
        
        return api.sendMessage(`✅ تم إلغاء الحظر عن المستخدم ${userName}`, threadID, messageID);
    }

    // ============= حظر مجموعة =============
    if (action === "حظر_جروب") {
        const targetGroupID = args[1] || threadID;
        const reason = args.slice(2).join(" ") || "لا يوجد سبب";
        
        const isBanned = userData.isGroupBanned(targetGroupID);
        if (isBanned) {
            return api.sendMessage(`⚠️ المجموعة ${targetGroupID} محظورة بالفعل`, threadID, messageID);
        }
        
        userData.banGroup(targetGroupID, senderID, reason);
        return api.sendMessage(`✅ تم حظر المجموعة ${targetGroupID}\n📝 السبب: ${reason}`, threadID, messageID);
    }

    // ============= إلغاء حظر مجموعة =============
    if (action === "الغاء_حظر_جروب") {
        const targetGroupID = args[1] || threadID;
        
        const isBanned = userData.isGroupBanned(targetGroupID);
        if (!isBanned) {
            return api.sendMessage(`⚠️ المجموعة ${targetGroupID} غير محظورة`, threadID, messageID);
        }
        
        userData.unbanGroup(targetGroupID);
        return api.sendMessage(`✅ تم إلغاء حظر المجموعة ${targetGroupID}`, threadID, messageID);
    }

    // ============= مساعدة =============
    const helpMsg = 
`📋 أوامر الإدارة

• ادارة حظر [ايدي|@منشن] [سبب] - حظر مستخدم عالمياً
• ادارة الغاء_حظر [ايدي|@منشن] - إلغاء الحظر العالمي
• ادارة حظر_جروب [ايدي] [سبب] - حظر مجموعة
• ادارة الغاء_حظر_جروب [ايدي] - إلغاء حظر مجموعة
• ادارة لاست - عرض المجموعات
• ادارة غادر [ايدي] - مغادرة مجموعة
• ادارة اشعار [رسالة] - إرسال إشعار للجميع
• ادارة طلبات - عرض طلبات المجموعات
• ادارة تشغيل/ايقاف - تشغيل/إيقاف البوت
• ادارة احصائيات - عرض الإحصائيات`;
    
    return api.sendMessage(helpMsg, threadID, messageID);
};

// ============= معالج الردود =============
module.exports.HakimReply = async ({ api, event, HakimReply, userData }) => {
    const { type, author, groupsData, pendingData } = HakimReply;
    const { threadID, messageID, senderID, body, attachments } = event;
    
    if (senderID !== author) return;
    
    // معالجة قائمة المجموعات
    if (type === "group_list" && groupsData) {
        const match = body?.trim().toLowerCase().match(/(حظر|الغاء_حظر|غادر|ضيفني)\s*(\d+)/);
        if (!match) return api.sendMessage("استخدم: حظر 1", threadID, messageID);
        
        const cmd = match[1];
        const group = groupsData.find(g => g.index === parseInt(match[2]));
        if (!group) return api.sendMessage("رقم غير صحيح", threadID, messageID);
        
        if (cmd === "حظر") {
            userData.banGroup(group.id, senderID, "حظر عبر لاست");
            api.sendMessage(`✅ تم حظر ${group.name}`, threadID, messageID);
        } else if (cmd === "الغاء_حظر") {
            userData.unbanGroup(group.id);
            api.sendMessage(`✅ تم إلغاء حظر ${group.name}`, threadID, messageID);
        } else if (cmd === "غادر") {
            await api.removeUserFromGroup(api.getCurrentUserID(), group.id);
            api.sendMessage(`✅ تم مغادرة ${group.name}`, threadID, messageID);
        } else if (cmd === "ضيفني") {
            await api.addUserToGroup(senderID, group.id);
            api.sendMessage(`✅ تمت إضافتك إلى ${group.name}`, threadID, messageID);
        }
        
        try { await api.unsendMessage(HakimReply.messageID); } catch(e) {}
        return;
    }
    
    // معالجة طلبات المجموعات
    if (type === "pending_groups" && pendingData) {
        const reply = body?.trim().toLowerCase();
        
        if (reply === "موافقة الكل") {
            for (const group of pendingData) {
                try { await api.handleGroupRequest(group.id, true); } catch(e) {}
            }
            api.sendMessage(`✅ تم قبول جميع الطلبات`, threadID, messageID);
        } else {
            const match = reply.match(/(موافقة|رفض)\s*(\d+)/);
            if (match) {
                const group = pendingData.find(g => g.index === parseInt(match[2]));
                if (group) {
                    await api.handleGroupRequest(group.id, match[1] === "موافقة");
                    api.sendMessage(`✅ ${match[1] === "موافقة" ? "قبول" : "رفض"} طلب ${group.name}`, threadID, messageID);
                }
            }
        }
        
        try { await api.unsendMessage(HakimReply.messageID); } catch(e) {}
        return;
    }
    
    // تغيير صورة البوت
    if (type === "set_avatar" && attachments?.[0]?.type === "photo") {
        const imgPath = path.join(__dirname, 'cache', `avatar_${Date.now()}.jpg`);
        try {
            const response = await axios.get(attachments[0].url, { responseType: 'arraybuffer' });
            await fs.writeFile(imgPath, response.data);
            await api.changeAvatar(fs.createReadStream(imgPath));
            await fs.unlink(imgPath);
            api.sendMessage("✅ تم تغيير صورة البوت", threadID, messageID);
        } catch(e) { api.sendMessage(`❌ فشل: ${e.message}`, threadID, messageID); }
        try { await api.unsendMessage(HakimReply.messageID); } catch(e) {}
        return;
    }
    
    // تغيير بايو البوت
    if (type === "set_bio" && body && body.length >= 3) {
        try {
            await api.changeBio(body);
            api.sendMessage(`✅ تم تغيير البايو إلى:\n${body}`, threadID, messageID);
        } catch(e) { api.sendMessage(`❌ فشل: ${e.message}`, threadID, messageID); }
        try { await api.unsendMessage(HakimReply.messageID); } catch(e) {}
        return;
    }
};