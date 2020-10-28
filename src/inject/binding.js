(function () {
  top.addEventListener('message', async ({origin, data}) => {
    console.log(`Binding context received...`, origin, data);
    const {apiProxy} = data;
    if ( apiProxy ) {
      top._graderService(JSON.stringify({origin,apiProxy}));
    } 
  });

  top.postMessage("binding ready", "*");

  console.log({bindingSide: _graderService});

  return {bindingAttached: !!_graderService};
}());
