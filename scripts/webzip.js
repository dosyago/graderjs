#!/usr/bin/env node

const path = require('path');
const fs = require('fs');

const AdmZip = require('adm-zip');

const file = new AdmZip();

console.log("HELLO");

file.addLocalFile(path.resolve(__dirname, '..', 'src', 'build', 'server.js'), 'app');
file.addLocalFolder(path.resolve(__dirname, '..', 'src', 'public'), 'app/public');

fs.writeFileSync(path.resolve(__dirname, '..', 'build', 'app.zip'), file.toBuffer());


