import {fork} from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

import AdmZip from 'adm-zip';

import args from './lib/args.js';
import {sleep} from './lib/common.js';

process.on('error', (...args) => {
  console.log(args);
});

start();

async function start() {
  console.log('App launcher started.');

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
      {stdio:[null, null, null, 'ipc'], detached: true, windowsHide: true}
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
      process.stdout.clearLine();
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
    console.info('Check state', state);
    console.log('Launcher failed. Exiting in 15 seconds...');
    await sleep(15000);
    process.exit(1);
  }
}

