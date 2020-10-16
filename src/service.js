// imports
  // node builtin
    import fs from 'fs';
    import path from 'path';
    import express from 'express';

  // 3rd party
    import {createHttpTerminator} from 'http-terminator';

  // 3rd party customized and added to repo
    import {launch as ChromeLaunch} from './lib/vendor/chrome-launcher.js';

  // own 
    import {install} from 'browser-installer';

  // internal
    import API from './index.js';
    import CONFIG from './config.js'
    import {
      newSessionId,
      DEBUG2,
      sleep, DEBUG, say,
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
      safe_notify('Request app start.');
      return await run(app, settings);
    }
  }

// main functions
  async function run(app, settings) {
    DEBUG && console.log("Settings", settings);
    const {keepConsoleOpen, server, addHandlers, noWindow} = settings;
    const uis = new Map();

    // start background service
      console.log(`Start service...`);
      safe_notify('Request service start.');
      console.log({settings});

      let service, ServicePort;
      try {
        ({service, port:ServicePort} = await start({
          app, addHandlers, desiredPort:CONFIG.desiredPort, server
        }));
        API.ServicePort = ServicePort;
      } catch(e) {
        console.error(e);
        safe_notify('Could not start background service. Because: ' + JSON.stringify(e));
        process.exit(1);
      }

      safe_notify('Service started.');
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

    // check for keep console open and notify if requested
      if ( keepConsoleOpen ) {
        safe_notify({keepConsoleOpen});
      }

    // do layout prep if requrested
      let layout;
      if ( settings.doLayout ) {
        const {screenWidth, screenHeight} = await API.ui.getScreen({
          ServicePort, 
          sessionId: SessionId,
          uis
        });

        layout = {screenWidth, screenHeight};

        if ( typeof settings.doLayout === "function" ) {
          layout = settings.doLayout(layout);
        }
      }

    // setup return value 
      const retVal = {
        settings,
        uis,
        expressApp: app, ServicePort, service, notify, newSessionId,
        UI: undefined,
      };

    // launch UI unless not needed yet
      let UI;

      if ( ! noWindow ) {
        safe_notify('Request user interface.');
        console.log(`Launching UI...`);
        try {
          if ( settings.uiName === undefined ) {
            throw new TypeError(`If you open a new UI window (i.e, don't specify noWindow) and it is not a 'headless' UI, you need to supply a uiName parameter to settings`);
          }
          ({UI} = await newBrowser({
            uis,
            ServicePort, sessionId: SessionId, layout, 
            name: settings.uiName
          }));
        } catch(e) {
          let fatal = null;
          console.log(e, e.code, e.code == "ERR_LAUNCHER_NOT_INSTALLED");
          if ( e && e.code == "ERR_LAUNCHER_NOT_INSTALLED" ) {
            try { 
              await install();
              ({UI} = await newBrowser({
                uis,
                ServicePort, sessionId: SessionId, layout,
                name: settings.uiName
              }));
            } catch(e2) {
              fatal = e2;
            }
          } else {
            fatal = e;
          }
          if ( fatal ) {
            DEBUG && console.error('fatal', fatal);
            fs.writeFileSync('browser.error', JSON.stringify({err:fatal, msg:fatal+'', stack:fatal.stack}));
            safe_notify('Could not start UI (chrome). Because: ' + JSON.stringify(fatal)); 
            process.exit(1);
          }
        }
        // it's the first so set it as default
        retVal.UI = UI;
      } else {
        retVal.UI = undefined;
      }

      //DEBUG && console.log({browser, ChromeLaunch});
      console.log(`Chrome started.`);
      safe_notify('User interface created.');

    // setup future cleanup
      const killService = installCleanupHandlers({bg: service, App: retVal});
      retVal.killService = killService;

    // don't keep the socket exposed
      if ( ! noWindow ) {
        UI.socket = null;
      }

    safe_notify && safe_notify(`App started. ${ServicePort}`);
    process.disconnect && process.disconnect();

    return retVal;
  }

  export async function newBrowser({
    uis,
    sessionId: browserSessionId, 
    blank: blank = false,
    ServicePort: ServicePort = undefined,
    uriPath: uriPath = '/',
    headless: headless = false,
    layout: layout = undefined,
    noDelete: noDelete = false,
    silent: silent = false,
    name,
    keepService: keepService = false      // by default we kill the service when last UI closes
  } = { name: undefined, sessionId: undefined, uis: undefined }) {
    if ( !uis ) {
      throw new TypeError(`newBrowser must receive a map of all UIs existing by name`);
    }
    if ( !name && !headless) {
      throw new TypeError(`newBrowser must receive a name property to specify the UI name, unless 'headless' is requesed`);
    }
    if ( name !== undefined && headless ) {
      throw new TypeError(`newBrowser cannot specify a name for a headless UI. The headless UI name will be automatically generated.`);
    }
    if ( !(browserSessionId && ((ServicePort||'').toString() || blank)) ) {
      throw new TypeError(`newBrowser must be passed a unique browserSessionId and either the 'blank' flag or a ServicePort`);
    }
    if ( uis.has(name) ) {
      throw new TypeError(`newBrowser cannot create a UI named ${name} because one already exists in  the uis map.`);
    }
   
    // DEBUG
      const id = (Math.random()*99999+Date.now()).toString(36);
      DEBUG && console.log({browserStart:{id, browserSessionId, ServicePort}});

    // set up some state to track progress
      let bindingRetryCount = 0;

    // set up a promise to track progress
      let reject, resolve;
      const pr = new Promise((res, rej) => (resolve = res, reject = rej));

    // set up disk space
      !silent && safe_notify('Request UI directories.');
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
      !silent && safe_notify('UI data and cache directory created.');

    // construct start URL
      let startUrl;

      if ( blank ) {
        startUrl = 'data:text/html,<!DOCTYPE html><script>document.title = "Made with Grader"</script>';
      } else {
        startUrl = `http://localhost:${ServicePort}${uriPath}`;
      }

    // start browser
      const CHROME_OPTS = [
        `--no-default-browser-check`,
        `--disable-extensions`,
        `--disable-breakpad`,
        `--metrics-recording-only`,
        `--new-window`,
        `--no-first-run`,
        /*'--restore-last-session',*/
        `--disk-cache-dir=${temp_browser_cache(browserSessionId)}`,
        `--aggressive-cache-discard`
      ];

      if ( headless ) {
        // not really headless because we need to use the real display to collect info
        // but this means it doesn't open a window
        CHROME_OPTS.push('--silent-launch');
        // also, specify the UI name
        name = (Math.random()*3136668085).toString(36);
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
        logLevel: DEBUG ? 'verbose' : 'silent',
        chromeFlags:CHROME_OPTS, 
        userDataDir:app_data_dir(browserSessionId), 
        ignoreDefaultFlags: true,
        handleSIGINT: false
      }

      DEBUG && console.log({LAUNCH_OPTS});

      let browser;
      try {
        browser = await ChromeLaunch(LAUNCH_OPTS);
      } catch(e) {
        let fatal = null;
        console.log('track', e, e.code, e.code == "ERR_LAUNCHER_NOT_INSTALLED");
        if ( e && e.code == "ERR_LAUNCHER_NOT_INSTALLED" ) {
          try { 
            await install();
            browser = await ChromeLaunch(LAUNCH_OPTS);
          } catch(e2) {
            fatal = e2;
          }
        } else {
          fatal = e;
        }
        if ( fatal ) {
          DEBUG && console.error('fatal', fatal);
          fs.writeFileSync('browser.error', JSON.stringify({err:fatal, msg:fatal+'', stack:fatal.stack}));
          safe_notify('Could not start UI (chrome). Because: ' + JSON.stringify(fatal)); 
          throw fatal;
        }
      }

    // connect to UI
      let appTarget;
      !silent && safe_notify('Request interface connection.');
      console.log(`Connecting to UI...`);
      console.log(browser);
      const UI = await connect({port: browser.port, exposeSocket: true});
      console.log(`Connected.`);
      !silent && safe_notify('User interface online.');

    // expose some props
      Object.defineProperties(UI, {
        name: {
          value: name
        },
        id: {
          value: id
        },
        browser: {
          value: browser
        }
      });

    // save the UI and browser in the uis named map
      uis.set(UI.name, {UI,browser});

    // prepare cleanup
      Object.defineProperty(UI, 'cleanSessionDirs', {
        value: cleanSessionDirs
      });

      // or if the process exits
        process.on('beforeExit', async () => await API.ui.close(UI));

      // standard close stuff
        UI.socket.on('close', () => UI.disconnected = true);
        UI.socket.on('close', async () => {
          DEBUG && console.log({appUIs:uis, name: UI.name});
          let App;
          try {
            App = API._serviceOnly.getApp();
          } catch(e) {
            DEBUG && console.log(`No app yet`, UI);
          }

          try {
            uis.delete(UI.name);
            if ( App && UI === App.UI ) {
              // default UI so remove it from App
              App.UI = undefined;
            }
            DEBUG && console.log({appUIs:uis});
            if ( App && uis.size == 0 && ! (App.settings.keepAlive || keepService ) ) {
              await App.killService();
            } else {
              await API.ui.close(UI);
            }
          } catch(e) {
            console.log(`Error handling socket close`, e, UI);
          }
        });

    // get a target and (if not 'headless') a windowId
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
          ({windowId} = await UI.send("Browser.getWindowForTarget", {
            targetId: appTarget.targetId
          }));
        }
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
        browserSessionId: {
          value: browserSessionId
        },
        browser: {
          value: browser
        }
      });

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
            const {result:{value:result}} = await send("Runtime.evaluate", {
              expression: `({screenWidth: screen.width, screenHeight: screen.height})`,
              returnByValue: true
            }, sessionId);

            console.log({result});

            const {screenWidth, screenHeight} = result;

            API.util.kv('screen', {screenWidth, screenHeight});

          resolve({browser,UI});
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
            await on("Runtime.bindingCalled", async ({
                name:bindingName, payload, executionContextId
              }) => {
                DEBUG && console.log("Service side received call from UI binding");
                let id;
                try {
                  id = JSON.parse(payload).id;
                } catch(e) {
                  console.info(`Couldn't parse payload`, payload, e);
                  return;
                }

                DEBUG && console.info({bindingName, id, payload, executionContextId});

                const result = {};
                try {
                  result.value = await bridge({
                    uiName: name, name: bindingName, payload, executionContextId
                  });
                } catch(e) {
                  const stack = e.stack && '\n' + e.stack.split(/\n/g);
                  result.error = `${e.name}: ${e.message}${stack || ''}`;
                }
                const sendResult = await send("Runtime.evaluate", {
                  expression: `globalThis._graderUI(${JSON.stringify({result, id})})`,
                  contextId: executionContextId
                }, sessionId);

                if ( sendResult.exceptionDetails ) {
                  DEBUG && console.info(`Error talking to _graderUI`, JSON.stringify(sendResult));
                } else {
                  DEBUG && console.log(`Successfully sent API result to page`, {result}, {sendResult});
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
                  DEBUG && console.log({installBindingCalled:true});

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
      function cleanSessionDirs() {
        DEBUG && console.info({cleanSessionDirs:browserSessionId}); 
        if ( ! noDelete ) {
          DEBUG && console.info({deleteStart:{browserSessionId}});
          // try to delete  
            try {
              fs.rmdirSync(sessionDir(browserSessionId), {recursive:true, maxRetries:3, retryDelay:700});
            } catch(e) {
              DEBUG && console.info(`Error deleting session folder...`, e);
            }

          // if it did not delete yet schedule for later
            if ( fs.existsSync(sessionDir(browserSessionId)) ) {
              DEBUG && console.info({deleteStart:{browserSessionId}});
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
                DEBUG && console.info({expiredSessionsToDeleteLater:expiredSessions});
              } catch(e) {
                DEBUG && console.info(`Error scheduling session data for deletion...`, e);
              }
            }
        } else {
          DEBUG && console.info({noDelete: SessionId});
        }
      }
  }

  async function start({
    app, 
    desiredPort, 
    addHandlers: addHandlers = null, 
    noStandard: noStandard = false, 
    server: server = null
  }) {
    let service;

    let upAt, resolve, reject;
    const pr = new Promise((res, rej) => (resolve = res, reject = rej));

    let port = desiredPort;

    if ( server ) {
      service = server;
      service.listen(Number(port), async err => {
        if ( PORT_DEBUG || err ) { 
          console.warn(err);
          return reject(err);
        } 
        upAt = new Date;
        say({serviceUp:{upAt,port}});
        resolve({service, upAt, port});
        console.log(`Ready`);
      });
    } else {
      if ( ! noStandard ) {
        addStandardHandlers(app);
      }

      DEBUG && console.log({startService: port});

      if ( addHandlers ) {
        try {
          addHandlers(app);
        } catch(e) {
          console.info(`Error adding handlers to app`, app, addHandlers, e); 
          reject(new TypeError(`Supplied addHandlers function threw error: ${e}`));
        }
      }

      service = app.listen(Number(port), async err => {
        if ( PORT_DEBUG || err ) { 
          console.warn(err);
          return reject(err);
        } 
        upAt = new Date;
        say({serviceUp:{upAt,port}});
        resolve({service, upAt, port});
        console.log(`Ready`);
      });
    }

    service.on('error', async err => {
      await sleep(10);
      if ( retryCount++ < MAX_RETRY ) {
        console.log({retry:{retryCount, badPort: port, DEBUG, err}});
        safe_notify(`${port} taken. Trying new port...`);
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
  function notify(msg) {
    let resolve, reject;
    const pr = new Promise((res, rej) => (resolve = res, reject = rej));
    if ( process.send ) {
      process.send(msg, null, {}, e => {
        if ( e ) {
          reject(e);
        }
        resolve(true);
      });
    } else {
      say({processSend:msg});
      resolve(false);
    }
    return pr;
  }

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

  function addStandardHandlers(app) {
    app.use(express.urlencoded({extended:true}));
    app.use(express.static(SITE_PATH));
  }

  function installCleanupHandlers({bg, App}) {
    // someone closed the browser window

    let count = 0;

    const killService = async (...args) => {
      count++;
      DEBUG2 && console.info({killService:1, count, args});
      try {
        DEBUG2 && console.info({killService:2, count});
        for( const {UI} of App.uis.values() ) {
          try {
            await API.ui.close(UI);
          } catch(e2) {
            DEBUG2 && console.info(`Error shutting down the UI ${UI.name}...`, e2);
          }
        }
        DEBUG2 && console.info({killService:3, count});
      } catch(e) {
        DEBUG2 && console.info(`Error shutting down the browser...`, e);
      }

      try {
        DEBUG2 && console.info({killService:4, count});
        if ( bg.listening ) {
        DEBUG2 && console.info({killService:5, count});
          await stop(bg);
        DEBUG2 && console.info({killService:6, count});
        } else {
        DEBUG2 && console.info({killService:7, count});
          say({killService: 'already closed'});
        DEBUG2 && console.info({killService:8, count});
        }
      } catch(e) {
        DEBUG2 && console.info(`Error shutting down the service...`, e);
      }

      DEBUG2 && console.info({killService:9, count});
      process.exit(0);
    };

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
