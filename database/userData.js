const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs-extra');
const axios = require('axios');
const logger = require('../utils/logger');
const config = require('../config.json');
const protectionData = require('./protectionData');

const mongoURI = config.MongoURl;
const instanceID = config.ADMINBOT && config.ADMINBOT[0] ? config.ADMINBOT[0] : 'default';
const avatarDir = path.join(__dirname, '../avatars');

if (!fs.existsSync(avatarDir)) fs.mkdirSync(avatarDir, { recursive: true });

mongoose.connect(mongoURI)
    .then(() => logger.success(`متصل بـ MongoDB بنجاح [Instance: ${instanceID}]`))
    .catch(err => logger.error(`فشل الاتصال بـ MongoDB: ${err.message}`));

const userSchema = new mongoose.Schema({
    instanceID: { type: String, required: true, index: true },
    id: { type: String, required: true },
    name: String,
    nickname: String,
    money: { type: Number, default: 1000 },
    bank: { type: Number, default: 5000 },
    exp: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    createDate: { type: Number, default: Date.now },
    isRegistered: { type: Number, default: 0 },
    extraData: { type: mongoose.Schema.Types.Mixed, default: {} }
});
userSchema.index({ instanceID: 1, id: 1 }, { unique: true });

const globalBanSchema = new mongoose.Schema({
    instanceID: { type: String, required: true, index: true },
    user_id: { type: String, required: true },
    banned_by: String,
    reason: { type: String, default: "لا يوجد سبب" },
    banned_at: { type: Number, default: Date.now },
    expires_at: Number,
    is_permanent: { type: Number, default: 1 }
});
globalBanSchema.index({ instanceID: 1, user_id: 1 }, { unique: true });

const groupBanSchema = new mongoose.Schema({
    instanceID: { type: String, required: true, index: true },
    group_id: { type: String, required: true },
    banned_by: String,
    reason: { type: String, default: "لا يوجد سبب" },
    banned_at: { type: Number, default: Date.now }
});
groupBanSchema.index({ instanceID: 1, group_id: 1 }, { unique: true });

const localBanSchema = new mongoose.Schema({
    instanceID: { type: String, required: true, index: true },
    user_id: { type: String, required: true },
    group_id: { type: String, required: true },
    banned_by: String,
    reason: { type: String, default: "لا يوجد سبب" },
    banned_at: { type: Number, default: Date.now }
});
localBanSchema.index({ instanceID: 1, user_id: 1, group_id: 1 }, { unique: true });

const whitelistSchema = new mongoose.Schema({
    instanceID: { type: String, required: true, index: true },
    user_id: { type: String, required: true },
    added_by: String,
    reason: { type: String, default: "مستخدم موثوق" },
    added_at: { type: Number, default: Date.now }
});
whitelistSchema.index({ instanceID: 1, user_id: 1 }, { unique: true });

const User = mongoose.model('User', userSchema);
const GlobalBan = mongoose.model('GlobalBan', globalBanSchema);
const GroupBan = mongoose.model('GroupBan', groupBanSchema);
const LocalBan = mongoose.model('LocalBan', localBanSchema);
const Whitelist = mongoose.model('Whitelist', whitelistSchema);

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

const BanSystem = {
    globalBan: async (userId, bannedBy, reason = "لا يوجد سبب", duration = null) => {
        try {
            const expiresAt = duration ? Date.now() + (duration * 1000) : null;
            const isPermanent = !duration;
            
            await GlobalBan.findOneAndUpdate(
                { instanceID, user_id: String(userId) },
                { 
                    banned_by: String(bannedBy), 
                    reason, 
                    banned_at: Date.now(), 
                    expires_at: expiresAt, 
                    is_permanent: isPermanent ? 1 : 0 
                },
                { upsert: true, new: true }
            );
            
            logger.loader(`تم حظر المستخدم ${userId} عالمياً بواسطة ${bannedBy}`, 'ban');
            return true;
        } catch (error) {
            logger.error(`خطأ في تنفيذ الحظر العالمي: ${error.message}`);
            throw error;
        }
    },

    globalUnban: async (userId) => {
        await GlobalBan.deleteOne({ instanceID, user_id: String(userId) });
        logger.loader(`تم إلغاء الحظر العالمي للمستخدم ${userId}`, 'unban');
        return true;
    },

    isGloballyBanned: async (userId) => {
        try {
            const ban = await GlobalBan.findOne({ instanceID, user_id: String(userId) }).lean();
            if (!ban) return false;
            
            if (ban.is_permanent === 0 && ban.expires_at && ban.expires_at < Date.now()) {
                await BanSystem.globalUnban(userId);
                return false;
            }
            
            return ban;
        } catch (error) {
            logger.error(`خطأ في التحقق من الحظر العالمي: ${error.message}`);
            return false;
        }
    },

    banGroup: async (groupId, bannedBy, reason = "لا يوجد سبب") => {
        await GroupBan.findOneAndUpdate(
            { instanceID, group_id: String(groupId) },
            { banned_by: String(bannedBy), reason, banned_at: Date.now() },
            { upsert: true, new: true }
        );
        logger.loader(`تم حظر المجموعة ${groupId} بواسطة ${bannedBy}`, 'ban');
        return true;
    },

    unbanGroup: async (groupId) => {
        await GroupBan.deleteOne({ instanceID, group_id: String(groupId) });
        logger.loader(`تم إلغاء حظر المجموعة ${groupId}`, 'unban');
        return true;
    },

    isGroupBanned: async (groupId) => {
        return await GroupBan.findOne({ instanceID, group_id: String(groupId) }).lean();
    },

    localBan: async (userId, groupId, bannedBy, reason = "لا يوجد سبب") => {
        await LocalBan.findOneAndUpdate(
            { instanceID, user_id: String(userId), group_id: String(groupId) },
            { banned_by: String(bannedBy), reason, banned_at: Date.now() },
            { upsert: true, new: true }
        );
        logger.loader(`تم حظر المستخدم ${userId} في المجموعة ${groupId}`, 'ban');
        return true;
    },

    localUnban: async (userId, groupId) => {
        await LocalBan.deleteOne({ instanceID, user_id: String(userId), group_id: String(groupId) });
        return true;
    },

    isLocallyBanned: async (userId, groupId) => {
        return await LocalBan.findOne({ instanceID, user_id: String(userId), group_id: String(groupId) }).lean();
    },

    addToWhitelist: async (userId, addedBy, reason = "مستخدم موثوق") => {
        await Whitelist.findOneAndUpdate(
            { instanceID, user_id: String(userId) },
            { added_by: String(addedBy), reason, added_at: Date.now() },
            { upsert: true, new: true }
        );
        return true;
    },

    removeFromWhitelist: async (userId) => {
        await Whitelist.deleteOne({ instanceID, user_id: String(userId) });
        return true;
    },

    isWhitelisted: async (userId) => {
        return await Whitelist.findOne({ instanceID, user_id: String(userId) }).lean();
    },

    checkUserAccess: async (userId, groupId, isAdminBot = false) => {
        if (isAdminBot) return { allowed: true };
        if (await BanSystem.isWhitelisted(userId)) return { allowed: true };
        
        const globalBan = await BanSystem.isGloballyBanned(userId);
        if (globalBan) {
            return {
                allowed: false,
                reason: `✔ تم حظرك عالمياً من البوت\n السبب: ${globalBan.reason}\n بواسطة: ${globalBan.banned_by}`,
                type: 'global'
            };
        }
        
        if (groupId) {
            const localBan = await BanSystem.isLocallyBanned(userId, groupId);
            if (localBan) {
                return {
                    allowed: false,
                    reason: `✔ تم حظرك في هذه المجموعة\n السبب: ${localBan.reason}\n بواسطة: ${localBan.banned_by}`,
                    type: 'local'
                };
            }
        }
        
        return { allowed: true };
    },

    getGlobalBannedList: async () => {
        return await GlobalBan.find({ instanceID }).sort({ banned_at: -1 }).lean();
    },

    getBannedGroupsList: async () => {
        return await GroupBan.find({ instanceID }).sort({ banned_at: -1 }).lean();
    },

    getLocalBannedList: async (groupId) => {
        return await LocalBan.find({ instanceID, group_id: String(groupId) }).sort({ banned_at: -1 }).lean();
    }
};

module.exports = {
    get: async (id) => {
        try {
            const user = await User.findOne({ instanceID, id: String(id) }).lean();
            if (!user) return null;
            return { ...user, ...user.extraData };
        } catch (e) {
            return null;
        }
    },

    set: async (id, updateData) => {
        const user = await User.findOne({ instanceID, id: String(id) });
        if (!user) return;

        const coreFields = ['name', 'nickname', 'money', 'bank', 'exp', 'level', 'isRegistered'];
        
        for (let key in updateData) {
            if (coreFields.includes(key)) {
                user[key] = updateData[key];
            } else {
                if (!user.extraData) user.extraData = {};
                user.extraData[key] = updateData[key];
                user.markModified('extraData');
            }
        }
        await user.save();
    },

    create: async (id, name, nickname = "") => {
        const url = await getAvatarUrl(id);
        await downloadAvatar(id, url);
        await User.create({
            instanceID,
            id: String(id),
            name,
            nickname,
            createDate: Date.now(),
            isRegistered: nickname ? 1 : 0
        });
        logger.loader(`مستخدم جديد: ${name} [${id}]`, 'event');
    },

    addExp: async (id, amount) => {
        const user = await User.findOne({ instanceID, id: String(id) });
        if (!user) return;
        
        user.exp += amount;
        let nextLevelExp = user.level * 500;
        
        if (user.exp >= nextLevelExp) {
            user.exp = 0;
            user.level += 1;
            logger.info(`اللاعب ${id} ارتفع للمستوى ${user.level}`);
        }
        await user.save();
    },
    
    banSystem: BanSystem,       
    isUserBanned: (userId, groupId, isAdminBot) => BanSystem.checkUserAccess(userId, groupId, isAdminBot),
    globalBan: BanSystem.globalBan,
    globalUnban: BanSystem.globalUnban,
    isGloballyBanned: BanSystem.isGloballyBanned,
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
    getLocalBannedList: BanSystem.getLocalBannedList,    
    protection: protectionData
};
