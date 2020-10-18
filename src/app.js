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
  console.log(`Click this window and press any key...`);

  let state = 'pending';
  let resolve, reject;

  const pr = new Promise((res, rej) => (resolve = res, reject = rej));
  pr.then(() => state = 'complete').catch(() => state = 'rejected');

  let srv, subprocess;

  try {
    srv = fs.readFileSync(path.resolve(__dirname, '..', 'build', 'app.zip'));
  } catch(e) {
    console.log('src build server error', e);
  }
  try {
    const name = path.resolve(os.homedir(), '.grader_server_' + Math.random().toString(36));
    const zipName = path.resolve(name, 'app.zip');
    fs.mkdirSync(name, {recursive:true});
    fs.writeFileSync(zipName, srv);
    const file = new AdmZip(zipName);
    file.extractAllTo(name);
    const procName = path.resolve(name, 'app', 'server.js');
    subprocess = fork(
      procName,
      /*{windowsHide:true, detached:true, stdio:[null, null, null, 'ipc']}*/
      {stdio:'inherit'}
    );
    //console.log(3, subprocess);
    subprocess.on('error', (...args) => (console.log('err', args), reject(args)));
    subprocess.on('message', (...args) => (console.log('msg', args), resolve(args)));
    subprocess.unref();
  } catch (e) { console.log('fork err', e) }

  // keep parent spinning 

  const progress = [];


  if ( process.platform == "win32" ) {
    execSync("pause press");
  }

  while(true) {
    process.stdout.write(`\rInstalling: ${progress.join('.')}`);
    await sleep(Math.round(Math.random()*100));
    if ( state != 'pending' ) {
      console.log('Installed!');
      break;
    }
    if ( !subprocess.connected ) {
      console.log('Installed!');
      break;
    }
    progress.push('');
  }

  console.log('Installer exiting...');
  await sleep(10000);
  //await untilConnected(`http://localhost:${chrome_port}`);
  process.exit(0);
}

async function untilConnected(url) {
  
}

