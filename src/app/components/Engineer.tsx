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
import io from 'socket.io-client';

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

        const setControlMessageHandler = (message: any) => {
            if (isSubscribed) {
                setControlMessage({ message: message.payload, shown: true });
                setMessageShown(true);
            }
        };

        const listeners = [
            { event: 'control-message', handler: setControlMessageHandler },
            { event: 'show-control-message', handler: setControlMessageHandler },
            { event: 'hide-control-message', handler: () => setMessageShown(false) },
            {
                event: 'search-string-changed', handler: (string: any) => {
                    console.log('search string changed', string);
                    setSearchString(string.payload)
                },
            }
        ];

        listeners.forEach(({ event, handler }) => {
            //@ts-ignore
            window.__TAURI__.event.listen(event, handler);
        });

        return () => { isSubscribed = false; };
    }, []);


    //@ts-ignore
    useEffect(() => {
        // YT And TikTok

        const socket = io("http://localhost:7011", {
            withCredentials: true,
            extraHeaders: {
                "my-custom-header": "abcd"
            }
        });

        socket.on("connect", () => {
            const commandData = {
                uniqueId: '',
                options: {}
            };

            socket.emit("setUniqueId", commandData);
        });

        socket.on("youtubeChat", (chatItem) => {
            console.log("Received YouTube Chat");
            if (chatItem) {
                console.log("Received YouTube Chat:", JSON.stringify(chatItem, null, 3));
                setChat((prevChat) => {
                    const lastChat = prevChat[prevChat.length - 1];
                    let newChat = [...prevChat];
                    //@ts-ignore
                    if (lastChat && lastChat.id === chatItem.id && lastChat.message === chatItem.message && Array.isArray(chatItem.message) && chatItem.message[0].text) {
                        return prevChat;
                    } else {
                        console.log('new chat', chatItem);
                        //@ts-ignore
                        newChat.push({
                            user: chatItem.author.name,
                            message: chatItem.message[0].text,
                            emotes: {},
                            color: '#FFEEEE',
                            first: false,
                            id: chatItem.id,
                            returningChatter: false,
                            platform: 'youtube',
                        });
                    }
                    return newChat.slice(Math.max(newChat.length - 60, 0));
                });
            }
        });

        socket.on("tiktokChat", (msg) => {
            if (msg) {
                console.log("Received TikTok Chat:", JSON.stringify(msg, null, 3));
                setChat((prevChat) => {
                    const lastChat = prevChat[prevChat.length - 1];
                    let newChat = [...prevChat];
                    //@ts-ignore
                    if (lastChat && lastChat.msgId === msg.msgId && lastChat.comment === msg.comment) {
                        return prevChat;
                    } else {
                        if ('nickname' in msg && 'comment' in msg) {
                            //@ts-ignore
                            newChat.push({
                                user: msg.nickname,
                                message: msg.comment,
                                emotes: {},
                                color: '#FFEEEE',
                                first: false,
                                id: msg.msgId,
                                returningChatter: false,
                                platform: 'tiktok',
                            });
                        }
                    }
                    return newChat.slice(Math.max(newChat.length - 60, 0));
                });
            } else {
                console.log("Received TikTok Chat, but message is missing.", msg);
            }
        });

        // Twitch
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

    interface ChatLine {
        message: string;
        user: string;
    }

    const searchInChat = (chat: ChatLine[], searchString: string): ChatLine[] => {
        if (!searchString) {
            // Return the original array if the search string is empty
            return chat;
        }

        const lowerCaseSearchString = searchString.toLowerCase();

        return chat.filter(chatLine => {
            const message = chatLine.message;
            const user = chatLine.user;

            if (typeof message === 'string' && typeof user === 'string') {
                return message.toLowerCase().includes(lowerCaseSearchString) ||
                    user.toLowerCase().includes(lowerCaseSearchString);
            }

            return false;
        });
    };

    const lowerCaseSearchString = searchString.toLowerCase();

    const safeParse = (message: string, emotes: any, options: any) => {
        try {
            return parse(message, emotes, options);
        } catch (e) {
            console.error('Error during parsing:', e);
            return ''; // Return an empty string or some default message in case of error
        }
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
                                controlMessage.message
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
                        {chat.filter((chatLine: any) => {
                            if ((chatLine.message || '').toLowerCase().includes(lowerCaseSearchString) ||
                                (chatLine.user || '').toLowerCase().includes(lowerCaseSearchString)) {
                                console.log('SEARCH \n\n\n\n', searchString)
                                return true;
                            } else {
                                return false;
                            }
                        }
                        )
                            .map((chatLine: any, index) => (
                                <motion.div
                                    key={index}
                                    id={chatLine.id}
                                    className="chatLine"
                                    style={{
                                        border: chatLine.first ? "2px solid white" :
                                            chatLine.gift ? "2px dotted gold" :
                                                chatLine.id === hoveredMessageId ? '2px dotted white' :
                                                    (chatLine.platform === 'youtube' || chatLine.platform === 'tiktok') ? "2px solid white" : chatLine.gift ? "2px dotted gold" : "",
                                        borderRadius: "10px",
                                        backgroundColor: chatLine.first ? "green" : chatLine.id === highlightedMessageId ? "gray" : chatLine.platform === 'youtube' ? '#C10000' : chatLine.platform === 'tiktok' ? '#00A19C' : "",
                                        fontWeight: chatLine.first ? "bold" : "normal",
                                        fontSize: chatLine.first ? `${engineerFontSize * 1.2}px` : `${engineerFontSize}px`,
                                        cursor: "pointer",
                                        marginTop: "5px",
                                    }}
                                    initial={{ opacity: 0, y: -50 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -50 }}
                                    onClick={(e) => {
                                        if (e.shiftKey) {
                                            if (chatLine.message && chatLine.message.length > 0 && chatLine.user && chatLine.user.length > 0) {
                                                //@ts-ignore
                                                window.__TAURI__.event.emit("featured-message", chatLine);
                                            }
                                        }
                                        else if (highlightedMessageId === chatLine.id) {
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
                                    // on control + click tauri emit featured message
                                    onDoubleClick={() => {
                                        if (chatLine.message && chatLine.message.length > 0 && chatLine.user && chatLine.user.length > 0) {
                                            //@ts-ignore
                                            window.__TAURI__.event.emit("featured-message", chatLine);
                                        }
                                    }}
                                >
                                    {chatLine.first && <PiPlantBold size={`${engineerFontSize * 1.2}px`} color="white" style={{ marginRight: "20px", paddingTop: "5px" }} />}
                                    {chatLine.id === highlightedMessageId && <FaSearch size={`${engineerFontSize * 1.2}px`} color="gold" style={{ padding: "4px" }} />}
                                    {chatLine.platform === 'twitch' && <FaTwitch size={`${engineerFontSize}px`} style={{ marginRight: "10px" }} />}
                                    {chatLine.platform === 'youtube' && <FaYoutube size={`${engineerFontSize}px`} style={{ marginRight: "10px", marginLeft: "5px" }} />}
                                    {chatLine.platform === 'tiktok' && <FaTiktok size={`${engineerFontSize}px`} style={{ marginRight: "10px", marginLeft: "5px" }} />}
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
                                        __html: Autolinker.link(safeParse(chatLine.message, chatLine.emotes, options), {
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
                    //@ts-ignore
                    window.__TAURI__.event.emit("featured-message", {});
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
