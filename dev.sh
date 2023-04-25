#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd $DIR || (echo "error!"; exit 1)

VIRTUALIZE_ACTIVATE_VIA_SCRIPT=1 source ./activate

if [[ `uname -s` == "Darwin" ]]; then
    # run the client dev environment on a mac
    echo "running the client dev environment"
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
else
    # run the server dev environment on the Maka-Niu
    echo "running the server dev environment"
    INTERFACE="wlan0"

    echo "starting coconut server in dev mode"
    NODE_ENV=development node_modules/.bin/nodemon -V --watch server/src -x "node server/src/coconut.js $INTERFACE"
fi
