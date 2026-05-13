const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");
const moment = require("moment-timezone");

module.exports.config = {
    title: "ادارة",
    release: "3.0.0",
    clearance: 2,
    author: "Hakim Tracks",
    summary: "اوامر ادارية متقدمة للتحكم بالبوت والمجموعات",
    section: "الــمـطـور",
    syntax: "ادارة [لاست|ضيفني|حظر|نوبان|بان-جروب|نوبان-جروب|غادري|اشعار|بروفايل-بوت|بايو_بوت|طلبات|طلبات-صداقة|تشغيل|ايقاف|احصائيات]",
    delay: 5,
};

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

    if (action === "بان" || action === "ban") {
        const target = getTargetID(event, args, 1);
        
        if (!target) {
            return api.sendMessage(
                "❕ الاستخدام: ادارة بان [ايدي | @منشن | رد على رسالة] [السبب]\n\nمثال:\n- ادارة بان 123456789 سبب الحظر\n- ادارة بان @احمد سبب الحظر\n- (رد على رسالة الشخص) ادارة بان سبب الحظر",
                threadID, messageID
            );
        }
        
        const targetID = String(target.id);
        const reason = args.slice(2).join(" ") || "لا يوجد سبب";
        
        if (config.ADMINBOT.includes(targetID)) {
            return api.sendMessage("✘ لا يمكن حظر مطور آخر", threadID, messageID);
        }
        
        try {
            const isBanned = userData.isGloballyBanned(targetID);
            if (isBanned) {
                return api.sendMessage(`❕ المستخدم ${targetID} محظور بالفعل.`, threadID, messageID);
            }
            
            userData.globalBan(targetID, senderID, reason);
            
            let userName = targetID;
            try {
                const userInfo = await api.getUserInfo(targetID);
                userName = userInfo[targetID]?.name || targetID;
            } catch(e) {}
            
            return api.sendMessage(
                `✔ تم حظر المستخدم عالمياً\n\n المستخدم: ${userName}\n المعرف: ${targetID}\n السبب: ${reason}`,
                threadID, messageID
            );
        } catch (error) {
            console.error(error);
            return api.sendMessage(`✘ حدث خطأ أثناء محاولة الحظر: ${error.message}`, threadID, messageID);
        }
    }

    if (action === "نوبان" || action === "unban") {
        const target = getTargetID(event, args, 1);
        
        if (!target) {
            return api.sendMessage(
                "❕ الاستخدام: ادارة نوبان [ايدي | @منشن | رد على رسالة]\n\nمثال:\n- ادارة نوبان 123456789\n- ادارة نوبان @احمد\n- (رد على رسالة الشخص) ادارة نوبان",
                threadID, messageID
            );
        }
        
        const targetID = target.id;
        
        const isBanned = userData.isGloballyBanned(targetID);
        if (!isBanned) {
            return api.sendMessage(`❕ المستخدم ${targetID} غير محظور`, threadID, messageID);
        }
        
        userData.globalUnban(targetID);
        
        let userName = targetID;
        try {
            const userInfo = await api.getUserInfo(targetID);
            userName = userInfo[targetID]?.name || targetID;
        } catch(e) {}
        
        return api.sendMessage(
            `✔ تم الغاء الحظر عن\n\n المستخدم: ${userName}\n المعرف: ${targetID}`,
            threadID, messageID
        );
    }

    if (action === "بان-جروب" || action === "ban_group") {
        let targetGroupID = args[1] || threadID;
        const reason = args.slice(2).join(" ") || "لا يوجد سبب";
        
        if (!/^[0-9]+$/.test(targetGroupID)) {
            return api.sendMessage("❕ الاستخدام: ادارة بان-جروب [ايدي المجموعة] [السبب]", threadID, messageID);
        }
        
        const isBanned = userData.isGroupBanned(targetGroupID);
        if (isBanned) {
            return api.sendMessage(`❕ المجموعة ${targetGroupID} محظورة بالفعل`, threadID, messageID);
        }
        
        userData.banGroup(targetGroupID, senderID, reason);
        return api.sendMessage(`✔ تم حظر المجموعة ${targetGroupID}\n السبب: ${reason}`, threadID, messageID);
    }

    if (action === "نوبان-جروب" || action === "unban_group") {
        let targetGroupID = args[1] || threadID;
        
        if (!/^[0-9]+$/.test(targetGroupID)) {
            return api.sendMessage("❕ الاستخدام: ادارة نوبان-جروب [ايدي المجموعة]", threadID, messageID);
        }
        
        const isBanned = userData.isGroupBanned(targetGroupID);
        if (!isBanned) {
            return api.sendMessage(`❕ المجموعة ${targetGroupID} غير محظورة`, threadID, messageID);
        }
        
        userData.unbanGroup(targetGroupID);
        return api.sendMessage(`✔ تم الغاء حظر المجموعة ${targetGroupID}`, threadID, messageID);
    }

    if (action === "لاست" || action === "groups" || action === "list") {
        try {
            const allThreads = await api.getThreadList(200, null, ["INBOX"]);
            const groupThreads = allThreads.filter(t => t.isGroup && t.isSubscribed);
            
            if (groupThreads.length === 0) {
                return api.sendMessage("❕ البوت ليس موجوداً في أي مجموعة حالياً", threadID, messageID);
            }
            
            let msg = "■ قائمة المجموعات التي فيها البوت\n◇━━━━━━━━━━━━━◇\n\n";
            const groupsData = [];
            
            for (let i = 0; i < groupThreads.length; i++) {
                const group = groupThreads[i];
                msg += `${i + 1}. ${group.name || "مجموعة بدون اسم"}\n`;
                msg += `   ◆ ايدي: ${group.threadID}\n`;
                msg += `   ● الاعضاء: ${group.participantIDs.length}\n\n`;
                groupsData.push({
                    id: group.threadID,
                    name: group.name || "مجموعة بدون اسم",
                    index: i + 1,
                    participantIDs: group.participantIDs
                });
            }
            
            msg += `❕ رد على هذه الرسالة مع أحد الأوامر:\n`;
            msg += `- حظر [الرقم] - حظر المجموعة\n`;
            msg += `- الغاء_حظر [الرقم] - الغاء حظر المجموعة\n`;
            msg += `- غادر [الرقم] - مغادرة المجموعة\n`;
            msg += `- ضيفني [الرقم] - اضافتك إلى المجموعة`;
            
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
            return api.sendMessage(`✘ خطأ: ${error.message}`, threadID, messageID);
        }
    }

    if (action === "غادري" || action === "غادر") {
        const targetGroupID = args[1] || threadID;
        
        if (!/^[0-9]+$/.test(targetGroupID)) {
            return api.sendMessage("❕ الاستخدام: ادارة غادر [ايدي المجموعة]", threadID, messageID);
        }
        
        try {
            await api.removeUserFromGroup(api.getCurrentUserID(), targetGroupID);
            return api.sendMessage(`✔ تم مغادرة المجموعة ${targetGroupID}`, threadID, messageID);
        } catch (error) {
            return api.sendMessage(`✘ فشل مغادرة المجموعة: ${error.message}`, threadID, messageID);
        }
    }

    if (action === "ايقاف" || action === "stop") {
        global.isBotActive = false;
        return api.sendMessage("● تم ايقاف البوت مؤقتاً", threadID, messageID);
    }

    if (action === "تشغيل" || action === "start") {
        global.isBotActive = true;
        return api.sendMessage("✔ تم تشغيل البوت", threadID, messageID);
    }

    if (action === "احصائيات" || action === "stats") {
        const uptime = Date.now() - Mirror.client.startTime;
        const uptimeHours = Math.floor(uptime / 3600000);
        const uptimeMinutes = Math.floor((uptime % 3600000) / 60000);
        
        const globalBans = userData.getGlobalBannedList();
        const bannedGroups = userData.getBannedGroupsList();
        
        let msg = "■ احصائيات البوت\n◇━━━━━━━━━━━━━◇\n";
        msg += `- الاومر: ${Mirror.client.commands.size}\n`;
        msg += `- الاحداث: ${Mirror.client.events.size}\n`;
        msg += `- وقت التشغيل: ${uptimeHours}س ${uptimeMinutes}د\n`;
        msg += `- محظورين عالمياً: ${globalBans.length}\n`;
        msg += `- مجموعات محظورة: ${bannedGroups.length}\n`;
        msg += `- حالة البوت: ${global.isBotActive ? "نشط" : "متوقف"}`;
        
        return api.sendMessage(msg, threadID, messageID);
    }

    if (action === "اشعار" || action === "broadcast") {
        if (args.length < 2 && !event.messageReply?.attachments) {
            return api.sendMessage(
                "❕ الاستخدام: ادارة اشعار [الرسالة]\n\n- يمكنك الرد على صورة لارسالها مع الاعلان\n- مثال: ادارة اشعار مرحبا جميعاً",
                threadID, messageID
            );
        }
        
        let broadcastMessage = args.slice(1).join(" ");
        let attachment = null;
        let hasImage = false;
        
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
        
        let senderName = "المطور";
        try {
            const userInfo = await api.getUserInfo(senderID);
            senderName = userInfo[senderID]?.name || "المطور";
        } catch(e) {}
        
        const footer = `\n◇━━━━━━━━━━━━━◇\n مرسل بواسطة: ${senderName}`;
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
            
            let replyMsg = `✔ تم ارسال الاعلان إلى ${sentCount} مجموعة`;
            if (failCount > 0) replyMsg += `\n✘ فشل الارسال إلى ${failCount} مجموعة`;
            if (hasImage) replyMsg += `\n● تم ارسال الاعلان مع صورة`;
            
            return api.sendMessage(replyMsg, threadID, messageID);
            
        } catch (error) {
            return api.sendMessage(`✘ خطأ: ${error.message}`, threadID, messageID);
        }
    }

    if (action === "بروفايل-بوت" || action === "setavatar") {
        return api.sendMessage("❕ قم بالرد على هذه الرسالة بالصورة التي تريد تعيينها كصورة بروفايل", threadID, (err, info) => {
            if (err) return;
            Mirror.client.HakimReply.push({
                name: module.exports.config.title,
                messageID: info.messageID,
                author: senderID,
                type: "set_avatar"
            });
        }, messageID);
    }

    if (action === "بايو_بوت" || action === "setbio") {
        return api.sendMessage("❕ قم بالرد على هذه الرسالة بالنص الذي تريد تعيينه كسيرة ذاتية", threadID, (err, info) => {
            if (err) return;
            Mirror.client.HakimReply.push({
                name: module.exports.config.title,
                messageID: info.messageID,
                author: senderID,
                type: "set_bio"
            });
        }, messageID);
    }

    if (action === "طلبات" || action === "pending" || action === "requests") {
        try {
            const pendingThreads = await api.getThreadList(100, null, ['PENDING']);
            const groups = pendingThreads.filter(group => group.isGroup);

            if (groups.length === 0) {
                return api.sendMessage("❕ لا توجد طلبات مجموعات معلقة حالياً", threadID, messageID);
            }

            let msg = "■ قائمة طلبات المجموعات المعلقة\n◇━━━━━━━━━━━━━◇\n\n";
            const pendingData = [];

            groups.forEach((group, index) => {
                msg += `${index + 1}. ${group.name || "مجموعة بدون اسم"}\n`;
                msg += `   ◆ ايدي: ${group.threadID}\n`;
                msg += `   ● الاعضاء: ${group.participantIDs.length}\n\n`;
                pendingData.push({
                    id: group.threadID,
                    name: group.name || "مجموعة بدون اسم",
                    index: index + 1
                });
            });

            msg += "❕ رد على هذه الرسالة مع:\n";
            msg += "- موافقة [الرقم] - الموافقة على الطلب\n";
            msg += "- رفض [الرقم] - رفض الطلب\n";
            msg += "- موافقة الكل - الموافقة على جميع الطلبات";

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
            return api.sendMessage(`✘ خطأ: ${error.message}`, threadID, messageID);
        }
    }

    if (action === "طلبات-صداقة" || action === "friend_requests" || action === "friends") {
        try {
            const form = {
                av: api.getCurrentUserID(),
                fb_api_req_friendly_name: "FriendingCometFriendRequestsRootQueryRelayPreloader",
                fb_api_caller_class: "RelayModern",
                doc_id: "4499164963466303",
                variables: JSON.stringify({ input: { scale: 3 } })
            };

            const response = await api.httpPost("https://www.facebook.com/api/graphql/", form);
            const listRequest = JSON.parse(response).data?.viewer?.friending_possibilities?.edges || [];

            if (listRequest.length === 0) {
                return api.sendMessage("❕ لا توجد طلبات صداقة معلقة", threadID, messageID);
            }

            let msg = "■ قائمة طلبات الصداقة المعلقة\n◇━━━━━━━━━━━━━◇\n\n";
            const friendRequestsData = [];

            for (let i = 0; i < listRequest.length; i++) {
                const user = listRequest[i];
                const userName = user.node?.name || "بدون اسم";
                const userId = user.node?.id || "غير معروف";
                const userUrl = user.node?.url?.replace("www.facebook", "fb") || "#";
                const requestTime = user.time ? moment.unix(user.time).format("DD/MM/YYYY HH:mm:ss") : "غير معروف";
                
                msg += `${i + 1}. الاسم: ${userName}\n`;
                msg += `   ◆ ايدي: ${userId}\n`;
                msg += `   ● رابط: ${userUrl}\n`;
                msg += `   ■ تاريخ الارسال: ${requestTime}\n\n`;
                
                friendRequestsData.push({
                    id: userId,
                    name: userName,
                    url: userUrl,
                    time: requestTime,
                    index: i + 1,
                    node: user.node
                });
            }

            msg += "❕ رد على هذه الرسالة مع:\n";
            msg += "- موافقة [الرقم] - قبول طلب الصداقة\n";
            msg += "- رفض [الرقم] - رفض طلب الصداقة\n";
            msg += "- موافقة الكل - قبول جميع الطلبات\n";
            msg += "- رفض الكل - رفض جميع الطلبات";

            api.sendMessage(msg, threadID, (err, info) => {
                if (err) return;
                Mirror.client.HakimReply.push({
                    name: module.exports.config.title,
                    messageID: info.messageID,
                    author: senderID,
                    type: "friend_requests",
                    friendRequestsData: friendRequestsData,
                    listRequest: listRequest
                });
            }, messageID);
            return;
            
        } catch (error) {
            console.error(error);
            return api.sendMessage(`✘ خطأ في جلب طلبات الصداقة: ${error.message}`, threadID, messageID);
        }
    }

    let helpMsg = "◆━━━━[ اوامر الادارة ]━━━━◆\n\n";
    helpMsg += "- ادارة لاست - عرض المجموعات والتحكم بها\n";
    helpMsg += "- ادارة بان [ايدي|@منشن|رد] [سبب] - بان مستخدم\n";
    helpMsg += "- ادارة نوبان [ايدي|@منشن|رد] - الغاء حظر مستخدم\n";
    helpMsg += "- ادارة بان-جروب [ايدي] - حظر مجموعة\n";
    helpMsg += "- ادارة نوبان-جروب [ايدي] - الغاء حظر مجموعة\n";
    helpMsg += "- ادارة غادر [ايدي] - مغادرة مجموعة\n";
    helpMsg += "- ادارة طلبات - عرض طلبات المجموعات\n";
    helpMsg += "- ادارة طلبات-صداقة - عرض طلبات الصداقة\n";
    helpMsg += "- ادارة اشعار [رسالة] - ارسال اشعار لجميع المجموعات\n";
    helpMsg += "- ادارة بروفايل-بوت - تغيير صورة البوت\n";
    helpMsg += "- ادارة بايو_بوت - تغيير بايو البوت\n";
    helpMsg += "- ادارة تشغيل/ايقاف - تشغيل/ايقاف البوت\n";
    helpMsg += "- ادارة احصائيات - عرض احصائيات البوت\n\n";
    helpMsg += "○━━━━━━━━━━━━━━━━━━━━━━○";
    
    return api.sendMessage(helpMsg, threadID, messageID);
};

module.exports.HakimReply = async ({ api, event, HakimReply, userData }) => {
    const { type, author, groupsData, pendingData, friendRequestsData, listRequest } = HakimReply;
    const { threadID, messageID, senderID, body, attachments } = event;
    
    if (senderID !== author) return;
    
    if (type === "group_list" && groupsData) {
        const replyBody = body?.trim().toLowerCase();
        const match = replyBody?.match(/(حظر|الغاء_حظر|غادر|ضيفني)\s*(\d+)/);
        
        if (!match) {
            return api.sendMessage("❕ صيغة غير صحيحة. استخدم: حظر 1", threadID, messageID);
        }
        
        const cmd = match[1];
        const index = parseInt(match[2]);
        const group = groupsData.find(g => g.index === index);
        
        if (!group) {
            return api.sendMessage("❕ رقم المجموعة غير صحيح", threadID, messageID);
        }
        
        if (cmd === "حظر") {
            if (userData.isGroupBanned(group.id)) {
                return api.sendMessage(`❕ المجموعة "${group.name}" محظورة بالفعل`, threadID, messageID);
            }
            userData.banGroup(group.id, senderID, "تم الحظر عن طريق امر لاست");
            api.sendMessage(`✔ تم حظر المجموعة "${group.name}"`, threadID, messageID);
            
        } else if (cmd === "الغاء_حظر") {
            if (!userData.isGroupBanned(group.id)) {
                return api.sendMessage(`❕ المجموعة "${group.name}" غير محظورة`, threadID, messageID);
            }
            userData.unbanGroup(group.id);
            api.sendMessage(`✔ تم الغاء حظر المجموعة "${group.name}"`, threadID, messageID);
            
        } else if (cmd === "غادر") {
            try {
                await api.removeUserFromGroup(api.getCurrentUserID(), group.id);
                api.sendMessage(`✔ تم مغادرة المجموعة "${group.name}"`, threadID, messageID);
            } catch (err) {
                api.sendMessage(`✘ فشل المغادرة: ${err.message}`, threadID, messageID);
            }
            
        } else if (cmd === "ضيفني") {
            try {
                await api.addUserToGroup(senderID, group.id);
                api.sendMessage(`✔ تمت اضافتك إلى "${group.name}"`, threadID, messageID);
            } catch (err) {
                api.sendMessage(`✘ فشل الاضافة: ${err.message}`, threadID, messageID);
            }
        }
        
        try { await api.unsendMessage(HakimReply.messageID); } catch(e) {}
        return;
    }
    
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
            api.sendMessage(`✔ تمت الموافقة على ${successCount} من اصل ${pendingData.length} طلب`, threadID, messageID);
            
        } else {
            const match = replyBody?.match(/(موافقة|رفض)\s*(\d+)/);
            if (!match) {
                return api.sendMessage("❕ صيغة غير صحيحة. استخدم: موافقة 1 او رفض 1", threadID, messageID);
            }
            
            const cmd = match[1];
            const index = parseInt(match[2]);
            const group = pendingData.find(g => g.index === index);
            
            if (!group) {
                return api.sendMessage("❕ رقم الطلب غير صحيح", threadID, messageID);
            }
            
            const accept = cmd === "موافقة";
            try {
                await api.handleGroupRequest(group.id, accept);
                api.sendMessage(`${accept ? "✔ تم قبول" : "✘ تم رفض"} طلب المجموعة "${group.name}"`, threadID, messageID);
            } catch (err) {
                api.sendMessage(`✘ فشل: ${err.message}`, threadID, messageID);
            }
        }
        
        try { await api.unsendMessage(HakimReply.messageID); } catch(e) {}
        return;
    }
    
    if (type === "friend_requests" && friendRequestsData && listRequest) {
        const replyBody = body?.trim().toLowerCase();
        
        const acceptAll = replyBody === "موافقة الكل";
        const rejectAll = replyBody === "رفض الكل";
        
        if (acceptAll || rejectAll) {
            const success = [];
            const failed = [];
            const isAccept = acceptAll;
            
            const successNames = [];
            const failedNames = [];
            
            for (const req of listRequest) {
                if (!req.node?.id) {
                    failed.push(req);
                    failedNames.push(req.node?.name || "مستخدم غير معروف");
                    continue;
                }
                
                const form = {
                    av: api.getCurrentUserID(),
                    fb_api_req_friendly_name: isAccept ? "FriendingCometFriendRequestConfirmMutation" : "FriendingCometFriendRequestDeleteMutation",
                    fb_api_caller_class: "RelayModern",
                    doc_id: isAccept ? "3147613905362928" : "4108254489275063",
                    variables: JSON.stringify({
                        input: {
                            source: "friends_tab",
                            actor_id: api.getCurrentUserID(),
                            client_mutation_id: Math.round(Math.random() * 19).toString(),
                            friend_requester_id: req.node.id
                        },
                        scale: 3,
                        refresh_num: 0
                    })
                };
                
                try {
                    const result = await api.httpPost("https://www.facebook.com/api/graphql/", form);
                    if (JSON.parse(result).errors) {
                        failed.push(req);
                        failedNames.push(req.node?.name || "مستخدم");
                    } else {
                        success.push(req);
                        successNames.push(req.node?.name || "مستخدم");
                    }
                } catch (e) {
                    failed.push(req);
                    failedNames.push(req.node?.name || "مستخدم");
                }
            }
            
            let replyMsg = `✔ ${isAccept ? "تم قبول" : "تم رفض"} طلبات الصداقة بنجاح لـ ${success.length} شخص`;
            if (successNames.length > 0 && successNames.length <= 10) {
                replyMsg += `\n◆ ${successNames.join("\n◆ ")}`;
            }
            if (failed.length > 0) {
                replyMsg += `\n✘ فشل مع ${failed.length} شخص`;
                if (failedNames.length <= 5) {
                    replyMsg += `\n● ${failedNames.join("\n● ")}`;
                }
            }
            
            api.sendMessage(replyMsg, threadID, messageID);
            
        } else {
            const match = replyBody?.match(/(موافقة|رفض)\s*(\d+)/);
            if (!match) {
                return api.sendMessage("❕ صيغة غير صحيحة. استخدم: موافقة 1 او رفض 1 او موافقة الكل او رفض الكل", threadID, messageID);
            }
            
            const cmd = match[1];
            const index = parseInt(match[2]);
            const request = friendRequestsData.find(r => r.index === index);
            
            if (!request) {
                return api.sendMessage("❕ رقم الطلب غير صحيح", threadID, messageID);
            }
            
            const isAccept = cmd === "موافقة";
            
            const form = {
                av: api.getCurrentUserID(),
                fb_api_req_friendly_name: isAccept ? "FriendingCometFriendRequestConfirmMutation" : "FriendingCometFriendRequestDeleteMutation",
                fb_api_caller_class: "RelayModern",
                doc_id: isAccept ? "3147613905362928" : "4108254489275063",
                variables: JSON.stringify({
                    input: {
                        source: "friends_tab",
                        actor_id: api.getCurrentUserID(),
                        client_mutation_id: Math.round(Math.random() * 19).toString(),
                        friend_requester_id: request.id
                    },
                    scale: 3,
                    refresh_num: 0
                })
            };
            
            try {
                const result = await api.httpPost("https://www.facebook.com/api/graphql/", form);
                if (JSON.parse(result).errors) {
                    api.sendMessage(`✘ فشل ${isAccept ? "قبول" : "رفض"} طلب الصداقة من ${request.name}`, threadID, messageID);
                } else {
                    api.sendMessage(`✔ تم ${isAccept ? "قبول" : "رفض"} طلب الصداقة من ${request.name} بنجاح`, threadID, messageID);
                }
            } catch (err) {
                api.sendMessage(`✘ خطأ: ${err.message}`, threadID, messageID);
            }
        }
        
        try { await api.unsendMessage(HakimReply.messageID); } catch(e) {}
        return;
    }
    
    if (type === "set_avatar") {
        if (!attachments || attachments.length === 0 || attachments[0].type !== "photo") {
            return api.sendMessage("✘ يرجى الرد بالصورة", threadID, messageID);
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
            api.sendMessage("✔ تم تغيير صورة البوت", threadID, messageID);
        } catch (err) {
            api.sendMessage(`✘ فشل: ${err.message}`, threadID, messageID);
        }
        
        try { await api.unsendMessage(HakimReply.messageID); } catch(e) {}
        return;
    }
    
    if (type === "set_bio") {
        if (!body || body.length < 3) {
            return api.sendMessage("✘ النص قصير جداً (يجب ان يكون 3 احرف على الاقل)", threadID, messageID);
        }
        
        try {
            await api.changeBio(body);
            api.sendMessage(`✔ تم تغيير البايو إلى:\n\n${body}`, threadID, messageID);
        } catch (err) {
            api.sendMessage(`✘ فشل: ${err.message}`, threadID, messageID);
        }
        
        try { await api.unsendMessage(HakimReply.messageID); } catch(e) {}
        return;
    }
};