"use client";
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { EmoteOptions, parse } from 'simple-tmi-emotes';
import { PiPlantBold } from 'react-icons/pi';
import { FaTiktok, FaTwitch, FaYoutube } from 'react-icons/fa';
import { isDark, lightenColor } from './Main';
import Autolinker from 'autolinker';

interface Message {
    first?: boolean;
    platform?: 'twitch' | 'youtube' | 'tiktok';
    color?: string;
    user?: string;
    message?: string;
    emotes?: any;
    payload?: any;
}

const safeParse = (message: string, emotes: any, options: any) => {
    try {
        return parse(message, emotes, options);
    } catch (e) {
        console.error('Error during parsing:', e);
        return '';
    }
};

const emojiSize = '24px';
const options: EmoteOptions = {
    format: 'default',
    themeMode: 'light',
    scale: '1.0',
};

const Main = () => {
    const [queue, setQueue] = useState<Message[]>([]);
    const [showing, setShowing] = useState<Message | null>(null);
    const [showingVisible, setShowingVisible] = useState<boolean>(false);

    useEffect(() => {
        const featuredMessageHandler = (message: Message) => {
            setQueue((prevQueue) => [...prevQueue, message.payload]);
        };

        //@ts-ignore
        window.__TAURI__.event.listen('featured-message', featuredMessageHandler);

        return () => {
            //@ts-ignore
            window.__TAURI__.event.unlisten('featured-message', featuredMessageHandler);
        };
    }, []);

    const moveToShowing = (index: number) => {
        const newShowing = queue[index];
        setShowing(newShowing);
    };

    const removeFromQueue = (index: number) => {
        setQueue((prevQueue) => prevQueue.filter((_, i) => i !== index));
    };

    const clearQueue = () => {
        setQueue([]);
    };

    const toggleShowing = () => {
        setShowingVisible((prev) => !prev);
    };

    return (
        <div data-tauri-drag-region style={mainContainerStyle}>
            <div data-tauri-drag-region style={{
                fontSize: '1.5rem',
                fontWeight: 'bold',
                marginBottom: '1rem',
                padding: '5px',
            }}>Now Showing</div>
            <div style={containerStyle}>
                <motion.div
                    initial={false}
                    animate={{ opacity: showingVisible ? 1 : 0 }}
                    transition={{ duration: 0.5 }}
                    style={{ marginTop: '1rem', minHeight: '1.5rem' }}
                >
                    {showing && showing.message && <div style={{
                        marginBottom: '1rem',
                        maxWidth: '600px',
                        minWidth: '600px',
                        position: 'relative',
                    }}>
                        <motion.div
                            key={showing.user || '' + showing.message}
                            initial="hidden"
                            animate="visible"
                            transition={{ duration: 0.5 }}
                            style={{
                                display: "flex",
                                flexDirection: 'column',
                                alignItems: "center",
                                justifyContent: "center",
                                padding: "10px",
                                backgroundColor: "black",
                                fontSize: emojiSize,
                                maxWidth: '600px',
                                minWidth: '600px',
                            }}
                        >
                            {showing.user && <div style={{
                                alignSelf: 'flex-start',
                                width: '100%',
                                display: 'flex',
                                justifyContent: 'flex-start',
                                paddingRight: '10px',
                            }}>
                                <span className="username" style={{
                                    fontWeight: "bold",
                                    color: showing.color && isDark(showing.color) ? lightenColor(showing.color, 40) : showing.color || "white",
                                    fontSize: emojiSize,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                }}>{showing.user + ':'}</span>
                            </div>}
                            {showing.message && <span className="message" dangerouslySetInnerHTML={{
                                __html: Autolinker.link(safeParse(showing.message, showing.emotes, options), {
                                    className: 'apple',
                                }),
                            }} style={{
                                fontSize: emojiSize,
                                maxWidth: '580px',
                                margin: '0 auto',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                display: '-webkit-box',
                                WebkitLineClamp: 3,
                                WebkitBoxOrient: 'vertical',
                                textAlign: 'left'
                            }} />}
                            <div style={{
                                position: 'absolute',
                                bottom: '0',
                                left: '0',
                                width: '100%',
                                height: '4px',
                                backgroundColor: showing.color || "white",
                            }}></div>
                        </motion.div>
                    </div>}
                </motion.div>
            </div>
            <button onClick={toggleShowing} style={buttonStyle}>show/hide</button>
            <button onClick={clearQueue} style={buttonStyle}>clear all</button>
            <div style={queueContainerStyle}>
                On Deck
                <hr style={{ margin: '1rem 0', width: '100%' }} />
                {queue.map((message, index) => (
                    <motion.div
                        key={index}
                        initial={{ x: 300, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ duration: 0.5 }}
                        onClick={() => moveToShowing(index)}
                        onContextMenu={(e) => {
                            e.preventDefault();
                            removeFromQueue(index);
                        }}
                        style={queueItemStyle}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        {message && message.message && <div style={{ marginBottom: '1rem' }}>
                            <motion.div
                                key={message.user || '' + message.message}
                                initial="hidden"
                                animate="visible"
                                transition={{ duration: 0.5 }}
                                style={
                                    message === showing
                                        ? { ...queueItemStyle, ...selectedStyle }
                                        : queueItemStyle
                                }
                            >
                                {message.first && <PiPlantBold size={emojiSize} color="white" style={{ marginRight: "20px", paddingTop: "5px" }} />}
                                {message.platform === 'twitch' && <FaTwitch size={emojiSize} style={{ marginRight: "10px" }} />}
                                {message.platform === 'youtube' && <FaYoutube size={emojiSize} style={{ marginRight: "10px", marginLeft: "5px" }} />}
                                {message.platform === 'tiktok' && <FaTiktok size={emojiSize} style={{ marginRight: "10px", marginLeft: "5px" }} />}
                                {message.user && <span className="username" style={{
                                    fontWeight: "bold",
                                    color: message.color && isDark(message.color) ? lightenColor(message.color, 40) : message.color || "white",
                                    fontSize: emojiSize,
                                    marginRight: "10px"
                                }}>{message.user}: </span>}
                                {message.message && <span className="message" dangerouslySetInnerHTML={{
                                    __html: Autolinker.link(safeParse(message.message, message.emotes, options), {
                                        className: 'apple',
                                    }),
                                }} style={{ fontSize: emojiSize }} />}
                            </motion.div>
                        </div>}
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

const mainContainerStyle: React.CSSProperties = {
    color: 'white',
    fontFamily: 'Arial, sans-serif',
    textAlign: 'center',
    height: '100vh',
    overflow: 'hidden',
};

const containerStyle: React.CSSProperties = {
    marginBottom: '1rem',
    padding: '1rem',
    border: '1px solid white',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '200px',
    maxHeight: '200px',
};

const queueContainerStyle: React.CSSProperties = {
    marginBottom: '1rem',
    padding: '5px',
    border: '1px solid white',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: '#000000',
    maxHeight: '300px',
    overflowY: 'auto',
    overflowX: 'hidden',
};

const buttonStyle: React.CSSProperties = {
    padding: '0.5rem 1rem',
    margin: '0.5rem',
    border: 'none',
    cursor: 'pointer',
    backgroundColor: 'gray',
    color: 'white',
};

const queueItemStyle: React.CSSProperties = {
    cursor: 'pointer',
    userSelect: 'none',
};

const selectedStyle: React.CSSProperties = {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderColor: 'white',
    borderWidth: '2px',
    borderStyle: 'solid',
};

export default Main;