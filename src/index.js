const API = {
  go,                   // launch app (you can pass through args here)
  stop,                 // kill app and exit (after async jobs parameter completes)
  say,                  // say something to console (throws if console has closed)

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
    on,                 // start listening for a DevTools event
    off,                // stop listening for a DevTools event
  }
};

export default API;
