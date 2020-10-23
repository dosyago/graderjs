#!/bin/bash

mydir=$(pwd)

echo "Installing nexe and upx..."

isnexe=$(which nexe)
isupx=$(which upx)

if [ -z "$isnexe" ]; then
  npm i -g nexe
else
  echo "Nexe installed already."
fi
if [ -z "$isupx" ]; then
  curl -L -o upx.tar.xz https://github.com/upx/upx/releases/download/v3.96/upx-3.96-amd64_linux.tar.xz
  tar -xJf upx.tar.xz
  rm upx.tar.xz
  sudo cp upx-3.96-amd64_linux/upx /usr/local/bin
  rm -rf upx-3.96-amd64_linux
else 
  echo "upx installed already."
fi

echo "Shrinking nexe binaries..."

cd ~/.nexe/
chmod +x *
upx *

cd $mydir
