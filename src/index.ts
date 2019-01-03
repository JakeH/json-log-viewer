#!/usr/bin/env node
import minimist from 'minimist';
import { widget } from 'blessed';
import { MainPanel } from './widgets/MainPanel';
import { StatusLine } from './widgets/StatusLine';
import { FileLogProvider } from './log-providers/file';

const opts = minimist(process.argv.slice(2));
const logFile = opts._[0];

if (!logFile) {
  console.log('error: missing log file');
  process.exit(1);
}

const screen = new widget.Screen({
  smartCSR: true,
  log: opts.log,
});
screen.key(['C-c'], function (_ch, _key) {
  return process.exit(0);
});

const level = opts.l || opts.level;
const args = { screen, level };

const provider = new FileLogProvider(logFile);
const mainPanel = new MainPanel(args, provider);

const statusLine = new StatusLine({ screen, mainPanel });
screen.append(statusLine);
mainPanel.setCurrent();

screen.render();

process.on('SIGWINCH', function () {
  screen.emit('resize');
});
