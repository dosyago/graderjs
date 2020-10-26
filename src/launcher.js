import {fork} from 'child_process';
import fs from 'fs';
import path from 'path';

import AdmZip from 'adm-zip';

import {DEBUG, say, sleep, appDir, logFile} from './lib/common.js';

launchApp();

async function launchApp() {
  console.log('App launcher started.');

  // setup a promise to track a part of the setup
    let state = 'pending';
    let resolve, reject;

    const pr = new Promise((res, rej) => (resolve = res, reject = rej));
    pr.then(() => state = 'complete').catch(() => state = 'rejected');

  let appBundle, subprocess = {}, message = '';

  // setup future cleanup
    const killService = (e) => {
      subprocess.kill();
      console.log('');
      say({exitTrigger:e});
      exit(1);
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
      exit(1);
    }

  try {

    // create the app directory
      console.log('Preparing app data directory.');
      const name = DEBUG ? path.resolve(appDir(), 'dev') : appDir();
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
      file.extractAllTo(name, /*overwrite*/ true);

    // and delete the zip
      fs.unlinkSync(zipName);

    // fork the app process
      console.log('App process requested.');
      const procName = path.resolve(name, 'app', 'service.js');
      const log = fs.createWriteStream(logFile());
      log.on('open', () => {
        try {
          subprocess = fork(
            procName,
            !DEBUG ? 
              {stdio:[log, log, log, 'ipc'], detached: true}
            :
              {stdio:'inherit'}
          );
          subprocess.on('error', (...args) => (console.log('err', args), reject(args)));
          subprocess.on('message', (...args) => {
            process.stdout.write('\n'+message);
            if ( typeof args[0] == "string" ) {
              message = args[0];
              if ( message.startsWith('App started.') ) {
                resolve(args)
              }
            }
          });
          !DEBUG && subprocess.unref();
        } catch(e) {
          console.log('fork err', e);
          exit(1);
        }
      });

  } catch (e) { 
    console.log('launch err', e) 
    exit(1);
  }

  console.log('App process created.');

  // keep this process spinning while we track startup progress
    const progress = [];

    while( subprocess.connected && state == 'pending' ) {
      process.stdout.clearLine(0); // 0 is 'entire line'
      process.stdout.cursorTo(0);
      process.stdout.write(`Waiting for your system security checks: ${progress.join('.')}`);

      await sleep(Math.round(Math.random()*370));

      progress.push('');
    }

    console.log('');

  // report the outcome
    if ( state == 'complete' ) {
      const port = Number(message.split('.')[1].trim());
      console.log(`Service on port ${port}`);
      console.log(`Launcher completed successfully.`);
      exit(0);
    } else {
      console.error('Error at', message);
      console.info({state, subprocessConnected:subprocess.connected});
      console.log('Waiting 5 seconds...');
      await sleep(5000);
      exit(1);
    }
}

async function exit(code) {
  console.log(`Exit status: ${code ? 'failure' : 'success'}`);
  if ( DEBUG ) {
    console.log(`DEBUG on so not exiting.`);
    process.stdin.resume();
  } else {
    console.log('Exiting...');
    sleep(500).then(() => process.exit(code));
  }
}

