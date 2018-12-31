import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as ini from 'ini';
import * as _ from 'lodash';

let _transform = 'unloaded';

export function loadTransform(_fs = fs) {
  if (_transform === 'unloaded') {
    const transformFile = path.join(os.homedir(), '.json-log-viewer');
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
    if (value === '$') {
      hash[key] = _.cloneDeep(entry);
    } else {
      hash[key] = _.get(entry, value);
    }
    return hash;
  }, {});
}

function parse(line) {
  try {
    return doTransform(JSON.parse(line));
  } catch (e) {
    return null;
  }
}

export function readLog(file, reader = fs) {
  const contents = reader.readFileSync(file).toString();
  const lines = _.compact(contents.split('\n').filter(line => line).map(parse));

  return lines.map(line => {
    const result = _.pick(line, ['timestamp', 'level', 'message']);
    const data = _.omit(line, ['timestamp', 'level', 'message']);
    return Object.assign({}, result, { data });
  });
}
