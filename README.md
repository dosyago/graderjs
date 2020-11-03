# Grader.JS

Grader.JS, or just **Grader**, is a tool to help you build cross-platform desktop apps in JavaScript, HTML and CSS, without the bloat of Electron.

# Get Started

Use npm to create a new Grader app like so:

```sh
  mkdir my-app
  cd my-app
  # make it git
  git init
  # make it grader
  npm i graderjs
```

And the [Grader.JS tool](https://github.com/c9fe/graderjs) will automatically populate your repo.

Then, read the [getting started guide](https://github.com/c9fe/grader-base/blob/master/README.md) or see below for an API reference.

# API reference

The Grader API is pretty simple. 

```js
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
      getLayout,          // get window left, right, width, height and windowState

      openBlank,          // open a UI window to about:blank
      writePage,          // like document.write if using a custom window control box, writes to the
                          // iframe document inside that

      getScreen,          // get screen dimensions
    },

    meta: {
      publishAPI,         // publish an API into the UI context (requires apiInUI: true)

      getStartURL,        // gets the start URL for the app 
      getFavicon,         // gets a (or an optionally named) favicon as a data URL
      getTitle,           // gets the app title
    },

    control: {
      send,               // send a DevTools command (throws if ui not connected yet)
      on,                 // start listening for a DevTools event (throws if ui not connected yet)
      off,                // stop listening for a DevTools event (throws if ui not connected yet)
    },

    util: {
      sleep,
      kv: save,           // save a (key, value) pair
      k: load,            // getrieve a key
      d: del              // delete a key
    },

    _serviceOnly: {       // can not be called from UI side
      getUI,              // returns the named UI
      getApp              // returns the App
    }
  };
```

# Architecture

Grader consists of 3 parts:
- a background service running as a server on an available dynamic port 
- zero or a number of UI windows, using HTML/JS/CSS rendered by Google Chrome
- a console window which you can optionally keep open

The UI can talk to the service via the included `grader` global API bridge in every UI window. 

Communication between the service and the UI is done via responses to API calls made by the UI. The service can also control a UI using the Chrome DevTools protocol. 


# Security

The binaries are built using `nexe`, which uses Node.JS runtimes which I pre-pack with `upx` to save ~75% of the size. Apart from webpack and its minimization, there is no obfuscation applied to the code. The code is packed into a binary by `nexe`.

Aside from a few methods marked `_serviceOnly`, the API is available on the service side (Node.JS) and in the client (via the `grader` global in any UI windows). If you're loading 3rd-party content, you might not want to give them access to the `grader` global, so there is an `apiInUI` flag, as well as origin checks and an allowedOrigins whitelist, I'll implement in future.

