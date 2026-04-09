import * as net from 'net';

/**
 * Opens a TCP connection to host:port and closes it immediately on success.
 * Rejects on timeout, refusal, or other socket errors.
 */
export function verifyTcpReachable(
    host: string,
    port: number,
    timeoutMs = 10_000
): Promise<void> {
    return new Promise((resolve, reject) => {
        const socket = new net.Socket();
        let settled = false;

        const finish = (fn: () => void) => {
            if (!settled) {
                settled = true;
                fn();
            }
        };

        socket.setTimeout(timeoutMs);

        socket.once('connect', () => {
            socket.destroy();
            finish(() => resolve());
        });

        socket.once('timeout', () => {
            socket.destroy();
            finish(() =>
                reject(
                    new Error(
                        `TCP connection to ${host}:${port} timed out after ${timeoutMs}ms`
                    )
                )
            );
        });

        socket.once('error', (err: NodeJS.ErrnoException) => {
            finish(() => reject(err));
        });

        socket.connect(port, host);
    });
}

export function tcpTunnelsWantsMailPorts(tcpTunnels: string): {
    smtp: boolean;
    imap: boolean;
} {
    const wants = { smtp: false, imap: false };
    for (const tunnel of tcpTunnels.trim().split(/\s+/)) {
        if (!tunnel) continue;
        const idx = tunnel.lastIndexOf(':');
        if (idx === -1) continue;
        const port = tunnel.slice(idx + 1);
        if (port === '587') wants.smtp = true;
        if (port === '993') wants.imap = true;
    }
    return wants;
}
