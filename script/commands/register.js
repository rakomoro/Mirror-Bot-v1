const deco = require('../../utils/decorations');

module.exports.config = {
    title: "تسجيل",
    release: "2.0.0",
    clearance: 0,
    author: "Hakim Tracks",
    summary: "تسجيل حساب جديد في البوت باستخدام اللقب",
    section: "عـــامـة",
    syntax: "",
    delay: 5,
};

module.exports.HakimRun = async ({ api, event, args, userData, user }) => {
    const { threadID, messageID, senderID } = event;
    const nickname = args.join(" ");


    if (user && user.isRegistered) {
        let msg = deco.titlePremium("⚠️ تنبيه التسجيل") + "\n\n";
        msg += deco.lineStar(`أنت مسجل بالفعل بلقب: ${user.nickname}`) + "\n\n";
        msg += deco.separatorDots + "\n";
        msg += deco.info("لا يمكنك التسجيل مرة أخرى. إذا أردت تغيير لقبك، تواصل مع المطور.") + "\n";
        return api.sendMessage(msg, threadID, messageID);
    }


    if (!nickname) {
        let msg = deco.titleLuxury("📝 طريقة التسجيل") + "\n\n";
        msg += deco.lineArrow("يرجى كتابة اللقب بعد الأمر") + "\n\n";
        msg += deco.titleGolden("مثال الاستخدام:") + "\n";
        msg += deco.box("تسجيل راكو سان") + "\n\n";
        msg += deco.lineArrow("اللقب يجب أن يكون فريداً وسهل التذكر") + "\n";
        return api.sendMessage(msg, threadID, messageID);
    }


    if (nickname.length > 30) {
        return api.sendMessage(
            deco.error("اللقب طويل جداً! يجب أن يكون أقل من 30 حرف."),
            threadID,
            messageID
        );
    }

    if (nickname.length < 2) {
        return api.sendMessage(
            deco.error("اللقب قصير جداً! يجب أن يكون على الأقل حرفين."),
            threadID,
            messageID
        );
    }

    try {

        const userInfo = await api.getUserInfo(senderID);
        const name = userInfo[senderID]?.name || "مستخدم فيسبوك";
        

        if (!user) {
            await userData.create(senderID, name, nickname);
        } else {
            await userData.set(senderID, { nickname: nickname, isRegistered: 1 });
        }


        let msg = deco.titlePremium("✨ تم التسجيل بنجاح ✨") + "\n\n";
        msg += deco.lineStar(`الاسم الحقيقي: ${name}`) + "\n";
        msg += deco.lineStar(`لقبك الجديد: ${nickname}`) + "\n\n";
        
        msg += deco.titleGolden("🎉 مرحباً بك في عالم ميرور بوت") + "\n";
        msg += deco.box(`
الآن يمكنك الوصول إلى:
━━━━━━━━━━━━━━━━━━━━━━
⚔️ نظام الألعاب (مغارة، ديماس، ببجي)
💰 نظام الاقتصاد والتجارة
🎮 ألعاب ترفيهية متنوعة
🤖 خدمات الذكاء الاصطناعي
📊 إحصائيات وتقارير شخصية

اكتب: اوامر
للحصول على قائمة الأوامر الكاملة!
        `) + "\n";
        
        msg += deco.progressBarLuxury(100) + "\n\n";
        msg += deco.center("استعد للارتقاء لمستوى الـ Monarch! 👑", 40);

        api.sendMessage(msg, threadID, messageID);
    } catch (e) {
        console.error("خطأ في التسجيل:", e);
        api.sendMessage(
            deco.error("حدث خطأ أثناء التسجيل. يرجى المحاولة لاحقاً."),
            threadID,
            messageID
        );
    }
};
