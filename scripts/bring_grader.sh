#!/bin/bash

echo "Making it Grader-ified..."

git clone https://github.com/c9fe/grader-base.git
cp -r grader-base/* .

npm i

