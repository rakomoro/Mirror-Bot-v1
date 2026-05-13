const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");

module.exports.config = {
    title: "ادارة",
    release: "3.0.0",
    clearance: 2,
    author: "Hakim Tracks",
    summary: "أوامر إدارية متقدمة للتحكم بالبوت والمجموعات",
    section: "المطور",
    syntax: "ادارة [لاست|ضيفني|حظر|الغاء_حظر|حظر_جروب|الغاء_حظر_جروب|غادر|اشعار|صورة_بوت|بايو_بوت|طلبات|تشغيل|ايقاف|احصائيات]",
    delay: 5,
};

// دالة مساعدة للحصول على ID المستخدم
function getTargetID(event, args, startIndex = 1) {
    const { mentions, messageReply } = event;
    
    if (Object.keys(mentions).length > 0) {
        return { id: Object.keys(mentions)[0], type: "mention" };
    }
    
    if (messageReply?.senderID) {
        return { id: messageReply.senderID, type: "reply" };
    }
    
    const potentialID = args[startIndex];
    if (potentialID && /^[0-9]+$/.test(potentialID)) {
        return { id: potentialID, type: "id" };
    }
    
    return null;
}

module.exports.HakimRun = async ({ api, event, args, config, userData }) => {
    const { threadID, messageID, senderID } = event;
    const action = args[0]?.toLowerCase();

    if (!config.ADMINBOT.includes(senderID)) {
        return api.sendMessage("ليس لديك الصلاحية لاستخدام هذا الأمر.", threadID, messageID);
    }

    // ============= حظر مستخدم (عالمي) =============
    if (action === "حظر" || action === "ban") {
        const target = getTargetID(event, args, 1);
        
        if (!target) {
            return api.sendMessage(
                "الاستخدام: ادارة حظر [ايدي | @منشن | رد على رسالة] [السبب]\n\nمثال:\n• ادارة حظر 123456789 سبب الحظر\n• ادارة حظر @احمد سبب الحظر\n• (رد على رسالة الشخص) ادارة حظر سبب الحظر",
                threadID, messageID
            );
        }
        
        const targetID = String(target.id);
        const reason = args.slice(2).join(" ") || "لا يوجد سبب";
        
        if (config.ADMINBOT.includes(targetID)) {
            return api.sendMessage("لا يمكن حظر مطور آخر!", threadID, messageID);
        }
        
        try {
            const isBanned = userData.isGloballyBanned(targetID);
            if (isBanned) {
                return api.sendMessage(`المستخدم ${targetID} محظور بالفعل عالمياً.`, threadID, messageID);
            }
            
            userData.globalBan(targetID, senderID, reason);
            
            let userName = targetID;
            try {
                const userInfo = await api.getUserInfo(targetID);
                userName = userInfo[targetID]?.name || targetID;
            } catch(e) {}
            
            return api.sendMessage(
                `✅ تم حظر المستخدم عالمياً\n\n👤 المستخدم: ${userName}\n🆔 المعرف: ${targetID}\n📝 السبب: ${reason}`,
                threadID, messageID
            );
        } catch (error) {
            console.error(error);
            return api.sendMessage(`❌ حدث خطأ أثناء محاولة الحظر: ${error.message}`, threadID, messageID);
        }
    }

    // ============= الغاء حظر مستخدم =============
    if (action === "الغاء_حظر" || action === "unban") {
        const target = getTargetID(event, args, 1);
        
        if (!target) {
            return api.sendMessage(
                "الاستخدام: ادارة الغاء_حظر [ايدي | @منشن | رد على رسالة]\n\nمثال:\n• ادارة الغاء_حظر 123456789\n• ادارة الغاء_حظر @احمد\n• (رد على رسالة الشخص) ادارة الغاء_حظر",
                threadID, messageID
            );
        }
        
        const targetID = target.id;
        
        const isBanned = userData.isGloballyBanned(targetID);
        if (!isBanned) {
            return api.sendMessage(`المستخدم ${targetID} غير محظور`, threadID, messageID);
        }
        
        userData.globalUnban(targetID);
        
        let userName = targetID;
        try {
            const userInfo = await api.getUserInfo(targetID);
            userName = userInfo[targetID]?.name || targetID;
        } catch(e) {}
        
        return api.sendMessage(
            `✅ تم إلغاء الحظر العالمي عن المستخدم\n\n👤 المستخدم: ${userName}\n🆔 المعرف: ${targetID}`,
            threadID, messageID
        );
    }

    // ============= حظر مجموعة =============
    if (action === "حظر_جروب" || action === "ban_group") {
        let targetGroupID = args[1] || threadID;
        const reason = args.slice(2).join(" ") || "لا يوجد سبب";
        
        if (!/^[0-9]+$/.test(targetGroupID)) {
            return api.sendMessage("الاستخدام: ادارة حظر_جروب [ايدي المجموعة] [السبب]", threadID, messageID);
        }
        
        const isBanned = userData.isGroupBanned(targetGroupID);
        if (isBanned) {
            return api.sendMessage(`المجموعة ${targetGroupID} محظورة بالفعل`, threadID, messageID);
        }
        
        userData.banGroup(targetGroupID, senderID, reason);
        return api.sendMessage(`✅ تم حظر المجموعة ${targetGroupID}\n📝 السبب: ${reason}`, threadID, messageID);
    }

    // ============= الغاء حظر مجموعة =============
    if (action === "الغاء_حظر_جروب" || action === "unban_group") {
        let targetGroupID = args[1] || threadID;
        
        if (!/^[0-9]+$/.test(targetGroupID)) {
            return api.sendMessage("الاستخدام: ادارة الغاء_حظر_جروب [ايدي المجموعة]", threadID, messageID);
        }
        
        const isBanned = userData.isGroupBanned(targetGroupID);
        if (!isBanned) {
            return api.sendMessage(`المجموعة ${targetGroupID} غير محظورة`, threadID, messageID);
        }
        
        userData.unbanGroup(targetGroupID);
        return api.sendMessage(`✅ تم إلغاء حظر المجموعة ${targetGroupID}`, threadID, messageID);
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

    // ============= مغادرة مجموعة =============
    if (action === "غادر" || action === "leave") {
        const targetGroupID = args[1] || threadID;
        
        if (!/^[0-9]+$/.test(targetGroupID)) {
            return api.sendMessage("الاستخدام: ادارة غادر [ايدي المجموعة]", threadID, messageID);
        }
        
        try {
            await api.removeUserFromGroup(api.getCurrentUserID(), targetGroupID);
            return api.sendMessage(`✅ تم مغادرة المجموعة ${targetGroupID}`, threadID, messageID);
        } catch (error) {
            return api.sendMessage(`❌ فشل مغادرة المجموعة: ${error.message}`, threadID, messageID);
        }
    }

    // ============= إيقاف البوت =============
    if (action === "ايقاف" || action === "stop") {
        global.isBotActive = false;
        return api.sendMessage("🛑 تم إيقاف البوت مؤقتاً", threadID, messageID);
    }

    // ============= تشغيل البوت =============
    if (action === "تشغيل" || action === "start") {
        global.isBotActive = true;
        return api.sendMessage("✅ تم تشغيل البوت", threadID, messageID);
    }

    // ============= إحصائيات =============
    if (action === "احصائيات" || action === "stats") {
        const uptime = Date.now() - Mirror.client.startTime;
        const uptimeHours = Math.floor(uptime / 3600000);
        const uptimeMinutes = Math.floor((uptime % 3600000) / 60000);
        
        const globalBans = userData.getGlobalBannedList();
        const bannedGroups = userData.getBannedGroupsList();
        
        let msg = "📊 احصائيات البوت\n━━━━━━━━━━━━━\n";
        msg += `📦 الأوامر: ${Mirror.client.commands.size}\n`;
        msg += `🎯 الأحداث: ${Mirror.client.events.size}\n`;
        msg += `⏱️ وقت التشغيل: ${uptimeHours}س ${uptimeMinutes}د\n`;
        msg += `🚫 محظورين عالمياً: ${globalBans.length}\n`;
        msg += `🔇 مجموعات محظورة: ${bannedGroups.length}\n`;
        msg += `🟢 حالة البوت: ${global.isBotActive ? "نشط" : "متوقف"}`;
        
        return api.sendMessage(msg, threadID, messageID);
    }

    // ============= إشعار (إذاعة) =============
    if (action === "اشعار" || action === "broadcast") {
        if (args.length < 2 && !event.messageReply?.attachments) {
            return api.sendMessage(
                "📢 الاستخدام: ادارة اشعار [الرسالة]\n\n• يمكنك الرد على صورة لإرسالها مع الإشعار\n• مثال: ادارة اشعار مرحبا جميعاً",
                threadID, messageID
            );
        }
        
        let broadcastMessage = args.slice(1).join(" ");
        let attachment = null;
        let hasImage = false;
        
        // التحقق من وجود صورة في الرد
        if (event.messageReply?.attachments?.length > 0) {
            const attach = event.messageReply.attachments[0];
            if (attach.type === "photo" || attach.type === "animated_image") {
                hasImage = true;
                try {
                    const imgResponse = await axios.get(attach.url, { responseType: 'stream' });
                    attachment = imgResponse.data;
                } catch(e) {
                    console.error("فشل تحميل الصورة:", e);
                }
            }
        }
        
        // إضافة توقيع المرسل
        let senderName = "المطور";
        try {
            const userInfo = await api.getUserInfo(senderID);
            senderName = userInfo[senderID]?.name || "المطور";
        } catch(e) {}
        
        const footer = `\n━━━━━━━━━━━━━\n📨 مرسل بواسطة: ${senderName}`;
        const finalMessage = broadcastMessage + footer;
        
        try {
            const allThreads = await api.getThreadList(200, null, ["INBOX"]);
            const groupThreads = allThreads.filter(t => t.isGroup && t.isSubscribed);
            
            let sentCount = 0;
            let failCount = 0;
            
            for (const group of groupThreads) {
                if (group.threadID !== threadID) {
                    try {
                        if (hasImage && attachment) {
                            await api.sendMessage({
                                body: finalMessage,
                                attachment: attachment
                            }, group.threadID);
                        } else {
                            await api.sendMessage(finalMessage, group.threadID);
                        }
                        sentCount++;
                        await new Promise(resolve => setTimeout(resolve, 800));
                    } catch (e) {
                        failCount++;
                    }
                }
            }
            
            let replyMsg = `✅ تم إرسال الإشعار إلى ${sentCount} مجموعة`;
            if (failCount > 0) replyMsg += `\n⚠️ فشل الإرسال إلى ${failCount} مجموعة`;
            if (hasImage) replyMsg += `\n🖼️ تم إرسال الإشعار مع الصورة`;
            
            return api.sendMessage(replyMsg, threadID, messageID);
            
        } catch (error) {
            return api.sendMessage(`❌ خطأ: ${error.message}`, threadID, messageID);
        }
    }

    // ============= تغيير صورة البوت =============
    if (action === "صورة_بوت" || action === "setavatar") {
        return api.sendMessage("🖼️ قم بالرد على هذه الرسالة بالصورة التي تريد تعيينها كصورة بروفايل", threadID, (err, info) => {
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
        return api.sendMessage("✏️ قم بالرد على هذه الرسالة بالنص الذي تريد تعيينه كسيرة ذاتية", threadID, (err, info) => {
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
    let helpMsg = "📋 أوامر الإدارة المتاحة\n━━━━━━━━━━━━━\n\n";
    helpMsg += "• ادارة لاست - عرض المجموعات والتحكم بها\n";
    helpMsg += "• ادارة حظر [ايدي|@منشن|رد] [سبب] - حظر مستخدم عالمياً\n";
    helpMsg += "• ادارة الغاء_حظر [ايدي|@منشن|رد] - الغاء حظر مستخدم\n";
    helpMsg += "• ادارة حظر_جروب [ايدي] - حظر مجموعة\n";
    helpMsg += "• ادارة الغاء_حظر_جروب [ايدي] - الغاء حظر مجموعة\n";
    helpMsg += "• ادارة غادر [ايدي] - مغادرة مجموعة\n";
    helpMsg += "• ادارة طلبات - عرض طلبات المجموعات\n";
    helpMsg += "• ادارة اشعار [رسالة] - ارسال اشعار لجميع المجموعات (مع دعم الرد على صورة)\n";
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
            api.sendMessage(`✅ تم حظر المجموعة "${group.name}"`, threadID, messageID);
            
        } else if (cmd === "الغاء_حظر") {
            if (!userData.isGroupBanned(group.id)) {
                return api.sendMessage(`المجموعة "${group.name}" غير محظورة`, threadID, messageID);
            }
            userData.unbanGroup(group.id);
            api.sendMessage(`✅ تم إلغاء حظر المجموعة "${group.name}"`, threadID, messageID);
            
        } else if (cmd === "غادر") {
            try {
                await api.removeUserFromGroup(api.getCurrentUserID(), group.id);
                api.sendMessage(`✅ تم مغادرة المجموعة "${group.name}"`, threadID, messageID);
            } catch (err) {
                api.sendMessage(`❌ فشل المغادرة: ${err.message}`, threadID, messageID);
            }
            
        } else if (cmd === "ضيفني") {
            try {
                await api.addUserToGroup(senderID, group.id);
                api.sendMessage(`✅ تمت إضافتك إلى "${group.name}"`, threadID, messageID);
            } catch (err) {
                api.sendMessage(`❌ فشل الإضافة: ${err.message}`, threadID, messageID);
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
            api.sendMessage(`✅ تمت الموافقة على ${successCount} من أصل ${pendingData.length} طلب`, threadID, messageID);
            
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
                api.sendMessage(`${accept ? "✅ تم قبول" : "❌ تم رفض"} طلب المجموعة "${group.name}"`, threadID, messageID);
            } catch (err) {
                api.sendMessage(`❌ فشل: ${err.message}`, threadID, messageID);
            }
        }
        
        try { await api.unsendMessage(HakimReply.messageID); } catch(e) {}
        return;
    }
    
    // ===== تغيير صورة البوت =====
    if (type === "set_avatar") {
        if (!attachments || attachments.length === 0 || attachments[0].type !== "photo") {
            return api.sendMessage("⚠️ يرجى الرد بالصورة", threadID, messageID);
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
            api.sendMessage("✅ تم تغيير صورة البوت", threadID, messageID);
        } catch (err) {
            api.sendMessage(`❌ فشل: ${err.message}`, threadID, messageID);
        }
        
        try { await api.unsendMessage(HakimReply.messageID); } catch(e) {}
        return;
    }
    
    // ===== تغيير بايو البوت =====
    if (type === "set_bio") {
        if (!body || body.length < 3) {
            return api.sendMessage("⚠️ النص قصير جداً (يجب أن يكون 3 أحرف على الأقل)", threadID, messageID);
        }
        
        try {
            await api.changeBio(body);
            api.sendMessage(`✅ تم تغيير البايو إلى:\n\n${body}`, threadID, messageID);
        } catch (err) {
            api.sendMessage(`❌ فشل: ${err.message}`, threadID, messageID);
        }
        
        try { await api.unsendMessage(HakimReply.messageID); } catch(e) {}
        return;
    }
};