export interface Site {
    name: string;
    url: string;
    bearerToken?: string;
    username?: string;
    password?: string;
    scriptExecutorId: number;
    mailConfig: string;
    ngrokContainer?: string;
}

export type Sites = Site[];
