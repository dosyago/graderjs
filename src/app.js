import {execSync, fork, spawn} from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

import AdmZip from 'adm-zip';

import args from './lib/args.js';
import {DEBUG, context, sleep, NO_SANDBOX} from './lib/common.js';

process.on('error', (...args) => {
  console.log(args);
});

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

start();

async function start() {
  console.log('App launcher started.');
  console.log(`Click this window and press any key...`);

  let state = 'pending';
  let resolve, reject;

  const pr = new Promise((res, rej) => (resolve = res, reject = rej));
  pr.then(() => state = 'complete').catch(() => state = 'rejected');

  let srv, subprocess, message;

  try {
    srv = fs.readFileSync(path.resolve(__dirname, '..', 'build', 'app.zip'));
  } catch(e) {
    console.log('src build server error', e);
  }
  try {
    console.log('Preparing temp data directory.');
    const name = path.resolve(os.homedir(), '.grader_server_' + Math.random().toString(36));
    const zipName = path.resolve(name, 'app.zip');
    fs.mkdirSync(name, {recursive:true});
    fs.writeFileSync(zipName, srv);

    console.log('Inflating app contents.');
    const file = new AdmZip(zipName);
    file.extractAllTo(name);
    const procName = path.resolve(name, 'app', 'server.js');

    console.log('App process requested.');
    subprocess = fork(
      procName,
      /*{windowsHide:true, detached:true, stdio:[null, null, null, 'ipc']}*/
      {stdio:[null, null, null, 'ipc'], detached: true}
    );
    //console.log(3, subprocess);
    subprocess.on('error', (...args) => (console.log('err', args), reject(args)));
    subprocess.on('message', msg => (message = msg, console.log(msg), resolve(args)));
    subprocess.unref();
  } catch (e) { 
    console.log('fork err', e) 
    console.log('App process failed. Exiting...');   
    process.exit(1);
  }

  console.log('App process created.');

  // keep parent spinning 

  /**
  if ( process.platform === "win32" ) {
    execSync("pause press");
  }
  **/

  const progress = [];

  while(true) {
    if ( !subprocess.connected || message == 'App started.' ) {
      break;
    }

    if ( state == 'pending' ) {
      process.stdout.clearLine();
      process.stdout.cursorTo(0);
      process.stdout.write(`Waiting for your system security checks: ${progress.join('.')}`);
    }

    await sleep(Math.round(Math.random()*370));

    progress.push('');
  }

  if ( message == 'App started.' ) {
    console.log('Launcher exiting successfully...');
    await sleep(15000);
    process.exit(0);
  } else {
    console.info(message, state);
    console.log('Launcher failed. Exiting...');
    await sleep(15000);
    process.exit(1);
  }
}

async function untilConnected(url) {
  
}

