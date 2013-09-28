var express = require('express'),
    passport = require('passport'),
    https = require('https'),
    url = require('url'),
    querystring = require('querystring'),
    crypto = require('crypto'),
    util = require('util'),
    TwitterStrategy = require('passport-twitter').Strategy,
    OAuth = require('./oauth').OAuth,
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

    var oAuth = new OAuth({
        consumerKey: CONSUMER_KEY, 
        consumerSecret: CONSUMER_SECRET,
        token: req.user.token,
        tokenSecret: req.user.tokenSecret
    });
  
    // Get a list of follower ids.
    var url = 'https://api.twitter.com/1.1/followers/ids.json?cursor=-1&screen_name=' + req.params.id + '&count=100&stringify_ids=true';  
    oAuth.request({ url: url }, function (response) {
        console.log("Got response: " + response.statusCode);
        var data = ''
        response.on('data', function (chunk) {
            data += chunk;
        });
        response.on('end', function () {
            var result = JSON.parse(data);
            var body = encodeURIComponent('user_id') + '=' + encodeURIComponent(result.ids.join(','));
            oAuth.request({ 
                url: 'https://api.twitter.com/1.1/users/lookup.json?include_entities=false',
                method: 'POST',
                body: body
            }, function (response) {
                console.log("Got response: " + response.statusCode);
                var data = ''
                response.on('data', function (chunk) {
                    data += chunk;
                });             
                response.on('end', function () {
                    res.send(JSON.parse(data));
                });
            }).end();
        });
    }).end();
  
  //res.send(url.parse('https://api.twitter.com/1.1/followers/ids.json?cursor=-1&screen_name=pbevis&count=5000'));
  
  /*var config = {
    url: 'https://api.twitter.com/1.1/followers/ids.json?cursor=-1&screen_name=pbevis&count=5000',
    method: 'GET',
    consumerKey: CONSUMER_KEY,
    signature: null,
    signatureMethod: 'HMAC-SHA1',
    token: req.user.token,
    //token: '80892654-KCx7LTHCaVcp13NjeGEkSvOge3QIdweKaOqb3TzpH',
    timestamp: Math.floor(new Date().getTime()/1000),
    version: "1.0",
    consumerSecret: CONSUMER_SECRET,
    tokenSecret: req.user.tokenSecret
    //tokenSecret: 'VkAwOYPPJTjnYwsVCQuped9lmSnO04ld0YocVxWvg'
  };
  
  var nonce = [];
  var chars = ['a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z','A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z','0','1','2','3','4','5','6','7','8','9'];
  var pos;  
  for (var i = 0; i < 32; i++) {
    pos = Math.floor(Math.random() * chars.length);
    nonce[i]=  chars[pos];
  }
  config.nonce = nonce.join('');
  
  //console.log(oAuth);
  config.nonce = oAuth.generateNonce(32);
  
  var parts = url.parse(config.url);
  dictionary = querystring.parse(parts.query);
  dictionary.oauth_consumer_key = config.consumerKey;
  dictionary.oauth_nonce = config.nonce;
  dictionary.oauth_signature_method = config.signatureMethod;
  dictionary.oauth_timestamp = config.timestamp;
  dictionary.oauth_token = config.token;
  dictionary.oauth_version = config.version;
  
  // Convert the dictionary to an array of key/value pairs so it can be sorted.
  var array = [];
  for (var key in dictionary) {
    if (dictionary.hasOwnProperty(key)) {
      array.push({ key: encodeURIComponent(key), value: encodeURIComponent(dictionary[key]) });
    }
  };
  
  // Sort the pairs by key and then by value. 
  array.sort(function(a,b) {
    var result = a.key.localeCompare(b.key);
    if (result === 0) {
      a.value.localeCompare(b.value);
    }
    return result
  });
  
  // Build the parameters string by concatinating the key/value pairs.
  var parameterString = '';
  array.forEach(function (element, index) {
    parameterString = parameterString + element.key + '=' + element.value + '&';
  });  
  parameterString = parameterString.substring(0, parameterString.length - 1);

  // Prepend the protocol and the URL (minus the query string).
  signatureString = encodeURIComponent(parts.href.substring(0, parts.href.indexOf(parts.search))) + '&' + encodeURIComponent(parameterString);
  signatureString = config.method.toUpperCase() + '&' + signatureString;
  
  // Build the signing key from the consumer secret the token secret.
  signingKey = encodeURIComponent(config.consumerSecret) + '&' + encodeURIComponent(config.tokenSecret);
  
  // Create the signature hash from the signature string and the signing key.
  config.signature = encodeURIComponent(crypto.createHmac('sha1', signingKey).update(signatureString).digest('base64'));
  
  var oAuth = 'OAuth oauth_consumer_key="' + config.consumerKey + '"';
  oAuth = oAuth + ', oauth_nonce="' + config.nonce + '"';
  oAuth = oAuth + ', oauth_signature="' + config.signature + '"';
  oAuth = oAuth + ', oauth_signature_method="' + config.signatureMethod + '"';
  oAuth = oAuth + ', oauth_timestamp="' + config.timestamp + '"';
  oAuth = oAuth + ', oauth_token="' + config.token + '"';
  oAuth = oAuth + ', oauth_version="' + config.version + '"';
   
  var options = {
    host: 'api.twitter.com',
    method: config.method,
    path: '/1.1/followers/ids.json?cursor=-1&screen_name=pbevis&count=5000',
    headers: {
      'Connection': 'close',
      'User-Agent': 'TweepDeck',
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': oAuth
    }
  };
  
  var request = https.request(options, function (response) {
    console.log("Got response: " + response.statusCode);
    var data = ''
    response.on('data', function (chunk) {
      data += chunk;
    });
    response.on('end', function () {
      res.send(JSON.parse(data));
    });
  });
  request.end();*/
    
  //res.send('Followers of ' + req.user.displayName + ' (@' + req.user.username + ')');
});

// Start the app by listening on <port>
var port = process.env.PORT || 3000
app.listen(port)

console.log('App listenning on port: ' + port)