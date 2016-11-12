'use strict';

console.log("Starting example server...");
var port = 3000;

var mongoose = require('mongoose');
mongoose.set('debug', true);

var express = require('express');
var app = express();

var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

var expressMicroserviceAuth = require('../');

var swaggerDefinition = {
  host: 'localhost:'+port,
  basePath: '/auth/v1',
  schemes: ['http']
}
app.use('/auth/v1', expressMicroserviceAuth(require('./db'), swaggerDefinition, require('./options.json')));

var swaggerDefinitionBis = {
  host: 'localhost:'+port,
  basePath: '/authBis/v1',
  schemes: ['http']
}
app.use('/authBis/v1', expressMicroserviceAuth(require('./dbBis'), swaggerDefinitionBis, require('./options.json')));


app.get("/", function(req, res) {
  res.status(200).send("express-microservice-auth EXAMPLE SERVER /");
});

app.listen(port, function() {
  console.log('Listening on %s', port)
});
