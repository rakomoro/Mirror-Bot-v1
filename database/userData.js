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
        banned_at INTEGER,
        expires_at INTEGER,
        is_permanent INTEGER DEFAULT 1
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

// جدول قائمة المستخدمين المسموح لهم (whitelist)
db.prepare(`
    CREATE TABLE IF NOT EXISTS whitelist (
        user_id TEXT PRIMARY KEY,
        added_by TEXT,
        reason TEXT,
        added_at INTEGER
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

// ============= دوال نظام الحظر العالمية =============

const BanSystem = {
    // حظر مستخدم عالمياً
    globalBan: (userId, bannedBy, reason = "لا يوجد سبب", duration = null) => {
        const expiresAt = duration ? Date.now() + (duration * 1000) : null;
        const isPermanent = !duration;
        
        const stmt = db.prepare(`
            INSERT OR REPLACE INTO global_bans (user_id, banned_by, reason, banned_at, expires_at, is_permanent)
            VALUES (?, ?, ?, ?, ?, ?)
        `);
        stmt.run(userId, bannedBy, reason, Date.now(), expiresAt, isPermanent ? 1 : 0);
        logger.loader(`تم حظر المستخدم ${userId} عالمياً بواسطة ${bannedBy}`, 'ban');
        return true;
    },
    
    // إلغاء الحظر العالمي
    globalUnban: (userId) => {
        const stmt = db.prepare("DELETE FROM global_bans WHERE user_id = ?");
        stmt.run(userId);
        logger.loader(`تم إلغاء الحظر العالمي للمستخدم ${userId}`, 'unban');
        return true;
    },
    
    // التحقق من الحظر العالمي
    isGloballyBanned: (userId) => {
        const stmt = db.prepare("SELECT * FROM global_bans WHERE user_id = ?");
        const ban = stmt.get(userId);
        
        if (!ban) return false;
        
        // التحقق من انتهاء المدة
        if (!ban.is_permanent && ban.expires_at && ban.expires_at < Date.now()) {
            BanSystem.globalUnban(userId);
            return false;
        }
        
        return ban;
    },
    
    // حظر مجموعة
    banGroup: (groupId, bannedBy, reason = "لا يوجد سبب") => {
        const stmt = db.prepare(`
            INSERT OR REPLACE INTO group_bans (group_id, banned_by, reason, banned_at)
            VALUES (?, ?, ?, ?)
        `);
        stmt.run(groupId, bannedBy, reason, Date.now());
        logger.loader(`تم حظر المجموعة ${groupId} بواسطة ${bannedBy}`, 'ban');
        return true;
    },
    
    // إلغاء حظر المجموعة
    unbanGroup: (groupId) => {
        const stmt = db.prepare("DELETE FROM group_bans WHERE group_id = ?");
        stmt.run(groupId);
        logger.loader(`تم إلغاء حظر المجموعة ${groupId}`, 'unban');
        return true;
    },
    
    // التحقق من حظر المجموعة
    isGroupBanned: (groupId) => {
        const stmt = db.prepare("SELECT * FROM group_bans WHERE group_id = ?");
        return stmt.get(groupId);
    },
    
    // حظر مستخدم محلياً في مجموعة
    localBan: (userId, groupId, bannedBy, reason = "لا يوجد سبب") => {
        const stmt = db.prepare(`
            INSERT OR REPLACE INTO local_bans (user_id, group_id, banned_by, reason, banned_at)
            VALUES (?, ?, ?, ?, ?)
        `);
        stmt.run(userId, groupId, bannedBy, reason, Date.now());
        logger.loader(`تم حظر المستخدم ${userId} في المجموعة ${groupId}`, 'ban');
        return true;
    },
    
    // إلغاء الحظر المحلي
    localUnban: (userId, groupId) => {
        const stmt = db.prepare("DELETE FROM local_bans WHERE user_id = ? AND group_id = ?");
        stmt.run(userId, groupId);
        return true;
    },
    
    // التحقق من الحظر المحلي
    isLocallyBanned: (userId, groupId) => {
        const stmt = db.prepare("SELECT * FROM local_bans WHERE user_id = ? AND group_id = ?");
        return stmt.get(userId, groupId);
    },
    
    // إضافة إلى القائمة البيضاء
    addToWhitelist: (userId, addedBy, reason = "مستخدم موثوق") => {
        const stmt = db.prepare(`
            INSERT OR REPLACE INTO whitelist (user_id, added_by, reason, added_at)
            VALUES (?, ?, ?, ?)
        `);
        stmt.run(userId, addedBy, reason, Date.now());
        return true;
    },
    
    // إزالة من القائمة البيضاء
    removeFromWhitelist: (userId) => {
        const stmt = db.prepare("DELETE FROM whitelist WHERE user_id = ?");
        stmt.run(userId);
        return true;
    },
    
    // التحقق من القائمة البيضاء
    isWhitelisted: (userId) => {
        const stmt = db.prepare("SELECT * FROM whitelist WHERE user_id = ?");
        return stmt.get(userId);
    },
    
    // التحقق الشامل من صلاحية المستخدم (يعيد سبب المنع إن وُجد)
    checkUserAccess: (userId, groupId, isAdminBot = false) => {
        // أدمن البوت لا يمكن حظره
        if (isAdminBot) return { allowed: true };
        
        // التحقق من القائمة البيضاء أولاً
        if (BanSystem.isWhitelisted(userId)) return { allowed: true };
        
        // التحقق من الحظر العالمي
        const globalBan = BanSystem.isGloballyBanned(userId);
        if (globalBan) {
            return {
                allowed: false,
                reason: `🚫 تم حظرك عالمياً من البوت\n📝 السبب: ${globalBan.reason}\n👮 بواسطة: ${globalBan.banned_by}`,
                type: 'global'
            };
        }
        
        // التحقق من الحظر المحلي (في حالة وجود groupId)
        if (groupId) {
            const localBan = BanSystem.isLocallyBanned(userId, groupId);
            if (localBan) {
                return {
                    allowed: false,
                    reason: `🚫 تم حظرك في هذه المجموعة\n📝 السبب: ${localBan.reason}\n👮 بواسطة: ${localBan.banned_by}`,
                    type: 'local'
                };
            }
        }
        
        return { allowed: true };
    },
    
    // الحصول على قائمة المحظورين عالمياً
    getGlobalBannedList: () => {
        const stmt = db.prepare("SELECT * FROM global_bans ORDER BY banned_at DESC");
        return stmt.all();
    },
    
    // الحصول على قائمة المجموعات المحظورة
    getBannedGroupsList: () => {
        const stmt = db.prepare("SELECT * FROM group_bans ORDER BY banned_at DESC");
        return stmt.all();
    },
    
    // الحصول على قائمة المحظورين محلياً في مجموعة
    getLocalBannedList: (groupId) => {
        const stmt = db.prepare("SELECT * FROM local_bans WHERE group_id = ? ORDER BY banned_at DESC");
        return stmt.all(groupId);
    }
};

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
    
    // تصدير نظام الحظر ليكون متاحاً عالمياً
    banSystem: BanSystem,
    
    // دوال مساعدة إضافية
    isUserBanned: (userId, groupId, isAdminBot) => BanSystem.checkUserAccess(userId, groupId, isAdminBot),
    globalBan: BanSystem.globalBan,
    globalUnban: BanSystem.globalUnban,
    banGroup: BanSystem.banGroup,
    unbanGroup: BanSystem.unbanGroup,
    isGroupBanned: BanSystem.isGroupBanned,
    localBan: BanSystem.localBan,
    localUnban: BanSystem.localUnban,
    isLocallyBanned: BanSystem.isLocallyBanned,
    addToWhitelist: BanSystem.addToWhitelist,
    removeFromWhitelist: BanSystem.removeFromWhitelist,
    isWhitelisted: BanSystem.isWhitelisted,
    getGlobalBannedList: BanSystem.getGlobalBannedList,
    getBannedGroupsList: BanSystem.getBannedGroupsList,
    getLocalBannedList: BanSystem.getLocalBannedList
};