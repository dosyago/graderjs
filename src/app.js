import {fork} from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

import AdmZip from 'adm-zip';

import CONFIG from './config.js';
import args from './lib/args.js';
import {say, sleep} from './lib/common.js';

start();

async function start() {
  console.log('App launcher started.');

  let state = 'pending';
  let resolve, reject;

  const pr = new Promise((res, rej) => (resolve = res, reject = rej));
  pr.then(() => state = 'complete').catch(() => state = 'rejected');

  let srv, subprocess, message;

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

  try {
    srv = fs.readFileSync(path.resolve(__dirname, '..', 'build', 'app.zip'));
  } catch(e) {
    console.log('src build service error', e);
  }
  try {
    console.log('Preparing temp data directory.');
    // need to think about this
    const name = path.resolve(os.homedir(), '.grader', `service_${CONFIG.name}` + Math.random().toString(36));
    const zipName = path.resolve(name, 'app.zip');
    fs.mkdirSync(name, {recursive:true});
    fs.writeFileSync(zipName, srv);

    console.log('Inflating app contents.');
    const file = new AdmZip(zipName);
    file.extractAllTo(name);
    const procName = path.resolve(name, 'app', 'service.js');

    console.log('App process requested.');
    subprocess = fork(
      procName,
      {stdio:[null, null, null, 'ipc'], detached: true}
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

  // keep parent spinning 

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

