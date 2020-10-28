(function () {
  top.addEventListener('message', async ({origin, data}) => {
    console.log(`Binding context received...`, origin, data);
    const {apiProxy} = data;
    if ( apiProxy ) {
      top._graderService(JSON.stringify({origin,apiProxy}));
    } 
  });

  const result = {bindingAttached: !!_graderService};

  top.postMessage("binding ready", "*");

  return result;
}());
