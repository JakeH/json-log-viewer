import { widget } from 'blessed';
import { BaseWidget } from './BaseWidget';

const fmtKey = (rawKey: any, padding: number) => {
  const key = padding
    ? `${rawKey}:`.padEnd(padding + 1)
    : `${rawKey}:`;
  return `{blue-fg}{bold}${key}{/bold}{/blue-fg}`;
};

const spaces = (s: string, len: number) => new Array(len).join(' ') + s;

const formatEntry = (key: string, val: any, padding: number, level = 0) => {
  const value = val && typeof val === 'object'
    ? formatObject(val, level + 1)
    : ` ${val}`;
  return `${fmtKey(key, padding)}${value}`;
};

const formatObject = (obj: { [x: string]: any; }, level = 0) => {
  const padding = Math.max(...Object.keys(obj).map(k => k.length));
  const entries = Object.keys(obj)
    .map(key => `${formatEntry(key, obj[key], padding, level)}`)
    .map((val: string) => spaces(val, level * 2));
  return [''].concat(entries).join('\n');
};

export class LogDetails extends BaseWidget {
  json: boolean;
  el: any;
  entry: any;
  constructor(opts = {}) {
    super(Object.assign({}, opts, {
      width: '90%',
      height: '80%',
      shadow: true,
      handleKeys: true,
    }));
    this.json = false;
  }

  handleKeyPress(ch: any, key: { name: string; }) {
    if (key.name === 'enter' || key.name === 'escape') {
      this.log('detach');
      this.el.detach();
      this.detach();
      this.screen.render();
      return;
    }
    if (key.name === 'j') {
      this.json = !this.json;
      this.update();
    }
  }

  display(entry: { timestamp: string; level: string; message: string; data: any; }) {
    this.setLabel(`{bold} ${entry.timestamp} - ${entry.level} - ${entry.message} {/}`);
    this.entry = entry.data;
    this.update();
  }

  update() {
    if (this.el) {
      this.el.detach();
      this.el = null;
    }
    const content = this.json
      ? JSON.stringify(this.entry, null, 2)
      : formatObject(this.entry);
    this.el = new widget.Box({
      scrollable: true,
      alwaysScroll: true,
      keys: true,
      scrollbar: { ch: ' ', track: { bg: 'grey' }, style: { bg: 'yellow' } },
      tags: true,
      content,
    });
    this.el.on('keypress', this.handleKeyPress.bind(this));
    this.el.focus();

    this.append(this.el);
    this.screen.render();
  }
}
