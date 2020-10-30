// imports
  import path from 'path';
  import fs from 'fs';
  import * as Service from './service.js';
  import * as Common from './lib/common.js';
  import CONFIG from './config.js';

// constants
  // simple key value store
  const KV = {};
  const HasListeners = new Map();

// main export
  const API = {
    go,                   // start app launch sequence
    stop,                 // kill app, cleanup, and exit (after async jobs parameter completes)
    say,                  // say something to console (throws if console closed)

    ui : {
      open,               // open UI window
      close,              // close UI window
      move,               // move UI window (throws if no window open)
      size,               // size UI window (throws if no window open)
      minimize,           // minimize UI window (throws if no window open)
      maximize,           // maximize UI window (throws if no window open)
      restore,            // switch between maximize and how it was before
      fullscreen,         // UI window to fullscreen
      partscreen,         // UI window to part of screen

      openBlank,          // open a UI window to about:blank
      writePage,          // like document.write if using a custom window control box, writes to the
                          // iframe document inside that

      getScreen,          // get screen dimensions
    },

    meta: {
      publishAPI,         // publish an API into the UI context (requires apiInUI: true)

      getStartURL,        // gets the start URL for the app 
      getFavicon,         // gets a (or an optionally named) favicon as a data URL
      getTitle,        // gets the app title
    },

    control: {
      send,               // send a DevTools command (throws if ui not connected yet)
      on,                 // start listening for a DevTools event (throws if ui not connected yet)
      off,                // stop listening for a DevTools event (throws if ui not connected yet)
    },

    util: {
      sleep: Common.sleep,
      kv: save,                     // save a (key, value) pair
      k: load,                      // getrieve a key
      d: del
    },
  };

export default API;

// state variables
  let App;

// basic functions
  async function go({
    apiInUI:                              // enable grader API available in UI context
      apiInUI = false,
    addHandlers:
      addHandlers = undefined,            // callback to add the route handlers to an express app
    server:
      server = true,                      // used to disable or replace default server 
        // if you don't want a server or if you need 
        // more control (such as websockets, or TLS)
        // we call listen automatically
    keepConsoleOpen:
      keepConsoleOpen = false,            // keeps the console open in case you need it
    doLayout:                               
      doLayout = false                    // control window layout on screen
        // true for auto mode or a function 
        // signature: ({screenWidth, screenHeight}) => 
        // {screenWidth, screenHeight, x, y, width, height}
  } = {}) {
    App = await Service.go({
      apiInUI, addHandlers, server, keepConsoleOpen, doLayout
    });

    API.ServicePort = App.ServicePort;
    //Common.DEBUG && console.log({App});
    return App;
  }

  async function stop() {
    if ( !App ) {
      throw new TypeError(
        `API.stop can only be called if App has started and is not already stopped.`
      );
    }

    await App.killService();
  }

  function say(msg) {
    return App.notify(msg, null, {}, e => {
      Common.DEBUG && console.info("say.App.notify", e);
      throw new TypeError(
        `Cannot API.say a console message because App Console has already closed.`
      );
    });
  }

// meta functions
  async function publishAPI(apiRoot, slotName) {
    // apiRoot is an object with properties that enumerate all the functions of that API
    // e.g. if your API is "sendEmail", "checkReplies", your apiRoot is
    // {sendEmail, checkReplies}
    // you can overwrite built-in APIs (like uitl, ui, control and window)
    // but we throw if you try to overwrite those APIs you publish
    Object.defineProperty(API, slotName, {
      get: () => apiRoot,
      set() {
        throw new TypeError(`API slot ${slotName} is already present and cannot be overwritten.`);
      }
    });
  }

// window functions
  async function open() {
    const {ServicePort} = App;
    const sessionId = App.newSessionId();
    fs.writeFileSync('grader.open', JSON.stringify({ServicePort, sessionId}));
    let browser, UI;
    try {
      ({UI,browser} = await Service.newBrowser({ServicePort, sessionId}));
    } catch(e) {
      console.log("open.newBrowser", e);
      fs.writeFileSync('grader.error', JSON.stringify({err:e, msg:e+''}));
    }

    // don't expose socket
    UI.socket = null;

    return {UI,browser};
  }

  async function close(UI = App.UI) {
    /*
    try {
      await UI.send("Browser.close", {}); 
    } catch(e) {
      console.info('Error closing browser', e);
      return false;
    }

    try {
      UI.disconnect()
    } catch(e) {
      console.info(`Error disconnecting socket`, e);
      return false;
    }
    */

    try {
      await UI.shutdown();
    } catch(e) {
      console.info(`Error shut down browser.`, e);
      return false;
    }

    return true;
  }

  async function move({x,y}, UI = App.UI) {
    UI.x = x;
    UI.y = y;
    return await UI.send("Browser.setWindowBounds", {
      windowId: UI.windowId,
      bounds: {
        left: x,
        top: y
      }
    });
  }

  async function size({width,height}, UI = App.UI) {
    /*
    await UI.send("Emulation.setDeviceMetricsOverride", {
      mobile: false,
      width,
      height,
      deviceScaleFactor: 1,
      screenOrientation: {
        angle: 0,
        type: 'portraitPrimary'
      },
    });
    */
    await UI.send("Browser.setWindowBounds", {
      windowId: UI.windowId,
      bounds: {
        windowState: 'normal',
        width:0,
        height:0
      }
    });
    const result = await UI.send("Browser.setWindowBounds", {
      windowId: UI.windowId,
      bounds: {
        windowState: 'normal',
        width,
        height
      }
    });
    UI.width = width;
    UI.height = height;
    return result;
  }

  async function minimize(UI = App.UI) {
    if ( UI.windowState == 'minimized' ) return;
    const result = await UI.send("Browser.setWindowBounds", {
      windowId: UI.windowId,
      bounds: {
        windowState: 'minimized'
      }
    });
    UI.windowState = 'minimized';
    return result;
  }

  async function restore(UI = App.UI) {
    let result;
    if ( UI.windowState == 'maximized' ) {
      result = await UI.send("Browser.setWindowBounds", {
        windowId: UI.windowId,
        bounds: {
          windowState: 'normal'
        }
      });
      UI.windowState = 'normal';
    } else {
      result = await UI.send("Browser.setWindowBounds", {
        windowId: UI.windowId,
        bounds: {
          windowState: 'maximized'
        }
      });
      UI.windowState = 'maximized';
    }
    return result;
  }

  async function maximize(UI = App.UI) {
    if ( UI.windowState == 'maximized' ) return;
    if ( UI.windowState == 'minimized' ) {
      await partscreen(UI);
    }
    const result = await UI.send("Browser.setWindowBounds", {
      windowId: UI.windowId,
      bounds: {
        windowState: 'maximized'
      }
    });
    UI.windowState = 'maximized';
    return result;
  }

  async function fullscreen(UI = App.UI) {
    if ( UI.windowState == 'fullscreen' ) return;
    if ( UI.windowState == 'minimized' ) {
      await partscreen(UI);
    }
    const result = await UI.send("Browser.setWindowBounds", {
      windowId: UI.windowId,
      bounds: {
        windowState: 'fullscreen'
      }
    });
    UI.windowState = 'fullscreen';
    return result;
  }

  async function partscreen(UI = App.UI) {
    if ( UI.windowState == 'normal' ) return;
    const result = await UI.send("Browser.setWindowBounds", {
      windowId: UI.windowId,
      bounds: {
        windowState: 'normal'
      }
    });
    UI.windowState = 'normal';
    return result;
  }

// window functions part ii
  async function openBlank() {

  }

  async function writePage() {

  }

  async function getStartURL(UI = App.UI) {
    return UI.startUrl;
  }

  async function getFavicon() {
    const iconPath = path.resolve(Service.SITE_PATH, '_icons', 'favicon.ico');  
    const base64Icon = fs.readFileSync(iconPath, {encoding:'base64'});
    const dataURL = `data:image/ico;base64,${base64Icon}`;
    return dataURL;
  }

  async function getTitle() {
    return CONFIG.name;
  }

// window functions part iii
  async function getScreen({ServicePort, sessionId}) {
    let screen = load('screen');

    console.log("GET SCREEN");

    if ( !screen ) {
      // open a headless browser to a page that sends us the screen details
        let UI;
        try {
          ({UI} = await Service.newBrowser({
            uriPath: '/_api/getscreen.html',
            headless: true, 
            ServicePort, 
            sessionId
          }));
        } catch(e) {
          console.log("getScreen.newBrowser", e);
          fs.writeFileSync('grader.error', JSON.stringify({err:e, msg:e+''}));
        }
      
      // wait until the key is set
        await hasKey('screen');

      // kill the browser __ it has served its purpose, honorably and nobly
        UI.shutdown(); 
      
      screen = load('screen');
    }

    console.log({screen});

    return screen;
  }

// control functions
  async function send(command, params, UI = App.UI) {
    return await UI.send(command, params);
  }

  async function on(eventName, handler, UI = App.UI) {
    return await UI.on(eventName, handler);
  }

  function off() {
    throw new TypeError(`off is not implemented yet...`);
  }

// util part i: KV functions (keys are strings)
  function save(key, value) {
    key += '';
    if ( typeof value == "object" ) {
      // do a pseudo merge
      let newValue;
      if ( Array.isArray(value) ) {
        const existing = KV[key] || [];
        if ( Array.isArray(existing) ) {
          newValue = [...existing, ...value];
        } else if ( typeof existing == "object" ) {
          value.forEach((v,i) => {
            existing[i] = v;
          });
          newValue = existing;
        } else {
          newValue = value;
        }
      } else {
        const existing = KV[key] || {};
        newValue = Object.assign(existing, value);
      }
      KV[key] = newValue;
    } else {
      KV[key] = value;
    }

    // run any listeners waiting for this key to be set
      let listeners = HasListeners.get(key);
      if ( listeners ) {
        HasListeners.delete(key);
        listeners.forEach(res => {
          // execute each without a stack
          setTimeout(() => res(true), 0);
        });
      }
  }

  function load(key) {
    key += '';
    return KV[key];
  }

  function del(key) {
    key += '';
    delete KV[key];
  }

  // returns a promise that resolves to true when the key is set
    async function hasKey(key) {
      key += '';

      let resolve;
      const pr = new Promise(res => resolve = res);

      let hasKey = false;

      hasKey = Object.prototype.hasOwnProperty.call(KV, key);

      if ( hasKey ) {
        return resolve(true);
      } else {
        let listeners = HasListeners.get(key);
        if ( ! listeners ) {
          listeners = [];
          HasListeners.set(key, listeners);
        }
        // these listeners will be called by save once key is set
        listeners.push(resolve);
      }

      return pr;
    }
