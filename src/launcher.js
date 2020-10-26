import {fork} from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

import AdmZip from 'adm-zip';

import CONFIG from './config.js';
import {DEBUG, say, sleep} from './lib/common.js';

launchApp();

async function launchApp() {
  console.log('App launcher started.');

  // setup a promise to track a part of the setup
    let state = 'pending';
    let resolve, reject;

    const pr = new Promise((res, rej) => (resolve = res, reject = rej));
    pr.then(() => state = 'complete').catch(() => state = 'rejected');

  let appBundle, subprocess, message = '';

  // setup future cleanup
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
    const appPath = path.resolve(__dirname, '..', 'build', 'app.zip');
    try {
      appBundle = fs.readFileSync(appPath);
    } catch(e) {
      console.log('src build service error', e);
    }

  try {
    // create the app directory
      console.log('Preparing app data directory.');
      DEBUG && console.log({DEBUG});
      const name = DEBUG ? 
        path.resolve(__dirname, '..', 'dev')
        :
        path.resolve(os.homedir(), '.grader', 'appData', `${(CONFIG.organization || CONFIG.author).name}`, `service_${CONFIG.name}`);
      const zipName = path.resolve(name, 'app.zip');
      if ( ! fs.existsSync(name) ) {
        fs.mkdirSync(name, {recursive:true});
      }
      if ( fs.existsSync(zipName) ) {
        fs.unlinkSync(zipName);
      }
      
    // unzip a fresh copy of app from binary every time
      console.log('Inflating app contents.');
      fs.writeFileSync(zipName, appBundle);
      const file = new AdmZip(zipName);
      DEBUG && console.log({zipName, name, appPath});
      file.extractAllTo(name, /*overwrite*/ true);
    // and delete the zip
      fs.unlinkSync(zipName);

    // fork the app process
      console.log('App process requested.');
      const procName = path.resolve(name, 'app', 'service.js');
      DEBUG && console.log({procName});
      subprocess = fork(
        procName,
        !DEBUG ? 
          {stdio:[null, null, null, 'ipc'], detached: true}
        :
          {stdio:'inherit'}
      );
      subprocess.on('error', (...args) => (console.log('err', args), reject(args)));
      subprocess.on('message', (...args) => {
        if ( typeof args[0] == "string" ) {
          message = args[0];
        }
        process.stdout.write('\n'+message);
        resolve(args)
      });
      !DEBUG && subprocess.unref();
  } catch (e) { 
    console.log('fork err', e) 
    console.log('App process failed. Exiting...');   
    process.exit(1);
  }

  console.log('App process created.');

  /*
    await sleep(5000);
    process.exit(0);
  */

  // keep this process spinning while we track startup progress
    const progress = [];

    while( subprocess.connected && !(typeof message == "string" && message.startsWith('App started.')) ) {
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
    if ( typeof message == "string" && message.startsWith('App started.') ) {
      const port = Number(message.split('.')[1].trim());
      console
      console.log(`Service on port ${port}`);
      console.log('Launcher exiting successfully...');
      if ( DEBUG ) {
        console.log(`DEBUG on so Waiting 60 seconds.`);
        await sleep(60000);
      } else {
        await sleep(500);
        process.exit(0);
      }
    } else {
      console.error('Error at', message);
      console.info('Check state', state, 'subprocess.connected', subprocess.connected);
      console.log('Launcher failed. Exiting in 5 seconds...');
      await sleep(5000);
      process.exit(1);
    }
}

