#!/bin/bash

mydir=$(pwd)

echo "Installing upx and nexe..."

isupx=$(which upx)
isnexe=$(which nexe)

if [ -z "$isupx" ]; then
  curl -L -o upx.tar.xz https://github.com/upx/upx/releases/download/v3.96/upx-3.96-amd64_linux.tar.xz
  tar -xJf upx.tar.xz
  rm upx.tar.xz
  sudo cp upx-3.96-amd64_linux/upx /usr/local/bin
  rm -rf upx-3.96-amd64_linux
else 
  echo "upx installed already."
fi
if [ -z "$isnexe" ]; then
  npm i -g nexe
  echo "Shrinking nexe binaries..." 
  cd ~/.nexe/
  chmod +x *
  upx *
else
  echo "Nexe installed already."
fi


cd $mydir
