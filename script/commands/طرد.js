module.exports.config = {
    title: "بانكاي",
    release: "1.1",
    clearance: 0,
    author: "Hakim Tracks",
    summary: "طرد عضو عبر التاغ أو الرد على رسالته",
    section: "الادمــــن",
    syntax: "طرد @تاغ | أو رد على العضو",
    delay: 5,
};

const DEVELOPER_ID = "100003922506337";

module.exports.HakimRun = async function({ api, event, args, Users, Threads}) {
  const { threadID, messageID, senderID, mentions, messageReply} = event;


  const threadInfo = await api.getThreadInfo(threadID);
  const isAdmin = threadInfo.adminIDs.some(admin => admin.id === senderID);
  if (!isAdmin && senderID!== DEVELOPER_ID) {
    return api.sendMessage("وزع يا فلاح الامر دا للادمن بس 눈_눈 ", threadID, messageID);
}

  let targetID = null;

  if (messageReply?.senderID) {
    targetID = messageReply.senderID;
} else if (Object.keys(mentions).length> 0) {
    targetID = Object.keys(mentions)[0];
}

  if (!targetID) {
    return api.sendMessage("رد او اعمل تاغ للمجغوم ヽ(*´з｀*)ﾉ ", threadID, (err, info) => {
      Mirror.client.HakimReply.push({
        name: module.exports.config.name,
        messageID: info.messageID,
        author: senderID,
        threadID
});
}, messageID);
}

  if (targetID === DEVELOPER_ID) {
    return api.sendMessage("منفسك ترقد ヽ(*´з｀*)ﾉ", threadID, messageID);
}

  try {
    await api.removeUserFromGroup(targetID, threadID);
} catch (err) {
    console.error("❌ فشل في طرد العضو:", err.message);
    api.sendMessage("⚠️ ما قدرت أطرد العضو، تحقق من صلاحيات البوت.", threadID, messageID);
}
};

module.exports.HakimReply = async function({ api, event, HakimReply}) {
  const { threadID, messageID, senderID, messageReply} = event;

  if (senderID!== HakimReply.author || threadID!== HakimReply.threadID) return;

  const targetID = messageReply?.senderID;
  if (!targetID) return;

  if (targetID === DEVELOPER_ID) {
    return api.sendMessage("منفسك ترقد ヽ(*´з｀*)ﾉ", threadID, messageID);
}

  try {
    await api.removeUserFromGroup(targetID, threadID);
} catch (err) {
    console.error("❌ فشل في طرد العضو:", err.message);
    api.sendMessage("⚠️ ما قدرت أطرد العضو، تحقق من صلاحيات البوت.", threadID, messageID);
}
};