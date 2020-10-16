import os from 'os';
import path from 'path';
import fs from 'fs';

const DSP = 22121;
const DCP = 8222;

export const server_port = process.env.PORT || process.argv[2] || DSP;
export const chrome_port = process.argv[3] || DCP;

const Pref = {};
const pref_file = path.resolve(os.homedir(), '.grader.config.json');
const cacheId = Math.random().toString('36');

loadPref();

let BasePath = Pref.BasePath;
const temp_browser_cache = () => path.resolve(os.homedir(), '.temp-browser-cache' + cacheId);
const app_data_dir = () => path.resolve(os.homedir(), '.app-data');

console.log(`Args usage: <server_port> <chrome_port> <... other args>`);

updateBasePath(process.argv[5] || Pref.BasePath || os.homedir());

const args = {
  server_port, 
  chrome_port,
  updateBasePath,
  getBasePath,
  temp_browser_cache,
  app_data_dir
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
      Object.assign(Pref, JSON.parse(fs.readFileSync(pref_file)));
    } catch(e) {
      console.warn("Error reading from preferences file", e);
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
    console.warn("Error writing preferences file", pref_file, Pref, e);
  }
}

