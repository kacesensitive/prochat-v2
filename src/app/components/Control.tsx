"use client";
import { useState, useEffect } from 'react';
import styles from './control.module.css'

export type State = {
    fontSize: number;
    emojiSize: string;
    useTagColor: boolean;
};

let myState: State = {
    fontSize: 14,
    emojiSize: "1.0",
    useTagColor: false
};

function changeState(newState: State): void {
    myState = newState;
    window.localStorage.setItem('myState', JSON.stringify(myState));
    //@ts-ignore
    window.__TAURI__.event.emit('state-changed');
}

export default function Control() {
    const [fontSize, setFontSize] = useState(myState.fontSize);
    const [emojiSize, setEmojiSize] = useState(myState.emojiSize);
    const [useTagColor, setUseTagColor] = useState(myState.useTagColor);
    const [stream, setStream] = useState(() => window.localStorage.getItem('stream') || 'EverythingNowShow');
    const [message, setMessage] = useState('');
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        setFontSize(Number(window.localStorage.getItem('fontSize') || '14'));
        setEmojiSize(window.localStorage.getItem('emojiSize') || "1.0");
        setUseTagColor(window.localStorage.getItem('useTagColor') === "true");
    }, []);

    useEffect(() => {
        window.localStorage.setItem('fontSize', String(fontSize));
        window.localStorage.setItem('emojiSize', emojiSize);
        window.localStorage.setItem('useTagColor', String(useTagColor));
    }, [fontSize, emojiSize, useTagColor]);

    const handleSend = () => {
        if (isVisible) {
            //@ts-ignore
            window.__TAURI__.event.emit('hide-control-message');
        } else {
            //@ts-ignore
            window.__TAURI__.event.emit('show-control-message', message);
        }
        setIsVisible(!isVisible);
    }

    const handleMessageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setMessage(event.target.value);
    }

    const updateStream = (newStream: string) => {
        setStream(newStream);
        window.localStorage.setItem('stream', newStream);
        //@ts-ignore
        window.__TAURI__.event.emit('stream-changed');
    }

    const handleStreamChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        updateStream(event.target.value);
    }

    const handleFontSizeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const newFontSize = Number(event.target.value);
        setFontSize(newFontSize);
        changeState({ ...myState, fontSize: newFontSize });
    }

    const handleEmojiSizeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const newEmojiSize = event.target.value;
        setEmojiSize(newEmojiSize);
        changeState({ ...myState, emojiSize: newEmojiSize });
    }

    const handleTagColorChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const newUseTagColor = event.target.checked;
        setUseTagColor(newUseTagColor);
        changeState({ ...myState, useTagColor: newUseTagColor });
    }

    return (
        <main className={styles.main}>
            <label htmlFor="fontSize">Font Size: {fontSize}</label>
            <input
                type="range"
                id="fontSize"
                name="fontSize"
                min="10"
                max="60"
                value={fontSize}
                onChange={handleFontSizeChange}
            />
            <label htmlFor="emojiSize">Emoji Size: </label>
            <select style={{ "color": "black" }} id="emojiSize" name="emojiSize" value={emojiSize} onChange={handleEmojiSizeChange}>
                <option value="0.5">0.5</option>
                <option value="0.75">0.75</option>
                <option value="1.0">1.0</option>
                <option value="1.25">1.25</option>
                <option value="1.5">1.5</option>
                <option value="2.0">2.0</option>
            </select>
            <label htmlFor="useTagColor">Use Tag Color: </label>
            <input
                type="checkbox"
                id="useTagColor"
                name="useTagColor"
                checked={useTagColor}
                onChange={handleTagColorChange}
            />
            <label htmlFor="stream">Stream: </label>
            <input
                type="text"
                id="stream"
                name="stream"
                value={stream}
                onChange={handleStreamChange}
            />
            <label htmlFor="message">Message: </label>
            <input
                type="text"
                id="message"
                name="message"
                value={message}
                onChange={handleMessageChange}
            />
            <button onClick={handleSend}>{isVisible ? 'Hide' : 'Show'} Control Message</button>
        </main>
    )
}
