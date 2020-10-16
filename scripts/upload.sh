#!/bin/sh

gpush patch "New release" 
description=$1
latest_tag=$(git describe --abbrev=0)
grel release -u dosyago -r grader --tag $latest_tag --name "New release" --description '"'"$description"'"'
grel upload -u dosyago -r grader --tag $latest_tag --name "grader.exe" --file grader.exe
grel upload -u dosyago -r grader --tag $latest_tag --name "grader.macos" --file grader.mac
grel upload -u dosyago -r grader --tag $latest_tag --name "grader.linux" --file grader.nix
grel upload -u dosyago -r grader --tag $latest_tag --name "grader.linx32" --file grader.nix32
grel upload -u dosyago -r grader --tag $latest_tag --name "grader.win32.exe" --file grader.win32.exe



