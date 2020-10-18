import Fetch from 'node-fetch';
import Ws from 'ws';

const ROOT_SESSION = "browser";

export default async function connect({port:port = 9222} = {}) {
  const Resolvers = {};
  const Handlers = {};
  let id = 0;
  let socket;

  try {
    const {webSocketDebuggerUrl} = await Fetch(`http://localhost:${port}/json/version`).then(r => r.json());
    let resolve;
    const promise = new Promise(res => resolve = res);

    socket = new Ws(webSocketDebuggerUrl);

    socket.on('message', handle);
    socket.on('open', () => resolve());

    await promise;

    return {
      send,
      on, ons,
      disconnect: close
    }
    
  } catch(e) {
    console.log("Error communicating with browser", e);
    process.exit(1);
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
    const {method} = message;
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
    return ({message}) => fn(message.params)
  }
}
