var express = require('express'),
    passport = require('passport'),
    TwitterStrategy = require('passport-twitter').Strategy,
    Twitter = require('./lib/twitter').Twitter
    app = express();
    
var CONSUMER_KEY = 'tmIkEIh5Rjo4Fgr9iQJw',
    CONSUMER_SECRET = 'DKfi5iyvsAQScssQYvRIp3N63oKOuo3qt09EwiZrEI';

app.configure(function() {
  app.use(express.static('public'));
  app.use(express.cookieParser());
  app.use(express.bodyParser());
  app.use(express.session({ secret: '1234567890' }));
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(app.router);
});

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

passport.use(new TwitterStrategy({
    consumerKey: CONSUMER_KEY,
    consumerSecret: CONSUMER_SECRET,
    callbackURL: "http://localhost:3000/auth/twitter/callback"
  },
  function(token, tokenSecret, profile, done) {
      var user = profile;
      user.token = token;
      user.tokenSecret = tokenSecret;
      return done(null, user);
  }
));

// Redirect the user to Twitter for authentication.  When complete, Twitter
// will redirect the user back to the application at
//   /auth/twitter/callback
app.get('/auth/twitter', passport.authenticate('twitter'));

// Twitter will redirect the user to this URL after approval.  Finish the
// authentication process by attempting to obtain an access token.  If
// access was granted, the user will be logged in.  Otherwise,
// authentication has failed.
app.get('/auth/twitter/callback',    
  passport.authenticate('twitter', { successRedirect: '/',
                                     failureRedirect: '/login' }));
                                    
app.get('/followers/:id', function(req, res) {
    var twitter = new Twitter({
        consumerKey: CONSUMER_KEY, 
        consumerSecret: CONSUMER_SECRET,
        token: req.user.token,
        tokenSecret: req.user.tokenSecret
    });
    
    twitter.getFollowers(req.params.id, function (result) {
        res.send(result);
    });
});

// Start the app by listening on <port>
var port = process.env.PORT || 3000
app.listen(port)

console.log('App listenning on port: ' + port)