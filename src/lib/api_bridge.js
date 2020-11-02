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
  DEBUG && console.info('Bridge called', requestArgs);

  const [{uiName, name, payload: stringPayload, executionContextId}] = requestArgs;

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

    // this 1 line creates our UI is last argument 
    // and must be default parameter set to App.UI 
    // API calling convention
    if ( apiCall.toString().includes('UI = App.UI') ) {
      if ( revivedArgs.length == apiCall.length ) {
        // check if it's a string (must be as it must be the name of UI)
        // this is how one UI can call API on another UI
        // by specifying the UI arg as a string name for the other UI
        const lastArg = revivedArgs.pop();
        if ( typeof lastArg == "string" ) {
          revivedArgs.push(API._serviceOnly.getUI(lastArg));
        } else {
          throw new TypeError(`If API call has UI as last parameter, caller must either leave it blank (to be called on its own UI) or specify a string name of the UI on which the call is to be made. This call received a last argument of: ${lastArg} which is incorect.`);
        }
      } else {
        // add the requested UI to the end of the args
        revivedArgs.push(API._serviceOnly.getUI(uiName));
      }
    }

    const apiResult = await apiCall(...revivedArgs);

    DEBUG && (counter += 1);

    DEBUG && console.log({counter, apiResult, time: Date.now()});
    
    return apiResult;
  } catch(e) {
    console.info(`API proxy could not complete request`, {origin, path, args}, e);
    throw e;
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
    throw new TypeError(`API method ${steps.join('.')} was not found. Reason: Path was undefined (at ${
        steps.slice(0,index+1).join('.')
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
