#!/usr/bin/env node

/* eslint-disable */

var fs = require('fs');
var path = require('path');
var cpr = require('cpr');
var argv = require('minimist')(process.argv.slice(2));
var commands = argv._;

var SKEL_DIR = path.join(__dirname, '..', 'skel');

function usage() {
  console.log('Usage: create-graphql-app <command> <arg>, where command is:');
  console.log(' - create-graphql-app init project-dir');
  console.log(' - create-graphql-app create-type path/to/type.graphql');
  process.exit(1);
}

if (commands[0] === 'init') {
  var projectDir = commands[1];

  if (!projectDir) {
    usage();
  }

  // TODO - nice things like checking the directory doesn't exist

  cpr(SKEL_DIR, projectDir, function(err, files) {
    process.exit(0);
  });
}
