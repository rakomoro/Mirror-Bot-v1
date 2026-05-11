const restoreAttempts = {};
const DEVELOPER_ID = "100003922506337";
const DEVELOPER_NICK = "ࢪاكــــــــو عـــــمـــكـم";

module.exports.config = {
    title: "كنية",
    release: "1.2",
    clearance: 0,
    author: "Hakim Tracks",
    summary: "تعيين كنية لعضو في المجموعة باستخدام تاغ أو رد أو لنفسك",
    section: "الادمــــن",
    syntax: "كنية @تاغ + الكنية | أو رد على رسالة العضو + الكنية | أو كنية لنفسك",
    delay: 5,
};

module.exports.HakimRun = async function({ api, event, args}) {
  const { threadID, messageID, messageReply, mentions, senderID} = event;

  let targetID = senderID;
  let nickname;

  if (messageReply) {
    targetID = messageReply.senderID;
    nickname = args.join(" ").trim();
} else if (Object.keys(mentions).length> 0) {
    targetID = Object.keys(mentions)[0];
    nickname = args.slice(1).join(" ").trim();
} else {
    nickname = args.join(" ").trim();
}

  if (!nickname) return;


  if (targetID === DEVELOPER_ID && nickname!== DEVELOPER_NICK) {
    api.sendMessage("المطور فوق القانون ويراقبك يا دنقل 👁️", threadID, messageID);


    restoreAttempts[threadID] = restoreAttempts[threadID] || 0;
    if (restoreAttempts[threadID]>= 2) return;

    try {
      await api.changeNickname(DEVELOPER_NICK, threadID, DEVELOPER_ID);
} catch (err) {
      restoreAttempts[threadID]++;
}

    return;
}

  try {
    await api.changeNickname(nickname, threadID, targetID);
} catch (err) {
    console.error("❌ خطأ في تعيين الكنية:", err.message);
    api.sendMessage("⚠️ فشل في تعيين الكنية، تحقق من صلاحيات البوت.", threadID, messageID);
}
};