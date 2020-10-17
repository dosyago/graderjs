#!/bin/bash

source ~/.nvm/nvm.sh

nvm use v12.10.0

npm run build

chmod +x build/grader.js

