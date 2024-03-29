'use strict';

var express = require('express');
var router = express.Router();
var passport = require('passport');

var User = require('../models/user');
var Room = require('../models/room');
var Cipher = require('../cipher/cipherTools');


// Home page
router.get('/', function(req, res, next) {
  // If user is already logged in, then redirect to rooms page
  if (req.isAuthenticated()) {
    res.redirect('/rooms');
  } else {
    res.render('login', {
      success: req.flash('success')[0],
      errors: req.flash('error'),
      showRegisterForm: req.flash('showRegisterForm')[0]
    });
  }
});

// Login
router.post('/login', passport.authenticate('local', {
  successRedirect: '/rooms',
  failureRedirect: '/',
  failureFlash: true
}));

// Register via username and password
router.post('/register', function(req, res, next) {

  var key = Cipher.generatorKeys();
  var codRoom;
  Room.create({
    title: req.body.username,
    privateKey: Cipher.getPrivateKey(key),
    publicKey: Cipher.getPublicKey(key),
		isUsr: "YES"
  }, function(err, newRoom) {
    if (err) throw err;
    console.log("Criou sala de usuario -- " + newRoom)
    codRoom = newRoom._id;

    var credentials = {
      'username': req.body.username,
      'password': req.body.password,
      'publicKey': Cipher.getPublicKey(key),
      'privateKey': Cipher.getPrivateKey(key),
      'codRoom': codRoom
    };

    if (credentials.username === '' || credentials.password === '') {
      req.flash('error', 'Missing credentials');
      req.flash('showRegisterForm', true);
      res.redirect('/');
    } else {

      // Check if the username already exists for non-social account
      User.findOne({
        'username': new RegExp('^' + req.body.username + '$', 'i'),
        'socialId': null
      }, function(err, user) {
        if (err) throw err;
        if (user) {
          req.flash('error', 'Username already exists.');
          req.flash('showRegisterForm', true);
          res.redirect('/');
        } else {
          User.create(credentials, function(err, newUser) {
            if (err) throw err;
            req.flash('success', 'Your account has been created. Please log in.');
            res.redirect('/');
          });
        }
      });
    }

  });
});

// Rooms
router.get('/rooms', [User.isAuthenticated, function(req, res, next) {
  Room.find(function(err, rooms) {
    if (err) throw err;
    res.render('rooms', {
      rooms
    });
  });
}]);

// Chat Room
router.get('/chat/:id', [User.isAuthenticated, async function(req, res, next) {
  var roomId = req.params.id;
  var room = await Room.findById(roomId);

  res.render('chatroom', {
    user: req.user,
    room: room
  });

}]);

// Logout
router.get('/logout', function(req, res, next) {
  // remove the req.user property and clear the login session
  req.logout();

  // destroy session data
  req.session = null;

  // redirect to homepage
  res.redirect('/');
});

router.post('/decipher', async function(req, res) {
  var roomId = req.body.roomId;
  var msg = req.body.message;

  var roo = await Room.findById(roomId);

  console.log('routes PrivateKey:  ' + roo.privateKey);
  console.log('routes messageContent  ' + msg);

  return await Cipher.decipher(msg, roo.privateKey);
});


module.exports = router;
