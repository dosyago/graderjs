import path from 'path';
import express from 'express';

import args from './lib/args.js';
import {say} from './lib/common.js';

const SITE_PATH = path.resolve(__dirname, '..', 'src', 'public');

console.log({SITE_PATH});

const app = express();

let Server, upAt, port;

const AppServer = {
  start, stop
}

export default AppServer;

if ( require.main === module ) {
  start({server_port:22121});
}

async function start({server_port}) {
  let resolve, reject;
  const pr = new Promise((res, rej) => (resolve = res, reject = rej));

  port = server_port;
  addHandlers();

  Server = app.listen(Number(port), err => {
    if ( err ) { 
      reject(err);
    } 
    upAt = new Date;
    say({server_up:{upAt,port}});
    resolve({upAt,port});
  });

  return pr;
}

function addHandlers() {
  app.use(express.urlencoded({extended:true}));
  app.use(express.static(SITE_PATH));
}

async function stop() {
  let resolve;
  const pr = new Promise(res => resolve = res);

  console.log(`Closing server...`);

  Server.close(() => {
    console.log(`Server closed.`);
    resolve();
  });

  return pr;
}


