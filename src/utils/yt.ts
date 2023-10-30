import axios from 'axios';
import { EventEmitter } from 'events';

interface YouTubeOptions {
    channelId: string;
    apiKey: string;
}

type YouTubeEmitter = EventEmitter & {
    id?: string;
    key?: string;
    liveId?: string;
    chatId?: string;
    interval?: NodeJS.Timeout;
};

const createYouTube = (options: YouTubeOptions): YouTubeEmitter => {
    const { channelId, apiKey } = options;
    const yt: YouTubeEmitter = new EventEmitter();
    yt.id = channelId;
    yt.key = apiKey;
    getLive(yt);
    return yt;
};

const request = async (yt: YouTubeEmitter, url: string) => {
    try {
        const response = await axios.get(url);
        if (response.status === 200) {
            return response.data;
        } else {
            yt.emit('error', `Status code: ${response.status}`);
            return null;
        }
    } catch (error) {
        yt.emit('error', error);
        return null;
    }
};

const getLive = async (yt: YouTubeEmitter) => {
    const url = `https://www.googleapis.com/youtube/v3/search?eventType=live&part=id&channelId=${yt.id}&type=video&key=${yt.key}`;
    const data = await request(yt, url);
    if (!data || !data.items[0]) {
        yt.emit('error', 'Cannot find live.');
        return;
    }
    yt.liveId = data.items[0].id.videoId;
    await getChatId(yt).catch(err => yt.emit('error', err));
};

const getChatId = async (yt: YouTubeEmitter) => {
    if (!yt.liveId) return yt.emit('error', 'Live id is invalid.');
    const url = `https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails&id=${yt.liveId}&key=${yt.key}`;
    const data = await request(yt, url);
    if (!data || !data.items.length) {
        return yt.emit('error', 'Cannot find chat.');
    }
    yt.chatId = data.items[0].liveStreamingDetails.activeLiveChatId;
    yt.emit('ready');
};

const getChat = async (yt: YouTubeEmitter) => {
    if (!yt.chatId) return yt.emit('error', 'Chat id is invalid.');
    const url = `https://www.googleapis.com/youtube/v3/liveChat/messages?liveChatId=${yt.chatId}&part=id,snippet,authorDetails&maxResults=10&key=${yt.key}`;
    const data = await request(yt, url);
    if (data) {
        yt.emit('json', data);
    }
};

const listen = (yt: YouTubeEmitter, delay: number | undefined) => {
    if (yt.interval) {
        clearInterval(yt.interval);
    }
    let lastRead = 0;
    let time = 0;
    yt.interval = setInterval(async () => {
        try {
            await getChat(yt);
        } catch (err) {
            yt.emit('error', err);
        }
    }, delay);

    yt.on('json', (data: { items: any; }) => {
        for (const item of data.items) {
            time = new Date(item.snippet.publishedAt).getTime();
            if (lastRead < time) {
                lastRead = time;
                yt.emit('message', item);
            }
        }
    });
};

const stop = (yt: YouTubeEmitter) => {
    clearInterval(yt.interval!);
};

export { createYouTube, listen, stop };
