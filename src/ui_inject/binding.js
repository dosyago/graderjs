(function () {
  const DEBUG = false;

  /* eslint-disable no-undef */
  // if binding not present yet following line will throw 
  // (which we want as it lets us know if binding is present!)
  const attachResult = {bindingAttached: !!_graderService};
  /* eslint-enable no-undef */

  globalThis.top.addEventListener('message', async ({origin, data}) => {
    DEBUG && console.log(`Binding context received...`, origin, data);
    const {id, apiProxy} = data;
    if ( apiProxy && id ) {
      globalThis.top._graderService(JSON.stringify({origin,apiProxy, id}));
    } else {
      DEBUG && console.info(`No apiProxy and id properties, so not a binding context message`, data);
    }
  });

  // add the reverse binding so the service can communicate to the UI
    // this will be called from service using Runtime.evaluate
  Object.defineProperty(globalThis, '_graderUI', {
    value: msg => {
      const {result, id} = msg;
      if ( ! result ) {
        DEBUG && console.info(`Isolated world _graderUI received invalid result object`, msg);
        throw new TypeError(`Isolated world _graderUI received invalid result object`);
      }
      globalThis.top.postMessage({result, id}, "*");
      return true;
    }
  });

  globalThis.top.postMessage("binding ready", "*");

  return attachResult;
}());
