"use client";
import { useEffect, useRef, useState } from "react";
import tmi from "tmi.js";
import { EmoteOptions, parse } from 'simple-tmi-emotes';
import { AnimatePresence, motion } from "framer-motion";
import Autolinker from 'autolinker';
import { invoke } from "@tauri-apps/api/tauri";
import Control, { State } from "./Control";
import { FaSearch } from 'react-icons/fa';
import { BsFill1CircleFill } from "react-icons/bs";
import { IoIosArrowDown } from "react-icons/io";
import { TbUserPlus } from "react-icons/tb";
import { AiOutlineClear } from "react-icons/ai";
import { PiPlantBold } from "react-icons/pi";
import { writeText } from '@tauri-apps/api/clipboard';
import { isDark, lightenColor } from "./Main";


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
    // Retrieve stored settings from local storage
    const initialFontSize = parseInt(window.localStorage.getItem('fontSize') || '14');
    const initialEngineerFontSize = parseInt(window.localStorage.getItem('engineerFontSize') || '14');
    const initialEmojiSize = window.localStorage.getItem('emojiSize') || '1.0';
    const initialUseTagColor = window.localStorage.getItem('useTagColor') === 'true';

    const [fontSize, setFontSize] = useState(initialFontSize);
    const [engineerFontSize, setEngineerFontSize] = useState(initialEngineerFontSize);
    const settingsRef = useRef<HTMLDivElement | null>(null);
    const [emojiSize, setEmojiSize] = useState(initialEmojiSize);
    const [useTagColor, setUseTagColor] = useState(initialUseTagColor);
    const [stream, setStream] = useState(() => window.localStorage.getItem('stream') || 'EverythingNowShow');
    const [controlMessage, setControlMessage] = useState<ControlMessage | null>(null); // Single control message instead of an array
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

        // Scroll to the bottom of chat window
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
        setFontSize(myState.fontSize); // update font size here
        setEngineerFontSize(myState.engineerFontSize); // update font size here
        setEmojiSize(myState.emojiSize); // update emoji size here
        setUseTagColor(myState.useTagColor); // update useTagColor here
    });

    useEffect(() => {
        let isSubscribed = true; // Local variable

        // Existing 'control-message' listener
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

        // New 'show-control-message' listener
        const showControlMessageHandler = (message: string) => {
            if (isSubscribed) {
                setControlMessage({
                    message,
                    shown: true,
                });
                setMessageShown(true); // Make sure message is shown
            }
        };
        //@ts-ignore
        window.__TAURI__.event.listen('show-control-message', showControlMessageHandler);

        // New 'hide-control-message' listener
        const hideControlMessageHandler = () => {
            if (isSubscribed) {
                setMessageShown(false); // Hide the message
            }
        };
        //@ts-ignore
        window.__TAURI__.event.listen('hide-control-message', hideControlMessageHandler);

        // New 'search-string-changed' listener
        const searchStringChanged = (string: any) => {
            if (isSubscribed) {
                setSearchString(string.payload);
            }
        };
        //@ts-ignore
        window.__TAURI__.event.listen('search-string-changed', searchStringChanged);

        return () => {
            // No event listener removal, but prevent state update when component is unmounted
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
                //@ts-ignore
                if (lastChat && lastChat.user === tags["display-name"] && lastChat.message === message) {
                    return prevChat;
                } else {
                    return [...prevChat, { user: tags["display-name"], message, emotes: tags?.emotes, color: tags?.color, first: first, id: tags?.id, returningChatter: tags?.['returning-chatter'] }];
                }
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
            </AnimatePresence>
        </div>
            <div className="px-4" style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                <div className="chatBox" ref={chatWindowRef} style={{
                    borderRadius: "15px",
                    padding: "24px",
                    paddingBottom: "40px",
                    overflowY: "scroll",
                    overflowX: "hidden",
                    maxHeight: "90vh", // Reduced by 5vh to account for footer
                    minHeight: "80vh",
                    display: "flex",
                    flexDirection: "column-reverse",
                    fontSize: `${engineerFontSize}px`,
                    boxShadow: "0px 0px 10px 0px rgba(0,0,0,0.75)",
                    position: 'relative',
                    scrollbarWidth: 'none', // for Firefox
                    msOverflowStyle: 'none', // for Internet Explorer and Edge
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
                                            // sleep for 100ms to allow the user filter to clear
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
                                            const fullMessage = `${chatLine.message} - ${chatLine.user}`;
                                            await writeText(fullMessage);
                                            console.log('Copy command was successful');
                                        } catch (err) {
                                            console.error('Could not copy text: ', err);
                                        }
                                    }}
                                >
                                    {chatLine.first && <PiPlantBold size={`${engineerFontSize * 1.2}px`} color="white" style={{ marginRight: "20px", paddingTop: "5px" }} />}
                                    {chatLine.id === highlightedMessageId && <FaSearch size={`${engineerFontSize * 1.2}px`} color="gold" style={{ padding: "4px" }} />}
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
                zIndex: 10000, // make sure this is higher than other z-indices
                cursor: 'pointer', // makes the icon clickable
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
