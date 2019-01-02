
import { homedir } from 'os';
import { join as pathJoin } from 'path';
import { AppConfig } from './models/app-config';

const configFile = pathJoin(homedir(), '.json-log-viewer');

const defaultConfig: AppConfig = {
    useLocalTime: false,
};

export const config: AppConfig = require(configFile).default || defaultConfig;
