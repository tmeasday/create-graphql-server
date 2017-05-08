#!/bin/bash 
pushd "$(dirname $0)/.." > /dev/null 
PACKAGE_DIR=`pwd` 
popd > /dev/null

CGS="$PACKAGE_DIR/dist/bin/create-graphql-server.js" 
INPUT_DIR="$PACKAGE_DIR/test/input-authorization" 
chmod +x $CGS
 
set -e 

MD5HASH=""
TMPDIR1=`mktemp -d 2>/dev/null || mktemp -d -t 'cgs-test-authorization'` 

chmod -R 777 $TMPDIR1

function finish { 
  rm -rf $TMPDIR1
  echo 
  echo 
  echo "Test failed" 
} 
trap finish EXIT

function exists {
  if [ -f $1 ] ; then
    return 0
  else
    echo "Error: File is missing: " $1
    return 1
  fi
}

function ifDirExistsRemove {
  if [ -d $1 ] ; then
    rm -rf $1
  fi
}

function hasRef {
  if [ -f $1 ] ; then
    if [ `grep -o $2 $1 | wc -l` -eq $3 ] ; then
      return 0
    else
      echo "Error: File" $1 "contains" `grep -o $2 $1 | wc -l` "times the string '"$2"'. Expected are" $3 "times."
      return 1
    fi
  else
    echo "Error: File is missing: " $1
    return 1
  fi
}

function getMD5 {
  # Detect Operating system
  OS=$(uname)
  MD5HASH=""
  case "$OS" in
    "Darwin")
    { 
      MD5HASH=$(md5 -q $1)
    } ;;
    "Linux")
    {
      MD5HASH=($(md5sum $1))
    } ;;
    *)
    {
      echo "Test failed. Unsopported OS"
      exit
    } ;;
  esac
  echo "$MD5HASH"
}

function openDevEnv {
  OS=$(uname)
  MD5HASH=""
  case "$OS" in
      "Darwin")
    { 
      PWD=$(pwd)
      open $PWD
      # open -a iTerm $PWD
      subl . &
      yarn install && yarn start
    } ;;
  esac
}

# Prepare directory
echo 'cd $TMPDIR1'
cd $TMPDIR1
ifDirExistsRemove output-app-start

echo 'JWT_KEY=test-key $CGS init output-app-start'
JWT_KEY='test-key' $CGS init output-app-start

echo 'cd output-app-start'
cd output-app-start

echo '$CGS add-user "$INPUT_DIR/User1.graphql"'
$CGS add-user "$INPUT_DIR/User1.graphql"

echo '$CGS add-user "$INPUT_DIR/User2.graphql"'
$CGS add-user "$INPUT_DIR/User2.graphql"

echo '$CGS add-type "$INPUT_DIR/Post1.graphql"'
$CGS add-type "$INPUT_DIR/Post1.graphql" 

echo '$CGS add-type "$INPUT_DIR/Post2.graphql"'
$CGS add-type "$INPUT_DIR/Post2.graphql"

# TEST1: Testing of 4 add-types 
# it (should be pattern User1, User2, Post1, Post2 in model/index.js)
# it (should be pattern User1, User2, Post1, Post2 in resolvers/index.js)
# it (should be pattern User1, User2, Post1, Post2 in schema/index.js)
# it (should be pattern User1, User2, Post1, Post2 in authorization/index.js)
# it (should be a model/User1.js, resolver/User1.js, schema/User1.graphql, authorization/User1.js)
# it (should be a model/User2.js, resolver/User2.js, schema/User2.graphql, authorization/User2.js)
# it (should be a model/Post1.js, resolver/Post1.js, schema/Post1.graphql, authorization/Post1.js)
# it (should be a model/Post2.js, resolver/Post2.js, schema/Post2.graphql, authorization/Post2.js)
# testing files for existence:

if  exists "./model/User1.js" &&
    exists "./model/User2.js" &&
    exists "./model/Post1.js" &&
    exists "./model/Post2.js" &&

    exists "./resolvers/User1.js" &&
    exists "./resolvers/User2.js" &&
    exists "./resolvers/Post1.js" &&
    exists "./resolvers/Post2.js" &&

    exists "./schema/User1.graphql" &&
    exists "./schema/User2.graphql" &&
    exists "./schema/Post1.graphql" &&
    exists "./schema/Post2.graphql" &&

    exists "./authorization/User1.js" &&
    exists "./authorization/User2.js" &&
    exists "./authorization/Post1.js" &&
    exists "./authorization/Post2.js" &&

    hasRef "./model/index.js" "User1" 4 &&
    hasRef "./model/index.js" "User2" 4 &&
    hasRef "./model/index.js" "Post1" 4 &&
    hasRef "./model/index.js" "Post2" 4 &&

    hasRef "./resolvers/index.js" "user1Resolvers" 2 &&
    hasRef "./resolvers/index.js" "user2Resolvers" 2 &&
    hasRef "./resolvers/index.js" "post1Resolvers" 2 &&
    hasRef "./resolvers/index.js" "post2Resolvers" 2 &&

    hasRef "./schema/index.js" "./User1.graphql" 1 &&
    hasRef "./schema/index.js" "./User2.graphql" 1 &&
    hasRef "./schema/index.js" "./Post1.graphql" 1 &&
    hasRef "./schema/index.js" "./Post2.graphql" 1 &&

    hasRef "./authorization/User1.js" "isUser" 1 &&
    hasRef "./authorization/User1.js" "defaultUserRole" 1 &&
    hasRef "./authorization/User1.js" "firstUserRole" 1 &&
    hasRef "./authorization/User1.js" "adminUserRole" 1 &&
    hasRef "./authorization/User1.js" "ownerField" 1 &&
    hasRef "./authorization/User1.js" "roleField" 1 &&
    hasRef "./authorization/User1.js" "create" 1 &&
    hasRef "./authorization/User1.js" "read" 1 &&
    hasRef "./authorization/User1.js" "update" 2 &&
    hasRef "./authorization/User1.js" "delete" 1 &&

    hasRef "./authorization/User2.js" "isUser" 1 &&
    hasRef "./authorization/User2.js" "defaultUserRole" 1 &&
    hasRef "./authorization/User2.js" "firstUserRole" 1 &&
    hasRef "./authorization/User2.js" "adminUserRole" 1 &&
    hasRef "./authorization/User2.js" "ownerField" 1 &&
    hasRef "./authorization/User2.js" "roleField" 1 &&
    hasRef "./authorization/User2.js" "create" 1 &&
    hasRef "./authorization/User2.js" "read" 1 &&
    hasRef "./authorization/User2.js" "update" 1 &&
    hasRef "./authorization/User2.js" "delete" 1 &&

    hasRef "./authorization/Post2.js" "ownerField" 1 &&
    hasRef "./authorization/Post2.js" "roleField" 1 &&
    hasRef "./authorization/Post2.js" "create" 1 &&
    hasRef "./authorization/Post2.js" "read" 1 &&
    hasRef "./authorization/Post2.js" "update" 1 &&
    hasRef "./authorization/Post2.js" "delete" 1 &&

    hasRef "./authorization/Post2.js" "ownerField" 1 &&
    hasRef "./authorization/Post2.js" "roleField" 1 &&
    hasRef "./authorization/Post2.js" "create" 1 &&
    hasRef "./authorization/Post2.js" "read" 1 &&
    hasRef "./authorization/Post2.js" "update" 1 &&
    hasRef "./authorization/Post2.js" "delete" 1 &&

    hasRef "./schema/User1.graphql" "name" 3 &&
    hasRef "./schema/User1.graphql" "email" 3 &&
    hasRef "./schema/User1.graphql" "password" 2 &&
    hasRef "./schema/User1.graphql" "role:" 3 &&

    hasRef "./schema/User2.graphql" "name" 3 &&
    hasRef "./schema/User2.graphql" "email" 3 &&
    hasRef "./schema/User2.graphql" "password" 2 &&
    hasRef "./schema/User2.graphql" "role:" 3 &&

    hasRef "./schema/Post1.graphql" "post:" 3 &&
    hasRef "./schema/Post1.graphql" "owner:" 1 &&
    hasRef "./schema/Post1.graphql" "ownerId:" 2 &&

    hasRef "./schema/Post2.graphql" "post:" 3 &&
    hasRef "./schema/Post2.graphql" "owner:" 1 &&
    hasRef "./schema/Post2.graphql" "ownerId:" 2 &&

    hasRef "./authorization/index.js" "User1" 4 &&
    hasRef "./authorization/index.js" "User2" 4 &&
    hasRef "./authorization/index.js" "Post1" 4 &&
    hasRef "./authorization/index.js" "Post2" 4 ; then
  echo "Test Passed Test1: 4 add-types"
  openDevEnv
else 
  echo "Test Failed Test1: 4 add-types"
fi

set +e 
trap - EXIT 
echo " "
echo "ALL TESTS PASSED"
echo " "