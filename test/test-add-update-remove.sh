#!/bin/bash 
pushd "$(dirname $0)/.." > /dev/null 
PACKAGE_DIR=`pwd` 
popd > /dev/null

CGS="$PACKAGE_DIR/dist/bin/create-graphql-server.js" 
INPUT_DIR="$PACKAGE_DIR/test/input" 
chmod +x $CGS
 
set -e 
MD5HASH=""
TMPDIR1=`mktemp -d 2>/dev/null || mktemp -d -t 'cgs-test-start'` 
TMPDIR2=`mktemp -d 2>/dev/null || mktemp -d -t 'cgs-test-end'` 
TMPDIR3=`mktemp -d 2>/dev/null || mktemp -d -t 'cgs-test-directory-full'`

chmod -R 777 $TMPDIR1
chmod -R 777 $TMPDIR2 
chmod -R 777 $TMPDIR3 

function finish { 
  rm -rf $TMPDIR1
  rm -rf $TMPDIR2 
  rm -rf $TMPDIR3 
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

# Prepare two directories for later comparisons with each other
cd $TMPDIR3 
JWT_KEY='test-key' $CGS init output-app-start

cd $TMPDIR2 
JWT_KEY='test-key' $CGS init output-app-start

cd $TMPDIR1 
JWT_KEY='test-key' $CGS init output-app-start

cd output-app-start
$CGS add-type "$INPUT_DIR/Order-after.graphql" 
$CGS add-type "$INPUT_DIR/Order-before.graphql" 
$CGS add-type "$INPUT_DIR/Tweet.graphql" 
$CGS add-type "$INPUT_DIR/User.graphql" 
# TEST1: Testing of 4 add-types 
# it (should be pattern User, Tweet, Order in model/index.js)
# it (should be pattern User, Tweet, Order  in resolvers/index.js)
# it (should be pattern User, Tweet, Order  in schema/index.js)
# it (should be a model/User.js, resolver/User.js, schema/User.graphql)
# it (should be a model/Tweet.js, resolver/Tweet.js, schema/Tweet.graphql)
# it (should be a model/Order.js, resolver/Order.js, schema/Order.graphql)
# testing files for existence:

if  exists "./model/User.js" &&
    exists "./model/Tweet.js" &&
    exists "./model/Order.js" &&
    exists "./resolvers/User.js" &&
    exists "./resolvers/Tweet.js" &&
    exists "./resolvers/Order.js" &&
    exists "./schema/User.graphql" &&
    exists "./schema/Tweet.graphql" &&
    exists "./schema/Order.graphql" &&
    hasRef "./model/index.js" "User" 4 &&
    hasRef "./model/index.js" "Tweet" 4 &&
    hasRef "./model/index.js" "Order" 4 &&
    hasRef "./resolvers/index.js" "userResolvers" 2 &&
    hasRef "./resolvers/index.js" "tweetResolvers" 2 &&
    hasRef "./resolvers/index.js" "orderResolvers" 2 &&
    hasRef "./schema/index.js" "./User.graphql" 1 &&
    hasRef "./schema/index.js" "./Tweet.graphql" 1 &&
    hasRef "./schema/index.js" "./Order.graphql" 1 ; then
  echo "Test Passed Test1: 4 add-types"
else 
  echo "Test Failed Test1: 4 add-types"
fi

$CGS add-type "$INPUT_DIR/Order-before.graphql" 
# TEST2: Testing of an update
# it (should have a schema/Order.graphql, model/Order.js, resolvers/Order.js file)
# it (should have a pattern in schema/index.js, resolvers/index.js, model/index.js)
# testing files for existence: 
if  exists "./model/User.js" &&
    exists "./model/Tweet.js" &&
    exists "./model/Order.js" &&
    exists "./resolvers/User.js" &&
    exists "./resolvers/Tweet.js" &&
    exists "./resolvers/Order.js" &&
    exists "./schema/User.graphql" &&
    exists "./schema/Tweet.graphql" &&
    exists "./schema/Order.graphql" &&
    hasRef "./model/index.js" "User" 4 &&
    hasRef "./model/index.js" "Tweet" 4 &&
    hasRef "./model/index.js" "Order" 4 &&
    hasRef "./resolvers/index.js" "userResolvers" 2 &&
    hasRef "./resolvers/index.js" "tweetResolvers" 2 &&
    hasRef "./resolvers/index.js" "orderResolvers" 2 &&
    hasRef "./schema/index.js" "./User.graphql" 1 &&
    hasRef "./schema/index.js" "./Tweet.graphql" 1 &&
    hasRef "./schema/index.js" "./Order.graphql" 1 ; then
  echo "Test Passed Test2: update with add-type without file change"
else 
  echo "Test Failed Test2: update with add-type without file change"
fi

echo "# Comment " >> "./model/Order.js"
File1=$(getMD5 "./model/Order.js")
$CGS add-type "$INPUT_DIR/Order-after.graphql" 
File2=$(getMD5 "./model/Order.js")
# TEST3: Testing of update with changed model/Order.js file
# it (should still have the same MD5, meaning file shouldn't have changed)
echo "Calculated Hashes are: $File1 $File2"
if [ "$File1" == "$File2" ]; then
  echo "Test Passed Test3: update with add-type and file change"
else
  echo "Test Failed Test3: update with add-type and file change"
fi
 
echo "\n" >> ./model/Order.js
File1=$(getMD5 "./model/Order.js")
$CGS add-type "$INPUT_DIR/Order-after.graphql" --force-update
File2=$(getMD5 "./model/Order.js")
# TEST4: Testing of update with add-type with changed model/Order.js file with force-update option
# it (should have a different MD5, meaning force-update has altered the file)
echo "Calculated Hashes are: $File1 $File2"
if [ "$File1" != "$File2" ]; then
  echo "Test Passed Test4: update with add-type and file change in --force-update mode"
else
  echo "Test Failed Test4: update with add-type and file change in --force-update mode"
fi

$CGS remove-type "$INPUT_DIR/Order-after.graphql" 
$CGS remove-type "TWEET" 
$CGS remove-type "user" 
# TEST5: Testing 3 remove-types
# it (should be a equal app-test-start and app-test-end directory)
diff -rb "$TMPDIR1" "$TMPDIR2" -x "db" -x "node_modules" -x "nohup.out" -x ".create-graphql-server.checksums"
if [ $? -eq 0 ] ; then 
  echo "Test Passed Test5: 3x remove-type should be equal to the initial directory"
else  
  echo "Test Failed Test5: 3x remove-type should be equal to the initial directory"
fi

# Preparing TEST6 do add-types in alphabetical order to get the right order of references
echo "Preparing Test 6: add-type in the right order for testing full path test with correct reference order"
$CGS add-type "$INPUT_DIR/Order-after.graphql" 
$CGS add-type "$INPUT_DIR/Order-before.graphql" 
$CGS add-type "$INPUT_DIR/Tweet.graphql" 
$CGS add-type "$INPUT_DIR/User.graphql" 
cd $TMPDIR3
cd output-app-start
echo "Do add-type path (all graphql files of the test/input directory in one command)"
$CGS add-type "$INPUT_DIR"
diff -rb "$TMPDIR1" "$TMPDIR3" -x "db" -x "node_modules" -x "nohup.out" -x ".create-graphql-server.checksums"
if [ $? -eq 0 ] ; then 
  echo "Test Passed Test6: add-type path equals the same like multiple single add-type"
else  
  echo "Test Failed Test6: add-type path equals the same like multiple single add-type"
fi

# TEST7: Testing correct files in TMPDIR3
# it (should have a schema/Order.graphql, model/Order.js, resolvers/Order.js file)
# it (should have a pattern in schema/index.js, resolvers/index.js, model/index.js)
# testing files for existence: 
if  exists "./model/User.js" &&
    exists "./model/Tweet.js" &&
    exists "./model/Order.js" &&
    exists "./resolvers/User.js" &&
    exists "./resolvers/Tweet.js" &&
    exists "./resolvers/Order.js" &&
    exists "./schema/User.graphql" &&
    exists "./schema/Tweet.graphql" &&
    exists "./schema/Order.graphql" &&
    hasRef "./model/index.js" "User" 4 &&
    hasRef "./model/index.js" "Tweet" 4 &&
    hasRef "./model/index.js" "Order" 4 &&
    hasRef "./resolvers/index.js" "userResolvers" 2 &&
    hasRef "./resolvers/index.js" "tweetResolvers" 2 &&
    hasRef "./resolvers/index.js" "orderResolvers" 2 &&
    hasRef "./schema/index.js" "./User.graphql" 1 &&
    hasRef "./schema/index.js" "./Tweet.graphql" 1 &&
    hasRef "./schema/index.js" "./Order.graphql" 1 ; then
  echo "Test Passed Test7: add-type path has also correct files and references"
else 
  echo "Test Failed Test7: add-type path has also correct files and references"
fi

echo "Test8 do remove-type path"
$CGS remove-type "$INPUT_DIR"
diff -rb "$TMPDIR2" "$TMPDIR3" -x "db" -x "node_modules" -x "nohup.out" -x ".create-graphql-server.checksums"
if [ $? -eq 0 ] ; then 
  echo "Test Passed Test8: remove-type path should be also equal to the initial directory"
else  
  echo "Test Failed Test8: remove-type path should be also equal to the initial directory"
fi

set +e 
trap - EXIT 
echo " "
echo "ALL TESTS PASSED"
echo " "