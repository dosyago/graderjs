#!/bin/bash

source ~/.nvm/nvm.sh

nvm use v12.10.0

npm run clean

# build bundled server first
cd src/

npx webpack

cd ../

# bundle a node inside (hopefully a temporary fix)
cp ~/.nvm/versions/node/v12.10.0/bin/node build/

npm run build-nix

chmod +x build/grader.js

cp -r build ~/
cp -r bin ~/

#serve -p 8080
