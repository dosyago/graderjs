import {DEBUG} from './common.js';
import API from '../index.js';
import CONFIG from '../config.js';

const ALLOWED_ORIGINS = () => {
  const OK = new Set([
    ...CONFIG.apiOrigins || [],
    `http://localhost:${API.ServicePort}`,
    `https://localhost:${API.ServicePort}` 
  ]);
  return OK;
}

let counter = 0;

export default async function bridge(...requestArgs) {
  counter++;
  console.log('Bridge called', requestArgs);
  DEBUG && console.info('Bridge called', requestArgs, API);

  const [{name, payload: stringPayload, executionContextId}] = requestArgs;

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

  const {path, args} = apiProxy;

  try {
    const apiCall = resolvePathToFunction(API, path);

    const revivedArgs = JSON.parse(args);

    const apiResult = await apiCall(...revivedArgs);

    counter += 1;

    console.log({counter, apiResult, time: Date.now()});
    
    return apiResult;
  } catch(e) {
    console.info(`API proxy could not complete request`, {origin, path, args}, e);
    throw new TypeError(`Error on API proxy request: ${e}`);
  }
}

function resolvePathToFunction(root, steps) {
  let link = root;
  let lastLink;
  let index = 0;
  let nextStep = steps[index];

  while(link[nextStep] !== undefined) {
    lastLink = link;
    link = link[nextStep];

    index+=1;
    nextStep = steps[index];
  }

  if ( index < steps.length ) {
    console.info(`Path ended before last step reached`, {lastLink, link, nextStep, steps, root});
    throw new TypeError(`Path was undefined (at ${
        steps.slice(0,index).join('.')
      }) before reaching end of: ${
        steps.join('.')
      }`
    );
  }

  if ( typeof link !== "function" ) {
    console.info(`Path ended at non-function`, {lastLink, nonFunction: link, nextStep, steps, root});
    throw new TypeError(`Path needs to end at a function for API call. But ended at: ${link}`);
  }

  // bind link's this value to lastLink
    // as if it was called via <lastLink>.<link>(
  const reboundFunction = link.bind(lastLink);

  return reboundFunction;
}
