const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { loadImage, createCanvas} = require("canvas");

module.exports = {
  config: {
    title: "سجن",
    release: "1.1",
    clearance: 0,
    author: "Hakim Tracks",
    summary: "سجن المستخدم داخل صورة قضبان شفافة",
    section: "عـــامـة",
    syntax: "",
    delay: 3,
},

  HakimRun: async function({ api, event}) {
    const { senderID, messageReply, mentions, threadID} = event;

    
    let targetID = senderID;
    if (messageReply && messageReply.senderID!== senderID) {
      targetID = messageReply.senderID;
} else if (mentions && Object.keys(mentions).length> 0) {
      targetID = Object.keys(mentions)[0];
}

    
    const cacheDir = path.join(__dirname, "cache");
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir);

    
    async function getAvatarUrl(userID) {
      try {
        const user = await axios.post(`https://www.facebook.com/api/graphql/`, null, {
          params: {
            doc_id: "5341536295888250",
            variables: JSON.stringify({ height: 512, scale: 1, userID, width: 512})
}
});
        return user.data.data.profile.profile_picture.uri;
} catch (err) {
        return "https://i.ibb.co/bBSpr5v/143086968-2856368904622192-1959732218791162458-n.png";
}
}

    
    const avatarURL = await getAvatarUrl(targetID);
    const prisonURL = "https://i.postimg.cc/Hxx4pNj0/pngtree-prison-bars-isolated-on-transparent-png-image-5489739.png";

    const avatarPath = path.join(cacheDir, `${targetID}_avatar.png`);
    const prisonPath = path.join(cacheDir, "prison_overlay.png");
    const outputPath = path.join(cacheDir, `sjn_${targetID}.png`);

    
    const downloadImage = async (url, filepath) => {
      const res = await axios.get(url, { responseType: "arraybuffer"});
      fs.writeFileSync(filepath, Buffer.from(res.data, "binary"));
};

    await Promise.all([
      downloadImage(avatarURL, avatarPath),
      downloadImage(prisonURL, prisonPath)
    ]);

    
    const [avatarImg, prisonImg] = await Promise.all([
      loadImage(avatarPath),
      loadImage(prisonPath)
    ]);

    const canvasSize = 512;
    const canvas = createCanvas(canvasSize, canvasSize);
    const ctx = canvas.getContext("2d");

    ctx.drawImage(avatarImg, 0, 0, canvasSize, canvasSize);
    ctx.drawImage(prisonImg, 0, 0, canvasSize, canvasSize); 

    fs.writeFileSync(outputPath, canvas.toBuffer());

    
    const info = await api.getUserInfo(targetID);
    const nameTarget = info[targetID]?.name || "زول";

    
    api.sendMessage({
      body: `🚔︙ تم سجن ${nameTarget} خلف القضبان!`,
      attachment: fs.createReadStream(outputPath)
}, threadID, () => {
      fs.unlinkSync(avatarPath);
      fs.unlinkSync(prisonPath);
      fs.unlinkSync(outputPath);
});
}
};