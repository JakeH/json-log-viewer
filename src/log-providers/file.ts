import { readFile } from 'fs';
import { promisify } from 'util';
import { LogProviderBase } from './base';
import { Line } from '../models/line';

const readProm = promisify(readFile);

export class FileLogProvider extends LogProviderBase {

  public lineCount: number;

  constructor(private filename: string) {
    super();
  }

  public async getLines(start: number, end: number = Number.MAX_SAFE_INTEGER): Promise<Line[]> {

    const contents = await readProm(this.filename, 'utf8');

    const lines =
      contents.split(/\r?\n/)
        .filter(Boolean)
        .reverse();

    this.lineCount = lines.length;

    const filteredLines =
      lines.map((val, i) => i >= start && i <= end ? val : undefined)
        .filter(Boolean)
        .map(super.parseLine);

    return filteredLines;
  }

}
