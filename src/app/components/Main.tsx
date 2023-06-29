"use client";
import { useEffect, useRef, useState } from "react";
import tmi from "tmi.js";
import { EmoteOptions, parse } from 'simple-tmi-emotes';
import { AnimatePresence, motion } from "framer-motion";
import Autolinker from 'autolinker';
import { invoke } from "@tauri-apps/api/tauri";
import { State } from "./Control";

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

export function Main() {
    const [chat, setChat] = useState([]);
    const [fontSize, setFontSize] = useState(14);
    const settingsRef = useRef<HTMLDivElement | null>(null);
    const [emojiSize, setEmojiSize] = useState("1.0");
    const [useTagColor, setUseTagColor] = useState(false);
    const [stream, setStream] = useState(() => window.localStorage.getItem('stream') || 'IZIDORE');

    useEffect(() => {
        //@ts-ignore
        window.__TAURI__.event.listen('stream-changed', () => {
            setStream(window.localStorage.getItem('stream') || 'EverythingNowShow');
            window.location.reload();
        });
    }, []);

    const [greetMsg, setGreetMsg] = useState("");

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

    async function greet() {
        setGreetMsg(await invoke("greet", { name: "Bob" }));
    }

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

            msg.message = message;

            //@ts-ignore
            setChat((prevChat) => {
                const lastChat = prevChat[prevChat.length - 1];
                //@ts-ignore
                if (lastChat && lastChat.user === tags["display-name"] && lastChat.message === message) {
                    return prevChat;
                } else {
                    return [...prevChat, { user: tags["display-name"], message, emotes: tags?.emotes, color: tags?.color || {} }];
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
        <div className="px-4" style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
            <div className="chatBox" style={{
                borderRadius: "15px",
                padding: "20px",
                overflowY: "hidden",
                maxHeight: "98vh",
                minHeight: "80vh",
                display: "flex",
                flexDirection: "column-reverse",
                fontSize: `${fontSize}px`,
                boxShadow: "0px 0px 10px 0px rgba(0,0,0,0.75)",
                position: 'relative',
            }}>
                <AnimatePresence>
                    {chat.map((chatLine: any, index) => (
                        <motion.div
                            key={index}
                            className="chatLine"
                            style={{ border: "1px solid black", borderRadius: "10px", padding: "10px", margin: "10px" }}
                            initial={{ opacity: 0, y: -50 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -50 }}
                        >
                            <span className="username" style={{ fontWeight: "bold", color: useTagColor ? chatLine.color : '' }}>{chatLine.user}: </span>
                            <span className="message" dangerouslySetInnerHTML={{
                                __html: Autolinker.link(parse(chatLine.message, chatLine.emotes, options), {
                                    className: 'apple',
                                }),
                            }} />
                        </motion.div>
                    )).reverse()}
                </AnimatePresence>
            </div>
            <div className="my-7" />
        </div>
    );
}

export default Main;
