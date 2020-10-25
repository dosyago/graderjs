import * as Service from './service.js';

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
  }
};

export default API;

let App;

// basic functions
  async function go() {
    App = await Service.go();
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
      DEBUG && console.info(e);
      throw new TypeError(`Cannot say a console message because App Console has already closed.`);
    }
  }

function open() {

}

function close() {

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
