const io = require("socket.io")(7011, {
    cors: {
        origin: "https://tauri.localhost", // http://localhost:3000 for dev
        methods: ["GET", "POST"],
        credentials: true,
        allowedHeaders: ["my-custom-header"],
        cors: { origin: "*" }
    }
});
const { TikTokConnectionWrapper } = require('./connectionWrapper');
const { LiveChat } = require('youtube-chat');
const argv = require('yargs/yargs')(process.argv.slice(2)).argv;

let youtubeChannelId = argv.yt || "UC7Po7K12YTOE5jNYYE0kKaA";
let tiktokProfileName = argv.tiktok || "everythingnowshow";

io.on("connection", (socket) => {
    let tiktokConnectionWrapper;
    const liveChat = new LiveChat({ channelId: youtubeChannelId });

    liveChat.on('start', (liveId) => {
        console.info(`YouTube Live chat started for Live ID: ${liveId}`);
    });

    liveChat.on('chat', (chatItem) => {
        socket.emit("youtubeChat", chatItem);
    });

    liveChat.on('error', (err) => {
        console.error(`YouTube Live chat error: ${err}`);
    });

    liveChat.start().then((ok) => {
        if (!ok) {
            console.log("Failed to start YouTube Live chat, check emitted error");
            console.error(`\n\n\n\n Close and try again once ProChat is running!`);
        }
    });

    socket.on("setUniqueId", (data) => {
        const { uniqueId, options } = data;
        tiktokConnectionWrapper = new TikTokConnectionWrapper(tiktokProfileName || uniqueId, options, true);
        tiktokConnectionWrapper.connect();

        tiktokConnectionWrapper.connection.on('chat', (msg) => {
            socket.emit("tiktokChat", msg);
        });
    });

    socket.on("disconnect", () => {
        if (tiktokConnectionWrapper) {
            tiktokConnectionWrapper.disconnect();
        }
        liveChat.stop();
    });
});

console.info(`Chat service running on port 7011`);
