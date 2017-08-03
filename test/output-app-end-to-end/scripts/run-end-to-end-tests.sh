#!/bin/bash -

MOCHA="npm run testonly -- "

# ensure the user has started the server
echo "checking for server connection"

TEST_DIR=$(dirname $(dirname "$0"))
SEED_DIR=$(dirname $TEST_DIR)/seeds
LOG_FILE=$(dirname $TEST_DIR)/output-app/server/logs/all-logs-readable.log

$MOCHA "$TEST_DIR/index.js" > /dev/null 2> /dev/null
if [[ $? -ne 0 ]]; then
  echo "FAILED: Ensure you have started the server and it is running on port 3000"
  exit 1
fi

echo "seeding database"
mongoimport --drop --host 127.0.0.1:3002 --db database --collection user "$SEED_DIR/User.json"

if [[ $? -ne 0 ]]; then
  echo "FAILED: Ensure that mongo is also running on 3002"
  exit 1
fi

mongoimport --drop --host 127.0.0.1:3002 --db database --collection tweet "$SEED_DIR/Tweet.json"

echo "running tests"

# Test all...
 $MOCHA "$TEST_DIR"

# Test only specific test files...
# $MOCHA "$TEST_DIR/test-1-roles.js"
# $MOCHA "$TEST_DIR/test-2-queries-with-user-role-admin.js"
# $MOCHA "$TEST_DIR/test-3-mutations-with-user-role-admin.js"
# $MOCHA "$TEST_DIR/test-4-mutations-with-unknown-user.js"
# $MOCHA "$TEST_DIR/test-5-mutations-with-user-role-user.js"
# $MOCHA "$TEST_DIR/test-6-mutations-with-user-role-editor.js"

echo "Please consider the log file for debugging $LOG_FILE"
echo ""
