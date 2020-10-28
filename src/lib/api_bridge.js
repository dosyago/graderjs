import API from '../index.js';
import CONFIG from '../config.js';

const ALLOWED_ORIGINS = () => new Set([
  ...CONFIG.apiOrigins || [],
  "https://localhost:${API.ServicePort}" 
]);


export default async function bridge(...args) {
  console.log('Bridge called', args, API);

  const [{name, payload: stringPayload, executionContextId}] = args;

  let payload;

  try {
    payload = JSON.parse(stringPayload);  
  } catch(e) {
    console.info(`Error parsing API bridge payload`, name, payload, executionContextId);
    throw new TypeError(`Error parsing API bridge payload ${e}`);
  }

  const {origin, apiProxy} = payload;

  if ( ! origin || ! apiProxy ) {
    console.info(`Malformed apiProxy request`, {stringPayload, origin, apiProxy});
    throw new TypeError(`API bridge received malformed apiProxy request. Requires origin and apiProxy properties.`);
  }

  if ( ! ALLOWED_ORIGINS().has(origin) ) {
    console.info(`Illegitimate origin requesting API bridge access`, {stringPayload, origin, apiProxy});
    throw new TypeError(`API bridge received apiProxy request from disallowed origin. If you want this origin to make API bridge requests, add it to the config.apiOrigins list.`);
  }

  try {
    const {path, args} = apiProxy;

    const {callThis, apiCall} = resolvePath(API, path);

    const apiResult = await apiCall.call(callThis, ...args);

    console.log({apiResult});
    
    return apiResult;
  } catch(e) {
    console.info(`API proxy could not complete request`, {origin, path, args}, e);
    throw new TypeError(`Error on API proxy request: ${e}`);
  }
}
