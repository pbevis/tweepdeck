var OAuth = require('./oauth').OAuth;

/**
 * Initialises a new instance of the Twitter class.
 */
function Twitter(options) {
    OAuth.call(this, options);
}

// Inherit from OAuth.
Twitter.prototype = Object.create(OAuth.prototype);

Twitter.prototype.getFollowers = function(id, callback) {
    var parent = this, url = 'https://api.twitter.com/1.1/followers/ids.json?cursor=-1&screen_name=' + id + '&count=100&stringify_ids=true';  
    this.request({ url: url }, function (response) {
        var data = ''
        response.on('data', function (chunk) {
            data += chunk;
        });
        response.on('end', function () {
            var result = JSON.parse(data);
            var body = encodeURIComponent('user_id') + '=' + encodeURIComponent(result.ids.join(','));
            parent.request({ 
                url: 'https://api.twitter.com/1.1/users/lookup.json?include_entities=false',
                method: 'POST',
                body: body
            }, function (response) {
                var data = ''
                response.on('data', function (chunk) {
                    data += chunk;
                });             
                response.on('end', function () {
                    var result = JSON.parse(data);
                    callback(result);
                });
            }).end();
        });
    }).end();
}

/**
 * Expose constructor.
 */
exports.Twitter = Twitter;