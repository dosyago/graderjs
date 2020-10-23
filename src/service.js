// imports
  import fs from 'fs';
  import os from 'os';
  import path from 'path';
  import express from 'express';
  import {launch as ChromeLaunch} from 'chrome-launcher';
  import {createHttpTerminator} from 'http-terminator';

  import args from './../src/lib/args.js';
  import {DEBUG, say} from './../src/lib/common.js';
  import connect from './lib/protocol.js';
  import {NO_SANDBOX} from './lib/common.js';
  import CONFIG from './config.js'

// constants
  const SITE_PATH = path.resolve(__dirname, 'public');
  const app_data_dir = () => path.resolve(os.homedir(), '.grader', 'appData', `${(CONFIG.organization || CONFIG.author).name}`, `service_${CONFIG.name}`, `ui-data`);
  const temp_browser_cache = () => path.resolve(os.homedir(), '.grader', 'appData', `${(CONFIG.organization || CONFIG.author).name}`, `service_${CONFIG.name}`, `ui-cache`);
  console.log({SITE_PATH});

  const {service_port, ui_port} = args;

  const CHROME_OPTS = !NO_SANDBOX ? [
    `--new-window`,
    `--no-first-run`,
    `--app=http://localhost:${service_port}`,
    '--restore-last-session',
    `--disk-cache-dir=${temp_browser_cache()}`,
    `--aggressive-cache-discard`
  ] : [
    `--new-window`,
    `--no-first-run`,
    `--app=http://localhost:${service_port}`,
    '--restore-last-session',
    `--disk-cache-dir=${temp_browser_cache()}`,
    `--aggressive-cache-discard`,
    '--no-sandbox'
  ];
  const LAUNCH_OPTS = {
    logLevel: 'verbose',
    port: ui_port, 
    chromeFlags:CHROME_OPTS, 
    userDataDir:app_data_dir(), 
    ignoreDefaultFlags: true
  }

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

    if (DEBUG || process.argv[1].includes(`service_${CONFIG.name}`)) {     // our startup cue
      notify('Request app start.');
      run(app);
    }
  }

// main functions
  async function run(app) {
    // start background service
      console.log(`Start service...`);
      notify('Request service start.');

      const {service} = await start({app, desiredPort:22121});

      notify('Server started.');
      console.log(`App service started.`);

    // set up disk space
      notify('Request cache directory.');
      if ( !fs.existsSync(temp_browser_cache()) ) {
        console.log(`Temp browser cache directory does not exist. Creating...`);
        fs.mkdirSync(temp_browser_cache(), {recursive:true});
        console.log(`Deleted.`);
      }
      if ( !fs.existsSync(app_data_dir()) ) {
        console.log(`App data dir does not exist. Creating...`);
        fs.mkdirSync(app_data_dir(), {recursive:true});
        console.log(`Created.`);
      }
      notify('Cache directory created.');

    // launch UI
      notify('Request user interface.');
      console.log(`Launching UI...`);
      console.log({LAUNCH_OPTS});
      const browser = await ChromeLaunch(LAUNCH_OPTS);
      console.log({browser, ChromeLaunch});
      console.log(`Chrome started.`);
      notify('User interface created.');

    // connect to UI
      notify('Request interface connection.');
      console.log(`Connecting to UI...`);
      const UI = await connect({port:ui_port, exposeSocket: true});
      console.log(`Connected.`);
      notify('User interface online.');

    installCleanupHandlers({ui: UI, bg: service});

    notify && notify('App started.');
    process.disconnect && process.disconnect();
  }

  async function start({app, desiredPort}) {
    let upAt, resolve, reject;
    const pr = new Promise((res, rej) => (resolve = res, reject = rej));

    let port = desiredPort;
    addHandlers(app);

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
  function notify(msg) {
    if ( process.send ) {
      process.send(msg);
    } else {
      say({processSend:msg});
    }
  }

  function addHandlers(app) {
    app.use(express.urlencoded({extended:true}));
    app.use(express.static(SITE_PATH));
  }

  function installCleanupHandlers({ui, bg}) {
    // someone closed the browser window

    const killService = async () => {
      if ( bg.listening ) {
        await stop(bg);
      } else {
        say({killService: 'already closed'});
      }
    };

    ui.socket.on('close', killService);

    // process cleanliness 
      process.on('beforeExit', killService);
      process.on('SIGBREAK', killService);
      process.on('SIGHUP', killService);
      process.on('SIGINT', killService);
      process.on('SIGTERM', killService);
      process.on('error', async (...args) => {
        console.log("Process error ", args);
        await killService();
      });
  }

  async function stop(bg) {
    const serviceTerminator = createHttpTerminator({
      server:bg,
      gracefulTerminatorTimeout: 1000
    });

    say({service:`Closing service...`});

    await serviceTerminator.terminate();

    say({service:'Closed'});
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
