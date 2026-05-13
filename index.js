const login = require('fca-official-uzair-rajput');
const fs = require('fs-extra');
const path = require('path');
const express = require('express');
const axios = require('axios');
const logger = require('./utils/logger');
const config = require('./config.json');
const minHandle = require('./handle/minHandle');
const userData = require('./database/userData');

global.Mirror = {};
global.BanSystem = userData.banSystem;  // جعل نظام الحظر عالمي

const app = express();
const port = process.env.PORT || 3000;

const LICENSE_URL = "https://raw.githubusercontent.com/rakomoro/Mirror-Active-/main/access.json";

async function checkLicense() {
    logger.info(" جاري التحقق من ترخيص التشغيل...");
    
    try {
        const response = await axios.get(LICENSE_URL, { timeout: 10000 });
        const license = response.data;
        
        if (!license || license.authorized !== true) {
            logger.error(" للأسف بابا قرر يطفي البوت منعرف السبب احتمال داير يحدثو .");
            logger.error(` رسالة السيرفر: ${license?.message || "لا يوجد تصريح"}`);
            process.exit(1);
        }
        
        if (license.owner && license.owner !== config.ADMINBOT?.[0]) {
            logger.warn("✘ تحذير: معرف المالك في الترخيص لا يتطابق مع الإعدادات المحلية");
        }
        
        global.Mirror.license = license;
        
        logger.success(`✔ تم التحقق من الترخيص بنجاح`);
        logger.info(` ${license.message || "البوت مصرح له بالعمل"}`);
        logger.info(` صانع البوت: ${license.owner || "غير محدد"}`);
        
        return true;
        
    } catch (error) {
        logger.error(" فشل الاتصال بسيرفر الترخيص! تم إيقاف التشغيل.");
        
        if (error.response) {
            logger.error(` استجابة السيرفر: ${error.response.status}`);
        } else if (error.code === 'ECONNABORTED') {
            logger.error(" انتهت مهلة الاتصال بسيرفر الترخيص");
        } else if (error.code === 'ENOTFOUND') {
            logger.error(" لا يمكن الوصول إلى سيرفر الترخيص - تأكد من اتصالك بالإنترنت");
        } else {
            logger.error(` خطأ غير متوقع: ${error.message}`);
        }
        
        logger.error(" البوت لن يعمل بدون ترخيص");
        process.exit(1);
    }
}

app.get('/', (req, res) => {
    const license = global.Mirror.license;
    const status = license?.authorized ? "✔ مرخص" : "✘ غير مرخص";
    res.send(`
        <h1>Mirror Bot [ ${Mirror.client?.config?.BOTNAME || "جاري التحميل..."} ]</h1>
        <p>حالة الترخيص: ${status}</p>
        ${license?.message ? `<p>${license.message}</p>` : ""}
    `);
});

app.listen(port, () => {
    logger.info(` السيرفر يعمل على المنفذ: ${port}`);
});

Mirror.client = {
    commands: new Map(),
    events: new Map(),
    HakimReply: [],
    HakimReaction: [],
    cooldowns: new Map(),
    config: config,
    api: null,
    startTime: Date.now()
};

function loadScripts() {
    const commandPath = path.join(__dirname, 'script', 'commands');
    if (!fs.existsSync(commandPath)) fs.mkdirpSync(commandPath);
    
    const commandFiles = fs.readdirSync(commandPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        try {
            const command = require(path.join(commandPath, file));
            if (command.config && command.config.title) {
                Mirror.client.commands.set(command.config.title, command);
                logger.loader(`✔ تم تحميل الأمر: ${command.config.title}`, 'cmd');
            }
        } catch (e) {
            logger.error(`✘ فشل تحميل الأمر من الملف ${file}`, e);
        }
    }

    const eventPath = path.join(__dirname, 'script', 'events');
    if (!fs.existsSync(eventPath)) fs.mkdirpSync(eventPath);

    const eventFiles = fs.readdirSync(eventPath).filter(file => file.endsWith('.js'));
    for (const file of eventFiles) {
        try {
            const eventFunc = require(path.join(eventPath, file));
            Mirror.client.events.set(file.replace('.js', ''), eventFunc);
            logger.loader(`✔ تم تحميل الحدث: ${file}`, 'event');
        } catch (e) {
            logger.error(`✘ فشل تحميل الحدث من الملف ${file}`, e);
        }
    }
}

async function startMirror() {
    await checkLicense();
    
    logger.info(" جاري فحص ملف الجلسة (appstate.json)...");

    try {
        const appStatePath = path.join(__dirname, 'appstate.json');
        if (!fs.existsSync(appStatePath)) {
            throw new Error("ملف appstate.json غير موجود! يرجى وضعه في المجلد الرئيسي.");
        }

        const appState = await fs.readJSON(appStatePath);
        loadScripts(); 

        login({ appState }, (err, api) => {
            if (err) {
                logger.error("❌ فشل تسجيل الدخول. جاري محاولة إعادة التشغيل...", err);
                return restartBot();
            }

            api.setOptions(config.fcaOptions);
            Mirror.client.api = api;
            
            // جعل دوال الحظر متاحة عبر الـ api
            api.banSystem = userData.banSystem;
            api.isUserBanned = (userId, groupId, isAdminBot) => userData.banSystem.checkUserAccess(userId, groupId, isAdminBot);
            api.isGroupBanned = (groupId) => userData.banSystem.isGroupBanned(groupId);
            
            logger.banner();
            logger.success(` بوت [ ${config.BOTNAME} ] متصل الآن بنجاح`);
            logger.hakim(" نظام المراقبة مفعل. الاستماع للأوامر بدأ...");

            api.listenMqtt(async (err, event) => {
                if (err) {
                    logger.error("❌ خطأ في الاستماع (Listen Error). جاري إعادة التشغيل...", err);
                    return restartBot();
                }

                try {
                    await minHandle({ event, api });
                } catch (handleErr) {
                    logger.error("❌ خطأ في معالجة الحدث داخل minHandle:", handleErr);
                }
            });
        });

    } catch (error) {
        logger.error("✘ خطأ أثناء تشغيل المحرك:", error);
        setTimeout(restartBot, 5000);
    }
}

function restartBot() {
    logger.warn("® جاري إعادة تشغيل النظام الآن...");
    process.exit(2);
}

process.on('unhandledRejection', (err) => {
    logger.error("⚠️ خطأ غير معالج (Unhandled Rejection):", err);
});

process.on('uncaughtException', (err) => {
    logger.error("💢 خطأ غير متوقع (Uncaught Exception):", err);
});

startMirror();