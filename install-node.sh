#!/bin/bash

mkdir node
git clone https://github.com/tj/n node/n
(export PREFIX=`pwd`/node; cd node/n; make; make install)
N_PREFIX=`pwd`/node node/bin/n 10.23
source ./activate
npm install -g yarn
