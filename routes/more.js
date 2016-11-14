'use strict';

module.exports = function(app, db, options) {
  var UserModel = require('../models/user')(db);
  var concat = require('concat-unique');
  var extend = require('extend');
  var jwt = require('jsonwebtoken');
  var express = require('express');
  var router = express.Router();

  var swaggerDefinition = {
    basePath: '/more'
  };

  /**
   * @swagger
   * /callbackdefault:
   *   get:
   *     description: Default callback after login
   *     tags: [login]
   *     produces:
   *       - application/json
   *     parameters:
   *       - name: jwt
   *         description: token codificado con la información del usuario
   *         in: query
   *         required: false
   *         type: string
   *       - name: err
   *         description: Descripción de error que se ha producido
   *         in: query
   *         required: false
   *         type: string
   *     responses:
   *       200:
   *         description: login
  */
  router.get('/callbackdefault', function(req, res, next){
     var token = req.query.jwt;
     var err = req.query.err;
     console.log('/callbackdefault jwt=' + token +' && err=' + err);
     if (err) {
       res.send("Error: " + err);
     } else {
       jwt.verify(token, options.jwt.secretOrKey, function(err, decoded) {
          if (err) {
            res.send("Error: "+err);
          } else {
            res.send("JWT decoded: " + JSON.stringify(decoded));
          }
       });
     }
   });

   /**
    * @swagger
    * /callbacktest:
    *   get:
    *     description: Callback para pruebas after login
    *     tags: [login]
    *     produces:
    *       - application/json
    *     parameters:
    *       - name: jwt
    *         description: token codificado con la información del usuario
    *         in: query
    *         required: false
    *         type: string
    *       - name: err
    *         description: Descripción de error que se ha producido
    *         in: query
    *         required: false
    *         type: string
    *     responses:
    *       200:
    *         description: login
   */
   router.get('/callbacktest', function(req, res, next){
     var token = req.query.jwt;
     var err = req.query.err;
     console.log('/callbacktest jwt=' + token +' && err=' + err);
     res.send('/callbacktest jwt=' + token +' && err=' + err);
   });

  //swagger docs
  app.use(swaggerDefinition.basePath, router);

  var swaggerJSDoc = require("swagger-jsdoc");
  return swaggerJSDoc({
    // Import swaggerDefinitions
    swaggerDefinition: swaggerDefinition,
    // Path to the API docs
    apis: ['./routes/more.js', './**/express-microservice-auth/routes/more.js'],
  });
}
