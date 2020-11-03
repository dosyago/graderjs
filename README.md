# Grader.JS

Grader.JS, or just **Grader**, is a tool to help you build cross-platform desktop apps in JavaScript, HTML and CSS, without the bloat of Electron.

# Get Started

Click "Use This Template".

Then put your code into, `src/app.js`:

```js
import Grader from './index.js';

start();

async function start() {
  await Grader.go();
}
```

You now have a GUI app in Node.JS and JavaScript/HTML/CSS.

# Configuration

You can configure some options:

`src/config.js`:
```js
{
  name: "GraderDemoApp",
  author: {
    name: "dosyago",
    url: "https://github.com/dosyago",
  },
  desiredPort: 22121,
  version: "0.0.1",
  description: "A Beautiful Demonstration of Just a Tiny Fraction of The Amazing Benevolence Which Grader Hath To Offer",
  source: "https://github.com/c9fe/grader",
  organization: {
    name: "Grader",
    url: "https://github.com/grader-js"
  },
  apiOrigins: [],                   // exact origins allowed to call Service API via grader global,
  DEBUG: true
}
```

