export interface SystemError extends Error {
    code: string;
    errno?: number;
    syscall?: string;
    path?: string;
}

export type Participant = {
    name: string;
    phone: string;
    image: string;
    rank: number;
}