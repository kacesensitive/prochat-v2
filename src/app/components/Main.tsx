"use client";
import { useEffect, useRef, useState } from "react";
import tmi from "tmi.js";
import { EmoteOptions, parse } from 'simple-tmi-emotes';
import { AnimatePresence, motion } from "framer-motion";
import Autolinker from 'autolinker';
import { State } from "./Control";
import { FaSearch } from 'react-icons/fa';
import { BsFill1CircleFill } from "react-icons/bs";
import { PiPlantBold } from "react-icons/pi";

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
    const initialEmojiSize = window.localStorage.getItem('emojiSize') || '1.0';
    const initialUseTagColor = window.localStorage.getItem('useTagColor') === 'true';

    const [fontSize, setFontSize] = useState(initialFontSize);
    const settingsRef = useRef<HTMLDivElement | null>(null);
    const [emojiSize, setEmojiSize] = useState(initialEmojiSize);
    const [useTagColor, setUseTagColor] = useState(initialUseTagColor);
    const [stream, setStream] = useState(() => window.localStorage.getItem('stream') || 'EverythingNowShow');
    const [controlMessage, setControlMessage] = useState<ControlMessage | null>(null); // Single control message instead of an array
    const [messageShown, setMessageShown] = useState(false);
    const [highlightedMessageId, setHighlightedMessageId] = useState(null);
    const [userFilter, setUserFilter] = useState("");

    useEffect(() => {
        //@ts-ignore
        window.__TAURI__.event.listen('stream-changed', () => {
            setStream(window.localStorage.getItem('stream') || 'EverythingNowShow');
            window.location.reload();
        });
    }, []);

    let myState: State = {
        emojiSize: "1.0",
        useTagColor: false,
        fontSize: 14,
    };

    //@ts-ignore
    window.__TAURI__.event.listen('state-changed', () => {
        const newState = JSON.parse(window.localStorage.getItem('myState') || '{}') as State;
        myState = newState;
        setFontSize(myState.fontSize); // update font size here
        setEmojiSize(myState.emojiSize); // update emoji size here
        setUseTagColor(myState.useTagColor); // update useTagColor here
        console.log(myState);
    });

    const chatWindowRef = useRef(null);

    const handleUserClicked = (user: any) => {
        setUserFilter(user.payload);
    };

    const handleUserClearClicked = () => {
        setUserFilter("");
    };

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

        const handleMessageClicked = (messageId: any) => {
            if (messageId.payload === "") {
                setHighlightedMessageId(null);
            }
            const messageElement = document.getElementById(messageId.payload);
            if (messageElement) {
                console.log('AHHH', messageId.payload);
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
                    overflowY: "scroll",
                    maxHeight: "98vh",
                    minHeight: "80vh",
                    display: "flex",
                    flexDirection: "column-reverse",
                    fontSize: `${fontSize}px`,
                    boxShadow: "0px 0px 10px 0px rgba(0,0,0,0.75)",
                    position: 'relative',
                    scrollbarWidth: 'none', // for Firefox
                    msOverflowStyle: 'none', // for Internet Explorer and Edge
                }}>
                    <AnimatePresence>
                        {chat.filter((chatLine: any) => (userFilter === "" || chatLine.user === userFilter))
                            .map((chatLine: any, index) => (
                                <motion.div
                                    key={index}
                                    id={chatLine.id}
                                    className="chatLine"
                                    style={{
                                        border: chatLine.first ? "2px solid white" : "1px solid black",
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
                                    <span className="username" style={{
                                        fontWeight: "bold", color: chatLine.first ? "white" : chatLine.id === highlightedMessageId ? "#FFC100" : useTagColor ? chatLine.color : "",
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
