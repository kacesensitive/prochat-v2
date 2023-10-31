"use client";
import { useEffect, useRef, useState } from "react";
import tmi from "tmi.js";
import { EmoteOptions, parse } from 'simple-tmi-emotes';
import { AnimatePresence, motion } from "framer-motion";
import Autolinker from 'autolinker';
import Control, { State } from "./Control";
import { FaSearch, FaTiktok, FaTwitch, FaYoutube } from 'react-icons/fa';
import { IoIosArrowDown } from "react-icons/io";
import { AiOutlineClear } from "react-icons/ai";
import { PiPlantBold } from "react-icons/pi";
import { writeText } from '@tauri-apps/api/clipboard';
import { isDark, lightenColor } from "./Main";
import { createYouTube, listen } from "@/utils/yt";
import { TikTokIOConnection } from "@/utils/tiktok";

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
}

interface ControlMessage {
    message: string;
    shown: boolean;
}

export function Main() {
    const [chat, setChat] = useState([]);
    const [firstMessageUsers, setFirstMessageUsers] = useState([]);
    const firstMessageUsersRef = useRef([]);
    const initialFontSize = parseInt(window.localStorage.getItem('fontSize') || '14');
    const initialEngineerFontSize = parseInt(window.localStorage.getItem('engineerFontSize') || '14');
    const initialEmojiSize = window.localStorage.getItem('emojiSize') || '1.0';
    const initialUseTagColor = window.localStorage.getItem('useTagColor') === 'true';

    const [fontSize, setFontSize] = useState(initialFontSize);
    const [engineerFontSize, setEngineerFontSize] = useState(initialEngineerFontSize);
    const [emojiSize, setEmojiSize] = useState(initialEmojiSize);
    const [useTagColor, setUseTagColor] = useState(initialUseTagColor);
    const [stream, setStream] = useState(() => window.localStorage.getItem('stream') || 'EverythingNowShow');
    const [youtubeChannelId, setyoutubeChannelId] = useState(() => window.localStorage.getItem('youtubeChannelId') || 'UC7Po7K12YTOE5jNYYE0kKaA-A');
    const [youtubeApiKey, setyoutubeApiKey] = useState(() => window.localStorage.getItem('youtubeApiKey') || 'apikey');
    const [controlMessage, setControlMessage] = useState<ControlMessage | null>(null);
    const [messageShown, setMessageShown] = useState(false);
    const [highlightedMessageId, setHighlightedMessageId] = useState(null);
    const [userFilter, setUserFilter] = useState("");
    const [searchString, setSearchString] = useState("");

    const [hoveredMessageId, setHoveredMessageId] = useState(null);

    const handleMessageClicked = (messageId: any) => {
        setHighlightedMessageId(messageId);
    };

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

    function onMessageClick(messageId: any) {
        console.log("Message clicked: " + messageId);
        //@ts-ignore
        window.__TAURI__.event.emit("message-clicked", messageId);
    }

    function onUserClick(user: any) {
        console.log("User clicked: " + user);
        //@ts-ignore
        window.__TAURI__.event.emit("user-clicked", user);
    }

    const handleUserClicked = (user: any) => {
        setUserFilter(user);
    };

    function onUserClearClick() {
        console.log("Clear User clicked: ");
        //@ts-ignore
        window.__TAURI__.event.emit("clear-user-clicked");
        handleUserClearClicked();
    }

    const handleUserClearClicked = () => {
        setUserFilter("");
    };

    const chatWindowRef = useRef(null);

    const onArrowDownClick = () => {
        //@ts-ignore
        window.__TAURI__.event.emit("snap-down");
        if (chatWindowRef.current) {
            //@ts-ignore
            chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
        }
    };

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
        setEngineerFontSize(myState.engineerFontSize);
        setEmojiSize(myState.emojiSize);
        setUseTagColor(myState.useTagColor);
    });

    useEffect(() => {
        let isSubscribed = true;

        const setControlMessageHandler = (message: string) => {
            if (isSubscribed) {
                setControlMessage({ message, shown: true });
                setMessageShown(true);
            }
        };

        const listeners = [
            { event: 'control-message', handler: setControlMessageHandler },
            { event: 'show-control-message', handler: setControlMessageHandler },
            { event: 'hide-control-message', handler: () => setMessageShown(false) },
            { event: 'search-string-changed', handler: (string: any) => setSearchString(string.payload) },
        ];

        listeners.forEach(({ event, handler }) => {
            //@ts-ignore
            window.__TAURI__.event.listen(event, handler);
        });

        return () => { isSubscribed = false; };
    }, []);


    //@ts-ignore
    useEffect(() => {

        const connection = new TikTokIOConnection('http://localhost:7011');

        connection.connect('everythingnowshow').then(() => {
            console.log('Connected to tiktok');
        }).catch((err) => {
            console.error('Failed to connect:', err);
        });

        let msgID: any = null;

        connection.on('chat', (msg) => {
            setChat((prevChat) => {
                let newChat = [...prevChat];
                if (msgID === msg.msgId) {
                    return prevChat;
                } else {
                    msgID = msg.msgId;
                    //@ts-ignore
                    newChat.push({
                        user: msg.nickname,
                        message: msg.comment,
                        // generate a random color using the name as the seed
                        color: '#' + Math.floor(Math.abs(Math.sin(msg.uniqueId.split('').reduce((prev: any, curr: any) => ((prev << 5) - prev) + curr.charCodeAt(0), 0)) * 16777215)).toString(16),
                        first: false,
                        id: msg.msgId,
                        returningChatter: false,
                        platform: 'tiktok'
                    });
                    // Limit chat history to the last 60 messages
                    return newChat.slice(Math.max(newChat.length - 60, 0));
                }
            });
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

        listen(yt, 30000);

        const client = new tmi.Client({
            options: { debug: true },
            connection: {
                secure: true,
                reconnect: true,
            },
            channels: [stream],
        });

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
            };

            let first = false;

            if (msg.firstMessage) {
                //@ts-ignore
                firstMessageUsersRef.current = [...firstMessageUsersRef.current, msg.username];
                setFirstMessageUsers(firstMessageUsersRef.current);
                console.log('first message1', msg.username);
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
                        platform: 'twitch',
                    });
                }

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
            zIndex: 9999,
        }}>
            <AnimatePresence>
                <div style={
                    {
                        bottom: 1
                    }
                }>
                    {messageShown && controlMessage?.message && (
                        <motion.div
                            initial={{ opacity: 0, y: -50 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -50 }}
                            style={{
                                background: '#2D2D2D',
                                border: '2px solid #FFC300',
                                boxShadow: '2px 2px 8px rgba(0, 0, 0, 0.25)',
                                fontSize: `${engineerFontSize * 2}px`,
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
                </div>
            </AnimatePresence>
        </div>
            <div className="px-4" style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                <div className="chatBox" ref={chatWindowRef} style={{
                    borderRadius: "15px",
                    padding: "24px",
                    paddingBottom: "40px",
                    overflowY: "scroll",
                    overflowX: "hidden",
                    maxHeight: "90vh",
                    minHeight: "80vh",
                    display: "flex",
                    flexDirection: "column-reverse",
                    fontSize: `${engineerFontSize}px`,
                    boxShadow: "0px 0px 10px 0px rgba(0,0,0,0.75)",
                    position: 'relative',
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                }}>
                    <AnimatePresence>
                        {chat.filter(chatLine =>
                            //@ts-ignore
                            chatLine.message.toLowerCase().includes(searchString.toLowerCase()) ||
                            //@ts-ignore
                            chatLine.user.toLowerCase().includes(searchString.toLowerCase()))
                            .map((chatLine: any, index) => (
                                <motion.div
                                    key={index}
                                    id={chatLine.id}
                                    className="chatLine"
                                    style={{
                                        border: chatLine.first ? "2px solid white" : chatLine.id === hoveredMessageId ? '2px dotted white' : chatLine.gift ? "2px dotted gold" : "",
                                        borderRadius: "10px",
                                        backgroundColor: chatLine.first ? "green" : chatLine.id === highlightedMessageId ? "gray" : "",
                                        fontWeight: chatLine.first ? "bold" : "normal",
                                        fontSize: chatLine.first ? `${engineerFontSize * 1.2}px` : `${engineerFontSize}px`,
                                        cursor: "pointer",
                                    }}
                                    initial={{ opacity: 0, y: -50 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -50 }}
                                    onClick={() => {
                                        if (highlightedMessageId === chatLine.id) {
                                            onMessageClick('');
                                            handleMessageClicked('');
                                        } else {
                                            onUserClearClick();
                                            onMessageClick('');
                                            handleMessageClicked('');

                                            setTimeout(() => {
                                                onMessageClick(chatLine.id);
                                                handleMessageClicked(chatLine.id);
                                            }, 100);
                                        }
                                    }}
                                    onMouseEnter={() => setHoveredMessageId(chatLine.id)}
                                    onMouseLeave={() => setHoveredMessageId(null)}
                                    onContextMenu={async (e) => {
                                        e.preventDefault();
                                        try {
                                            const fullMessage = `${chatLine.message.replace("@EverythingNowShow", "")} - ${chatLine.user}`;
                                            await writeText(fullMessage);
                                            console.log('Copy command was successful');
                                        } catch (err) {
                                            console.error('Could not copy text: ', err);
                                        }
                                    }}
                                >
                                    {chatLine.first && <PiPlantBold size={`${engineerFontSize * 1.2}px`} color="white" style={{ marginRight: "20px", paddingTop: "5px" }} />}
                                    {chatLine.id === highlightedMessageId && <FaSearch size={`${engineerFontSize * 1.2}px`} color="gold" style={{ padding: "4px" }} />}
                                    {chatLine.platform === 'twitch' && <FaTwitch size={`${engineerFontSize}px`} style={{ marginRight: "10px" }} />}
                                    {chatLine.platform === 'youtube' && <FaYoutube size={`${engineerFontSize}px`} style={{ marginRight: "10px" }} />}
                                    {chatLine.platform === 'tiktok' && <FaTiktok size={`${engineerFontSize}px`} style={{ marginRight: "10px" }} />}
                                    <span className="username"
                                        onClick={(e: any) => {
                                            console.log("User clicked: " + chatLine.user);
                                            console.log("User filter: " + userFilter);
                                            if (userFilter !== chatLine.user) {
                                                onUserClick(chatLine.user);
                                                handleUserClicked(chatLine.user);
                                                e.stopPropagation();
                                            } else {
                                                onUserClick('');
                                                handleUserClearClicked();
                                                e.stopPropagation();
                                            }
                                        }
                                        }
                                        style={{
                                            fontWeight: "bold",
                                            color: chatLine.first ? "white" : chatLine.id === highlightedMessageId ? "#FFC100" : useTagColor ? isDark(chatLine.color) ? lightenColor(chatLine.color, 40) : chatLine.color : "white",
                                            fontSize: chatLine.id === highlightedMessageId ? `${engineerFontSize * 1.6}px` : engineerFontSize
                                        }}>{chatLine.user}: </span>
                                    <span className="message" dangerouslySetInnerHTML={{
                                        __html: Autolinker.link(parse(chatLine.message, chatLine.emotes, options), {
                                            className: 'apple',
                                        }),
                                    }} style={{
                                        fontSize: chatLine.id === highlightedMessageId ? `${engineerFontSize * 1.6}px` : engineerFontSize
                                    }}
                                        onContextMenu={async (e) => {
                                            e.preventDefault();
                                            try {
                                                const fullMessage = `${chatLine.message} - ${chatLine.user}`;
                                                await writeText(fullMessage);
                                                console.log('Copy command was successful');
                                            } catch (err) {
                                                console.error('Could not copy text: ', err);
                                            }
                                        }} />
                                </motion.div>
                            )).reverse()}
                    </AnimatePresence>
                </div>
            </div>
            <div style={{
                position: 'fixed',
                right: '3em',
                bottom: '1em',
                zIndex: 10000,
                cursor: 'pointer',
            }}>
                <IoIosArrowDown size="22" onClick={() => onArrowDownClick()} />
                <AiOutlineClear size="22" onClick={() => {
                    onUserClearClick();
                    onMessageClick('');
                    handleMessageClicked('');
                }} />
            </div>
            <div style={{
                position: 'fixed',
                left: 0,
                bottom: 0,
                width: '100%',
                zIndex: 9999
            }}>
                <Control />
            </div></>
    );
}

export default Main;
