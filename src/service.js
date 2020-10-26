// imports
  import fs from 'fs';
  import os from 'os';
  import path from 'path';
  import express from 'express';
  import {launch as ChromeLaunch} from 'chrome-launcher';
  import {createHttpTerminator} from 'http-terminator';

  import CONFIG from './config.js'
  import {NO_SANDBOX, sleep, DEBUG, say} from './../src/lib/common.js';
  import connect from './lib/protocol.js';

// constants
  const PORT_DEBUG = false;
  const MAX_RETRY = 10;
  const SITE_PATH = path.resolve(__dirname, 'public');
  export const newSessionId = () => (Math.random()*1137).toString(36);
  const SessionId = newSessionId();
  const appDir = sessionId => DEBUG ? 
    path.resolve(__dirname, '..', 'sessions', sessionId)
    :
    path.resolve(os.homedir(), '.grader', 'appData', `${(CONFIG.organization || CONFIG.author).name}`, `service_${CONFIG.name}`, 'sessions', sessionId)
  ;
  const expiredSessionFile = () => DEBUG ?
    path.resolve(__dirname, '..', 'old-sessions.json')
    :
    path.resolve(os.homedir(), '.grader', 'appData', `${(CONFIG.organization || CONFIG.author).name}`, `service_${CONFIG.name}`, 'old-sessions.json')

  const app_data_dir = sessionId => path.resolve(appDir(sessionId), `ui-data`);
  const temp_browser_cache = sessionId => path.resolve(appDir(sessionId), `ui-cache`);
  console.log({SITE_PATH});

// global variables 
  let retryCount = 0;

// main executable block
  export async function go() {
    const app = express();

    // debugging info
      /**
      console.log({
        processArgv: process.argv,
        requireMain: require.main,
        module,
        importMetaURL: import.meta.url
      });
      **/

    if (DEBUG || process.argv[1].includes(`service_${CONFIG.name}`)) {     // our startup cue
      notify('Request app start.');
      return await run(app);
    }
  }

// main functions
  async function run(app) {
    // start background service
      console.log(`Start service...`);
      notify('Request service start.');

      let service, ServicePort;
      try {
        ({service, port:ServicePort} = await start({app, desiredPort:CONFIG.desiredPort}));
      } catch(e) {
        console.error(e);
        notify('Could not start background service. Because: ' + JSON.stringify(e));
        process.exit(1);
      }

      notify('Service started.');
      console.log(`App service started.`);

    // cleanup any old sessions
      const undeletedOldSessions = [];
      try {
        const expiredSessions = JSON.parse(fs.readFileSync(expiredSessionFile()).toString());
        expiredSessions.forEach(sessionId => {
          try {
            fs.rmdirSync(appDir(sessionId), {recursive:true, maxRetries:3, retryDelay: 700});
          } catch(e) {
            DEBUG && console.info(`Error deleting old sessions directory ${sessionId}...`, e);
            undeletedOldSessions.push(sessionId);
          }
        });
      } catch(e) {
        DEBUG && console.info(`Error deleting sessions from expred sessions file...`, e);
      }
      fs.writeFileSync(expiredSessionFile(), JSON.stringify(undeletedOldSessions));

    // launch UI
      notify('Request user interface.');
      console.log(`Launching UI...`);
      let UI, browser;
      try {
        ({UI,browser} = await newBrowser({ServicePort, sessionId: SessionId}));
      } catch(e) {
        console.error(e);
        notify('Could not start UI (chrome). Because: ' + JSON.stringify(e)); 
        process.exit(1);
      }

      DEBUG && console.log({browser, ChromeLaunch});
      console.log(`Chrome started.`);
      notify('User interface created.');

    const killService = installCleanupHandlers({ui: UI, bg: service, browser});

    notify && notify(`App started. ${ServicePort}`);
    process.disconnect && process.disconnect();

    return {app, killService, ServicePort, browser, service, UI, notify, newSessionId};
  }

  export async function newBrowser({ServicePort, sessionId, path: path = '/'}) {
    if ( ! sessionId || ! ServicePort) {
      throw new TypeError(`newBrowser must be passed a unique sessionId and ServicePort`);
    }

    // set up disk space
      safe_notify('Request UI directories.');
      if ( !fs.existsSync(temp_browser_cache(sessionId)) ) {
        console.log(`Temp browser cache directory does not exist. Creating...`);
        fs.mkdirSync(temp_browser_cache(sessionId), {recursive:true});
        console.log(`Created.`);
      }
      if ( !fs.existsSync(app_data_dir(sessionId)) ) {
        console.log(`App data dir does not exist. Creating...`);
        fs.mkdirSync(app_data_dir(sessionId), {recursive:true});
        console.log(`Created.`);
      }
      safe_notify('UI data and cache directory created.');

    // start browser
      const CHROME_OPTS = !NO_SANDBOX ? [
        `--disable-breakpad`,
        `--metrics-recording-only`,
        `--new-window`,
        `--no-first-run`,
        `--app=http://localhost:${ServicePort}${path}`,
        '--restore-last-session',
        `--disk-cache-dir=${temp_browser_cache(sessionId)}`,
        `--aggressive-cache-discard`
      ] : [
        `--disable-breakpad`,
        `--metrics-recording-only`,
        `--new-window`,
        `--no-first-run`,
        `--app=http://localhost:${ServicePort}${path}`,
        '--restore-last-session',
        `--disk-cache-dir=${temp_browser_cache(sessionId)}`,
        `--aggressive-cache-discard`,
        '--no-sandbox'
      ];
      const LAUNCH_OPTS = {
        logLevel: 'verbose',
        chromeFlags:CHROME_OPTS, 
        userDataDir:app_data_dir(sessionId), 
        ignoreDefaultFlags: true,
        /*
        startingUrl: `http://localhost:${ServicePort}${path}`,
        */
      }
      DEBUG && console.log({LAUNCH_OPTS});
      let browser;
      try {
        browser = await ChromeLaunch(LAUNCH_OPTS);
      } catch(e) {
        DEBUG && console.error(e);
        safe_notify('Could not start UI (chrome). Because: ' + JSON.stringify(e)); 
      }

    // connect to UI
      safe_notify('Request interface connection.');
      console.log(`Connecting to UI...`);
      console.log(browser);
      const UI = await connect({port: browser.port, exposeSocket: true});
      console.log(`Connected.`);
      safe_notify('User interface online.');

    // get windowId
      let windowId;

      try {
        const {targetInfos} = await UI.send("Target.getTargets", {});
        const appTarget = targetInfos.find(({type, url}) => {
          return type == 'page' && url.startsWith(`http://localhost:${ServicePort}`);
        });
        ({windowId} = await UI.send("Browser.getWindowForTarget", {
          targetId: appTarget.targetId
        }));
      } catch(e) {
        DEBUG && console.info(`Error getting window ID...`, e);
      }

    UI.windowId = windowId;
    browser.sessionId = sessionId;

    return {UI,browser};
  }

  async function start({app, desiredPort}) {
    let upAt, resolve, reject;
    const pr = new Promise((res, rej) => (resolve = res, reject = rej));

    let port = desiredPort;
    addHandlers(app);

    console.log({DEBUG, port});

    const service = app.listen(Number(port), async err => {
      if ( PORT_DEBUG || err ) { 
        console.warn(err);
        return reject(err);
      } 
      upAt = new Date;
      say({serviceUp:{upAt,port}});
      resolve({service, upAt, port});
      console.log(`Ready`);
    });
    service.on('error', async err => {
      await sleep(10);
      if ( retryCount++ < MAX_RETRY ) {
        console.log({retry:{retryCount, badPort: port, DEBUG, err}});
        notify(`${port} taken. Trying new port...`);
        const subsequentTry = start({app, desiredPort: randomPort()});
        subsequentTry.then(resolve).catch(reject);
      } else {
        reject({err, message: `Retries exceeded and: ${err || 'no further information'}`});
      }
      return;
    });

    return pr;
  }

// helper functions
  function randomPort() {
    // choose a port form the dynamic/private range: 49152 - 65535
    return 49152+Math.round(Math.random()*(65535-49152))
  }

  // safe notify handles any IPC channel closed error and ensure it is not thrown 
  function safe_notify(msg) {
    if ( process.send ) {
      return process.send(msg, null, {}, e => {
        if ( e ) {
          say({processSend:msg});
        }
      });
    } else {
      say({processSend:msg});
      return false;
    }
  }

  function notify(msg) {
    if ( process.send ) {
      process.send(msg);
    } else {
      say({processSend:msg});
    }
  }

  function addHandlers(app) {
    app.use(express.urlencoded({extended:true}));
    app.use(express.static(SITE_PATH));
  }

  function installCleanupHandlers({ui, bg, browser}) {
    // someone closed the browser window

    const killService = async () => {
      try {
        browser.kill();
      } catch(e) {
        DEBUG && console.info(`Could not kill browser...`, e);
      }

      if ( bg.listening ) {
        // try to delete  
          try {
            fs.rmdirSync(appDir(SessionId), {recursive:true, maxRetries:3, retryDelay:700});
          } catch(e) {
            DEBUG && console.info(`Error deleting session folder...`, e);
          }

        // if it did not delete yet schedule for later
          if ( fs.existsSync(appDir(SessionId)) ) {
            try {
              let expiredSessions = []
              try {
                expiredSessions = JSON.parse(fs.readFileSync(expiredSessionFile()).toString());
              } catch(e) {
                DEBUG && console.info(`Unable to read expired sessions file...`, e);
              }
              expiredSessions.push(SessionId);
              fs.writeFileSync(expiredSessionFile(), JSON.stringify(expiredSessions));
            } catch(e) {
              DEBUG && console.info(`Error scheduling session data for deletion...`, e);
            }
          }

        await stop(bg);
      } else {
        say({killService: 'already closed'});
      }
      process.exit(0);
    };

    ui.socket.on('close', killService);

    // process cleanliness 
      const ignore = () => true;
      process.on('beforeExit', killService);
      // do we need to ignore these?
      process.on('SIGBREAK', killService);
      process.on('SIGHUP', killService);
      process.on('SIGINT', killService);
      process.on('SIGTERM', killService);
      process.on('SIGQUIT', killService);
      process.on('SIGKILL', killService);
      process.on('error', async (...args) => {
        console.log("Process error ", args);
        await killService();
      });

    return killService;
  }

  async function stop(bg) {
    const serviceTerminator = createHttpTerminator({
      server:bg,
      gracefulTerminationTimeout: 1000
    });

    say({service:`Closing service...`});

    await serviceTerminator.terminate();

    say({service:'Closed'});
  }

