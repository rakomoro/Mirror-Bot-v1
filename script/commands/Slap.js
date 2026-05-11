const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { loadImage, createCanvas} = require("canvas");

module.exports = {
  config: {
    title: "كف",
    release: "1.3",
    clearance: 0,
    author: "Hakim Tracks",
    summary: "اصفع شخص بالرد أو المنشن",
    section: "الــعــاب",
    syntax: "",
    delay: 3,
},

  HakimRun: async function({ api, event}) {
    const { senderID, messageReply, mentions, threadID} = event;
    let targetID;

    if (messageReply && messageReply.senderID!== senderID) {
      targetID = messageReply.senderID;
} else if (mentions && Object.keys(mentions).length> 0) {
      targetID = Object.keys(mentions)[0];
} else {
      return api.sendMessage("🌚︙ لازم تعمل منشن أو ترد على شخص!", threadID);
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

    const avatarURL1 = await getAvatarUrl(senderID);
    const avatarURL2 = await getAvatarUrl(targetID);
    const baseURL = "https://i.postimg.cc/W3TPYK6t/a4f0af6f18bc5fae50516adc66a255da.jpg";

    const img1Path = path.join(cacheDir, `${senderID}.jpg`);
    const img2Path = path.join(cacheDir, `${targetID}.jpg`);
    const basePath = path.join(cacheDir, `slap_base.jpg`);
    const outputPath = path.join(cacheDir, `slap_${senderID}.png`);

    const downloadImage = async (url, filepath) => {
      const res = await axios.get(url, { responseType: "arraybuffer"});
      fs.writeFileSync(filepath, Buffer.from(res.data, "binary"));
};

    await Promise.all([
      downloadImage(avatarURL1, img1Path),
      downloadImage(avatarURL2, img2Path),
      downloadImage(baseURL, basePath)
    ]);

    const [baseImg, avatar1, avatar2] = await Promise.all([
      loadImage(basePath),
      loadImage(img1Path),
      loadImage(img2Path)
    ]);

    const canvas = createCanvas(baseImg.width, baseImg.height);
    const ctx = canvas.getContext("2d");

    ctx.drawImage(baseImg, 0, 0, canvas.width, canvas.height);

    const imgSize = 160;

    
    const pos1 = {
      x: canvas.width - imgSize - 80,
      y: 170
};

    
    const pos2 = {
      x: 30,
      y: 50
};

    
    ctx.save();
    ctx.beginPath();
    ctx.arc(pos1.x + imgSize / 2, pos1.y + imgSize / 2, imgSize / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(avatar1, pos1.x, pos1.y, imgSize, imgSize);
    ctx.restore();

    
    ctx.save();
    ctx.beginPath();
    ctx.arc(pos2.x + imgSize / 2, pos2.y + imgSize / 2, imgSize / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(avatar2, pos2.x, pos2.y, imgSize, imgSize);
    ctx.restore();

    fs.writeFileSync(outputPath, canvas.toBuffer());

    const info = await api.getUserInfo([senderID, targetID]);
    const nameSender = info[senderID]?.name || "شخص";
    const nameTarget = info[targetID]?.name || "زول";

    api.sendMessage({
      body: `🙆‍♂️︙قام ${nameSender} بصفع العب ${nameTarget} ヽ(*´з｀*)ﾉ`,
      attachment: fs.createReadStream(outputPath)
}, threadID, () => {
      fs.unlinkSync(img1Path);
      fs.unlinkSync(img2Path);
      fs.unlinkSync(basePath);
      fs.unlinkSync(outputPath);
});
}
};