import { widget } from 'blessed';
import { BaseWidget } from './BaseWidget';
import { Picker } from './Picker';
import { LogDetails } from './LogDetails';
import { levelColors, formatRows } from '../utils';
import { LogProvider } from '../log-providers/base';

const FIELDS = ['timestamp', 'level', 'message'];

interface MainPanelOptions {
  currentPage?: number;
  initialRow?: number;
  colSpacing?: number;
  wrap?: boolean;
  level: number;
  sort: string;
}

export class MainPanel extends BaseWidget {
  private initialRow: number;
  public row: number;
  currentPage: number;
  colSpacing: number;
  wrap: boolean;
  rows: any[];
  lastSearchTerm: any;
  levelFilter: number;
  filters: any[];
  sort: string;
  mode: string;
  updated: boolean;
  rawLines: any;
  linesCache: any;

  constructor(opts: MainPanelOptions, logProvider: LogProvider) {
    super(Object.assign({}, { top: '0', height: '99%', handleKeys: true }, opts));

    this.currentPage = opts.currentPage || 1;
    this.initialRow = opts.initialRow || 0;
    this.colSpacing = opts.colSpacing || 2;
    this.wrap = opts.wrap || true;
    this.row = 0;
    this.rows = [];
    this.lastSearchTerm = null;
    this.levelFilter = opts.level;
    this.filters = [];
    this.sort = opts.sort || '-timestamp';
    this.mode = 'normal';
    this.updated = true;

    this.log('pageWidth', this.pageWidth);
    this.on('resize', () => {
      this.screen.render();
      this.fixCursor();
      this.renderLines();
    });

    logProvider.getLines().then(lines => {
      this.rawLines = lines;
      this.log('loaded', this.rawLines.length);

      this.renderLines();

    });
  }

  get pageHeight() { return parseInt(this.height.toString(), 10) - 3; }
  get pageWidth() { return parseInt(this.width.toString(), 10) - 2 - 2; }

  get lastRow() {
    return (this.lines || []).length - 1;
  }

  get lines() {
    if (this.updated) {
      this.linesCache = this.calcLines();
      this.updated = false;
    }
    return this.linesCache;
  }

  calcLines() {
    if (!this.rawLines) {
      return [];
    }

    this.log('calcLines', this.sort, this.filters, this.levelFilter);

    const sort = (lines: object[]) => {
      if (!this.sort) { return lines; }

      const key = this.sortKey;
      const sorted = lines.filter(Boolean).sort((a, b) => (a[key] > b[key]) ? 1 : ((b[key] > a[key]) ? -1 : 0));

      return this.sort.startsWith('-') ? sorted.reverse() : sorted;

    };

    const filters = Array.from(this.filters);
    if (this.levelFilter) {
      filters.push({ key: 'level', value: this.levelFilter });
    }

    if (!filters.length) {
      return sort(this.rawLines);
    }

    this.log('filters', filters);

    return sort(this.rawLines.filter(line => {
      return filters.reduce((bool, filter) => {
        const key = FIELDS.indexOf(filter.key) > -1
          ? filter.key : `data.${filter.key}`;
        const value = line[key];
        if (!value) { return false; }
        if (!filter.method) {
          return value && value === filter.value;
        }
        if (filter.method === 'contains') {
          return value && value.toString().toLowerCase().indexOf(filter.value.toLowerCase()) > -1;
        }
      }, true);
    }));
  }

  renderLines(notify = true) {
    this.resetMode();
    this.rows = this.lines.slice(this.initialRow, this.initialRow + parseInt(this.height.toString(), 10) - 2);
    this.update(notify);
  }

  handleKeyPress(ch, key) {
    this.log('key', ch || (key && key.name));

    if (key.name === 'down') {
      this.moveDown();
      return;
    }
    if (key.name === 'up') {
      this.moveUp();
      return;
    }
    if (key.name === 'w') {
      this.wrap = !this.wrap;
      this.update();
      return;
    }
    if (key.name === 'pagedown') {
      this.pageDown();
      return;
    }
    if (key.name === 'pageup') {
      this.log('pageup triggering...');
      this.pageUp();
      return;
    }
    if (key.name === 'enter') {
      this.displayDetails();
      return;
    }
    if (ch === '0') {
      this.firstPage();
      return;
    }
    if (ch === '$') {
      this.lastPage();
      return;
    }
    if (ch === '/') {
      this.openSearch(true);
      return;
    }
    if (ch === '?') {
      this.openSearch();
      return;
    }
    if (ch === 'n') {
      this.search();
      return;
    }
    if (ch === 'l') {
      this.openLevelFilter();
      return;
    }
    if (ch === 'g') {
      this.openGoToLine();
      return;
    }
    if (ch === 's') {
      this.openSort();
      return;
    }
    if (ch === 'f') {
      if (this.filters.length || this.levelFilter) {
        return this.clearFilters();
      }
      this.openFilter();
      return;
    }
    if (ch === 'q') {
      process.exit(0);
      return;
    }
    if (ch === 'A') {
      this.moveToFirstViewportLine();
      return;
    }
    if (ch === 'G') {
      this.moveToLastViewportLine();
      return;
    }
    if (ch === 'C') {
      this.moveToCenterViewportLine();
      return;
    }
  }

  openLevelFilter() {
    const levels = ['all', 'debug', 'info', 'warn', 'error'];
    this.openPicker('Log Level', levels, (err, level) => {
      if (!level) { return; }
      if (err) { return; }

      this.log('selected', level);
      if (level === 'all') {
        return this.clearFilters();
      }
      this.setLevelFilter(level);
    });
  }

  get sortKey() {
    return this.sort && this.sort.replace(/^-/, '');
  }

  get sortAsc() {
    return !/^-/.test(this.sort);
  }

  openSort() {
    this.setMode('sort');
    this.openPicker('Sort by', FIELDS, (err, sort) => {
      if (!sort) { return this.resetMode(); }
      if (err) { return; }
      if (this.sortKey === sort && this.sortAsc) {
        return this.setSort(`-${sort}`);
      }
      this.setSort(sort);
    });
  }

  setUpdated() {
    this.updated = true;
    this.emit('update');
  }

  setMode(mode) {
    this.mode = mode;
    this.emit('update');
  }

  resetMode() {
    if (this.mode !== 'normal') {
      this.setMode('normal');
    }
  }

  openFilter() {
    this.setMode('filter');
    const fields = ['timestamp', 'level', 'message', 'other'];
    this.openPicker('Filter by', fields, (err, field) => {
      if (err || !field) { return this.resetMode(); }
      if (field === 'level') {
        return this.openLevelFilter();
      }
      if (field === 'other') {
        return this.openCustomFilter();
      }
      this.openFilterTerm(field);
    });
  }

  openCustomFilter() {
    this.prompt(`Field to filter:`, '', (field) => {
      if (!field) { return this.resetMode(); }
      if (field.indexOf(':') > -1) {
        return this.setFilter(field.split(':')[0], field.split(':')[1], 'contains');
      }
      this.openFilterTerm(field);
    });
  }

  openFilterTerm(field) {
    this.prompt(`Filter ${field} by:`, '', (value) => {
      if (!value) { return this.resetMode(); }
      this.setFilter(field, value, 'contains');
    });
  }

  setSort(sort) {
    this.sort = sort;
    this.renderLines();
  }

  setLevelFilter(level) {
    this.levelFilter = level;
    this.filterChanged();
  }

  filterChanged() {
    this.row = 0;
    this.initialRow = 0;
    this.setUpdated();
    this.renderLines();
  }

  setFilter(key, value, method) {
    this.filters = [{ key, value, method }];
    this.filterChanged();
  }

  clearFilters() {
    this.levelFilter = null;
    this.filters = [];
    this.filterChanged();
  }

  openPicker(label, items, callback) {
    const picker = new Picker(this, { label, items, keySelect: true });
    picker.on('select', (err, value) => callback(null, value));
    picker.setCurrent();
  }

  prompt(str, value, callback) {
    const prompt = new widget.Prompt({
      parent: <any>this,
      border: 'line',
      height: 'shrink',
      width: 'half',
      top: 'center',
      left: 'center',
      label: ' {blue-fg}Prompt{/blue-fg} ',
      tags: true,
      keys: true,
      vi: true,
      padding: 1,
    });

    prompt.input(str, value || '', (err, ret) => {
      if (err) { return; }
      if (ret) {
        callback(ret);
      } else {
        this.renderLines();
      }
    });
  }

  openSearch(clear = false) {
    this.setMode('search');
    if (clear) {
      this.lastSearchTerm = null;
    }
    this.prompt('Search:', this.lastSearchTerm, (value) => this.search(value));
  }

  openGoToLine() {
    this.setMode('GOTO');
    this.prompt('Line:', '', (value) => this.moveToLine(parseInt(value, 10) - 1));
  }

  searchTerm(term, caseSensitive, startRow) {
    const searchTerm = caseSensitive ? term : term.toLowerCase();
    return this.lines.findIndex((json, index) => {
      if (index < startRow) {
        return false;
      }
      const match = caseSensitive
        ? `${json.timestamp} ${json.message}`
        : `${json.timestamp} ${json.message}`.toLowerCase();
      return match.indexOf(searchTerm) > -1;
    });
  }

  message(str) {
    const msg = new widget.Question({
      parent: <any>this,
      border: 'line',
      height: 'shrink',
      width: 'half',
      top: 'center',
      left: 'center',
      label: ' {blue-fg}Message{/blue-fg} ',
      tags: true,
      keys: true,
      hidden: true,
      vi: true,
      padding: 1,
    });

    msg.ask(str, (err, value) => {
      this.log('value', value);
      this.renderLines();
    });
  }

  search(term = this.lastSearchTerm) {
    if (!term) {
      return this.message('No previous search');
    }
    this.lastSearchTerm = term;
    const pos = this.searchTerm(term, false, this.row + 1);
    if (pos > -1) {
      this.moveToLine(pos);
    } else {
      this.message(`No matches for '${term}'`);
    }
  }

  moveToLine(num) {
    this.row = num;
    this.initialRow = num;
    this.renderLines();
  }

  isOutsideViewPort() {
    return this.row > this.initialRow + this.pageHeight;
  }

  fixCursor() {
    if (this.isOutsideViewPort()) {
      this.initialRow = this.row - this.pageHeight;
    }
  }

  moveToFirstViewportLine() {
    this.row = this.initialRow;
    this.renderLines();
  }

  moveToCenterViewportLine() {
    this.row = (this.initialRow + this.pageHeight) / 2;
    this.renderLines();
  }

  moveToLastViewportLine() {
    this.row = this.initialRow + this.pageHeight;
    this.renderLines();
  }

  moveUp() {
    if (this.row === 0) {
      return;
    }

    this.row = Math.max(0, this.row - 1);
    const outside = this.row < this.initialRow;
    if (outside) {
      this.initialRow = this.row;
    }
    this.renderLines(outside);
  }

  moveDown() {
    if (this.row === this.lastRow) {
      return;
    }

    this.row = Math.min(this.lastRow, this.row + 1);
    const outside = this.row > this.lastVisibleLine;
    if (outside) {
      this.initialRow += 1;
    }
    this.renderLines(outside);
  }

  firstPage() {
    this.row = 0;
    this.initialRow = 0;
    this.renderLines();
  }

  lastPage() {
    this.row = this.lastRow;
    this.initialRow = this.row - this.pageHeight;
    this.renderLines();
  }

  pageDown() {
    if (this.row === this.lastRow) {
      return;
    }
    const relativeRow = this.relativeRow;
    this.row = Math.min(this.lastRow, this.row + this.pageHeight);
    this.initialRow = this.row - relativeRow;
    this.renderLines();
  }

  pageUp() {
    const relativeRow = this.relativeRow;
    this.row = Math.max(0, this.row - this.pageHeight);
    this.initialRow = Math.max(0, this.row - relativeRow);
    this.renderLines();
  }

  displayDetails() {
    const details = new LogDetails({ screen: this.screen });
    details.display(this.rows[this.relativeRow]);
  }

  get relativeRow() {
    return this.row - this.initialRow;
  }

  get lastVisibleLine() {
    return this.initialRow + this.pageHeight;
  }

  update(notify = true) {
    this.setLabel(`[{bold} ${this.row + 1}/${this.lastRow + 1} {/}]`);

    const columns: Array<{
      title: string, key: string, length?: number, format?: (value: object | string) => string
    }> = [
        {
          title: 'Timestamp', key: 'timestamp'
        },
        {
          title: 'Level', key: 'level', format: (v: string) => levelColors[v](v)
        },
        {
          title: 'D', key: 'data', length: 1, format: (v: object) => Object.keys(v).filter(k => v.hasOwnProperty(k)).length ? '*' : ' '
        },
        {
          title: 'Message', key: 'message'
        },
      ];

    const highlight = (row: string, index: number) => {
      const str = row.split('\n')[0];
      if (index === this.relativeRow) {
        return `{white-bg}{black-fg}${str}{/}`;
      }
      return str;
    };

    const content = formatRows(this.rows, columns, this.colSpacing, this.pageWidth - 1).map(highlight).join('\n');

    const [existing] = this.children.filter(o => o instanceof widget.List);
    const list = <widget.List>existing || new widget.List({ tags: true });

    list.setContent(content);

    this.append(list);
    this.screen.render();
    if (notify) {
      this.setUpdated();
    }
  }
}
