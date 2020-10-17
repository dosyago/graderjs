import {fork, spawn} from 'child_process';
import AdmZip from 'adm-zip';
import fs from 'fs';
import path from 'path';
import os from 'os';

import args from './lib/args.js';
import connect from './lib/protocol.js';

//import AppServer from './server.js';

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

let quitting, appWindow;

process.on('error', (...args) => {
  console.log(args);
});

start();


async function start() {
  //process.on('beforeExit', cleanup);
  //process.on('SIGBREAK', cleanup);
  //process.on('SIGHUP', cleanup);
  //process.on('SIGINT', cleanup);
  //process.on('SIGTERM', cleanup);

  console.log(`Importing dependencies...`);
  const {launch:ChromeLaunch} = await import('chrome-launcher');

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
  console.log(`Launching app server...`);
  let srv;
  try {
    srv = fs.readFileSync(path.resolve(__dirname, '..', 'build', 'app.zip'));
  } catch(e) {
    console.log('src build server', e);
  }
  const subx = '123';
  /**
  try {
    const name = path.resolve(os.homedir(), Math.random().toString(36) + '_grader_server.js');
    fs.writeFileSync(name, srv);
    const subprocess = spawn(
      path.resolve('..', 'build', 'node'), 
      [
        name
      ],
      {stdio:'inherit'}
      //{windowsHide:true, detached:true, stdio:'ignore'}
    );
    console.log(3, subprocess);
    subprocess.on('error', (...args) => console.log(3, args));
    //subprocess.unref();
  } catch (e) { console.log(e) }
  **/
  try {
    const name = path.resolve(os.homedir(), '.grader_server_' + Math.random().toString(36));
    const zipName = path.resolve(name, 'app.zip');
    fs.mkdirSync(name, {recursive:true});
    fs.writeFileSync(zipName, srv);
    const file = new AdmZip(zipName);
    file.extractAllTo(name);
    const procName = path.resolve(name, 'app', 'server.js');
    const subprocess = fork(
      procName,
      {windowsHide:true, detached:true, stdio:'ignore'}
    );
    console.log(3, subprocess);
    subprocess.on('error', (...args) => console.log(3, args));
    //subprocess.unref();
  } catch (e) { console.log(e) }

  //await AppServer.start({server_port});
  console.log(`App server started.`);

  console.log(`Waiting 1 second...`);
  await sleep(1000);

  console.log(`Launching chrome...`);
  console.log({LAUNCH_OPTS});
  const browser = await ChromeLaunch(LAUNCH_OPTS);
  console.log({browser, ChromeLaunch});
  console.log(`Chrome started.`);

  console.log(`Waiting 1 second...`);
  await sleep(1000);

  console.log(`Connecting to chrome...`);
  const AppWindow = await connect({port:chrome_port});

  AppWindow.close = async () => await browser.kill();

  appWindow = AppWindow;

  console.log(`Ready`);

  await sleep(10000);

  return appWindow;
}

async function cleanup(reason) {
  console.log(`Cleanup called on reason: ${reason}`);

  if ( quitting ) {
    console.log(`Cleanup already called so not running again.`);
    return;
  }
  quitting = true;

  if ( appWindow ) {
    appWindow.close();
  }

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
