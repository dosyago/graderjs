# Grader.JS

**Grader.JS**, or just **Grader**, is a tool to help you build accessible, cross-platform desktop app binaries in Node.JS, JavaScript, HTML and CSS, without the bloat of Electron, the headaches of Qt or the pernicious dorsal enemas of Babylon.Perl

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
                          
      getUI,              // returns the named UI object
      getApp,             // returns the App object
      publishAPI,         // publish an API to the API object
                          // if apiInUI: true, it will also be available in the UI side
    }
  };
```

# Top-level API method

The top-level methods have to do with launching and stopping the app, and saying something to the launcher console. They are:

- API.go(options)
- API.stop()
- API.say(msg)

## API.go(options)

Starts the app launch sequence. This will:

- create a server, otherwise known as the background service. The server will run on port `<Config>.desiredPort` if available, otherwise on a random port in the dynamic range from 49,152. If the `options.server` is set, Grader uses the `<HTTPServer>` object you pass and attempts to call 'listen' on it. 
- create a UI window. Grader uses the installed Google Chrom(e/ium) browser to run a native UI window using the browser's [`--app=${url}`](https://source.chromium.org/chromium/chromium/src/+/master:chrome/common/chrome_switches.cc;drc=8c4b7bb294e2c96b3aef99fa08effc473fdae015;l=47) [flag](https://peter.sh/experiments/chromium-command-line-switches/#app). If no Google Chrom(e/ium) is installed, one will be downloaded and installed first. Note that unlike [Electron](https://www.electronjs.org/) Grader does not bundle a browser inside the binaries of app, and it does not use a modified version of Chrome, instead using the installed version or downloading the latest version.

The method supports the following options:

- apiInUI: boolean. Make this API (minus the `_serviceOnly` domain) available in all UI windows under the `grader` global object.
- addHandlers: function(Express App object). A function called during background service server startup to add handlers to the created express app server.
  For example:

  ```js
  function addHandlers(app) {
     app.post('/file', upload, (req, res) => res.sendStatus(200));
  }

  await Grader.go({addHandlers});
  ```
  
  By default Grader creates an [Express app](https://expressjs.com/) for the background service server.
- server: `<HTTPServer>` object. If you want more control over the background service server Grader creates, you can create your own server and pass it in at launch using this option. For example, you might want to add TLS certificates, or you might want to use [Meteor](https://www.meteor.com/) instead of Express. 
- keepConsoleOpen: boolean. Requests that the launcher process not exit and instead keep its console window open.

The standard use of Grader is to create a cross-platform GUI app using Node.JS and web technologies. But, using a couple of flags, you can modify the behaviour to non-standard uses.

*** Note on Non Standard Uses ***

Using the options passed to `go()` you can customize the app launch behaviour. By passing a dummy object with a no-op `listen()` method in the `server` option, you can disable running a server. By specifying the `noWindow` flag, you can prevent the default behaviour of opening a UI window on app launch, and by requesting `keepConsoleOpen` you can ensure that the terminal console window, normally only open for the launch process and only on Windows, remains open for as long as you want. 

So, for example, you can use Grader to create a cross-platform terminal* app, without a GUI window, and optionally with or without a server. Note that static analysis and tree-shaking is performed by `webpack` so the minimum binary sizes will be slightly (but only slightly) affected by the options you specify in `go()`. 

* *Opening a terminal currently only happens on Windows, as part of the app launch process. See [this SO question](https://stackoverflow.com/questions/50507531/is-there-a-way-to-launch-a-terminal-window-or-cmd-on-windows-and-pass-run-a-co) for an idea of how this could be made into a standardized behaviour across platforms.*

** Note on Binary sizes **

The default minimum binary sizes are shown below:

![A table showing the approximate default minimum binary sizes for basic "Hello World" GUI apps built with Grader.JS. The minimum size for a Unix or Linux binary is 14.8 Mb. The minimum size for a 32-bit Unix or Linux binary is 14.2 Mb. The minimum size for a Macintosh OSX binary is 12.2 Mb. The minimum size for a Windows binary is 10.4 Mb. The minimum size for a 32-bit Windows binary is 8.5 Mb.](https://github.com/c9fe/graderjs/raw/master/.readme-assets/default%20binary%20sizes.JPG)

These are the sizes of baseic `hello world` example GUI apps, and the main contribution to the size is the compressed Node.JS executable that is included in the binary package. The minified Node.JS source code has the following sizes:

| path   | purpose  | size behavior  | uncompressed size (Kb)  | compressed size (Kb) |
|---|---|---|---|---|
| /build/grader.js  | launcher  |  fixed size | 94  | 31 |
| /src/build/service.js  | main app  | size depends on your code | 707 | 282 |
| /build/app.zip* | app bundle | size depends on your code | 715* | 283 |

* *Note: the app.zip bundle includes service.js, only exploded out for illustration*

The reality of the above numbers are that the total code contirbution of a fully functioning `hello world` GUI app is 314 Kb. Your app logic that you add on top of that, including any libraries you import, will add to that code size. But the main contribution to binary size is the size of the compressed Node.JS executable that is included in the binary package. 

## API.stop()

Stops the background service server (if it is listening), shuts any UI windows that remain open, and exits the process. But note that if you requested `keepConsoleOpen` you might need to close stdin yourself, as `keepConsoleOpen` runs `process.stdin.resume()`.

## API.say(msg)

Writes a message to `process.stdout` of the launcher process, so this message will shop up in the launcher console window. If the launcher process has already exited (as it will unless you request `keepConsoleOpen`), this method will throw.

# Configuration

Grader can be configured by the `src/config.js` file.

The keys are:


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

