import Fetch from 'node-fetch';
import Ws from 'ws';

import {context} from './common.js';

const ROOT_SESSION = "browser";

function promisify(context, name, err) {
  return async function(...args) {
    let resolver, rejector;
    const pr = new Promise((res,rej) => ([resolver, rejector] = [res,rej]));

    args.push(promisifiedCallback);

    context[name](...args);

    return pr;

    function promisifiedCallback(...result) {
      let error = err(name);
      if ( !! error ) {
        return rejector(error);    
      }
      return resolver(...result);
    }
  }
}

export default async function connect({port:port = 9222} = {}) {
  try {
    const {webSocketDebuggerUrl} = await Fetch(`http://localhost:${port}/json/version`).then(r => r.json());
    const socket = new Ws(webSocketDebuggerUrl);
    const Resolvers = {};
    const Handlers = {};
    socket.on('message', handle);
    let id = 0;

    let resolve;
    const promise = new Promise(res => resolve = res);

    socket.on('open', () => resolve());

    await promise;

    return {
      send,
      on, ons,
      disconnect: close
    }
    
    async function send(method, params = {}, sessionId) {
      const message = {
        method, params, sessionId, 
        id: ++id
      };
      if ( ! sessionId ) {
        delete message[sessionId];
      }
      const key = `${sessionId||ROOT_SESSION}:${message.id}`;
      let resolve;
      const promise = new Promise(res => resolve = res);
      Resolvers[key] = resolve;
      socket.send(JSON.stringify(message));
      return promise;
    }

    async function handle(message) {
      const stringMessage = message;
      message = JSON.parse(message);
      if ( message.error ) {
        //console.warn(message);
      }
      const {sessionId} = message;
      const {method, params} = message;
      const {id, result} = message;

      if ( id ) {
        const key = `${sessionId||ROOT_SESSION}:${id}`;
        const resolve = Resolvers[key];
        if ( ! resolve ) {
          console.warn(`No resolver for key`, key, stringMessage.slice(0,140));
        } else {
          Resolvers[key] = undefined;
          try {
            await resolve(result);
          } catch(e) {
            console.warn(`Resolver failed`, e, key, stringMessage.slice(0,140), resolve);
          }
        }
      } else if ( method ) {
        const listeners = Handlers[method];
        if ( Array.isArray(listeners) ) {
          for( const func of listeners ) {
            try {
              func({message, sessionId});
            } catch(e) {
              console.warn(`Listener failed`, method, e, func.toString().slice(0,140), stringMessage.slice(0,140));
            }
          }
        }
      } else {
        console.warn(`Unknown message on socket`, message);
      }
    }

    function on(method, handler) {
      let listeners = Handlers[method]; 
      if ( ! listeners ) {
        Handlers[method] = listeners = [];
      }
      listeners.push(wrap(handler));
    }

    function ons(method, handler) {
      let listeners = Handlers[method]; 
      if ( ! listeners ) {
        Handlers[method] = listeners = [];
      }
      listeners.push(handler);
    }

    function close() {
      socket.close();
    }

    function wrap(fn) {
      return ({message, sessionId}) => fn(message.params)
    }
  } catch(e) {
    console.log("Error communicating with browser", e);
    process.exit(1);
  }
}