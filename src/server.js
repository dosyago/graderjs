import fs from 'fs';
import os from 'os';
import path from 'path';
import express from 'express';
import {launch as ChromeLaunch} from 'chrome-launcher';

import args from './../src/lib/args.js';
import {say} from './../src/lib/common.js';
import connect from './lib/protocol.js';

const SITE_PATH = path.resolve(__dirname, 'public');
console.log({SITE_PATH});

import {DEBUG, context, sleep, NO_SANDBOX} from './lib/common.js';

const {server_port, chrome_port} = args;

const CHROME_OPTS = !NO_SANDBOX ? [
  `--app=http://localhost:${server_port}`,
  '--restore-last-session',
  `--disk-cache-dir=${args.temp_browser_cache()}`,
  `--aggressive-cache-discard`
] : [
  `--app=http://localhost:${server_port}`,
  '--restore-last-session',
  `--disk-cache-dir=${args.temp_browser_cache()}`,
  `--aggressive-cache-discard`,
  '--no-sandbox'
];
const LAUNCH_OPTS = {
  logLevel: 'verbose',
  port: chrome_port, 
  chromeFlags:CHROME_OPTS, 
  userDataDir:args.app_data_dir(), 
  ignoreDefaultFlags: true
}
const KILL_ON = {
  win32: 'taskkill /IM chrome.exe /F',
  darwin: 'pkill -15 chrome',
  freebsd: 'pkill -15 chrome',
  linux: 'pkill -15 chrome',
};

//process.on('beforeExit', cleanup);
//process.on('SIGBREAK', cleanup);
//process.on('SIGHUP', cleanup);
//process.on('SIGINT', cleanup);
//process.on('SIGTERM', cleanup);
process.on('error', (...args) => {
  console.log(args);
});

const app = express();

let Server, upAt, port, quitting, appWindow;

const AppServer = {
  start, stop
}

export default AppServer;

/**
console.log({
  processArgv: process.argv,
  requireMain: require.main,
  module,
  importMetaURL: import.meta.url
});
**/

if (process.argv[1].includes('grader_server_')) {
  process.send('Request app start.');
  run();
}

async function run() {
  console.log(`Start server...`);
  process.send('Request server start.');
  await start({server_port:22121});
  process.send('Server started.');
  console.log(`App server started.`);

  console.log(`Importing dependencies...`);

  process.send('Request cache directory.');
  console.log(`Removing grader's existing temporary browser cache if it exists...`);
  if ( fs.existsSync(args.temp_browser_cache()) ) {
    console.log(`Temp browser cache directory (${args.temp_browser_cache()}) exists, deleting...`);
    fs.rmdirSync(args.temp_browser_cache(), {recursive:true});
    console.log(`Deleted.`);
  }
  if ( !fs.existsSync(args.app_data_dir()) ) {
    console.log(`App data dir does not exist. Creating...`);
    fs.mkdirSync(args.app_data_dir(), {recursive:true});
    console.log(`Created.`);
  }
  process.send('Cache directory created.');

  process.send('Request user interface.');
  console.log(`Launching chrome...`);
  console.log({LAUNCH_OPTS});
  const browser = await ChromeLaunch(LAUNCH_OPTS);
  console.log({browser, ChromeLaunch});
  console.log(`Chrome started.`);
  process.send('User interface created.');

  process.send('Request interface connection.');
  console.log(`Connecting to chrome...`);
  const AppWindow = await connect({port:chrome_port});
  console.log(`Connected.`);
  process.send('User interface online.');

  process.send && process.send('App started.');
  process.disconnect && process.disconnect();

  AppWindow.close = async () => await browser.kill();
  appWindow = AppWindow;
}

async function start({server_port}) {
  let resolve, reject;
  const pr = new Promise((res, rej) => (resolve = res, reject = rej));

  port = server_port;
  addHandlers();

  Server = app.listen(Number(port), err => {
    if ( err ) { 
      reject(err);
    } 
    upAt = new Date;
    say({server_up:{upAt,port}});
    resolve({upAt,port});
  });

  console.log(`Ready`);

  return pr;
}

function addHandlers() {
  app.use(express.urlencoded({extended:true}));
  app.use(express.static(SITE_PATH));
}

async function stop() {
  let resolve;
  const pr = new Promise(res => resolve = res);

  say({server:`Closing server...`});

  Server.close(() => {
    say({server:`Server closed.`});
    resolve();
  });

  return pr;
}


async function cleanup(reason) {
  console.log(`Cleanup called on reason: ${reason}`);

  if ( quitting ) {
    console.log(`Cleanup already called so not running again.`);
    return;
  }
  quitting = true;

  if ( fs.existsSync(args.temp_browser_cache()) ) {
    console.log(`Temp browser cache directory (${args.temp_browser_cache()}) exists, deleting...`);
    fs.rmdirSync(args.temp_browser_cache(), {recursive:true});
    console.log(`Deleted.`);
  }

  //AppServer.stop();

  console.log(`Take a breath. Everything's done. grader is exiting in 3 seconds...`);

  await sleep(2000);

  process.exit(0);
} 
