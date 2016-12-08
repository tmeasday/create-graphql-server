#!/bin/bash

pushd "$(dirname $0)/.." > /dev/null
PACKAGE_DIR=`pwd`
popd > /dev/null

CGS="$PACKAGE_DIR/bin/create-graphql-server.js"
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
$CGS init output-app
cd output-app
$CGS add-type "$INPUT_DIR/tweet.graphql"
$CGS add-type "$INPUT_DIR/user.graphql"

set +e

diff -rb . "$EXPECTED_OUTPUT_DIR"

trap - EXIT
echo "Test Passed"
