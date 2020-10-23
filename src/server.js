// imports
  import fs from 'fs';
  //FFFimport os from 'os';
  import path from 'path';
  import express from 'express';
  import {launch as ChromeLaunch} from 'chrome-launcher';
  import {createHttpTerminator} from 'http-terminator';

  import args from './../src/lib/args.js';
  import {say} from './../src/lib/common.js';
  import connect from './lib/protocol.js';
  import {NO_SANDBOX} from './lib/common.js';

// constants
  const SITE_PATH = path.resolve(__dirname, 'public');
  console.log({SITE_PATH});

  const {service_port, ui_port} = args;

  const CHROME_OPTS = !NO_SANDBOX ? [
    `--new-window`,
    `--no-first-run`,
    `--app=http://localhost:${server_port}`,
    '--restore-last-session',
    `--disk-cache-dir=${args.temp_browser_cache()}`,
    `--aggressive-cache-discard`
  ] : [
    `--new-window`,
    `--no-first-run`,
    `--app=http://localhost:${server_port}`,
    '--restore-last-session',
    `--disk-cache-dir=${args.temp_browser_cache()}`,
    `--aggressive-cache-discard`,
    '--no-sandbox'
  ];
  const LAUNCH_OPTS = {
    logLevel: 'verbose',
    port: ui_port, 
    chromeFlags:CHROME_OPTS, 
    userDataDir:args.app_data_dir(), 
    ignoreDefaultFlags: true
  }

// process cleanliness 
  //process.on('beforeExit', cleanup);
  //process.on('SIGBREAK', cleanup);
  //process.on('SIGHUP', cleanup);
  //process.on('SIGINT', cleanup);
  //process.on('SIGTERM', cleanup);
  process.on('error', (...args) => {
    console.log(args);
  });

// main executable block
  {
    const app = express();

    // debugging info
      /**
      console.log({
        processArgv: process.argv,
        requireMain: require.main,
        module,
        importMetaURL: import.meta.url
      });
      **/

    if (process.argv[1].includes('grader_server_')) {     // our startup cue
      process.send('Request app start.');
      run();
    }
  }

// main functions
  async function run(app) {
    // start background service
      console.log(`Start service...`);
      process.send('Request service start.');

      const {service, port, upAt} = await start({app, desiredPort:22121});

      process.send('Server started.');
      console.log(`App service started.`);

    // set up disk space
      process.send('Request cache directory.');
      console.log(`Removing grader's existing temporary browser cache if it exists...`);
      if ( fs.existsSync(args.temp_browser_cache()) ) {
        console.log(`Temp browser cache directory (${args.temp_browser_cache()}) exists, deleting...`);
        fs.rmdirSync(args.temp_browser_cache(), {recursive:true});
        console.log(`Deleted.`);
      }
      if ( !fs.existsSync(args.app_data_dir()) ) {
        console.log(`App data dir does not exist. Creating...`);
        fs.mkdirSync(args.app_data_dir(), {recursive:true});
        console.log(`Created.`);
      }
      process.send('Cache directory created.');

    // launch UI
      process.send('Request user interface.');
      console.log(`Launching UI...`);
      console.log({LAUNCH_OPTS});
      const browser = await ChromeLaunch(LAUNCH_OPTS);
      console.log({browser, ChromeLaunch});
      console.log(`Chrome started.`);
      process.send('User interface created.');

    // connect to UI
      process.send('Request interface connection.');
      console.log(`Connecting to UI...`);
      const UI = await connect({port:ui_port, exposeSocket: true});
      console.log(`Connected.`);
      process.send('User interface online.');

    installCleanupHandlers({ui: UI, bg: service});

    process.send && process.send('App started.');
    process.disconnect && process.disconnect();
  }

  async function start({app, desiredPort}) {
    let server, port, upAt;
    let resolve, reject;
    const pr = new Promise((res, rej) => (resolve = res, reject = rej));

    port = desiredPort;
    addHandlers();

    const service = app.listen(Number(port), err => {
      if ( err ) { 
        reject(err);
      } 
      upAt = new Date;
      say({serviceUp:{upAt,port}});
      resolve({service, upAt, port});
    });

    console.log(`Ready`);

    return pr;
  }

// helper functions
  function addHandlers() {
    app.use(express.urlencoded({extended:true}));
    app.use(express.static(SITE_PATH));
  }

  async function stop() {
    let resolve;
    const pr = new Promise(res => resolve = res);

    say({service:`Closing service...`});

    Server.close(() => {
      say({server:`Server closed.`});
      resolve();
    });

    return pr;
  }

  function installCleanupHandlers({ui, bg}) {
    // someone closed the browser window
    ui.socket.on('close', () => {
      
    });
  }

// saved code
  /*
    async function cleanup(reason) {
      console.log(`Cleanup called on reason: ${reason}`);

      if ( quitting ) {
        console.log(`Cleanup already called so not running again.`);
        return;
      }
      quitting = true;

      if ( fs.existsSync(args.temp_browser_cache()) ) {
        console.log(`Temp browser cache directory (${args.temp_browser_cache()}) exists, deleting...`);
        fs.rmdirSync(args.temp_browser_cache(), {recursive:true});
        console.log(`Deleted.`);
      }

      service.close();

      console.log(`Take a breath. Everything's done. grader is exiting in 3 seconds...`);

      await sleep(2000);

      process.exit(0);
    } 
  */
