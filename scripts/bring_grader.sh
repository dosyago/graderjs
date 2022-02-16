#!/bin/bash

if [ -z "$1" ]; then
  echo "Use: graderjs <my-app-dir-name>"
  exit 1
fi

set -e

echo
echo "Making it Grader-ified..."

mkdir -p $1

cd $1

set +e
bash -e <<TRY
  git init
  git clone https://github.com/crisdosyago/grader-base.git
TRY

set -e

if [ $? -ne 0 ]; then
  echo "Git not installed. That's ok. Downloading zip/tar ball..."
  curl -o grader-base-master.zip -L https://github.com/crisdosyago/grader-base/archive/master.zip
  unzip grader-base-master.zip
  mv grader-base-master grader-base
fi

# make sure there's nothing in this directory to run install
rm -f package*
rm -rf node_modules

rm -rf grader-base/.git

cp -r grader-base/* .
cp -r grader-base/.gitignore .

rm -rf grader-base/

npm i --verbose

echo 'grader_app_name="'$1'"' > name.txt

echo
echo "Grader app directory created!"
echo
echo "Make sure you have nvm installed, and also node 14.15.3 (nvm install 14.15.3 will do it)."
echo "Then you can run"
echo "cd ./$1 && ./scripts/compile.sh"
echo "right now to get some binaries."
echo "Or copy your SPA into the ./$1/src/public/ folder (or start editing in there)"
echo "Or if you need more functionality you can also edit ./$1/src/app.js"
echo "to build your own app."
echo "See the docs: https://github.com/crisdosyago/graderjs or open the README.md in this directory"
echo "Happy Grading!"
echo

