{
  top.addEventListener('message', async ({origin, data}) => {
    console.log(`Binding context received...`, origin, data);
    const {apiProxy} = data;
    if ( apiProxy ) {
      self._graderService(JSON.stringify({origin,apiProxy}));
    } 
  });

  top.postMessage("binding ready", "*");
}
