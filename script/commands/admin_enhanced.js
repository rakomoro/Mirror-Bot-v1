const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");

module.exports.config = {
    title: "ادارة",
    release: "3.0.0",
    clearance: 2,
    author: "Hakim Tracks",
    summary: "أوامر إدارية متقدمة للتحكم بالبوت والمجموعات",
    section: "الــمـطـور",
    syntax: "ادارة [لاست|ضيفني|حظر|الغاء_حظر|حظر_جروب|الغاء_حظر_جروب|غادر|اذاعة|اذاعة_صورة|صورة_بوت|بايو_بوت|طلبات|تشغيل|ايقاف|احصائيات]",
    delay: 5,
};

module.exports.HakimRun = async ({ api, event, args, config, userData }) => {
    const { threadID, messageID, senderID } = event;
    const action = args[0]?.toLowerCase();

    if (!config.ADMINBOT.includes(senderID)) {
        return api.sendMessage("🚫 ليس لديك الصلاحية لاستخدام هذا الأمر.", threadID, messageID);
    }

    // ============= أمر لاست (عرض المجموعات) =============
    if (action === "لاست" || action === "groups" || action === "list") {
        try {
            const allThreads = await api.getThreadList(200, null, ["INBOX"]);
            const groupThreads = allThreads.filter(t => t.isGroup && t.isSubscribed);
            
            if (groupThreads.length === 0) {
                return api.sendMessage("البوت ليس موجوداً في أي مجموعة حالياً", threadID, messageID);
            }
            
            let msg = "قائمة المجموعات التي فيها البوت\n━━━━━━━━━━━━━\n\n";
            const groupsData = [];
            
            for (let i = 0; i < groupThreads.length; i++) {
                const group = groupThreads[i];
                msg += `${i + 1}. ${group.name || "مجموعة بدون اسم"}\n`;
                msg += `   ايدي: ${group.threadID}\n`;
                msg += `   الاعضاء: ${group.participantIDs.length}\n\n`;
                groupsData.push({
                    id: group.threadID,
                    name: group.name || "مجموعة بدون اسم",
                    index: i + 1,
                    participantIDs: group.participantIDs
                });
            }
            
            msg += `رد على هذه الرسالة مع أحد الأوامر:\n`;
            msg += `• حظر [الرقم] - حظر المجموعة\n`;
            msg += `• الغاء_حظر [الرقم] - الغاء حظر المجموعة\n`;
            msg += `• غادر [الرقم] - مغادرة المجموعة\n`;
            msg += `• ضيفني [الرقم] - إضافتك إلى المجموعة`;
            
            api.sendMessage(msg, threadID, (err, info) => {
                if (err) return;
                Mirror.client.HakimReply.push({
                    name: module.exports.config.title,
                    messageID: info.messageID,
                    author: senderID,
                    type: "group_list",
                    groupsData: groupsData
                });
            }, messageID);
            return;
        } catch (error) {
            console.error(error);
            return api.sendMessage(`خطأ: ${error.message}`, threadID, messageID);
        }
    }

    // ============= حظر مستخدم =============
    if (action === "حظر" || action === "ban") {
        const targetID = args[1];
        const reason = args.slice(2).join(" ") || "لا يوجد سبب";
        
        if (!targetID) {
            return api.sendMessage("الاستخدام: ادارة حظر [معرف المستخدم] [السبب]", threadID, messageID);
        }
        
        if (config.ADMINBOT.includes(targetID)) {
            return api.sendMessage("لا يمكن حظر مطور آخر!", threadID, messageID);
        }
        
        const isBanned = userData.isGloballyBanned(targetID);
        if (isBanned) {
            return api.sendMessage(`المستخدم ${targetID} محظور بالفعل`, threadID, messageID);
        }
        
        userData.globalBan(targetID, senderID, reason);
        return api.sendMessage(`تم حظر المستخدم ${targetID}\nالسبب: ${reason}`, threadID, messageID);
    }

    // ============= الغاء حظر مستخدم =============
    if (action === "الغاء_حظر" || action === "unban") {
        const targetID = args[1];
        
        if (!targetID) {
            return api.sendMessage("الاستخدام: ادارة الغاء_حظر [معرف المستخدم]", threadID, messageID);
        }
        
        const isBanned = userData.isGloballyBanned(targetID);
        if (!isBanned) {
            return api.sendMessage(`المستخدم ${targetID} غير محظور`, threadID, messageID);
        }
        
        userData.globalUnban(targetID);
        return api.sendMessage(`تم الغاء حظر المستخدم ${targetID}`, threadID, messageID);
    }

    // ============= حظر مجموعة =============
    if (action === "حظر_جروب" || action === "ban_group") {
        const targetGroupID = args[1] || threadID;
        const reason = args.slice(2).join(" ") || "لا يوجد سبب";
        
        const isBanned = userData.isGroupBanned(targetGroupID);
        if (isBanned) {
            return api.sendMessage(`المجموعة ${targetGroupID} محظورة بالفعل`, threadID, messageID);
        }
        
        userData.banGroup(targetGroupID, senderID, reason);
        return api.sendMessage(`تم حظر المجموعة ${targetGroupID}\nالسبب: ${reason}`, threadID, messageID);
    }

    // ============= الغاء حظر مجموعة =============
    if (action === "الغاء_حظر_جروب" || action === "unban_group") {
        const targetGroupID = args[1] || threadID;
        
        const isBanned = userData.isGroupBanned(targetGroupID);
        if (!isBanned) {
            return api.sendMessage(`المجموعة ${targetGroupID} غير محظورة`, threadID, messageID);
        }
        
        userData.unbanGroup(targetGroupID);
        return api.sendMessage(`تم الغاء حظر المجموعة ${targetGroupID}`, threadID, messageID);
    }

    // ============= مغادرة مجموعة =============
    if (action === "غادر" || action === "leave") {
        const targetGroupID = args[1] || threadID;
        
        try {
            await api.removeUserFromGroup(api.getCurrentUserID(), targetGroupID);
            return api.sendMessage(`تم مغادرة المجموعة ${targetGroupID}`, threadID, messageID);
        } catch (error) {
            return api.sendMessage(`فشل مغادرة المجموعة: ${error.message}`, threadID, messageID);
        }
    }

    // ============= إيقاف البوت =============
    if (action === "ايقاف" || action === "stop") {
        global.isBotActive = false;
        return api.sendMessage("تم إيقاف البوت مؤقتاً", threadID, messageID);
    }

    // ============= تشغيل البوت =============
    if (action === "تشغيل" || action === "start") {
        global.isBotActive = true;
        return api.sendMessage("تم تشغيل البوت", threadID, messageID);
    }

    // ============= إحصائيات =============
    if (action === "احصائيات" || action === "stats") {
        const uptime = Date.now() - Mirror.client.startTime;
        const uptimeHours = Math.floor(uptime / 3600000);
        const uptimeMinutes = Math.floor((uptime % 3600000) / 60000);
        
        const globalBans = userData.getGlobalBannedList();
        const bannedGroups = userData.getBannedGroupsList();
        
        let msg = "احصائيات البوت\n━━━━━━━━━━━━━\n";
        msg += `الاوامر: ${Mirror.client.commands.size}\n`;
        msg += `الاحداث: ${Mirror.client.events.size}\n`;
        msg += `وقت التشغيل: ${uptimeHours}س ${uptimeMinutes}د\n`;
        msg += `محظورين عالمياً: ${globalBans.length}\n`;
        msg += `مجموعات محظورة: ${bannedGroups.length}\n`;
        msg += `حالة البوت: ${global.isBotActive ? "نشط" : "متوقف"}`;
        
        return api.sendMessage(msg, threadID, messageID);
    }

    // ============= إذاعة =============
    if (action === "اذاعة" || action === "broadcast") {
        if (args.length < 2) {
            return api.sendMessage("الاستخدام: ادارة اذاعة [الرسالة]", threadID, messageID);
        }
        
        const broadcastMessage = args.slice(1).join(" ");
        
        try {
            const allThreads = await api.getThreadList(200, null, ["INBOX"]);
            const groupThreads = allThreads.filter(t => t.isGroup && t.isSubscribed);
            
            let sentCount = 0;
            for (const group of groupThreads) {
                if (group.threadID !== threadID) {
                    try {
                        await api.sendMessage(broadcastMessage, group.threadID);
                        sentCount++;
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    } catch (e) {}
                }
            }
            return api.sendMessage(`تم ارسال الاذاعة الى ${sentCount} مجموعة`, threadID, messageID);
        } catch (error) {
            return api.sendMessage(`خطأ: ${error.message}`, threadID, messageID);
        }
    }

    // ============= إذاعة صورة =============
    if (action === "اذاعة_صورة" || action === "broadcast_image") {
        if (args.length < 3) {
            return api.sendMessage("الاستخدام: ادارة اذاعة_صورة [رابط الصورة] [الرسالة]", threadID, messageID);
        }
        
        const imageUrl = args[1];
        const caption = args.slice(2).join(" ");
        
        try {
            const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
            const cachePath = path.join(__dirname, 'cache');
            await fs.ensureDir(cachePath);
            const imagePath = path.join(cachePath, `broadcast_${Date.now()}.jpg`);
            await fs.writeFile(imagePath, imageResponse.data);
            
            const allThreads = await api.getThreadList(200, null, ["INBOX"]);
            const groupThreads = allThreads.filter(t => t.isGroup && t.isSubscribed);
            
            let sentCount = 0;
            for (const group of groupThreads) {
                if (group.threadID !== threadID) {
                    try {
                        await api.sendMessage({
                            body: caption,
                            attachment: fs.createReadStream(imagePath)
                        }, group.threadID);
                        sentCount++;
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    } catch (e) {}
                }
            }
            
            await fs.unlink(imagePath);
            return api.sendMessage(`تم ارسال الاذاعة بالصورة الى ${sentCount} مجموعة`, threadID, messageID);
        } catch (error) {
            return api.sendMessage(`خطأ: ${error.message}`, threadID, messageID);
        }
    }

    // ============= تغيير صورة البوت =============
    if (action === "صورة_بوت" || action === "setavatar") {
        return api.sendMessage("قم بالرد على هذه الرسالة بالصورة التي تريد تعيينها كصورة بروفايل", threadID, (err, info) => {
            if (err) return;
            Mirror.client.HakimReply.push({
                name: module.exports.config.title,
                messageID: info.messageID,
                author: senderID,
                type: "set_avatar"
            });
        }, messageID);
    }

    // ============= تغيير بايو البوت =============
    if (action === "بايو_بوت" || action === "setbio") {
        return api.sendMessage("قم بالرد على هذه الرسالة بالنص الذي تريد تعيينه كسيرة ذاتية", threadID, (err, info) => {
            if (err) return;
            Mirror.client.HakimReply.push({
                name: module.exports.config.title,
                messageID: info.messageID,
                author: senderID,
                type: "set_bio"
            });
        }, messageID);
    }

    // ============= طلبات المجموعات =============
    if (action === "طلبات" || action === "pending" || action === "requests") {
        try {
            const pendingThreads = await api.getThreadList(100, null, ['PENDING']);
            const groups = pendingThreads.filter(group => group.isGroup);

            if (groups.length === 0) {
                return api.sendMessage("لا توجد طلبات مجموعات معلقة حالياً", threadID, messageID);
            }

            let msg = "قائمة طلبات المجموعات المعلقة\n━━━━━━━━━━━━━\n\n";
            const pendingData = [];

            groups.forEach((group, index) => {
                msg += `${index + 1}. ${group.name || "مجموعة بدون اسم"}\n`;
                msg += `   ايدي: ${group.threadID}\n`;
                msg += `   الاعضاء: ${group.participantIDs.length}\n\n`;
                pendingData.push({
                    id: group.threadID,
                    name: group.name || "مجموعة بدون اسم",
                    index: index + 1
                });
            });

            msg += "رد على هذه الرسالة مع:\n";
            msg += "• موافقة [الرقم] - الموافقة على الطلب\n";
            msg += "• رفض [الرقم] - رفض الطلب\n";
            msg += "• موافقة الكل - الموافقة على جميع الطلبات";

            api.sendMessage(msg, threadID, (err, info) => {
                if (err) return;
                Mirror.client.HakimReply.push({
                    name: module.exports.config.title,
                    messageID: info.messageID,
                    author: senderID,
                    type: "pending_groups",
                    pendingData: pendingData
                });
            }, messageID);
            return;
        } catch (error) {
            return api.sendMessage(`خطأ: ${error.message}`, threadID, messageID);
        }
    }

    // ============= مساعدة =============
    let helpMsg = "أوامر الإدارة المتاحة\n━━━━━━━━━━━━━\n\n";
    helpMsg += "• ادارة لاست - عرض المجموعات والتحكم بها\n";
    helpMsg += "• ادارة حظر [ايدي] [سبب] - حظر مستخدم عالمياً\n";
    helpMsg += "• ادارة الغاء_حظر [ايدي] - الغاء حظر مستخدم\n";
    helpMsg += "• ادارة حظر_جروب [ايدي] - حظر مجموعة\n";
    helpMsg += "• ادارة الغاء_حظر_جروب [ايدي] - الغاء حظر مجموعة\n";
    helpMsg += "• ادارة غادر [ايدي] - مغادرة مجموعة\n";
    helpMsg += "• ادارة طلبات - عرض طلبات المجموعات\n";
    helpMsg += "• ادارة اذاعة [رسالة] - ارسال لجميع المجموعات\n";
    helpMsg += "• ادارة اذاعة_صورة [رابط] [رسالة] - ارسال صورة للجميع\n";
    helpMsg += "• ادارة صورة_بوت - تغيير صورة البوت\n";
    helpMsg += "• ادارة بايو_بوت - تغيير بايو البوت\n";
    helpMsg += "• ادارة تشغيل/ايقاف - تشغيل/ايقاف البوت\n";
    helpMsg += "• ادارة احصائيات - عرض احصائيات البوت";
    
    return api.sendMessage(helpMsg, threadID, messageID);
};

// ============= معالج الردود (HakimReply) =============
module.exports.HakimReply = async ({ api, event, HakimReply, userData }) => {
    const { type, author, groupsData, pendingData } = HakimReply;
    const { threadID, messageID, senderID, body, attachments } = event;
    
    if (senderID !== author) return;
    
    // ===== معالجة ردود قائمة المجموعات =====
    if (type === "group_list" && groupsData) {
        const replyBody = body?.trim().toLowerCase();
        const match = replyBody?.match(/(حظر|الغاء_حظر|غادر|ضيفني)\s*(\d+)/);
        
        if (!match) {
            return api.sendMessage("صيغة غير صحيحة. استخدم: حظر 1", threadID, messageID);
        }
        
        const cmd = match[1];
        const index = parseInt(match[2]);
        const group = groupsData.find(g => g.index === index);
        
        if (!group) {
            return api.sendMessage("رقم المجموعة غير صحيح", threadID, messageID);
        }
        
        if (cmd === "حظر") {
            if (userData.isGroupBanned(group.id)) {
                return api.sendMessage(`المجموعة "${group.name}" محظورة بالفعل`, threadID, messageID);
            }
            userData.banGroup(group.id, senderID, "تم الحظر عن طريق أمر لاست");
            api.sendMessage(`تم حظر المجموعة "${group.name}"`, threadID, messageID);
            
        } else if (cmd === "الغاء_حظر") {
            if (!userData.isGroupBanned(group.id)) {
                return api.sendMessage(`المجموعة "${group.name}" غير محظورة`, threadID, messageID);
            }
            userData.unbanGroup(group.id);
            api.sendMessage(`تم الغاء حظر المجموعة "${group.name}"`, threadID, messageID);
            
        } else if (cmd === "غادر") {
            try {
                await api.removeUserFromGroup(api.getCurrentUserID(), group.id);
                api.sendMessage(`تم مغادرة المجموعة "${group.name}"`, threadID, messageID);
            } catch (err) {
                api.sendMessage(`فشل المغادرة: ${err.message}`, threadID, messageID);
            }
            
        } else if (cmd === "ضيفني") {
            try {
                await api.addUserToGroup(senderID, group.id);
                api.sendMessage(`تمت إضافتك إلى "${group.name}"`, threadID, messageID);
            } catch (err) {
                api.sendMessage(`فشل الإضافة: ${err.message}`, threadID, messageID);
            }
        }
        
        try { await api.unsendMessage(HakimReply.messageID); } catch(e) {}
        return;
    }
    
    // ===== معالجة ردود طلبات المجموعات =====
    if (type === "pending_groups" && pendingData) {
        const replyBody = body?.trim().toLowerCase();
        
        if (replyBody === "موافقة الكل") {
            let successCount = 0;
            for (const group of pendingData) {
                try {
                    await api.handleGroupRequest(group.id, true);
                    successCount++;
                    await new Promise(resolve => setTimeout(resolve, 500));
                } catch(e) {}
            }
            api.sendMessage(`تمت الموافقة على ${successCount} من أصل ${pendingData.length} طلب`, threadID, messageID);
            
        } else {
            const match = replyBody?.match(/(موافقة|رفض)\s*(\d+)/);
            if (!match) {
                return api.sendMessage("صيغة غير صحيحة. استخدم: موافقة 1 أو رفض 1", threadID, messageID);
            }
            
            const cmd = match[1];
            const index = parseInt(match[2]);
            const group = pendingData.find(g => g.index === index);
            
            if (!group) {
                return api.sendMessage("رقم الطلب غير صحيح", threadID, messageID);
            }
            
            const accept = cmd === "موافقة";
            try {
                await api.handleGroupRequest(group.id, accept);
                api.sendMessage(`${accept ? "تم قبول" : "تم رفض"} طلب المجموعة "${group.name}"`, threadID, messageID);
            } catch (err) {
                api.sendMessage(`فشل: ${err.message}`, threadID, messageID);
            }
        }
        
        try { await api.unsendMessage(HakimReply.messageID); } catch(e) {}
        return;
    }
    
    // ===== تغيير صورة البوت =====
    if (type === "set_avatar") {
        if (!attachments || attachments.length === 0 || attachments[0].type !== "photo") {
            return api.sendMessage("يرجى الرد بالصورة", threadID, messageID);
        }
        
        const imageUrl = attachments[0].url;
        const cachePath = path.join(__dirname, 'cache');
        await fs.ensureDir(cachePath);
        const imagePath = path.join(cachePath, `avatar_${Date.now()}.jpg`);
        
        try {
            const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
            await fs.writeFile(imagePath, response.data);
            await api.changeAvatar(fs.createReadStream(imagePath));
            await fs.unlink(imagePath);
            api.sendMessage("تم تغيير صورة البوت", threadID, messageID);
        } catch (err) {
            api.sendMessage(`فشل: ${err.message}`, threadID, messageID);
        }
        
        try { await api.unsendMessage(HakimReply.messageID); } catch(e) {}
        return;
    }
    
    // ===== تغيير بايو البوت =====
    if (type === "set_bio") {
        if (!body || body.length < 3) {
            return api.sendMessage("النص قصير جداً", threadID, messageID);
        }
        
        try {
            await api.changeBio(body);
            api.sendMessage(`تم تغيير البايو إلى:\n${body}`, threadID, messageID);
        } catch (err) {
            api.sendMessage(`فشل: ${err.message}`, threadID, messageID);
        }
        
        try { await api.unsendMessage(HakimReply.messageID); } catch(e) {}
        return;
    }
};