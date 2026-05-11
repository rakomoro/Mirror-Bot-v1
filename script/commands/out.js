module.exports.config = {
    title: "غادر",
    release: "1.0.0",
    clearance: 2,
    author: "Hakim Tracks",
    summary: "مو شغلك 😇",
    section: "الــمـطـور",
    syntax: "غادري [ايدي الكروب]",
    delay: 10,
};

module.exports.HakimRun = async function({ api, event, args }) {
    const permission =
    [`61553754531086`,`100003922506337`]
    if (!permission.includes(event.senderID)) return;
        if (!args[0]) return api.removeUserFromGroup(api.getCurrentUserID(), event.threadID);
        if (!isNaN(args[0])) return api.removeUserFromGroup(api.getCurrentUserID(), args.join(" "));
                                                                                              }
