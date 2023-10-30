"use client";
import { useEffect, useRef, useState } from "react";
import tmi from "tmi.js";
import { EmoteOptions, parse } from 'simple-tmi-emotes';
import { AnimatePresence, motion } from "framer-motion";
import Autolinker from 'autolinker';
import { State } from "./Control";
import { FaSearch, FaTwitch, FaYoutube } from 'react-icons/fa';
import { PiPlantBold } from "react-icons/pi";
import { createYouTube, listen } from "../../utils/yt";

interface Message {
    id: string | undefined;
    username: string | undefined;
    twitch: string | undefined;
    emotes: { [x: string]: string[];[x: number]: string[] };
    date: Date;
    message: string;
    badges: tmi.Badges | undefined;
    mod: boolean | undefined;
    subscriber: boolean | undefined;
    color: string | undefined;
    userType: string | undefined;
    turbo: boolean | undefined;
    returningChatter: boolean | undefined;
    firstMessage: boolean | undefined;
    platform: string;
}

interface ControlMessage {
    message: string;
    shown: boolean;
}

export function isDark(color: any) {
    if (color === undefined || color === null) {
        return false;
    }
    var c = color.substring(1);
    var rgb = parseInt(c, 16);
    var r = (rgb >> 16) & 0xff;
    var g = (rgb >> 8) & 0xff;
    var b = (rgb >> 0) & 0xff;

    var luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;

    return luma < 60;
}

export function lightenColor(color: any, percent: any) {
    var num = parseInt(color.replace("#", ""), 16),
        amt = Math.round(2.55 * percent),
        R = (num >> 16) + amt,
        G = (num >> 8 & 0x00FF) + amt,
        B = (num & 0x0000FF) + amt;
    return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 + (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 + (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
}


export function Main() {
    const [chat, setChat] = useState([]);
    const [firstMessageUsers, setFirstMessageUsers] = useState([]);
    const firstMessageUsersRef = useRef([]);
    const initialFontSize = parseInt(window.localStorage.getItem('fontSize') || '14');
    const initialEmojiSize = window.localStorage.getItem('emojiSize') || '1.0';
    const initialUseTagColor = window.localStorage.getItem('useTagColor') === 'true';

    const [fontSize, setFontSize] = useState(initialFontSize);
    const settingsRef = useRef<HTMLDivElement | null>(null);
    const [emojiSize, setEmojiSize] = useState(initialEmojiSize);
    const [useTagColor, setUseTagColor] = useState(initialUseTagColor);
    const [stream, setStream] = useState(() => window.localStorage.getItem('stream') || 'EverythingNowShow');
    const [youtubeChannelId, setyoutubeChannelId] = useState(() => window.localStorage.getItem('youtubeChannelId') || 'UC7Po7K12YTOE5jNYYE0kKaA');
    const [youtubeApiKey, setyoutubeApiKey] = useState(() => window.localStorage.getItem('youtubeApiKey') || 'apikey');
    const [controlMessage, setControlMessage] = useState<ControlMessage | null>(null);
    const [messageShown, setMessageShown] = useState(false);
    const [highlightedMessageId, setHighlightedMessageId] = useState(null);
    const [userFilter, setUserFilter] = useState("");

    useEffect(() => {
        //@ts-ignore
        window.__TAURI__.event.listen('stream-changed', () => {
            setStream(window.localStorage.getItem('stream') || 'EverythingNowShow');
            window.location.reload();
        });
        //@ts-ignore
        window.__TAURI__.event.listen('channel-changed', () => {
            setyoutubeChannelId(window.localStorage.getItem('youtubeChannelId') || '');
            window.location.reload();
        });
        //@ts-ignore
        window.__TAURI__.event.listen('api-changed', () => {
            setyoutubeApiKey(window.localStorage.getItem('youtubeApiKey') || '');
            window.location.reload();
        });
    }, []);

    let myState: State = {
        emojiSize: "1.0",
        useTagColor: true,
        fontSize: 14,
        engineerFontSize: 14,
    };

    //@ts-ignore
    window.__TAURI__.event.listen('state-changed', () => {
        const newState = JSON.parse(window.localStorage.getItem('myState') || '{}') as State;
        myState = newState;
        setFontSize(myState.fontSize);
        setEmojiSize(myState.emojiSize);
        setUseTagColor(myState.useTagColor);
    });

    const chatWindowRef = useRef(null);

    const handleUserClicked = (user: any) => {
        setUserFilter(user.payload);
    };

    const handleUserClearClicked = () => {
        setUserFilter("");
    };

    useEffect(() => {
        let isSubscribed = true;
        const controlMessageHandler = (message: string) => {
            if (isSubscribed) {
                setControlMessage({
                    message,
                    shown: true,
                });
            }
        };
        //@ts-ignore
        window.__TAURI__.event.listen('control-message', controlMessageHandler);
        const showControlMessageHandler = (message: string) => {
            if (isSubscribed) {
                setControlMessage({
                    message,
                    shown: true,
                });
                setMessageShown(true);
            }
        };
        //@ts-ignore
        window.__TAURI__.event.listen('show-control-message', showControlMessageHandler);
        const hideControlMessageHandler = () => {
            if (isSubscribed) {
                setMessageShown(false);
            }
        };
        //@ts-ignore
        window.__TAURI__.event.listen('hide-control-message', hideControlMessageHandler);

        const handleMessageClicked = (messageId: any) => {
            if (messageId.payload === "") {
                setHighlightedMessageId(null);
            }
            const messageElement = document.getElementById(messageId.payload);
            if (messageElement) {
                setHighlightedMessageId(messageId.payload);
                messageElement.scrollIntoView({ behavior: "smooth", block: "start" });
                window.scrollBy(0, -100);
            }
        };

        //@ts-ignore
        window.__TAURI__.event.listen('message-clicked', handleMessageClicked);

        //@ts-ignore
        window.__TAURI__.event.listen('user-clicked', handleUserClicked);

        //@ts-ignore
        window.__TAURI__.event.listen('clear-user-clicked', handleUserClearClicked);

        //@ts-ignore
        window.__TAURI__.event.listen('snap-down', () => {
            //scroll to the bottom of the page
            if (chatWindowRef.current) {
                //@ts-ignore
                chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
            }
        });

        return () => {
            isSubscribed = false;
        };
    }, []);

    //@ts-ignore
    useEffect(() => {
        const client = new tmi.Client({
            options: { debug: true },
            connection: {
                secure: true,
                reconnect: true,
            },
            channels: [stream],
        });

        const yt = createYouTube({
            channelId: youtubeChannelId,
            apiKey: youtubeApiKey
        });

        yt.on('error', (error) => {
            console.error(`Handled Error: ${error}`);
        });

        yt.on('message', (data: any) => {
            setChat((prevChat) => {
                let newChat = [...prevChat];
                //@ts-ignore
                newChat.push({
                    user: data.authorDetails.displayName,
                    message: data.snippet.displayMessage,
                    // generate a random color using the name as the seed
                    color: '#' + Math.floor(Math.abs(Math.sin(data.authorDetails.displayName.split('').reduce((prev: any, curr: any) => ((prev << 5) - prev) + curr.charCodeAt(0), 0)) * 16777215)).toString(16),
                    first: false,
                    id: data.id,
                    returningChatter: false,
                    platform: 'youtube'
                });
                // Limit chat history to the last 60 messages
                return newChat.slice(Math.max(newChat.length - 60, 0));
            });
        });

        listen(yt, 10000);

        client.connect();

        client.on('subgift', (channel, username, streakMonths, recipient, methods, userstate) => {
            console.log("SUBGIFT", username, streakMonths, recipient, methods, userstate);
            //@ts-ignore
            setChat((prevChat) => {
                //@ts-ignore
                return [...prevChat, { user: "ENSBOT", message: `${username} gifted a sub to ${recipient}!!!`, emotes: null, color: "#38D2D9", first: false, id: 1, returningChatter: false, gift: true }];
            });
        });

        client.on("message", (channel, tags, message, self) => {

            const msg: Message = {
                id: tags?.id,
                username: tags['display-name'],
                twitch: tags?.username,
                emotes: tags?.emotes || {},
                date: new Date(),
                message,
                badges: tags?.badges,
                mod: tags?.mod,
                subscriber: tags?.subscriber,
                color: tags?.color,
                userType: tags?.['user-type'],
                turbo: tags?.turbo,
                returningChatter: tags?.['returning-chatter'],
                firstMessage: tags?.['first-msg'],
                platform: 'twitch'
            };
            let first = false;

            if (msg.firstMessage) {
                //@ts-ignore
                firstMessageUsersRef.current = [...firstMessageUsersRef.current, msg.username];
                setFirstMessageUsers(firstMessageUsersRef.current);
                console.log('first message1', msg.username);
                console.log(firstMessageUsersRef.current);
            }
            //@ts-ignore
            if (firstMessageUsersRef.current.includes(msg.username)) {
                first = true;
                console.log('first message2', msg.username);
            }

            msg.message = message;

            //@ts-ignore
            setChat((prevChat) => {
                const lastChat = prevChat[prevChat.length - 1];
                let newChat = [...prevChat];
                //@ts-ignore
                if (lastChat && lastChat.user === tags["display-name"] && lastChat.message === message) {
                    return prevChat;
                } else {
                    //@ts-ignore
                    newChat.push({
                        user: tags["display-name"],
                        message,
                        emotes: tags?.emotes,
                        color: tags?.color,
                        first: first,
                        id: tags?.id,
                        returningChatter: tags?.['returning-chatter'],
                        platform: 'twitch'
                    });
                }

                // Limit chat history to the last 60 messages
                return newChat.slice(Math.max(newChat.length - 60, 0));
            });
        });

        return () => client.disconnect();
    }, []);
    const options: EmoteOptions = {
        format: 'default',
        themeMode: 'light',
        //@ts-ignore
        scale: emojiSize,
    };

    return (
        <><div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 9999
        }}>
            <AnimatePresence>
                {messageShown && controlMessage?.message && (
                    <motion.div
                        initial={{ opacity: 0, y: -50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -50 }}
                        style={{
                            background: '#2D2D2D',
                            border: '2px solid #FFC300',
                            boxShadow: '2px 2px 8px rgba(0, 0, 0, 0.25)',
                            fontSize: `${fontSize * 2}px`,
                            fontWeight: 'bold',
                            textAlign: 'center',
                            padding: '10px',
                            borderRadius: '10px',
                        }}
                    >
                        {
                            //@ts-ignore
                            controlMessage.message.payload
                        }
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
            <div className="px-4" style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                <div className="chatBox" ref={chatWindowRef} style={{
                    borderRadius: "15px",
                    padding: "20px",
                    overflow: "hidden",
                    maxHeight: "98vh",
                    minHeight: "80vh",
                    display: "flex",
                    flexDirection: "column-reverse",
                    fontSize: `${fontSize}px`,
                    boxShadow: "0px 0px 10px 0px rgba(0,0,0,0.75)",
                    position: 'relative',
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                }}>
                    <AnimatePresence>
                        {chat.filter((chatLine: any) => highlightedMessageId ? chatLine.id === highlightedMessageId : (userFilter === "" || chatLine.user === userFilter))
                            .map((chatLine: any, index) => (
                                <motion.div
                                    key={index}
                                    id={chatLine.id}
                                    className="chatLine"
                                    style={{
                                        border: chatLine.first ? "2px solid white" : chatLine.gift ? "2px dotted gold" : "",
                                        borderRadius: "10px",
                                        backgroundColor: chatLine.first ? "green" : chatLine.id === highlightedMessageId ? "gray" : "",
                                        fontWeight: chatLine.first ? "bold" : "normal",
                                        fontSize: chatLine.first ? `${fontSize * 1.2}px` : `${fontSize}px`,
                                        cursor: "pointer"
                                    }}
                                    initial={{ opacity: 0, y: -50 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -50 }}
                                >
                                    {chatLine.first && <PiPlantBold size={`${fontSize * 1.2}px`} color="white" style={{ marginRight: "20px", paddingTop: "5px" }} />}
                                    {chatLine.id === highlightedMessageId && <FaSearch size={`${fontSize * 1.2}px`} color="gold" style={{ padding: "4px" }} />}
                                    {chatLine.platform === 'twitch' && <FaTwitch size={`${fontSize}px`} style={{ marginRight: "10px" }} />}
                                    {chatLine.platform === 'youtube' && <FaYoutube size={`${fontSize}px`} style={{ marginRight: "10px" }} />}
                                    <span className="username" style={{
                                        fontWeight: "bold",
                                        color: chatLine.first ? "white" : chatLine.id === highlightedMessageId ? "#FFC100" : useTagColor ? isDark(chatLine.color) ? lightenColor(chatLine.color, 40) : chatLine.color : "white",
                                        fontSize: chatLine.id === highlightedMessageId ? `${fontSize * 1.6}px` : fontSize
                                    }}>{chatLine.user}: </span>
                                    <span className="message" dangerouslySetInnerHTML={{
                                        __html: Autolinker.link(parse(chatLine.message, chatLine.emotes, options), {
                                            className: 'apple',
                                        }),
                                    }} style={{
                                        fontSize: chatLine.id === highlightedMessageId ? `${fontSize * 1.6}px` : fontSize
                                    }} />
                                </motion.div>
                            )).reverse()}
                    </AnimatePresence>
                </div>
                <div className="my-7" />
            </div></>
    );
}

export default Main;
