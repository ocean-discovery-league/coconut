#!/bin/bash

if [[ `uname -s` != "Darwin" ]]; then
    echo "dev.sh is only for running on your mac"
    exit 1;
fi;

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd $DIR || (echo "error!"; exit 1)

VIRTUALIZE_ACTIVATE_VIA_SCRIPT=1 source ./activate

cleanup() {
    kill 0
    exit
}

trap cleanup INT

echo "starting sveltekit client server in backgound"
(cd client && yarn dev) &
sleep 2

echo "starting coconut server in dev mode"
(sleep 4; open http://localhost:6252) &
NODE_ENV=development node_modules/.bin/nodemon -V --watch server/src -x 'node server/src/coconut.js --debug'

wait
