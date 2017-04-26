#!/bin/bash

pushd "$(dirname $0)/.." > /dev/null
PACKAGE_DIR=`pwd`
popd > /dev/null

CGS="$PACKAGE_DIR/dist/bin/create-graphql-server.js"
INPUT_DIR="$PACKAGE_DIR/test/input"
EXPECTED_OUTPUT_DIR="$PACKAGE_DIR/test/output-app"

set -e

TMPDIR=`mktemp -d 2>/dev/null || mktemp -d -t 'cgs-test'`
function finish {
  rm -rf $TMPDIR
  echo
  echo
  echo "Test failed"
}
trap finish EXIT

cd $TMPDIR
JWT_KEY='test-key' $CGS init output-app
cd output-app
$CGS add-type "$INPUT_DIR/Tweet.graphql"
$CGS add-type "$INPUT_DIR/User.graphql"

diff -rb . "$EXPECTED_OUTPUT_DIR" -x "db" -x "node_modules" -x "nohup.out"
set +e

trap - EXIT
echo "Test Passed"
