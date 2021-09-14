<p align=center><img width=200 alt="Grader.JS logo image" src=https://github.com/i5ik/graderjs/raw/master/.readme-assets/grader_logo.png></p>

<p align=center>
 <img alt="Windows Grader app screenshot" src=https://github.com/i5ik/graderjs/raw/master/.readme-assets/wingrader.JPG width=222>
 <img alt="Ubuntu Linux Grader app screenshot" src=https://github.com/i5ik/graderjs/raw/master/.readme-assets/grader.JPG width=222>
</p>

# [:goggles: GRaderJS](https://github.com/i5ik/graderjs) ![npm downloads](https://img.shields.io/npm/dt/graderjs?label=npm%20downloads) ![version](https://img.shields.io/npm/v/graderjs?label=version) [![visitors+++](https://hits.seeyoufarm.com/api/count/incr/badge.svg?url=https%3A%2F%2Fgithub.com%2Fc9fe%2Fgraderjs&count_bg=%2379C83D&title_bg=%23555555&icon=&icon_color=%23E7E7E7&title=%28today%2Ftotal%29%20visitors%2B%2B%2B%20since%20Nov%209%202020&edge_flat=false)](https://hits.seeyoufarm.com) 

Build cross-platform desktop apps without the bloat using JS, HTML and CSS.

✔️

## Features that work right out of the box

- Create a downloadable binary for any platform ✔️
- NodeJS ✔️
- Chrome DevTools API ✔️
- GUI in HTML/JavaScript/CSS ✔️
- BYO front-end framework ✔️
- BYO back-end framework ✔️
- A GUI window with system-chrome (default topbar controls) that can be dragged around and aximized, minimized, resized (or the same via API).
- GUI window has app title and can have app icon. ✔️
- ES6 all the latest features (that work in the latest Chrome). ✔️
- Cross-platform builds (build for everywhere on Linux, or Mac or Windows). ✔️

## Features that don't (yet?) work

- App binary icons (it's just the NodeJS icon) 💀
- App system tray icons (on Mac, tray icons work on Windows) 💀
- Code signing and associated bona fides that give apps a "passport for safe and unimpeded passage" through your system (it's not built in, but you can sign your own binary, if you have the right setup). 💀

## What are apps built with GraderJS, technically?

A GraderJS app is just a full-stack application written in NodeJS that runs locally on your client's machine. It achieves this by:

- bundling a NodeJS (for the target platform) and your back-end and front-end source code into the binary.
- on execution the binary:
  1. starts the back-end service
  2. unzips the front-end to a temporary directory
  3. probes the screen to find its dimensions using a silently launched chrome window (and downloads and installs chrome if it is not)
  4. opens an "app view" chrome UI window to display the front-end

GraderJS apps are un-opinionated. You can code the front and back-end however you like, and all details like persisting state to the client's machine, and other useful things, are left to the app author to figure out themselves, and decide which way they want to go.

Unlike a regular full-stack app, GraderJS apps:

1. Look like a native app and run on the desktop.
2. Have full access to the system.
3. Have full access to the Chrome DevTools API to be able to fully utilize the great browser APIs, enabling you to incorporate "browser power" (think, automation of browsers, but that's just a fraction of what's possible) into your app experiences

## Details

Minimal binary is 10MB (Windows, Hello World App, using node v12.10.0). Typical Linux/MacOS binary is 14MB (Hello World App, using node v12.10.0). These days we have upgraded to node v14.15.3, but you can control the version (as long as the required nexe pre-built node binaries are available for that version). Node v14.15.3 binaries are larger (~19 - 24 MB).

<span id=top></span>
-------------------
- [Overview](##goggles-graderjs---)
  * [Details](#details)
  * [Advantages](#advantages)
  * [Disadvantages](#disadvantages-or-opportunities-and-opportunities-for-improvement-yes)
  * [Grader workflow](#grader-workflow)
  * [Extended Workflow](#extended-workflow)
  * [Ultimate Workflow](#ultimate-workflow-still-impossible)
  * [License](#license)
  * [Built with Grader](#built-with-grader)
- [Getting Started](#getting-started) 
  * [API & Documentation](#api--documentation)
  * [Extraordinary Control](#extraordinary-control)
  * [NodeJS related](#nodejs-related)
  * [App lifecycle](#app-lifecycle)
  * [Window related](#window-related)
  * [Docketty Docs](#docketty-docs)
  * [Questions](#questions)
- [Step by step guide](#step-by-step-guide)
  * [Get Started from the Command line](#get-started-from-the-command-line)
  * [Get Started from GitHub](#get-started-from-github)
  * [Start Building!](#start-building)
  * [Start Coding](#start-coding)
- [API](#api)
- [Then build it](#then-build-it)
- [Configuration](#configuration)
- [Screenshots](#screenshots)
- [More](#more)
- [Licensing](#licensing)
- [Related projects](#related-projects)
--------------------

## Advantages

- Simplicity. Grader is just a web server running on localhost viewed with the user's browser. If they have Chrome installed then you get a proper looking desktop app (thanks to the --app flag), and access to a bunch of cool APIs to control the browser (thanks to remote DevToosl protocol).
- Extensive APIs. Because you have access to Node.JS and, with Chrome, DevTools APIs there's so many things you can do. You can do almost anything.

<p align=right><a href=#top>Top</a></p>

## Disadvantages (...or, Opportunities, and Opportunities for Improvement? Yes)

- New. Undeveloped. Embryonic. Fragile. Untested. Unknown (relatively).
- Requires Chrome to be installed for a great experience (some people don't have it).
- Bundles Node.JS (and packs using upx but the binaries are still bigger than using Tauri or Neutralino).
- API still undeveloped and likely to change.
- Icons (for the binary) don't work (and it's a hard problem).

<p align=right><a href=#top>Top</a></p>

## Grader Workflow 

1. Create a new Grader app
2. Fill out the sections with your business logic and app specific node
3. Compile to get cross-platform binaries

<p align=right><a href=#top>Top</a></p>

## Extended Workflow 

4. Code-sign your binaries and upload them to app stores or GitHub releases or your own website.

<p align=right><a href=#top>Top</a></p>

## Ultimate Workflow (still impossible)

5. Use ~impossible non-existant~ ~(future?)~ packaging tool to bundle each binary in a soothing bath of platform specific app metadata that includes icons and associated weird OS specific coolness to make things truly awesome.

<p align=right><a href=#top>Top</a></p>

## License 

Copyright (c) 2020, Dosyago and/or its affiliates. All rights reserved.

This is a release of Grader, an cross-platform app builder.

License information can be found in the LICENSE file.

This software is dual-licensed. For information about commercial licensing, see [Dosyago Commercial License for OEMs, ISVs and VARs](https://github.com/dosyago/dual-licensing).

<p align=right><a href=#top>Top</a></p>

## Built with Grader

- [wingrader](https://github.com/i5ik/winrader) - windows 95 cross platform
- [jspaint.exe](https://github.com/i5ik/jspaint.exe) - classic paint cross platform

<p align=right><a href=#top>Top</a></p>

## Getting Started

```sh
npx graderjs my-app
```

<p align=right><a href=#top>Top</a></p>

### API & Documentation

Only a couple of API calls, classed into four categories: Protocol, NodeJS, App, Window.

Read [the API docs](https://github.com/i5ik/grader-base) for a detailed usage or see below for an overview.

<p align=right><a href=#top>Top</a></p>

### Protocol Control

Instrument the browser directly with DevTools\*.

- constrol.send(command, params)
- control.on(eventName, handlerFunction) (also off)

\**See commands available at [DevTools protocol homepage](https://chromedevtools.github.io/devtools-protocol/tot/)*

<p align=right><a href=#top>Top</a></p>

### NodeJS related

*As normal just use npm to add dependencies and import to use them*

### App Lifecycle

- launch: `go()` 
- shutdown: `stop()`

<p align=right><a href=#top>Top</a></p>

### Window Related

  - ui.open  
  - ui.close 
  - ui.move  
  - ui.size  
  - ui.minimize 
  - ui.maximize 
  - ui.restore  
  - ui.fullscreen  
  - ui.partscreen  
  - ui.getLayout
  - ui.openBlank (*not yet implemented*)
  - ui.writePage (*not yet implemented*)
  - ui.getScreen

<p align=right><a href=#top>Top</a></p>

### Docketty Docs

Then, read the [API docs](https://github.com/i5ik/grader-base/blob/master/README.md) or see below for the Getting Started Goose Guide.

<p align=right><a href=#top>Top</a></p>

### Questions

Open an issue!
  
<p align=right><a href=#top>Top</a></p>

## Step By Step Guide

### Get Started from the Command line

Use npm to get the [Grader.JS tool](https://github.com/i5ik/graderjs) to automatically populate your new grader app.

```sh
  $ npm i -g graderjs@latest
  $ graderjs my-new-app
```

Then, read the [API docs](https://github.com/i5ik/grader-base/blob/master/README.md) or see below for the Getting Started Goose Guide.

*Or...*

<p align=right><a href=#top>Top</a></p>

### Get Started from GitHub

Click ["Use This Template"](https://github.com/i5ik/grader-base) on the base-repo and you will have a new repo, then clone it to your workspace and `cd` into it, and run:

```sh
npm i
```

*Then...*

<p align=right><a href=#top>Top</a></p>

### Start Building!

Read [the API docs](https://github.com/i5ik/grader-base), or create yer binaries right away:

```sh
./scripts/compile.sh
```

You now have a GUI app in Node.JS and JavaScript/HTML/CSS.

And you will have cross-platform binaries available in `/bin`

(*and also for download from the computer you're on at port 8080.*)

<p align=right><a href=#top>Top</a></p>

### Start Coding

Put your own code into, `src/app.js`:

**E.g**:

```js
  import Grader from './index.js';

  start();

  async function start() {
    await Grader.go();
  }
```

And put your JS/HTML/CSS into, `src/public/index.html`:

```html
  <meta charset=utf-8>
  <title>Your Cross-Platform App</title>
  <style>
    :root {
      font-family: sans-serif;
      background: lavenderblush;
    }
    body {
      display: table;
      margin: 0 auto;
      background: silver;
      padding: 0.5em;
      box-shadow: 0 1px 1px purple;
    }
    h1 {
      margin: 0;
    }
    h2 {
      margin-top: 0;
    }
  </style>
  <h1>Hello World!</h1>
  <h2>Meet <i>Grader</i></h2>
  <p>
    <button onclick="grader.ui.minimize();">_</button>
    <button onclick="grader.ui.restore();">&#11036;</button>
    <button onclick="grader.ui.close();">x</button>
  <script>
      (async () => {
        await graderReady();

        const [title, favicon, startURL] = (await Promise.allSettled([
          grader.meta.getTitle(),
          grader.meta.getFavicon(),
          grader.meta.getStartURL()
        ])).map(({status, value, reason}) => {
          if ( status == 'fulfilled' ) return value;
          return reason;
        });

        console.log({title, favicon, startURL});

        document.title = title;
      })();
    </script>
```

### API

Read [the API docs](https://github.com/i5ik/grader-base)!

<p align=right><a href=#top>Top</a></p>

### Build it

```sh
./scripts/compile.sh
```

You now have a GUI app in Node.JS and JavaScript/HTML/CSS.

And you will have cross-platform binaries available in `/bin`

and also for download from the computer you're on at port 8080.

For more demos see the demos in `src/demos`.

### Configuration

You can configure some options, via the configuration located in `src/config.js`:

```js
module.exports = {
  name: "MyGraderApp",
  entry: "./app.js",
  author: {
    name: "my name",
    url: "https://github.com/my-github-username",
  },
  desiredPort: 49666,
  version: "0.0.1",
  description: "A Beautiful Demonstration",
  source: "https://github.com/my-github-username/MyGraderApp",
  organization: {
    name: "My Org",
    url: "https://github.com/my-github-org-name"
  },
  apiOrigins: [],      // origins allowed to call API from UI (not implemented)
  DEBUG: false         // switch on debug output when you're ready to debug
}
```

<p align=right><a href=#top>Top</a></p>

## Screenshots

![Windows Grader](https://github.com/i5ik/graderjs/raw/master/.readme-assets/wingrader.JPG)
![Linux Grader](https://github.com/i5ik/graderjs/raw/master/.readme-assets/grader.JPG)

<p align=right><a href=#top>Top</a></p>

## More

See [the API docs](https://github.com/i5ik/grader-base) for more. Or just read the README.md of the grader app you've just created, it contains the full API docs. You can also take a look at the API code in `src/index.js`.

<p align=right><a href=#top>Top</a></p>

## Licensing

You're free to use this so long as you abide by AGPL-3.0. If you want to use it commercially or don't want this license, you can [purchase an exemption](mailto:cris@dosycorp.com?subject=Grader.JS).

<p align=right><a href=#top>Top</a></p>

## Related projects

See [this list of Electron alternatives](https://github.com/sudhakar3697/electron-alternatives) for more options for cross-platform desktop app developement using web technologies.

<p align=right><a href=#top>Top</a></p>

## nerding warnung

**WARNING:** This project uses Google Chrome to display the UI. Running this will download and install Google Chrome if you don't already have it installed. If you are allergic to Google Chrome, please avoid running or ingesting this coode.

<p align=right><a href=#top>Top</a></p>

----------------------


# *Grader.JS!*
