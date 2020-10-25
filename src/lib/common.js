// determine where this code is running 

export const DEBUG = process.env.DEBUG_grader || true;

export const NO_SANDBOX = process.env.DEBUG_grader || false;

export const APP_ROOT = __dirname;

export const sleep = ms => new Promise(res => setTimeout(res, ms));

export function say(o) {
  console.log(JSON.stringify(o));
}
