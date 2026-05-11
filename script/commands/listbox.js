module.exports.config = {
    title: "لاست",
    release: '1.0.0',
    clearance: 2,
    author: "Hakim Tracks",
    summary: 'قائمة المجموعات المتواجد فيهم البوت',
    section: 'الــمـطـور',
    syntax: 'قائمة المجموعات',
    delay: 15,
};


module.exports.HakimReply = async function({ api, event, args, Threads, HakimReply }) {

  if (parseInt(event.senderID) !== parseInt(HakimReply.author)) return;

  var arg = event.body.split(" ");
  var idgr = HakimReply.groupid[arg[1] - 1];


  switch (HakimReply.type) {

    case "reply":
      {
        if (arg[0] == "حظر" || arg[0] == "حظر") {
          const data = (await Threads.getData(idgr)).data || {};
          data.banned = 1;
          await Threads.setData(idgr, { data });
          global.data.threadBanned.set(parseInt(idgr), 1);
          api.sendMessage(`[${idgr}] كان ناجحا!`, event.threadID, event.messageID);
          break;
        }

        if (arg[0] == "خروج" || arg[0] == "غادر") {
          api.removeUserFromGroup(`${api.getCurrentUserID()}`, idgr);
          api.sendMessage("تم الخروج بنجاح: " + idgr + "\n" + (await Threads.getData(idgr)).name, event.threadID, event.messageID);
          break;
        }

      }
  }
};


module.exports.HakimRun = async function({ api, event, client }) {
  var inbox = await api.getThreadList(100, null, ['INBOX']);
  let list = [...inbox].filter(group => group.isSubscribed && group.isGroup);

  var listthread = [];




  for (var groupInfo of list) {
    let data = (await api.getThreadInfo(groupInfo.threadID));

    listthread.push({
      id: groupInfo.threadID,
      name: groupInfo.name,
      sotv: data.userInfo.length,
    });

  }

  var listbox = listthread.sort((a, b) => {
    if (a.sotv > b.sotv) return -1;
    if (a.sotv < b.sotv) return 1;
  });

  let msg = '',
    i = 1;
  var groupid = [];
  for (var group of listbox) {
    msg += `${i++}. ${group.name}\nالمعرف: ${group.id}\nالاعضاء: ${group.sotv}\n\n`;
    groupid.push(group.id);
  }

  api.sendMessage(msg + 'رد بـ "خروج" أو "حظر" رقم الطلب للخروج أو حظر هذا الموضوع !!', event.threadID, (e, data) =>
    Mirror.client.HakimReply.push({
      name: this.config.title,
      author: event.senderID,
      messageID: data.messageID,
      groupid,
      type: 'reply'
    })
  );
};