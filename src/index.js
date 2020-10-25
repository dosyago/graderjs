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
  }

  async function stop() {
    if ( !App ) {
      throw new TypeError(`stop can only be called if App has started and is not already stopped.`);
    }

    await App.killService();
  }

  function say(msg) {
    try {
      App.notify(msg); 
    } catch(e) {
      Common.DEBUG && console.info(e);
      throw new TypeError(`Cannot say a console message because App Console has already closed.`);
    }
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

async function close(UI) {
  return await UI.send("Browser.close", {}); 
}

function move() {

}

function size() {

}

function minimize() {

}

function maximize() {

}

function fullscreen() {

}

function partscreen() {

}

function send() {

}

function on() {

}

function off() {

}
