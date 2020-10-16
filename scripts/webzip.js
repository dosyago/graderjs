#!/usr/bin/env node

const path = require('path');
const fs = require('fs');

const AdmZip = require('adm-zip');

const file = new AdmZip();

file.addLocalFile(path.resolve(__dirname, '..', 'src', 'build', 'service.js'), 'app');
file.addLocalFile(path.resolve(__dirname, '..', 'src', 'config.js'));
file.addLocalFolder(path.resolve(__dirname, '..', 'src', 'public'), 'app/public');
file.addLocalFolder(path.resolve(__dirname, '..', 'src', 'ui_inject'), 'app/ui_inject');

fs.writeFileSync(path.resolve(__dirname, '..', 'build', 'app.zip'), file.toBuffer());


