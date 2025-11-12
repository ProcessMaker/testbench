export interface Site {
    name: string;
    url: string;
    bearerToken?: string;
    username?: string;
    password?: string;
    scriptExecutorId: number;
    mailConfig: string;
    useTunnel?: boolean;
}

export type Sites = Site[];
