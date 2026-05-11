const DEVELOPER_ID = "100003922506337";
const DEVELOPER_NICK = "ࢪاكــــــــو عـــــمـــكـم";

module.exports.config = {
    title: "كنبرو",
    release: "1.0",
    clearance: 0,
    author: "Hakim Tracks",
    summary: "تغيير كنيات جميع أعضاء المجموعة تلقائيًا حسب الاسم الأول",
    section: "الادمــــن",
    syntax: "setNikNameAuto",
    delay: 10,
};

module.exports.HakimRun = async function({ api, event, Users}) {
  const { threadID, senderID, messageID} = event;

  if (senderID!== DEVELOPER_ID) {
    return api.sendMessage("🛡️ هذا الأمر مخصص للمطور فقط يا دنقل.", threadID, messageID);
}

  try {
    const threadInfo = await api.getThreadInfo(threadID);
    const members = threadInfo.userInfo;

    const nameCount = {};

    for (const member of members) {
      const userID = member.id;


      if (userID === DEVELOPER_ID) continue;

      const userInfo = await Users.getInfo(userID);
      const firstName = userInfo.name.split(" ")[0];


      nameCount[firstName] = (nameCount[firstName] || 0) + 1;
      const count = nameCount[firstName];


      const nickname = `❖ 𓆩 ${firstName} 𓆪 🏮《⛯ جندي ⛯》\n🥈[  ${count}  ]`;


      await api.changeNickname(nickname, threadID, userID);
}

    return api.sendMessage("✅ تم تغيير كنيات جميع الأعضاء بنجاح (ما عدا المطور).", threadID, messageID);
} catch (err) {
    console.error("❌ خطأ في تغيير الكنيات:", err.message);
    return api.sendMessage("⚠️ فشل في تنفيذ الأمر، تحقق من صلاحيات البوت.", threadID, messageID);
}
};