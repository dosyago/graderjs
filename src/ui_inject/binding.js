(function () {
  /* eslint-disable no-undef */
  // if binding not present yet following line will throw 
  // (which we want as it lets us know if binding is present!)
  const result = {bindingAttached: !!_graderService};
  /* eslint-enable no-undef */

  globalThis.top.addEventListener('message', async ({origin, data}) => {
    console.log(`Binding context received...`, origin, data);
    const {apiProxy} = data;
    if ( apiProxy ) {
      globalThis.top._graderService(JSON.stringify({origin,apiProxy}));
    } 
  });

  // add the reverse binding so the service can communicate to the UI
    // this will be called from service using Runtime.evaluate
  Object.defineProperty(globalThis, '_graderUI', {
    value: msg => {
      const {result} = msg;
      if ( ! result ) {
        console.info(`Isolated world _graderUI received invalid result object`, msg);
        throw new TypeError(`Isolated world _graderUI received invalid result object`);
      }
      globalThis.top.postMessage({result});
      return true;
    }
  });

  globalThis.top.postMessage("binding ready", "*");

  return result;
}());
