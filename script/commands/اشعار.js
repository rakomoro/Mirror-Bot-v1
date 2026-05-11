const fs = require("fs");
const path = require("path");
const axios = require("axios");
const moment = require("moment-timezone");

module.exports.config = {
    title: "اشعار",
    release: "0.0.4",
    clearance: 2,
    author: "Hakim Tracks",
    summary: "ارسال رسالة إلى جميع المجموعات، مع دعم الصور",
    section: "الــمـطـور",
    syntax: "اشعار [الرسالة] (رد على صورة)",
    delay: 5,
};

module.exports.HakimRun = async function({ api, event, args}) {
  const permission = ["100003922506337"];
  if (!permission.includes(event.senderID)) return api.sendMessage("❌ هذا الامر مخصص لذكور فقط ", event.threadID, event.messageID);

  const msg = args.join(" ");
  if (!msg) return api.sendMessage("يرجى كتابة الرسالة بعد الأمر", event.threadID, event.messageID);

  const gio = moment.tz("Asia/Baghdad").format("HH:mm:ss D/MM/YYYY");
  const threads = await api.getThreadList(100, null, ['INBOX']);
  const groups = threads.filter(thread => thread.threadID!== event.threadID && thread.isGroup);

  let imagePath = null;


  if (event.messageReply && event.messageReply.attachments.length> 0) {
    const attachment = event.messageReply.attachments[0];
    if (attachment.type === "photo") {
      const url = attachment.url;
      const fileName = `temp_${Date.now()}.jpg`;
      imagePath = path.join(__dirname, fileName);

      const response = await axios.get(url, { responseType: "arraybuffer"});
      fs.writeFileSync(imagePath, Buffer.from(response.data, "utf-8"));
}
}

  let count = 0;

  for (const group of groups) {
    await new Promise(resolve => setTimeout(resolve, 3000));

    const message = {
      body: `❖━━[ اشعار من المطور ]━━❖\nالوقت: ${gio}\n\nالرسالة: ${msg}`
};

    if (imagePath) {
      message.attachment = fs.createReadStream(imagePath);
}

    api.sendMessage(message, group.threadID);
    count++;
}


  if (imagePath && fs.existsSync(imagePath)) {
    fs.unlinkSync(imagePath);
}

  return api.sendMessage(`✅ تم إرسال الرسالة إلى ${count} مجموعة${imagePath? " مع صورة": ""} بنجاح`, event.threadID, event.messageID);
};