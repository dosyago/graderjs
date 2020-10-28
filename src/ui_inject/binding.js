(function () {
  // if binding not present yet following line will throw
  const result = {bindingAttached: !!_graderService};

  top.addEventListener('message', async ({origin, data}) => {
    console.log(`Binding context received...`, origin, data);
    const {apiProxy} = data;
    if ( apiProxy ) {
      top._graderService(JSON.stringify({origin,apiProxy}));
    } 
  });

  top.postMessage("binding ready", "*");

  return result;
}());
