import { readFile } from 'fs';
import { promisify } from 'util';
import { LogProviderBase } from './base';
import { Line } from '../models/line';

const readProm = promisify(readFile);

export class FileLogProvider extends LogProviderBase {
  private lines: Line[];

  constructor(private filename: string) {
    super();
  }

  public async getLines(): Promise<Line[]> {

    if (!this.lines) {
      const contents = await readProm(this.filename, 'utf8');

      this.lines =
        contents.split(/\r?\n/)
          .filter(Boolean)
          .map(super.parseLine);
    }

    return this.lines;
  }

}
