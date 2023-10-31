import io, { Socket } from "socket.io-client";

interface Options {
    [key: string]: any;
}

type EventHandler = (...args: any[]) => void;

export class TikTokIOConnection {
    private socket: Socket;
    private uniqueId: string | null;
    private options: Options | null;

    constructor(backendUrl: string) {
        this.socket = io(backendUrl);
        this.uniqueId = null;
        this.options = null;

        this.socket.on('connect', () => {
            console.info("Socket connected!");

            if (this.uniqueId) {
                this.setUniqueId();
            }
        });

        this.socket.on('disconnect', () => {
            console.warn("Socket disconnected!");
        });

        this.socket.on('streamEnd', () => {
            console.warn("LIVE has ended!");
            this.uniqueId = null;
        });

        this.socket.on('tiktokDisconnected', (errMsg: string) => {
            console.warn(errMsg);
            if (errMsg && errMsg.includes('LIVE has ended')) {
                this.uniqueId = null;
            }
        });
    }

    connect(uniqueId: string, options?: Options): Promise<void> {
        this.uniqueId = uniqueId;
        this.options = options || {};

        this.setUniqueId();

        return new Promise((resolve, reject) => {
            this.socket.once('tiktokConnected', resolve);
            this.socket.once('tiktokDisconnected', reject);

            setTimeout(() => {
                reject('Connection Timeout');
            }, 15000);
        });
    }

    private setUniqueId(): void {
        this.socket.emit('setUniqueId', this.uniqueId, this.options);
    }

    on(eventName: string, eventHandler: EventHandler): void {
        this.socket.on(eventName, eventHandler);
    }
}
