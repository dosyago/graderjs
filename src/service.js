// imports
  import fs from 'fs';
  import path from 'path';
  import express from 'express';
  import {launch as ChromeLaunch} from 'chrome-launcher';
  import {createHttpTerminator} from 'http-terminator';

  import API from './index.js';
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
    console.log("Settings", settings);
    // start background service
      console.log(`Start service...`);
      notify('Request service start.');
      console.log({settings});

      let service, ServicePort;
      try {
        ({service, port:ServicePort} = await start({app, desiredPort:CONFIG.desiredPort}));
        API.ServicePort = ServicePort;
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

    // do layout prep if requrested
      let layout;
      if ( settings.doLayout ) {
        const {screenWidth, screenHeight} = await API.ui.getScreen({
          ServicePort, 
          sessionId: newSessionId()
        });

        layout = {screenWidth, screenHeight};

        if ( typeof settings.doLayout === "function" ) {
          layout = settings.doLayout(layout);
        }
      }

    // launch UI
      notify('Request user interface.');
      console.log(`Launching UI...`);
      let UI, browser;
      try {
        ({UI,browser} = await newBrowser({ServicePort, sessionId: SessionId, layout}));
      } catch(e) {
        console.error(e);
        notify('Could not start UI (chrome). Because: ' + JSON.stringify(e)); 
        process.exit(1);
      }

      //DEBUG && console.log({browser, ChromeLaunch});
      console.log(`Chrome started.`);
      notify('User interface created.');

    // setup future cleanup
      const killService = installCleanupHandlers({ui: UI, bg: service});

    // don't keep the socket exposed
      UI.socket = null;

    notify && notify(`App started. ${ServicePort}`);
    process.disconnect && process.disconnect();

    return {app, killService, ServicePort, browser, service, UI, notify, newSessionId};
  }

  export async function newBrowser({
    sessionId: browserSessionId, 
    blank: blank = false,
    ServicePort: ServicePort = undefined,
    uriPath: uriPath = '/',
    headless: headless = false,
    layout: layout = undefined
  } = { sessionId: undefined }) {
    if ( !(browserSessionId && ((ServicePort||'').toString() || blank)) ) {
      throw new TypeError(`newBrowser must be passed a unique browserSessionId and either the 'blank' flag or a ServicePort`);
    }
   
    // set up some state to track progress
      let bindingRetryCount = 0;

    // set up a promise to track progress
      let reject, resolve, pr = new Promise((res, rej) => (resolve = res, reject = rej));

    // set up disk space
      safe_notify('Request UI directories.');
      if ( !fs.existsSync(temp_browser_cache(browserSessionId)) ) {
        console.log(`Temp browser cache directory does not exist. Creating...`);
        fs.mkdirSync(temp_browser_cache(browserSessionId), {recursive:true});
        console.log(`Created.`);
      }
      if ( !fs.existsSync(app_data_dir(browserSessionId)) ) {
        console.log(`App data dir does not exist. Creating...`);
        fs.mkdirSync(app_data_dir(browserSessionId), {recursive:true});
        console.log(`Created.`);
      }
      safe_notify('UI data and cache directory created.');

    // construct start URL
      let startUrl;

      if ( blank ) {
        startUrl = 'data:text/html,<!DOCTYPE html><script>document.title = "Made with Grader"</script>';
      } else {
        startUrl = `http://localhost:${ServicePort}${uriPath}`;
      }

    // start browser
      const CHROME_OPTS = !NO_SANDBOX ? [
        `--no-default-browser-check`,
        `--disable-extensions`,
        `--disable-breakpad`,
        `--metrics-recording-only`,
        `--new-window`,
        `--no-first-run`,
        /*'--restore-last-session',*/
        `--disk-cache-dir=${temp_browser_cache(browserSessionId)}`,
        `--aggressive-cache-discard`
      ] : [
        `--no-default-browser-check`,
        `--disable-extensions`,
        `--disable-breakpad`,
        `--metrics-recording-only`,
        `--new-window`,
        `--no-first-run`,
        /*'--restore-last-session',*/
        `--disk-cache-dir=${temp_browser_cache(browserSessionId)}`,
        `--aggressive-cache-discard`,
        '--no-sandbox'
      ];

      if ( headless ) {
        CHROME_OPTS.push('--silent-launch');
      } else {
        CHROME_OPTS.push(`--app=${startUrl}`);
      }

      if ( layout ) {
        let {screenWidth, screenHeight, x, y, width, height} = layout;
        
        if ( !screenWidth || !screenHeight ) return;

        // auto golden ratio
          if ( width === undefined || height === undefined ) {
            width = Math.ceil(0.618 * screenWidth);  
            height = Math.ceil(0.618 * screenHeight);
          }

        // auto center
          if ( x === undefined || y === undefined ) {
            x = Math.round((screenWidth-width)/2);
            y = Math.round((screenHeight-height)/2);
          }

        CHROME_OPTS.push(
          `--window-position=${x},${y}`,
          `--window-size=${width},${height}`,
        )
      }

      const LAUNCH_OPTS = {
        logLevel: 'verbose',
        chromeFlags:CHROME_OPTS, 
        userDataDir:app_data_dir(browserSessionId), 
        ignoreDefaultFlags: true,
      }

      if ( headless ) {
        LAUNCH_OPTS.startingUrl = startUrl;
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
        DEBUG && console.info({targetInfos, startUrl});
        if ( headless ) {
          appTarget = targetInfos.find(({type}) => {
            return type == 'background_page' 
          });
        } else {
          appTarget = targetInfos.find(({type, url}) => {
            return type == 'page' && url.startsWith(startUrl);
          });
        }
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
        },
        shutdown: {
          value: shutdownFunc 
        }
      });

      Object.defineProperty(browser, 'sessionId', {
        value: browserSessionId
      });

    // shutdown everything if we detect the UI connection closes
      UI.socket.on('close', () => UI.shutdown());

    // or if the process exits
      process.on('beforeExit', () => API.ui.close(UI));
      process.on('exit', () => API.ui.close(UI));
      process.on('SIGINT', () => API.ui.close(UI));

    // install binding and script and reload
      if ( headless ) {
        const {send} = UI;

        try {
          // attach to target
            DEBUG && console.log({installingAPIProxy:true});

            const {sessionId} = await send("Target.attachToTarget", {
              targetId: appTarget.targetId,
              flatten: true
            });

            UI.sessionId = sessionId;

            await send("Runtime.enable", {}, sessionId);

            DEBUG && console.log({attached:{sessionId}});

          // get screen details
            const result = await send("Runtime.evaluate", {
              expression: `({screenWidth: screen.width, screenHeight: screen.height})`,
              returnByValue: true
            }, sessionId);

            console.log({result});

            const {screenWidth, screenHeight} = result;

            API.util.kv('screen', {screenWidth, screenHeight});
        } catch(e) {
          DEBUG && console.info(`Error install API proxy...`, e);
        }
      } else {
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

        const {on, send} = UI;

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
              let id;
              try {
                id = JSON.parse(payload).id;
              } catch(e) {
                console.info(`Couldn't parse payload`, payload, e);
                return;
              }

              DEBUG && console.info({name, id, payload, executionContextId});

              const result = {};
              try {
                result.value = await bridge({name, payload, executionContextId});
              } catch(e) {
                const stack = e.stack && '\n' + e.stack.split(/\n/g);
                result.error = `${e.name}: ${e.message}${stack || ''}`;
              }
              const sendResult = await send("Runtime.evaluate", {
                expression: `globalThis._graderUI(${JSON.stringify({result, id})})`,
                contextId: executionContextId
              }, sessionId);

              if ( sendResult.exceptionDetails ) {
                console.info(`Error talking to _graderUI`, JSON.stringify(sendResult));
              } else {
                console.log(`Successfully sent API result to page`, {result}, {sendResult});
              }
            });

            await on("Runtime.consoleAPICalled", async ({args}) => {
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
                        reject(new Error(`Retries exceeded to add the binding to the page`)); 
                      }
                    } else {
                      resolve({browser, UI});
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
      }

    return pr;

    // helper (in scope) functions
      async function shutdownFunc() {
        if ( UI.alreadyShutdown ) return;

        UI.alreadyShutdown = true;
        // try to kill browser
          try {
            await browser.kill();
          } catch(e) {
            DEBUG && console.log(`Browser already dead...`, e);
          }

        // try to delete  
          try {
            fs.rmdirSync(sessionDir(browserSessionId), {recursive:true, maxRetries:3, retryDelay:700});
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
            expiredSessions.push(browserSessionId);
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
  /**
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
  **/

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

// ideas - old code
  // filling a 'blank' page with content without using a server 
    /**
      // this doesn't work as expected

      // first start browser and open to blank page
      // after the page is ready,
      // use our UI connection to write the correct window box as the page

        // get top frame
          const {frameTree: {frame: {id: frameId}}} = await UI.send(
            "Page.getFrameTree", {}, UI.sessionId
          );

        // write document
          const html = fs.readFileSync(windowBoxPath).toString();
          console.log({html, frameId});
          const result = await UI.send("Page.setDocumentContent", {
            frameId,
            html
          }, UI.sessionId);
          console.log({result});
    **/
