module.exports.config = {
    title: "مسح",
    release: "1.0.1",
    clearance: 1,
    author: "Hakim Tracks",
    summary: "ا",
    section: "عـــامـة",
    syntax: "حذف رسائل البوت",
    delay: 0,
};

module.exports.languages = {
    "vi": {
        "returnCant": "Không thể gỡ tin nhắn của người khác.",
        "missingReply": "Hãy reply tin nhắn cần gỡ."
    },
    "en": {
        "returnCant": "اقول تدخل حسابه وتحذفها 🙂🗡️",
        "missingReply": "رد عا رسالتي 🙂"
    }
}

module.exports.HakimRun = function({ api, event, getText }) {
    if (event.messageReply.senderID != api.getCurrentUserID()) return api.sendMessage(getText("returnCant"), event.threadID, event.messageID);
    if (event.type != "message_reply") return api.sendMessage(getText("missingReply"), event.threadID, event.messageID);
    return api.unsendMessage(event.messageReply.messageID);
}
