import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as ini from 'ini';
import * as _ from 'lodash';

let _transform = 'unloaded';
const transformFile = path.join(os.homedir(), '.json-log-viewer');

export function loadTransform(_fs = fs) {
  if (_transform === 'unloaded') {
    if (!_fs.existsSync(transformFile)) {
      return;
    }

    const contents = _fs.readFileSync(transformFile, 'utf8');
    const { transform } = ini.parse(contents);
    if (!transform) {
      return;
    }

    _transform = transform;
  }

  return _transform;
}

export function doTransform(entry, _fs = fs) {
  const transform = loadTransform(_fs);
  if (!transform) {
    return entry;
  }

  return Object.keys(transform).reduce((hash, key) => {
    const value = transform[key];
    hash[key] = entry[value];
    return hash;
  }, {});
}

function parse(line: string) {
  try {
    return doTransform(JSON.parse(line));
  } catch (e) {
    return null;
  }
}

export function readLog(file: string, reader = fs) {
  const contents = reader.readFileSync(file).toString();
  const lines = contents.split(/\r?\n/).filter(Boolean).map(parse);

  return lines.map(line => {
    const { timestamp, level, message, ...data } = line;
    return { timestamp, level, message, data };
  });
}
