<p align=center><img alt="Grader.JS logo image" src=https://github.com/c9fe/graderjs/raw/master/.readme-assets/grader_logo.png></p>

# [Grader.JS](https://github.com/c9fe/graderjs)

**Grader.JS**, or just **Grader**, is a tool to help you build accessible, cross-platform desktop app binaries in Node.JS, JavaScript, HTML and CSS, without the bloat of Electron, the headaches of Qt or the pernicious dorsal enemas of Babylon.Perl

## Get Started from the Command line

  Use npm to get the [Grader.JS tool](https://github.com/c9fe/graderjs) to automatically populate your new grader app.

  ```sh
    $ npm i -g graderjs@latest
    $ graderjs my-new-app
  ```

  Then, read the [API docs](https://github.com/c9fe/grader-base/blob/master/README.md) or see below for the Getting Started Goose Guide.

## Get Started from GitHub

Click ["Use This Template"](https://github.com/c9fe/grader-base) on the base-repo and you will have a new repo, then clone it to your workspace and `cd` into it, and run:

```sh
npm i
```

## Start Building!

Read [the API docs](https://github.com/c9fe/grader-base), or create binaries right away:

```sh
./scripts/compile.sh
```

You now have a GUI app in Node.JS and JavaScript/HTML/CSS.

And you will have cross-platform binaries available in `/bin`

(*and also for download from the computer you're on at port 8080.*)

## Start Coding

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

# Then build it

```sh
./scripts/compile.sh
```

You now have a GUI app in Node.JS and JavaScript/HTML/CSS.

And you will have cross-platform binaries available in `/bin`

and also for download from the computer you're on at port 8080.

For more demos see the demos in `src/demos`.

# Configuration

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

# More

See [the API docs](https://github.com/c9fe/grader-base) for more. Or just read the README.md of the grader app you've just created, it contains the full API docs. You can also take a look at the API code in `src/index.js'.

# Licensing

You're free to use this so long as you abide by AGPL-3.0. If you want to use it commercially or don't want this license, you can [purchase an exemption](mailto:cris@dosycorp.com?subject=Grader.JS).

# Related projects

See [this list of Electron alternatives](https://github.com/sudhakar3697/electron-alternatives) for more options for cross-platform desktop app developement using web technologies.

----------------------

# *Grader.JS!*
