// imports
  // node built-in
    import fs from 'fs';
    import path from 'path';
    import {fork} from 'child_process';

  // 3rd-party
    import AdmZip from 'adm-zip';
    import {Launcher} from './lib/vendor/chrome-launcher.js';

  // own 
    import {install} from 'browser-installer';

  // internal
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
  let preserveConsole = false;

  // setup future cleanup
    const killService = (e) => {
      subprocess.kill();
      console.log('');
      say({exitTrigger:e});
      return process.exit(1);
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
      return exit(1);
    }

  // ensure dependencies are met
    {
      let val;
      try {
        val = Launcher.getFirstInstallation();
      } catch(e) {
        DEBUG && console.info('Dependency check', e);
        console.log('Discovered upgrade opportunity.');
      }
      if ( ! val ) {
        console.log(`Installing dependencies...`);
        await install();
        console.log('Done! Process upgraded.');
      }
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

    // wait for log stream
      let logResolve;
      const logPr = new Promise(res => logResolve = res);
      const log = fs.createWriteStream(logFile());
      log.on('open', () => logResolve());
      await logPr;

    // fork the app process
      console.log('App process requested.');
      const procName = path.resolve(name, 'app', 'service.js');

      subprocess = fork(
        procName,
        !DEBUG ? 
          {stdio:[log, log, log, 'ipc'], detached: true}
        :
          {stdio:'inherit'}
      );
      subprocess.on('error', (...args) => (console.log('err', args), reject(args)));
      subprocess.on('message', (...args) => {
        if ( ! args[0] ) return;
        if ( typeof args[0] == "string" ) {
          message = args[0];
        } else {
          if ( args[0].keepConsoleOpen ) {
            preserveConsole = true;
          }
        }
        process.stdout.write('\n'+message);
        resolve(args)
      });
      !DEBUG && subprocess.unref();
  } catch (e) { 
    console.log('launch err', e) 
    return exit(1);
  } 

  console.log('App process created.');

  // keep this process spinning while we track startup progress
    const progress = [];

    while( subprocess.connected && !(
      typeof message == "string" && message.startsWith('App started.')
    )) {
      if ( state == 'pending' ) {
        progress.push('');
        process.stdout.clearLine(0); // 0 is 'entire line'
        process.stdout.cursorTo(0);
        process.stdout.write(`Waiting for your system security checks: ${progress.join('.')}`);
      }

      await sleep(Math.round(Math.random()*370));
    }

    console.log('');

    DEBUG && console.log({message, state});

  // check for keepConsoleOpen
    if ( preserveConsole ) {
      process.stdin.resume();
      console.log('Persistent console created.');
    }

  // report the outcome
    if ( typeof message == "string" && message.startsWith('App started.') ) {
      const port = Number(message.split('.')[1].trim());
      console.log(`Service on port ${port}`);
      console.log(`Launcher completed successfully.`);
      return exit(0);
    } else {
      console.error('Error at', message);
      console.info('State', state, 'subprocess.connected', subprocess.connected);
      console.log('Launcher failed. Exiting in 5 seconds...');
      await sleep(5000);
      return exit(1);
    }
}

function exit(code) {
  console.log(`Exit status: ${code ? 'failure' : 'success'}`);
  if ( DEBUG ) {
    console.log(`DEBUG is on. Not exiting.`);
    process.stdin.resume();
  } else {
    console.log('Exiting...');
    sleep(500).then(() => process.exit(code));
  }
}

