import {fork} from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

import AdmZip from 'adm-zip';

import CONFIG from './config.js';
import args from './lib/args.js';
import {DEBUG, say, sleep} from './lib/common.js';

launchApp();

async function launchApp() {
  console.log('App launcher started.');

  // setup a promise to track a part of the setup
    let state = 'pending';
    let resolve, reject;

    const pr = new Promise((res, rej) => (resolve = res, reject = rej));
    pr.then(() => state = 'complete').catch(() => state = 'rejected');

  let appBundle, subprocess, message;

  // cleanup
    const killService = (e) => {
      subprocess.kill();
      console.log();
      say({exitTrigger:e});
      process.exit(1);
    }

    process.on('SIGINT', killService);
    process.on('SIGQUIT', killService);
    process.on('SIGTSTP', killService);
    process.on('SIGHUP', killService);
    process.on('error', killService);

  // retrieve the app from the virtual filesystem in the build
    try {
      appBundle = fs.readFileSync(path.resolve(__dirname, '..', 'build', 'app.zip'));
    } catch(e) {
      console.log('src build service error', e);
    }

  try {
    // create the app directory
      console.log('Preparing app data directory.');
      const name = path.resolve(os.homedir(), '.grader', 'appData', `${(CONFIG.organization || CONFIG.author).name}`, `service_${CONFIG.name}`);
      const zipName = path.resolve(name, 'app.zip');
      if ( ! fs.existsSync(name) ) {
        fs.mkdirSync(name, {recursive:true});
      }

    // unzip a fresh copy of app from binary every time
      console.log('Inflating app contents.');
      fs.writeFileSync(zipName, appBundle);
      const file = new AdmZip(zipName);
      file.extractAllTo(name);

    // fork the app process
      console.log('App process requested.');
      const procName = path.resolve(name, 'app', 'service.js');
      subprocess = fork(
        procName,
        !DEBUG ? 
          {stdio:[null, null, null, 'ipc'], detached: true}
        :
          {stdio:'inherit'}
      );
      subprocess.on('error', (...args) => (console.log('err', args), reject(args)));
      subprocess.on('message', msg => (message = msg, process.stdout.write('\n'+msg), resolve(args)));
      subprocess.unref();
  } catch (e) { 
    console.log('fork err', e) 
    console.log('App process failed. Exiting...');   
    process.exit(1);
  }

  console.log('App process created.');

  // keep this process spinning while we track startup progress
    const progress = [];

    while( subprocess.connected && message != 'App started.' ) {
      if ( state == 'pending' ) {
        process.stdout.clearLine(0); // 0 is 'entire line'
        process.stdout.cursorTo(0);
        process.stdout.write(`Waiting for your system security checks: ${progress.join('.')}`);
      }

      await sleep(Math.round(Math.random()*370));

      progress.push('');
    }

    console.log('');

  // report the outcome
    if ( message == 'App started.' ) {
      console.log('Launcher exiting successfully...');
      process.exit(0);
    } else {
      console.error('Error at', message);
      console.info('Check state', state, 'subprocess.connected', subprocess.connected);
      console.log('Launcher failed. Exiting in 5 seconds...');
      await sleep(5000);
      process.exit(1);
    }
}

