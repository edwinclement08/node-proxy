#!/usr/local/bin/node
var pem = require('https-pem');
const write = require('write');

 
write('key.pem', pem.key, {newline: true});
write('cert.pem', pem.cert, {newline: true});

