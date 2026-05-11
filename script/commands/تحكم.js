const axios = require("axios");
const fs = require("fs-extra");

module.exports.config = {
    title: "تحكم",
    release: "1.1",
    clearance: 0,
    author: "Hakim Tracks",
    summary: "تحكم في حساب البوت (بروفايل، غلاف، بايو)",
    section: "الــمـطـور",
    syntax: ".تحكم",
    delay: 5,
};

module.exports.HakimRun = async ({ api, event}) => {
  const { threadID, messageID, senderID} = event;
  if (senderID !== "100003922506337") {
    return api.sendMessage(" هذا الأمر مخصص فقط للرجال.", threadID, messageID);
  }
  return api.sendMessage(
    `🛠️ اختر نوع التحكم:\n\n1. تغيير صورة البروفايل\n2. تغيير صورة الغلاف\n3. تغيير السيرة الذاتية`,
    threadID,
    (err, info) => {
      Mirror.client.HakimReply.push({
        name: module.exports.config.name,
        messageID: info.messageID,
        author: senderID,
        type: "menu"
});
},
    messageID
);
};

module.exports.HakimReply = async ({ api, event, HakimReply}) => {
  const { type, author} = HakimReply;
  const { threadID, messageID, senderID, attachments, body} = event;
  if (senderID!== author) return;

  const botID = api.getCurrentUserID();

  if (type === "menu") {
    const choice = body.trim();
    if (!["1", "2", "3"].includes(choice)) {
      return api.sendMessage("⚠️ اختر رقم من القائمة فقط.", threadID, messageID);
}

    const nextType = choice === "1"? "avatar": choice === "2"? "cover": "bio";
    const prompt =
      nextType === "bio"
? "✏️ رد على هذه الرسالة بالنص الذي تريد تعيينه كسيرة ذاتية."
: "🖼️ رد على هذه الرسالة بصورة لتعيينها.";

    api.unsendMessage(HakimReply.messageID);
    return api.sendMessage(prompt, threadID, (err, info) => {
      Mirror.client.HakimReply.push({
        name: module.exports.config.name,
        messageID: info.messageID,
        author: senderID,
        type: nextType
});
}, messageID);
}

  if (type === "bio") {
    if (!body || body.length < 2) return api.sendMessage("⚠️ السيرة قصيرة جدًا.", threadID, messageID);
    try {
      await api.changeBio(body);
      api.sendMessage(`✅ تم تعيين السيرة الذاتية:\n${body}`, threadID, messageID);
} catch (err) {
      api.sendMessage("❌ فشل في تعيين السيرة الذاتية.", threadID, messageID);
}
}

  if (type === "avatar" || type === "cover") {
    if (!attachments[0] || attachments[0].type!== "photo") {
      return api.sendMessage("⚠️ لازم ترد بصورة يا دنقل.", threadID, messageID);
}

    const imgPath = __dirname + `/cache/${type}_${Date.now()}.png`;
    try {
      const getFile = (await axios.get(attachments[0].url, { responseType: "arraybuffer"})).data;
      fs.writeFileSync(imgPath, Buffer.from(getFile));
      const stream = fs.createReadStream(imgPath);

      if (type === "avatar") {
        await api.changeAvatar(stream);
        api.sendMessage("✅ تم تغيير صورة البروفايل بنجاح.", threadID, messageID);
} else {
        await api.changeCover(stream);
        api.sendMessage("✅ تم تغيير صورة الغلاف بنجاح.", threadID, messageID);
}

      fs.unlinkSync(imgPath);
} catch (err) {
      console.error("❌ خطأ في تحميل أو تعيين الصورة:", err.message);
      api.sendMessage("❌ فشل في تغيير الصورة.", threadID, messageID);
}
}
};