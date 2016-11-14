'use strict';

module.exports = function(app, db, options) {
  var UserModel = require('../models/user')(db);
  var AccessModel = require('../models/access')(db);
  var googleapiGetEmail = require('googleapi-get-email');
  var concat = require('concat-unique');
  var extend = require('extend');
  var jwt = require('jsonwebtoken');
  var yyyymmdd = require('yyyy-mm-dd');
  var passport = require('passport');
  //var JwtStrategy = require('passport-jwt').Strategy;
  //var ExtractJwt = require('passport-jwt').ExtractJwt;
  var express = require('express');
  var router = express.Router();

  options = extend(true, {},
      {
        "authOpts": {
          passReqToCallback : true,
          session: false,
          scope: []
        }
        ,"common": {
          passReqToCallback : true,
          session: false
        }
        /*,"jwt": {
          jwtFromRequest: ExtractJwt.fromAuthHeader()
        }*/
        ,"facebook": {
          "enableRedirect": false,
          "enableToken": false,
          "callbackURL": options.path + '/login/facebook/callback',
          "profileFields": ["id", "displayName", "photos", "email"],
          "scope": []
        }
        ,"google": {
          "enableRedirect": false,
          "enableToken": false,
          "enableAuthcode": false,
          "callbackURL": options.path + '/login/google/callback',
          "scope": ["profile", "https://www.googleapis.com/auth/userinfo.email"]
        }
        ,"twitter": {
          "enableRedirect": false,
          "enableToken": false,
          "callbackURL": options.path + '/login/twitter/callback'
        }
        ,"instagram": {
          "enableRedirect": false,
          "enableToken": false,
          "callbackURL": options.path + '/login/instagram/callback'
        }
        ,"github": {
          "enableRedirect": false,
          "enableToken": false,
          "callbackURL": options.path + '/login/github/callback'
        }
        ,"local": {
          "enable": false,
          "callbackURL": options.path + '/login/local/callback'
        }
      },
      options
  );
  console.log("express-miroservice-auth login options: ",options);

  var swaggerDefinition = {
    basePath: '/login'
  };

  var callback = function(req, accessToken, refreshToken, profile, done) {
      console.log('login passport callback. profile: '+ JSON.stringify(profile));
      var filter = { "$or": [] };
      var profileEmail = profile.email ? profile.email : profile._json.email;
      if (!profileEmail && profile.provider == "google") {
        googleapiGetEmail(accessToken).then(function(emailInfo) {
          if (emailInfo.isVerified) {
            profileEmail = emailInfo.email;
          }
          callback1();
        }).catch(function(err) {
          console.log(err);
          callback1();
        });
      } else {
        callback1();
      }

      function callback1() {
        if (profile.id) {
          var or = {};
          or[req.params.method+"Id"] = profile.id;
          filter['$or'].push(or);
        }
        if (profileEmail) {
          filter['$or'].push({"email": profileEmail});
        }
        /*if (req.user) {
          filter['$or'].push({id: req.user.id});
        }*/
        console.log("callback filter: "+JSON.stringify(filter));

        UserModel.findOne(
            filter,
            function (err, userPm) {
                if(userPm) {
                  fillInfo(userPm._doc);
                  for(var prop in userPm._doc) {
                    userPm.markModified(prop);
                  }
                  userPm.save(callbackFinish);
                } else {
                  UserModel.create(fillInfo({}), callbackFinish);
                }
            }
        );
      }

      function callbackFinish(err, user) {
        done(err, user._doc);
        AccessModel.create({user: user._doc._id});
      }

      function fillInfo(user) {
        user[profile.provider+"Id"] = profile.id;
        user[profile.provider+"Token"] = accessToken;
        user.fullname = user.fullname ? user.fullname : profile.displayName;
        user.fullname = user.fullname ? user.fullname : ((profile.name.givenName ? profile.name.givenName : '') + (profile.name.givenName && profile.name.familyName ? ' ' : '') + (profile.name.familyName ? profile.name.familyName : ''));
        user.birthday = user.birthday ? user.birthday : profile.birthday;
        user.gender = user.gender ? user.gender : profile.gender;
        user.email = user.email ? user.email : profileEmail;
        user.language = user.language ? user.language : profile.language;
        if (typeof user.photos == 'undefined') {
          user.photos = [];
        }
        if (profile.photos) {
          for (var photoJson of profile.photos) {
            if (user.photos.indexOf(photoJson.value) == -1) {
              user.photos.push(photoJson.value);
            }
          }
        }
        return user;
      }
    }

    var finish = function(req, res, err, user) {//function(req, res, next) {
      var callbackRedirect = req.query.callback;
      callbackRedirect = callbackRedirect ? callbackRedirect : req.query.state;
      callbackRedirect = callbackRedirect ? callbackRedirect : '../../more/callbackdefault';
      var indexOfQ = callbackRedirect.indexOf('?');
      var query = '';
      if (err) {
        query = 'err=' + err;
      } else {
        //var user = req.user;
        var token = jwt.sign(user, options.jwt.secretOrKey, { expiresIn: options.jwt.expiresInSeconds });
        console.log('user: '+ JSON.stringify(user));
        console.log('token: %s ', token);

        query = 'jwt=' + encodeURIComponent(token);
      }
      res.redirect(callbackRedirect + (indexOfQ == -1 ? '?' : '&') + query);
  }

    /**
     * @swagger
     * /{method}:
     *   get:
     *     description: Login to the application with method
     *     tags: [login]
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: method
     *         description: Tipo de login (facebook, google, local, twitter...)
     *         in: path
     *         required: true
     *         type: string
     *       - name: callback
     *         description: Dirección de callback a la que se le pasará un parámetro "jwt"
     *         in: query
     *         required: true
     *         type: string
     *     responses:
     *       200:
     *         description: login
    */
    router.get('/:method', function(req, res, next) {
      var method = req.params.method;
      console.log('/login/'+method);
      var authOpts = extend({}, options.authOpts);
      authOpts.scope = req.query.scope ? req.query.scope.split('|') : [];
      authOpts.scope = concat(authOpts.scope, options[method].scope);

      if (req.query.callback) {
        authOpts.state = req.query.callback;
      }
      if (req.user) {
        passport.authenticate(method, authOpts)( req, res, next );
      } else {
        passport.authorize(method, authOpts)( req, res, next );
      }
    });

    /**
     * @swagger
     * /{method}/token:
     *   get:
     *     description: Login to the application with method
     *     tags: [login]
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: method
     *         description: Tipo de login (facebook, google, local, twitter...)
     *         in: path
     *         required: true
     *         type: string
     *       - name: access_token
     *         description: access_token
     *         in: query
     *         required: true
     *         type: string
     *     responses:
     *       200:
     *         description: login
    */
    router.get('/:method/token', function(req, res, next) {
      var method = req.params.method;
      console.log('/login/'+method+"/token");
      var authOpts = extend({}, options.authOpts);

      if (req.user) {
        passport.authenticate(method+"-token", function(err, user) {
          finish(req, res, err, user);
        })(req, res, next);
      } else {
        passport.authorize(method+"-token", function(err, user) {
          finish(req, res, err, user);
        })(req, res, next);
      }
    });


    /**
     * @swagger
     * /{method}/authcode:
     *   get:
     *     description: Login to the application with method
     *     tags: [login]
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: method
     *         description: Tipo de login (facebook, google, local, twitter...)
     *         in: path
     *         required: true
     *         type: string
     *       - name: authcode
     *         description: authcode
     *         in: query
     *         required: true
     *         type: string
     *     responses:
     *       200:
     *         description: login
    */
    router.get('/:method/authcode', function(req, res, next) {
      var method = req.params.method;
      console.log('/login/'+method+"/authcode");
      var authOpts = extend({}, options.authOpts);

      if (req.user) {
        passport.authenticate(method+"-authcode", function(err, user) {
          finish(req, res, err, user);
        })(req, res, next);
      } else {
        passport.authorize(method+"-authcode", function(err, user) {
          finish(req, res, err, user);
        })(req, res, next);
      }
    });

  /**
   * @swaggerINTERNAL
   */
  router.get('/:method/callback',  function(req, res, next) {
    var method = req.params.method;
    console.log('/login/'+method+'/callback query='+ JSON.stringify(req.query));
    passport.authenticate(method, options.authOpts, function(err, user) {
      finish(req, res, err, user);
    })(req, res, next);
  });


  if (options.facebook.enableRedirect) {
    var Strategy = require('passport-facebook').Strategy;
    passport.use(new Strategy(extend({}, options.common, options.facebook), callback));
  }
  if (options.facebook.enableToken) {
    var Strategy = require('passport-facebook-token');
    passport.use(new Strategy(extend({}, options.common, options.facebook), callback));
  }


  if (options.google.enableRedirect) {
    var Strategy = require('passport-google-oauth20').Strategy;
    passport.use(new Strategy(extend({}, options.common, options.google), callback));
  }
  if (options.google.enableToken) {
    var Strategy = require('passport-google-token').Strategy;
    passport.use(new Strategy(extend({}, options.common, options.google), callback));
  }
  if (options.google.enableAuthcode) {
    var Strategy = require('passport-google-authcode').Strategy;
    passport.use(new Strategy(extend({}, options.common, options.google), callback));
  }


  if (options.twitter.enableRedirect) {
    var Strategy = require('passport-twitter').Strategy;
    passport.use(new Strategy(extend({}, options.common, options.twitter), callback));
  }
  if (options.twitter.enableToken) {
    var Strategy = require('passport-twitter-token');
    passport.use(new Strategy(extend({}, options.common, options.twitter), callback));
  }


  if (options.instagram.enableRedirect) {
    var Strategy = require('passport-instagram').Strategy;
    passport.use(new Strategy(extend({}, options.common, options.instagram), callback));
  }
  if (options.instagram.enableToken) {
    var Strategy = require('passport-instagram-token').Strategy;
    passport.use(new Strategy(extend({}, options.common, options.instagram), callback));
  }


  if (options.github.enableRedirect) {
    var Strategy = require('passport-github').Strategy;
    passport.use(new Strategy(extend({}, options.common, options.github), callback));
  }
  if (options.github.enableToken) {
    var Strategy = require('passport-github-token').Strategy;
    passport.use(new Strategy(extend({}, options.common, options.github), callback));
  }


  if (options.local.enable) {
    var LocalStrategy = require('passport-local').Strategy;
    passport.use(new LocalStrategy(extend({}, options.common, options.local), function(req, id, password, done) {
        UserModel.findOne({ localId: id }, function (err, user) {
          if (err) { return done(err); }
          if (!user) { return done(null, false); }
          if (!user.verifyLocalPassword(password)) {
            return done(null, false);
          }
          return done(null, user);
        });
    }));
  }
   /*if (options.jwt) passport.use(new JwtStrategy(extend({}, options.common, options.jwt), function(payload, done) {
       UserModel.findOne({id: payload.id}, function(err, user) {
           if (err) {
               return done(err, false);
           }
           if (user) {
               done(null, user);
           } else {
               done(null, false);
           }
       });
   }));*/

  //swagger docs
  app.use(swaggerDefinition.basePath, router);

  var swaggerJSDoc = require("swagger-jsdoc");
  return swaggerJSDoc({
    // Import swaggerDefinitions
    swaggerDefinition: swaggerDefinition,
    // Path to the API docs
    apis: ['./routes/login.js', './**/express-microservice-auth/routes/login.js'],
  });

}
