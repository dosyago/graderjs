import os from 'os';
import path from 'path';

import CONFIG from '../config.js';

// determine where this code is running 

export const DEBUG = CONFIG.DEBUG;
export const DEBUG2 = true;

export const newSessionId = () => (Math.random()*1137).toString(36);

export const APP_ROOT = __dirname;
export const appDir = () => DEBUG ?
  path.resolve(__dirname, '..')
  :
  path.resolve(os.homedir(), '.grader', 'appData', `${(CONFIG.organization || CONFIG.author).name}`, `service_${CONFIG.name}`)
export const expiredSessionFile = () => path.resolve(appDir(), 'old-sessions.json')
export const sessionDir = sessionId => path.resolve(appDir(), 'sessions', sessionId)
export const app_data_dir = sessionId => path.resolve(sessionDir(sessionId), `ui-data`);
export const temp_browser_cache = sessionId => path.resolve(sessionDir(sessionId), `ui-cache`);
export const logFile = () => path.resolve(appDir(), 'launcher.log');

export const sleep = ms => new Promise(res => setTimeout(res, ms));

export function say(o) {
  console.log(JSON.stringify(o));
}

export function delayThrow(msg) {
  // collect the stack while it's in frame
  const err = new TypeError(msg);

  // throw after delay
  setTimeout(() => { throw err; }, 0);

  return void 0;
}
