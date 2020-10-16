#!/bin/bash

set -e

source ~/.nvm/nvm.sh

nvm use v12.10.0

npm run clean

# build bundled server first
cd src/

npx webpack

cd ../

# make and zip file containing the server.js and 
# the public folder of web assets
# and copy to build/
./scripts/webzip.js

# bundle a node inside (hopefully a temporary fix)
# cp ~/.nvm/versions/node/v12.10.0/bin/node build/

cp src/config.js build/

npm run build

chmod +x build/grader.js

#cp -r build ~/
cp -r bin ~/

serve -p 8080
