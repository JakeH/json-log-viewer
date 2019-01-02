import { widget } from 'blessed';
import * as _ from 'lodash';
import { BaseWidget } from './BaseWidget';
import { MainPanel } from './MainPanel';

interface PickerOptions {
  items: any;
  label: string;
  keySelect: boolean;
}
export class Picker extends BaseWidget {
  items: string[];
  label: string;
  keySelect: boolean;
  list: any;
  constructor(parent: MainPanel, opts: PickerOptions) {
    super(Object.assign({}, opts, {
      parent,
      top: 'center',
      left: 'center',
      width: 'shrink',
      height: 'shrink',
      shadow: true,
      padding: 1,
      style: {
        border: {
          fg: 'red',
        },
        header: {
          fg: 'blue',
          bold: true,
        },
        cell: {
          fg: 'magenta',
          selected: {
            bg: 'blue',
          },
        },
      },
    }));
    this.items = opts.items;
    this.label = opts.label || 'Select item';
    this.keySelect = !!opts.keySelect;
    this.update();
  }

  update() {
    this.setLabel(`{bold} ${this.label} {/}`);
    this.list = new widget.List({
      interactive: true,
      keys: true,
      style: {
        selected: {
          bg: 'white',
          fg: 'black',
          bold: true,
        },
      },
    });
    this.list.on('focus', () => this.log('focus'));
    this.list.on('blur', () => this.log('blur'));
    this.list.on('keypress', this.handleKeyPressed.bind(this));
    this.list.on('select', this.handleSelected.bind(this));
    this.list.setItems(this.items);
    this.append(this.list);
  }

  handleSelected(err, value) {
    this.selected(this.items[value]);
  }

  selected(value) {
    this.list.detach();
    this.detach();
    this.screen.render();
    this.emit('select', null, value);
  }

  handleKeyPressed(ch, key) {
    if (this.keySelect && /[a-z]/.test(ch)) {
      const item = this.items.find(i => i.startsWith(ch));
      if (item) {
        this.log('item', item);
        this.selected(item);
      }
    }

    if (key.name === 'escape') {
      this.selected(null);
    }
  }

  setCurrent() {
    this.list.focus();
    this.screen.render();
    return this;
  }
}
