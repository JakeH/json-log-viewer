import * as fs from 'fs';
import { config } from './config';

function parse(line: string) {
  try {
    return JSON.parse(line);
  } catch (e) {
    return null;
  }
}

export function readLog(file: string) {
  const contents = fs.readFileSync(file).toString();
  const lines = contents.split(/\r?\n/).filter(Boolean).map(parse);

  return lines.map(line => {
    const { timestamp, level, message, ...data } = line;
    return {
      timestamp: config.useLocalTime ? new Date(timestamp) : timestamp,
      level,
      message,
      data
    };
  });
}
