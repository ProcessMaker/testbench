export class Site {
    name: string;
    url: string;
    bearerToken?: string;
    username?: string;
    password?: string;
    scriptExecutorId: number;
    mailConfig: string;
    useTunnel?: boolean;
    imapAccount?: string;
    senderAccount?: string;
    receiverAccount?: string;

    constructor(data: {
        name: string;
        url: string;
        bearerToken?: string;
        username?: string;
        password?: string;
        scriptExecutorId: number;
        mailConfig: string;
        useTunnel?: boolean;
        siteNumber?: number;
        imapAccount?: string;
        senderAccount?: string;
        receiverAccount?: string;
    }) {
        this.name = data.name;
        this.url = data.url;
        this.bearerToken = data.bearerToken;
        this.username = data.username;
        this.password = data.password;
        this.scriptExecutorId = data.scriptExecutorId;
        this.mailConfig = data.mailConfig;
        this.useTunnel = data.useTunnel;
        this.imapAccount = data.imapAccount;
        this.senderAccount = data.senderAccount;
        this.receiverAccount = data.receiverAccount;
    }

    /**
     * Get username from site or fallback to environment variable
     */
    getUsername(): string {
        const username = this.username || process.env.INSTANCE_USERNAME;
        if (!username) {
            throw new Error('Username is required. Provide it in the site object or set INSTANCE_USERNAME environment variable.');
        }
        return username;
    }

    /**
     * Get password from site or fallback to environment variable
     */
    getPassword(): string {
        const password = this.password || process.env.INSTANCE_PASSWORD;
        if (!password) {
            throw new Error('Password is required. Provide it in the site object or set INSTANCE_PASSWORD environment variable.');
        }
        return password;
    }
}

export type Sites = Site[];

