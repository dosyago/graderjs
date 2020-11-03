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




# Security

The binaries are built using `nexe`, which uses Node.JS runtimes which I pre-pack with `upx` to save ~75% of the size. Apart from webpack and its minimization, there is no obfuscation applied to the code. The code is packed into a binary by `nexe`.

Aside from a few methods marked `_serviceOnly`, the API is available on the service side (Node.JS) and in the client (via the `grader` global in any UI windows). If you're loading 3rd-party content, you might not want to give them access to the `grader` global, so there is an `apiInUI` flag, as well as origin checks and an allowedOrigins whitelist, I'll implement in future.

