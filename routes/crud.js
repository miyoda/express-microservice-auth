'use strict';

module.exports = function(app, db, options) {
  var swaggerAdd = require('../utils/swagger-add');
  var Resource = require('resourcejs');
  var express = require('express');
  var router = express.Router();

  var UserModel = require('../models/user')(db);
  var AccessModel = require('../models/access')(db);

  var models = {
    'user': {
      model: UserModel,
      parentOf: {
        'access': {
          model: AccessModel
        }
      }
    }
  };

  router.use(function(req, res, next) {
      if (!options || !options.api_keys || options.api_keys.length != 0 && options.api_keys.indexOf(req.query.api_key) == -1) {
          console.log("Invalid api_key: "+req.query.api_key);
          res.status(401).send({ error: 'Invalid api_key' });
      } else {
        delete req.query.api_key;
        return next();
      }
  });

  var swaggerDefinition = {
    'basePath': '/crud'
  };

  prepareCrud(models, '');

  function prepareCrud(models, basePath, before) {
    for (var modelKey in models) {
        var modelInfo = models[modelKey];
        //var modelResource = Resource(router, '', modelKey, model).rest(); //without dependencies
        var modelResource = Resource(router, basePath, modelKey, modelInfo.model).rest({
          before: before ? before : function(req, res, next)  {
            req.query.populate = req.query.populate ? req.query.populate : '__NONE__';
            next();
          }
        });
        swaggerAdd(swaggerDefinition, modelResource.swagger());

        if (modelInfo.parentOf) {
          prepareCrud(modelInfo.parentOf, basePath+"/"+modelKey+"/:"+modelKey+"Id", function(req, res, next)  {
            req.body[modelKey] = req.params[modelKey+"Id"];
            req.modelQuery = this.model.where(modelKey, req.params[modelKey+"Id"]);
            //req.modelQuery = req.modelQuery.populate(modelKey)
              req.query.populate = req.query.populate ? req.query.populate : '__NONE__';
              next();
          });
        }

        /*var modelSwagger = modelResource.swagger();
        swaggerDefinition.paths = extend(swaggerDefinition.paths, modelSwagger.paths);
        swaggerDefinition.definitions = extend(swaggerDefinition.definitions, modelSwagger.definitions);*/
    }

  }

  app.use(swaggerDefinition.basePath, router);

  return swaggerDefinition;
}
