{
  const DEBUG = false;
  const GRADER_API_SLOT = 'grader';
  const SLOT_DESCRIPTOR = Object.create(null);
  const $ = Symbol.for(`[[GraderProxyHandlerPrivates]]`);
  const AwaitingPromises = new Map();

  const Target = async () => await void 0;

  let ID = 1;
  let readyRes;
  let ServiceIsReady = new Promise(res => readyRes = res);
  let GraderProxy, HandlerInstance, revoke; 
  let ready = false;

  if ( globalThis.self == globalThis.top ) {
    // we should probably do security checks on origin
    globalThis.top.addEventListener('message', ({origin,data}) => {
      if ( data == "binding ready" ) {
        ready = true;
        DEBUG && console.log("API Proxy notified that service binding is ready", origin);
        readyRes(true);
      } else if ( data == "turnOff" ) {
        ready = false;
        turnOff();
      } else if ( typeof data == "object" )  {
        if ( data.apiProxy ) return;
        if ( !(data.id && data.result) ) return;
        try {
          const {id, result} = data;
          const key = id + '';
          const {resolve, reject} = AwaitingPromises.get(key);
          AwaitingPromises.delete(key);
          if ( ! resolve ) {
            throw new TypeError(`No resolver for message ${key} with result ${result}`);
          } else {
            if ( result.error ) {
              reject(result.error);
            } else {
              resolve(result.value); 
            }
          }
        } catch(e) {
          DEBUG && console.info(`Error when message received`, data, e);
        }
      }
    });

    // a way to communicate with service before we install binding
      console.log(JSON.stringify({
        graderRequestInstallBinding: true
      }));
  }

  class Handler {
    constructor() {
      const Privates = Object.create(null);
      Privates.path = new Array();

      Object.defineProperty(this, $, {
        get: () => Privates
      });
    }

    apply(targ, thisArg, args) {
      const handler = this;

      guard('apply', handler, targ, GraderProxy);

      try {
        args = JSON.stringify(args);
      } catch(e) {
        DEBUG && console.warn(`apply.JSON.stringify error`, e);
        throw new TypeError(`Arguments need to be able to be serialized by JSON.stringify`);
      }

      if ( thisArg !== GraderProxy ) {
        throw new TypeError(`Do not rebind this when calling APIs using the ${GRADER_API_SLOT} proxy.`);
      }

      const path = Array.from(this[$].path);
      this[$].path.length = 0;

      return send({path, args});
    }

    get(targ, prop, recv) {
      const handler = this;

      guard('get', handler, targ, recv);

      this[$].path.push(prop.toString());

      return recv;
    }

    // not possible 
      construct() {
        throw new TypeError(`Not constructible.`);
      }
      defineProperty() {
        throw new TypeError(`Not possible.`);
      }
      deleteProperty() {
        throw new TypeError(`Not possible.`);
      }
      getOwnPropertyDescriptor() {
        throw new TypeError(`Not possible.`);
      }
      getPrototypeOf() {
        throw new TypeError(`Not possible.`);
      }
      has() {
        throw new TypeError(`Not possible.`);
      }
      isExtensible() {
        throw new TypeError(`Not possible.`);
      }
      ownKeys() {
        throw new TypeError(`Not possible.`);
      }
      preventExtensions() {
        throw new TypeError(`Not possible.`);
      }
      set() {
        throw new TypeError(`Not possible.`);
      }
      setPrototypeOf() {
        throw new TypeError(`Not possible.`);
      }
  }

  HandlerInstance = new Handler;

  ({proxy: GraderProxy, revoke} = Proxy.revocable(Target, HandlerInstance));

  SLOT_DESCRIPTOR.get = () => GraderProxy;

  Object.freeze(SLOT_DESCRIPTOR);
  Object.defineProperty(globalThis, GRADER_API_SLOT, SLOT_DESCRIPTOR);
  Object.defineProperty(globalThis, 'graderReady', {
    value: async () => ServiceIsReady
  });

  /* eslint-disable no-inner-declarations */

  function guard(source, handler, targ, recv) {
    if ( handler !== HandlerInstance ) {
      throw new TypeError(`${source}: this needs to be the HandlerInstance`);
    }

    if ( targ !== Target ) {
      throw new TypeError(`${source}: targ needs to be the Target`);
    }

    if ( recv !== GraderProxy ) {
      throw new TypeError(`${source}: recv needs to be the GraderProxy`);
    }
  }

  // send using binding added with Runtime.addBinding
  async function send(data) {
    let resolve, reject;
    const pr = new Promise((res, rej) => (resolve = res, reject = rej));
    if ( ! ready ) {
      const error = TypeError(`Binding is not ready yet.`);
      reject(error);
    } else {
      DEBUG && console.log("Will send", data);
      const id = nextId();
      const key = id + '';
      AwaitingPromises.set(key, {resolve, reject});
      globalThis.top.postMessage({id, apiProxy:data}, "*");
    }

    return pr;
  }

  // disable the binding
  function turnOff() {
    revoke();
  }

  function nextId() {
    return ID++;
  }

  /* eslint-enable no-inner-declarations */
}
