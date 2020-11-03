#!/bin/bash

echo "Making it Grader-ified..."

cd ../../

git clone https://github.com/c9fe/grader-base.git

cp -r grader-base/* .

npm i

rm -rf grader-base/

