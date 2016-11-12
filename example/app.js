'use strict';

console.log("Starting example server...");

var mongoose = require('mongoose');
mongoose.set('debug', true);

var express = require('express');
var app = express();

app.set('port', (process.env.PORT || 3000));

var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

var expressMicroserviceAuth = require('../');

var swaggerDefinition = {
  host: 'localhost:'+app.get('port'),
  basePath: '/auth/v1',
  schemes: ['http']
}
app.use('/auth/v1', expressMicroserviceAuth(require('./db'), swaggerDefinition, require('./options.json')));

var swaggerDefinitionBis = {
  host: 'localhost:'+app.get('port'),
  basePath: '/authBis/v1',
  schemes: ['http']
}
app.use('/authBis/v1', expressMicroserviceAuth(require('./dbBis'), swaggerDefinitionBis, require('./options.json')));


app.get("/", function(req, res) {
  res.status(200).send("express-microservice-auth EXAMPLE SERVER /");
});

app.listen(app.get('port'), function() {
  console.log('Listening on %s', app.get('port'))
});
