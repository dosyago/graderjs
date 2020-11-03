#!/bin/bash

echo "Making it Grader-ified..."

cd ../../

git clone https://github.com/c9fe/grader-base.git

rm -f package*
rm -rf node_modules

cp -r grader-base/* .

rm -rf grader-base/

echo $(pwd)

npm i --verbose


