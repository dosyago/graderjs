// imports
  import fs from 'fs';
  import path from 'path';
  import express from 'express';
  import {launch as ChromeLaunch} from 'chrome-launcher';
  import {createHttpTerminator} from 'http-terminator';

  import CONFIG from './config.js'
  import {
    NO_SANDBOX, sleep, DEBUG, say,
    expiredSessionFile,
    appDir,
    sessionDir,
    app_data_dir,
    temp_browser_cache, 
  } from './../src/lib/common.js';
  import connect from './lib/protocol.js';
  import bridge from './lib/api_bridge.js';

// constants
  const PORT_DEBUG = false;
  const MAX_RETRY = 10;
  const MAX_BINDING_RETRY = 10;
  export const SITE_PATH = path.resolve(__dirname, 'public');
  DEBUG && console.log({SITE_PATH});
  export const newSessionId = () => (Math.random()*1137).toString(36);
  const SessionId = newSessionId();
  const BINDING_NAME = "_graderService";
  const JS_CONTEXT_NAME = "GraderWorld";
  const API_PROXY_SCRIPT = fs.readFileSync(
    path.resolve(appDir(), 'app', 'ui_inject', 'proxy.js')
  ).toString();
  const SERVICE_BINDING_SCRIPT = fs.readFileSync(
    path.resolve(appDir(), 'app', 'ui_inject', 'binding.js')
  ).toString();

// global variables 
  let bindingRetryCount = 0;
  let retryCount = 0;

// main executable block
  export async function go(settings) {
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
      return await run(app, settings);
    }
  }

// main functions
  async function run(app, settings) {
    // get platform specific window box (if any)
      const platform = getPlatform();
      const windowBox = settings.windowControls[platform];

      let windowBoxPath = null;

      // true specifies the default
      if ( windowBox === true ) {
        windowBoxPath = path.resolve(SITE_PATH, '_winctrlbox', `${platform}_winctrl.html');  
      } 

      // a string sets a (possibly relative) path
      else if ( typeof windowBox == "string" ) {
        windowBoxPath = path.resolve(windowBox);
      }

      // false means no window control box
      else if ( windowBox === false ) {
        windowBoxPath = null;
      }

      // otherwise we have an error
      else {
        throw new TypeError(
          `Settings windowControl[platform], if set, can only be a string or a boolean`
        );
      }

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
            fs.rmdirSync(sessionDir(sessionId), {recursive:true, maxRetries:3, retryDelay: 700});
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
        if ( windowBoxPath ) {
          // open a blank window 
          ({UI,browser} = await newBrowser({blank: true, sessionId: SessionId}));

          // and use our UI connection to write the correct window box as the page

          // get top frame
            const {frameTree: {frame: {id: frameId}}} = await send(
              "Page.getFrameTree", {}, sessionId
            );

          // write document
            const html = fs.readFileSync(windowBoxPath).toString();
            await UI.send("Page.setDocumentContent", {
              frameId,
              html
            }, sessionId);
        } else {
          ({UI,browser} = await newBrowser({ServicePort, sessionId: SessionId}));
        }
      } catch(e) {
        console.error(e);
        notify('Could not start UI (chrome). Because: ' + JSON.stringify(e)); 
        process.exit(1);
      }

      //DEBUG && console.log({browser, ChromeLaunch});
      console.log(`Chrome started.`);
      notify('User interface created.');

    const killService = installCleanupHandlers({ui: UI, bg: service});

    notify && notify(`App started. ${ServicePort}`);
    process.disconnect && process.disconnect();

    return {app, killService, ServicePort, browser, service, UI, notify, newSessionId};
  }

  export async function newBrowser({ServicePort, blank, sessionId, uriPath: uriPath = '/'}) {
    if ( !(sessionId && (ServicePort.toString() || blank)) ) {
      throw new TypeError(`newBrowser must be passed a unique sessionId and either the 'blank' flag or a ServicePort`);
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

    // construct start URL
      let startUrl;

      if ( blank ) {
        startUrl = 'about:blank';
      } else {
        startUrl = `http://localhost:${ServicePort}${uriPath}`;
      }

    // start browser
      const CHROME_OPTS = !NO_SANDBOX ? [
        `--disable-extensions`,
        `--disable-breakpad`,
        `--metrics-recording-only`,
        `--new-window`,
        `--no-first-run`,
        `--app=${startUrl}`,
        '--restore-last-session',
        `--disk-cache-dir=${temp_browser_cache(sessionId)}`,
        `--aggressive-cache-discard`
      ] : [
        `--disable-extensions`,
        `--disable-breakpad`,
        `--metrics-recording-only`,
        `--new-window`,
        `--no-first-run`,
        `--app=${startUrl}`,
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
        startingUrl: `http://localhost:${ServicePort}${uriPath}`,
        */
      }
      DEBUG && console.log({LAUNCH_OPTS});
      let browser;
      try {
        browser = await ChromeLaunch(LAUNCH_OPTS);
      } catch(e) {
        DEBUG && console.error(e);
        fs.writeFileSync('browser.error', JSON.stringify({err:e, msg:e+'', stack:e.stack}));
        safe_notify('Could not start UI (chrome). Because: ' + JSON.stringify(e)); 
      }

    // connect to UI
      let appTarget;
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
        appTarget = targetInfos.find(({type, url}) => {
          return type == 'page' && url.startsWith(`http://localhost:${ServicePort}`);
        });
        ({windowId} = await UI.send("Browser.getWindowForTarget", {
          targetId: appTarget.targetId
        }));
      } catch(e) {
        DEBUG && console.info(`Error getting window ID...`, e);
      }

    // expose some useful properties 
      Object.defineProperties(UI, {
        windowId: {
          value: windowId
        },
        startUrl: {
          value: startUrl
        }
        shutdown: {
          value: shutdownFunc 
        }
      });

      Object.defineProperty(browser, 'sessionId', {
        value: sessionId
      });

    // shutdown everything if we detect the UI connection closes
      UI.socket.on('close', () => UI.shutdown());

    // don't keep the socket exposed
      UI.socket = null;

    // install binding and script and reload
      /**
        note that doing it like this
        where we add the binding only to the one isolate JS context
        where our grader API global is
        means that no JS scripts on any page 
        can access either the binding or the global
        the only way we can access those scripts is 
        to add a config.js property that whitelists those scripts
        and import them here using add script (in the same call we already use)
        or eval them in the isolated world directly
        this means that to actually talk to the window APIs
        from a regular script loaded staticly by the browser
        we need to use postMessage I think
        this is more work for the dev but ultimately i think
        a better solution since it's more secure than just with one flag
        (apiInUI) exposing the service APIs to any script that gets loaded
        by the UI
      **/

      const {ons, on, send} = UI;

      try {
        // attach to target
          DEBUG && console.log({installingAPIProxy:true});

          const {sessionId} = await send("Target.attachToTarget", {
            targetId: appTarget.targetId,
            flatten: true
          });

          UI.sessionId = sessionId;

          await send("Runtime.enable", {}, sessionId);
          await send("Page.enable", {}, sessionId);

          DEBUG && console.log({attached:{sessionId}});

        // add the proxy script to all frames in this target
          const script = await send("Page.addScriptToEvaluateOnNewDocument", {
            source: API_PROXY_SCRIPT,
          }, sessionId);

          DEBUG && console.log({script});

        // listen for binding request
          await on("Runtime.bindingCalled", async ({name, payload, executionContextId}) => {
            DEBUG && console.log("Service side received call from UI binding");
            DEBUG && console.info({name, payload, executionContextId});
            await bridge({name, payload, executionContextId});
          });

          await on("Runtime.consoleAPICalled", async ({args, executionContextId}) => {
            try {
              if ( args.length == 0 ) return;

              const [{value:string}] = args;

              let installBinding = false;

              if ( typeof string == "string" ) {
                try {
                  const obj = JSON.parse(string)
                  if ( obj.graderRequestInstallBinding ) {
                    installBinding = true;
                  }
                } catch(e) {
                  // not our message 
                }
              }

              if ( installBinding ) {
                console.log({installBindingCalled:true});

                // get top frame
                  const {frameTree: {frame: {id: frameId}}} = await send(
                    "Page.getFrameTree", {}, sessionId
                  );

                // create an isolate
                  const {executionContextId} = await send("Page.createIsolatedWorld", {
                    frameId,
                    worldName: JS_CONTEXT_NAME,
                  }, sessionId);

                // add a binding to it
                  if ( bindingRetryCount == 0 ) {
                    DEBUG && console.log(`Add service binding to ec ${executionContextId}`);
                    await send("Runtime.addBinding", {
                      name: BINDING_NAME,
                      executionContextId
                    }, sessionId);
                  }

                // add the service binding script 
                  // (to receive messages from API proxy and dispatch them to the binding)
                  DEBUG && console.log(`Add service binding script to ec ${executionContextId}`);
                  const {result, exceptionDetails} = await send("Runtime.evaluate", {
                    expression: SERVICE_BINDING_SCRIPT,
                    returnByValue: true,
                    executionContextId
                  }, sessionId);

                  DEBUG && console.log({result, exceptionDetails});

                // reload if needed
                  if ( exceptionDetails ) {
                    if ( bindingRetryCount++ < MAX_BINDING_RETRY ) {
                      // reload the page 
                        // (binding does not seem to be available to 
                        // isolated script unless page is reloaded)
                      await send("Page.reload", {}, sessionId);
                    } else {
                      throw new Error(`Retries exceeded to add the binding to the page`); 
                    }
                  }
              }
            } catch(e) {
              DEBUG && console.info(`Error installing binding...`, e);
            }
          });

        // reload to create a new document to 
          // ensure we add the script and request binding installation
          await send("Page.reload", {}, sessionId);
      } catch(e) {
        DEBUG && console.info(`Error install API proxy...`, e);
      }

    return {UI,browser};

    // helper (in scope) functions
      async function shutdownFunc() {
        if ( UI.alreadyShutdown ) return;

        UI.alreadyShutdown = true;
        // try to kill browser
          try {
            await browser.kill();
          } catch(e) {
            console.log(`Browser already dead...`, e);
          }

        // try to delete  
          try {
            fs.rmdirSync(sessionDir(sessionId), {recursive:true, maxRetries:3, retryDelay:700});
          } catch(e) {
            DEBUG && console.info(`Error deleting session folder...`, e);
          }

        // if it did not delete yet schedule for later
          try {
            let expiredSessions = []
            try {
              expiredSessions = JSON.parse(fs.readFileSync(expiredSessionFile()).toString());
            } catch(e) {
              DEBUG && console.info(`Unable to read expired sessions file...`, e);
            }
            expiredSessions.push(sessionId);
            const tmp = '.new'+Math.random();
            fs.writeFileSync(path.resolve(expiredSessionFile() + tmp), JSON.stringify(expiredSessions));
            fs.renameSync(path.resolve(expiredSessionFile() + tmp), expiredSessionFile());
          } catch(e) {
            DEBUG && console.info(`Error scheduling session data for deletion...`, e);
          }
      }
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
  function getPlatform() {
    const {platform: raw} = process;

    switch(raw) {
      case "aix":
      case "freebsd":
      case "linux":
      case "openbsd":
      case "sunos":
        return "nix";
      case "win32":
        return "win";
      case "darwin":
        return "osx";
      default: 
        // don't go crazy throwing errors here
        return "win";
    }
  }

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

  function installCleanupHandlers({ui, bg}) {
    // someone closed the browser window

    const killService = async () => {
      try {
        await ui.shutdown();
      } catch(e) {
        DEBUG && console.info(`Error shutting down the browser...`, e);
      }

      if ( bg.listening ) {
        await stop(bg);
      } else {
        say({killService: 'already closed'});
      }
      process.exit(0);
    };

    ui.socket.on('close', killService);

    // process cleanliness 
      process.on('beforeExit', killService);
      // do we need to ignore these?
      process.on('SIGBREAK', killService);
      process.on('SIGHUP', killService);
      process.on('SIGINT', killService);
      process.on('SIGTERM', killService);
      process.on('SIGQUIT', killService);
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

