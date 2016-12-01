#!/bin/bash -

MOCHA="npm run testonly -- "

# ensure the user has started the server
echo "checking for server connection"

$MOCHA ./test/index.js > /dev/null 2> /dev/null
if [[ $? -ne 0 ]]; then
  echo "FAILED: Ensure you have started the server and it is running on port 3000"
  exit 1
fi

echo "seeding database"
mongoimport --drop --host 127.0.0.1:3002 --db database --collection user seeds/user.json

if [[ $? -ne 0 ]]; then
  echo "FAILED: Ensure that mongo is also running on 3002"
  exit 1
fi

mongoimport --drop --host 127.0.0.1:3002 --db database --collection tweet seeds/tweet.json

echo "running tests"

$MOCHA
