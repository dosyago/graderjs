import os from 'os';
import path from 'path';
import fs from 'fs';

import {DEBUG} from './common.js';

const DSP = 22121;

export const service_port = process.env.PORT || process.argv[2] || DSP;

const Pref = {};
const pref_file = path.resolve(os.homedir(), '.grader', 'config.js');

loadPref();

let BasePath = Pref.BasePath;

updateBasePath(process.argv[5] || Pref.BasePath || os.homedir());

const args = {
  service_port, 
  updateBasePath,
  getBasePath,
};

export default args;

function updateBasePath(new_base_path) {
  new_base_path = path.resolve(new_base_path);
  if ( BasePath == new_base_path ) {
    return false;
  }

  console.log(`Updating base path from ${BasePath} to ${new_base_path}...`);
  BasePath = new_base_path;

  console.log(`Base path updated to: ${BasePath}. Saving to preferences...`);
  Pref.BasePath = BasePath;
  savePref();
  console.log(`Saved!`);

  return true;
}

function getBasePath() {
  return BasePath;
}

function loadPref() {
  if ( fs.existsSync(pref_file) ) {
    try {
      Object.assign(Pref, JSON.parse(fs.readFileSync(pref_file).toString('utf-8')));
    } catch(e) {
      DEBUG && console.warn("Error reading from preferences file", e);
    }
  } else {
    console.log("Preferences file does not exist. Creating one..."); 
    savePref();
  }
}

function savePref() {
  try {
    fs.writeFileSync(pref_file, JSON.stringify(Pref));
  } catch(e) {
    DEBUG && console.warn("Error writing preferences file", pref_file, Pref, e);
  }
}

