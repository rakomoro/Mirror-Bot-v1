const mongoose = require('mongoose');
const config = require('../config.json');

const instanceID = config.ADMINBOT && config.ADMINBOT[0] ? config.ADMINBOT[0] : 'default';

const protectionSchema = new mongoose.Schema({
    instanceID: { type: String, required: true, index: true },
    threadID: { type: String, required: true },
    enabled: {
        photo:    { type: Boolean, default: false },
        name:     { type: Boolean, default: false },
        add:      { type: Boolean, default: false },
        admin:    { type: Boolean, default: false },
        nickname: { type: Boolean, default: false },
        leave:    { type: Boolean, default: false },
        bot:      { type: Boolean, default: false },
        link:     { type: Boolean, default: false },
        spam:     { type: Boolean, default: false },
        mention:  { type: Boolean, default: false },
        emoji:    { type: Boolean, default: false },
        color:    { type: Boolean, default: false }
    },
    warns:     { type: Map, of: Number, default: {} },
    whitelist: { type: [String], default: [] },
    nicknames: { type: Map, of: String, default: {} },
    logs: [{
        text: String,
        time: Number
    }],
    oldName:  { type: String, default: "Group" },
    oldEmoji: { type: String, default: "👍" },
    oldColor: { type: String, default: null },
    oldImage: { type: String, default: null }
}, { timestamps: true });

protectionSchema.index({ instanceID: 1, threadID: 1 }, { unique: true });

const Protection = mongoose.model('Protection', protectionSchema);

module.exports = {
    get: async (threadID) => {
        try {
            return await Protection.findOne({ instanceID, threadID: String(threadID) });
        } catch (e) {
            return null;
        }
    },
    create: async (threadID, info) => {
        try {
            const doc = new Protection({
                instanceID,
                threadID: String(threadID),
                oldName:  info.threadName || "Group",
                oldEmoji: info.emoji || "👍",
                oldColor: info.threadTheme?.id || null,
                oldImage: info.imageSrc || null
            });
            await doc.save();
            return doc;
        } catch (e) {
            console.error("[حماية] خطأ في إنشاء السجل:", e);
            return null;
        }
    },
    save: async (doc) => {
        try {
            await doc.save();
            return true;
        } catch (e) {
            console.error("[حماية] خطأ في الحفظ:", e);
            return false;
        }
    }
};
