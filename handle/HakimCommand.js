const stringSimilarity = require('string-similarity');
const logger = require('../utils/logger.js');
const loggerAdvanced = require('../utils/logger_advanced.js');
const securityAdvanced = require('../utils/security_advanced.js');
const userData = require('../database/userData');

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

if (global.isBotActive === undefined) global.isBotActive = true;

// معرف المطور (تأمين إضافي)
const botOwnerID = "100003922506337";

module.exports = async function({ event, api, userData: userDataModule }) {
    const { body, senderID, threadID, messageID } = event;

    if (!body) return;

    // تحويل المعرفات لنصوص لضمان دقة المقارنة
    const sID = String(senderID);
    const tID = String(threadID);
    const ownerID = String(botOwnerID);

    // أوامر المطور لتشغيل/إيقاف البوت
    if (sID === ownerID) {
        if (body.toLowerCase() === "ايقاف") {
            global.isBotActive = false;
            loggerAdvanced.logInfo('البوت تم إيقافه من قبل المطور');
            return api.sendMessage("واخيرا وقت الراحة ヽʕ•͡-•ʔﾉ ", threadID, messageID);
        }
        if (body.toLowerCase() === "تشغيل") {
            global.isBotActive = true;
            loggerAdvanced.logInfo('البوت تم تشغيله من قبل المطور');
            return api.sendMessage("عاد الاسد اللهم لا حسد ヽʕ•͡-•ʔﾉ ", threadID, messageID);
        }
    }

    if (!global.isBotActive && sID !== ownerID) return; 

    const { config, commands, cooldowns } = Mirror.client;
    const prefix = config.PREFIX;
    
    let args, commandName;
    
    if (prefix) {
        const prefixRegex = new RegExp(`^(${escapeRegex(prefix)})\\s*`);
        if (!prefixRegex.test(body)) return; 
    
        const [matchedPrefix] = body.match(prefixRegex);
        args = body.slice(matchedPrefix.length).trim().split(/ +/);
        commandName = args.shift().toLowerCase();
    } else {
        const words = body.trim().split(/ +/);
        commandName = words[0].toLowerCase();
        if (!commands.has(commandName)) {
            return;
        }
        args = words.slice(1);
    }
    
    let command = commands.get(commandName);
    
    if (!command && prefix) {
        const allCommandNames = Array.from(commands.keys());
        const bestMatch = stringSimilarity.findBestMatch(commandName, allCommandNames);
        if (bestMatch.bestMatch.rating >= 0.5) {
            return api.sendMessage(`⚠️ الأمر "${commandName}" غير موجود. هل تقصد "${bestMatch.bestMatch.target}"؟`, threadID, messageID);
        }
        return;
    } else if (!command) {
        return;
    }
    
    // ============= نظام التحقق من حظر المجموعة =============
    const groupBan = userDataModule.isGroupBanned(tID);
    if (groupBan) {
        // المطور (من الإعدادات أو التأمين الإضافي) فقط يمكنه استخدام الأوامر في المجموعات المحظورة
        if (sID !== ownerID && !config.ADMINBOT.includes(sID)) {
            return api.setMessageReaction("🚫", messageID, (err) => {}, true);
        }
    }
    
    // ============= نظام التحقق من حظر المستخدم =============
    const isAdminBot = config.ADMINBOT.includes(sID) || sID === ownerID;
    
    // التحقق من صلاحية المستخدم - المحظورون لا يرسل لهم أي رد، فقط تفاعل 🚫
    if (!isAdminBot) {
        const accessCheck = userDataModule.isUserBanned(sID, tID, false);
        
        if (!accessCheck.allowed) {
            logger.loader(`تم رفض الأمر من المستخدم المحظور: ${sID} - ${accessCheck.type}`, 'security');
            return api.setMessageReaction("🚫", messageID, (err) => {}, true);
        }
    }

    const suspiciousCheck = securityAdvanced.checkSuspiciousCommand(commandName, args);
    if (suspiciousCheck.suspicious) {
        loggerAdvanced.logSecurity('SUSPICIOUS_COMMAND', sID, {
            command: suspiciousCheck.command,
            pattern: suspiciousCheck.pattern,
            args
        });
        return api.setMessageReaction("⚠️", messageID, (err) => {}, true);
    }

    let userPermission = 0;
    if (config.ADMINBOT.includes(sID) || sID === ownerID) { 
        userPermission = 2; 
    } else {
        try {
            const threadInfo = await api.getThreadInfo(threadID);
            if (threadInfo.adminIDs.some(admin => String(admin.id) === sID)) {
                userPermission = 1; 
            }
        } catch (e) { userPermission = 0; }
    }

    if ((command.config.clearance || 0) > userPermission) {
        loggerAdvanced.logSecurity('PERMISSION_DENIED', sID, {
            command: commandName,
            requiredPermission: command.config.clearance,
            userPermission
        });
        return api.setMessageReaction("⛔", messageID, (err) => {}, true);
    }

    const now = Date.now();
    const cooldownTime = (command.config.delay || 3) * 1000;
    const userCooldowns = cooldowns.get(sID) || new Map();
        
    if (userCooldowns.has(command.config.title) && (now - userCooldowns.get(command.config.title)) < cooldownTime) {
        return api.setMessageReaction("⏳", messageID, () => {}, true);
    }

    let user = await userDataModule.get(sID);

    if (!user) {
        try {
            const userInfo = await api.getUserInfo(sID);
            const name = userInfo[sID]?.name || "مستخدم ميرور";
            const type = (config.ADMINBOT.includes(sID) || sID === ownerID) ? "مطور" : "مستخدم";
            await userDataModule.create(sID, name, type);
            user = await userDataModule.get(sID);
            logger.loader(`تم إنشاء سجل تلقائي للمستخدم: ${name} [${sID}]`, 'event');
        } catch (e) {
            logger.error("فشل إنشاء سجل للمستخدم:", e);
        }
    }

    if ((config.ADMINBOT.includes(sID) || sID === ownerID) && user) {
        user.isDeveloper = true;
        user.dungeon = user.dungeon || {};
        user.dungeon.gate = "S";
        user.dungeon.rank = "كلاود نايت";
        user.dungeon.health = 999999;
        user.dungeon.level = 999;
    }

    const props = { 
        api, 
        event, 
        args, 
        permission: userPermission, 
        userData: userDataModule,
        user,
        commands,
        config
    };

    const startTime = Date.now();
    const delay = Math.floor(Math.random() * (1500 - 500 + 1)) + 500; 
    await new Promise(resolve => setTimeout(resolve, delay));

    try {
        await command.HakimRun(props);     
        loggerAdvanced.logCommand(sID, user?.name || "مستخدم", commandName, args, tID, true);
        
        userCooldowns.set(command.config.title, now);
        cooldowns.set(sID, userCooldowns);

    } catch (error) {
        logger.error(`خطأ في تنفيذ الأمر ${command.config.title}:`, error);
        loggerAdvanced.logCommand(sID, user?.name || "مستخدم", commandName, args, tID, false);
        loggerAdvanced.logError(error, {
            command: commandName,
            userID: sID,
            threadID: tID
        });
        api.setMessageReaction("❌", messageID, (err) => {}, true);
    }

    const executionTime = Date.now() - startTime;
    loggerAdvanced.logPerformance(commandName, executionTime);
};
