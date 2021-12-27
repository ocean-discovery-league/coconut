#!/bin/bash

node_version=16.13.1

mkdir -p node
git clone https://github.com/tj/n node/n
(export PREFIX=`pwd`/node; cd node/n; make; make install)

#pi zero arch no longer officially supported on node versions > 11
#https://raspberrypi.stackexchange.com/questions/111130/how-to-install-nodejs-v12-on-raspi-zero-armv6-not-available-for-download-anymor
# download the unofficial build and stick it into n's downloaded versions directory
# so it'll find it there and not try to look for it at nodejs.org and fail
if [[ `uname -m` -eq "arm6l" ]]; then
    echo "Downloading nodejs ${node_version} for armv6 from unofficial builds..."
    mkdir -p node/n/versions/node
    (cd node/n/versions/node
     curl -O https://unofficial-builds.nodejs.org/download/release/v${node_version}/node-v${node_version}-linux-armv6l.tar.xz
     tar -xf node-v${node_version}-linux-armv6l.tar.xz
     mv node-v${node_version}-linux-armv6l ${node_version}
     rm node-v${node_version}-linux-armv6l.tar.xz
    )
fi

N_PREFIX=`pwd`/node node/bin/n $node_version

# arm6l version of node crashes because of no wasm support
if [[ `name -m` -eq "arm6l" ]]; then
    mv node/bin/node{,.actual}
    cat > node/bin/node <EOF
#!/bin/sh
node_actual="`dirname $0`/node.actual"
exec "${node_actual}" --no-expose-wasm $*
EOF
    chmod +x node/bin/node
fi

source ./activate
npm install -g yarn
