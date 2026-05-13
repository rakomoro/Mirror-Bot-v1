const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs-extra');
const axios = require('axios');
const logger = require('../utils/logger');

const dbPath = path.join(__dirname, 'mirror.db');
const avatarDir = path.join(__dirname, '../avatars');
const db = new Database(dbPath);

if (!fs.existsSync(avatarDir)) fs.mkdirSync(avatarDir, { recursive: true });

// جدول المستخدمين الرئيسي
db.prepare(`
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT,
        nickname TEXT,
        money INTEGER DEFAULT 1000,
        bank INTEGER DEFAULT 5000,
        exp INTEGER DEFAULT 0,
        level INTEGER DEFAULT 1,
        createDate INTEGER,
        isRegistered INTEGER DEFAULT 0,
        extraData TEXT DEFAULT '{}'
    )
`).run();

// جدول الحظر العالمي للمستخدمين
db.prepare(`
    CREATE TABLE IF NOT EXISTS global_bans (
        user_id TEXT PRIMARY KEY,
        banned_by TEXT,
        reason TEXT,
        banned_at INTEGER
    )
`).run();

// جدول حظر المجموعات
db.prepare(`
    CREATE TABLE IF NOT EXISTS group_bans (
        group_id TEXT PRIMARY KEY,
        banned_by TEXT,
        reason TEXT,
        banned_at INTEGER
    )
`).run();

// جدول حظر المستخدمين داخل مجموعات محددة
db.prepare(`
    CREATE TABLE IF NOT EXISTS local_bans (
        user_id TEXT,
        group_id TEXT,
        banned_by TEXT,
        reason TEXT,
        banned_at INTEGER,
        PRIMARY KEY (user_id, group_id)
    )
`).run();

async function getAvatarUrl(userID) {
    try {
        const res = await axios.post(`https://www.facebook.com/api/graphql/`, null, {
            params: {
                doc_id: "5341536295888250",
                variables: JSON.stringify({ height: 500, scale: 1, userID, width: 500 })
            }
        });
        return res.data.data.profile.profile_picture.uri;
    } catch (err) {
        return "https://i.ibb.co/bBSpr5v/143086968-2856368904622192-1959732218791162458-n.png";
    }
}

async function downloadAvatar(userID, url) {
    const filePath = path.join(avatarDir, `${userID}.png`);
    try {
        const response = await axios({ url, responseType: 'stream' });
        const writer = fs.createWriteStream(filePath);
        response.data.pipe(writer);
        return new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });
    } catch (e) {
        logger.error(`فشل تحميل صورة المستخدم: ${userID}`);
        return null;
    }
}

// ============= نظام الحظر المبسط =============

// حظر مستخدم عالمياً
function globalBan(userId, bannedBy, reason = "لا يوجد سبب") {
    const stmt = db.prepare(`
        INSERT OR REPLACE INTO global_bans (user_id, banned_by, reason, banned_at)
        VALUES (?, ?, ?, ?)
    `);
    stmt.run(userId, bannedBy, reason, Date.now());
    logger.loader(`تم حظر المستخدم ${userId} عالمياً بواسطة ${bannedBy}`, 'ban');
    return true;
}

// إلغاء الحظر العالمي
function globalUnban(userId) {
    const stmt = db.prepare("DELETE FROM global_bans WHERE user_id = ?");
    stmt.run(userId);
    logger.loader(`تم إلغاء الحظر العالمي للمستخدم ${userId}`, 'unban');
    return true;
}

// التحقق من الحظر العالمي
function isGloballyBanned(userId) {
    const stmt = db.prepare("SELECT * FROM global_bans WHERE user_id = ?");
    const ban = stmt.get(userId);
    return ban || false;
}

// حظر مجموعة
function banGroup(groupId, bannedBy, reason = "لا يوجد سبب") {
    const stmt = db.prepare(`
        INSERT OR REPLACE INTO group_bans (group_id, banned_by, reason, banned_at)
        VALUES (?, ?, ?, ?)
    `);
    stmt.run(groupId, bannedBy, reason, Date.now());
    return true;
}

// إلغاء حظر مجموعة
function unbanGroup(groupId) {
    const stmt = db.prepare("DELETE FROM group_bans WHERE group_id = ?");
    stmt.run(groupId);
    return true;
}

// التحقق من حظر مجموعة
function isGroupBanned(groupId) {
    const stmt = db.prepare("SELECT * FROM group_bans WHERE group_id = ?");
    return stmt.get(groupId) || false;
}

// حظر مستخدم محلياً
function localBan(userId, groupId, bannedBy, reason = "لا يوجد سبب") {
    const stmt = db.prepare(`
        INSERT OR REPLACE INTO local_bans (user_id, group_id, banned_by, reason, banned_at)
        VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(userId, groupId, bannedBy, reason, Date.now());
    return true;
}

// إلغاء الحظر المحلي
function localUnban(userId, groupId) {
    const stmt = db.prepare("DELETE FROM local_bans WHERE user_id = ? AND group_id = ?");
    stmt.run(userId, groupId);
    return true;
}

// التحقق من الحظر المحلي
function isLocallyBanned(userId, groupId) {
    const stmt = db.prepare("SELECT * FROM local_bans WHERE user_id = ? AND group_id = ?");
    return stmt.get(userId, groupId) || false;
}

// التحقق من صلاحية المستخدم
function checkUserAccess(userId, groupId, isAdminBot = false) {
    if (isAdminBot) return { allowed: true };
    
    const globalBan = isGloballyBanned(userId);
    if (globalBan) {
        return {
            allowed: false,
            reason: `🚫 تم حظرك عالمياً\nالسبب: ${globalBan.reason}`,
            type: 'global'
        };
    }
    
    if (groupId) {
        const localBan = isLocallyBanned(userId, groupId);
        if (localBan) {
            return {
                allowed: false,
                reason: `🚫 تم حظرك في هذه المجموعة\nالسبب: ${localBan.reason}`,
                type: 'local'
            };
        }
    }
    
    return { allowed: true };
}

// الحصول على قائمة المحظورين
function getGlobalBannedList() {
    const stmt = db.prepare("SELECT * FROM global_bans ORDER BY banned_at DESC");
    return stmt.all();
}

function getBannedGroupsList() {
    const stmt = db.prepare("SELECT * FROM group_bans ORDER BY banned_at DESC");
    return stmt.all();
}

function getLocalBannedList(groupId) {
    const stmt = db.prepare("SELECT * FROM local_bans WHERE group_id = ? ORDER BY banned_at DESC");
    return stmt.all(groupId);
}

module.exports = {
    get: async (id) => {
        try {
            const user = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
            if (!user) return null;
            const extra = JSON.parse(user.extraData || '{}');
            return { ...user, ...extra };
        } catch (e) {
            return null;
        }
    },

    set: async (id, updateData) => {
        const user = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
        if (!user) return;

        const coreFields = ['name', 'nickname', 'money', 'bank', 'exp', 'level', 'isRegistered'];
        let extra = JSON.parse(user.extraData || '{}');

        for (let key in updateData) {
            if (coreFields.includes(key)) {
                db.prepare(`UPDATE users SET ${key} = ? WHERE id = ?`).run(updateData[key], id);
            } else {
                extra[key] = updateData[key];
            }
        }
        db.prepare("UPDATE users SET extraData = ? WHERE id = ?").run(JSON.stringify(extra), id);
    },

    create: async (id, name, nickname = "") => {
        const url = await getAvatarUrl(id);
        await downloadAvatar(id, url);
        const stmt = db.prepare("INSERT INTO users (id, name, nickname, createDate, isRegistered) VALUES (?, ?, ?, ?, ?)");
        stmt.run(id, name, nickname, Date.now(), nickname ? 1 : 0);
        logger.loader(`مستخدم جديد: ${name} [${id}]`, 'event');
    },

    addExp: async (id, amount) => {
        const user = db.prepare("SELECT exp, level FROM users WHERE id = ?").get(id);
        if (!user) return;
        let newExp = user.exp + amount;
        let newLevel = user.level;
        let nextLevelExp = newLevel * 500;
        if (newExp >= nextLevelExp) {
            newExp = 0;
            newLevel += 1;
            logger.info(`اللاعب ${id} ارتفع للمستوى ${newLevel}`);
        }
        db.prepare("UPDATE users SET exp = ?, level = ? WHERE id = ?").run(newExp, newLevel, id);
    },
    
    // تصدير دوال الحظر
    globalBan,
    globalUnban,
    isGloballyBanned,
    banGroup,
    unbanGroup,
    isGroupBanned,
    localBan,
    localUnban,
    isLocallyBanned,
    checkUserAccess,
    getGlobalBannedList,
    getBannedGroupsList,
    getLocalBannedList
};