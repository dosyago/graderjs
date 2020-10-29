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

  globalThis.top.postMessage("binding ready", "*");

  return result;
}());
