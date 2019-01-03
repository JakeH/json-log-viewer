import { EventEmitter } from 'events';
import { Line } from '../models/line';
import { config } from '../config';

export interface LogProvider {

    lineCount: number;

    getLines(start: number, end?: number): Promise<Line[]>;

    // events
    on(event: 'source-updated', listener: () => void): this;

}

export abstract class LogProviderBase extends EventEmitter implements LogProvider {
    abstract lineCount: number;
    abstract getLines(start: number, end?: number): Promise<Line[]>;

    protected parseLine(line: string): Line {
        const parsed = JSON.parse(line);
        const { timestamp, level, message, ...data } = parsed;
        return {
            timestamp: config.useLocalTime ? new Date(timestamp) : timestamp,
            level,
            message,
            data: !data || !Object.keys(data).filter(k => data.hasOwnProperty(k)).length ? undefined : data
        };
    }
}
