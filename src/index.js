import * as Service from './service.js';
import * as Common from './lib/common.js';

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
    fullscreen,         // UI window to fullscreen
    partscreen,         // UI window to part of screen
  },

  control: {
    send,               // send a DevTools command (throws if ui not connected yet)
    on,                 // start listening for a DevTools event (throws if ui not connected yet)
    off,                // stop listening for a DevTools event (throws if ui not connected yet)
  },

  util: {
    sleep: Common.sleep
  }
};

export default API;

let App;

// basic functions
  async function go() {
    App = await Service.go();
    //Common.DEBUG && console.log({App});
    return App;
  }

  async function stop() {
    if ( !App ) {
      throw new TypeError(`stop can only be called if App has started and is not already stopped.`);
    }

    await App.killService();
  }

  function say(msg) {
    return App.notify(msg, null, {}, e => {
      Common.DEBUG && console.info("say.App.notify", e);
      throw new TypeError(`Cannot say a console message because App Console has already closed.`);
    });
  }

async function open() {
  const {ServicePort} = App;
  const sessionId = App.newSessionId();
  let browser, UI;
  try {
    ({UI,browser} = await Service.newBrowser({ServicePort, sessionId}));
  } catch(e) {
    console.log("open", e);
  }
  return {UI,browser};
}

async function close(UI = App.UI) {
  return await UI.send("Browser.close", {}); 
}

async function move({x,y}, UI = App.UI) {
  return await UI.send("Browser.setWindowBounds", {
    windowId: UI.windowId,
    bounds: {
      left: x,
      top: y
    }
  });
}

async function size({width,height}, UI = App.UI) {
  return await UI.send("Browser.setWindowBounds", {
    windowId: UI.windowId,
    bounds: {
      width,
      height
    }
  });
}

async function minimize(UI = App.UI) {
  return await UI.send("Browser.setWindowBounds", {
    windowId: UI.windowId,
    bounds: {
      windowState: 'minimized'
    }
  });
}

async function maximize(UI = App.UI) {
  return await UI.send("Browser.setWindowBounds", {
    windowId: UI.windowId,
    bounds: {
      windowState: 'maximized'
    }
  });
}

async function fullscreen(UI = App.UI) {
  return await UI.send("Browser.setWindowBounds", {
    windowId: UI.windowId,
    bounds: {
      windowState: 'fullscreen'
    }
  });
}

async function partscreen(UI = App.UI) {
  return await UI.send("Browser.setWindowBounds", {
    windowId: UI.windowId,
    bounds: {
      windowState: 'normal'
    }
  });
}

function send() {

}

function on() {

}

function off() {

}
