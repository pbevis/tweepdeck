var https = require('https'),
    url = require('url'),
    querystring = require('querystring'),
    crypto = require('crypto'),
    utils = require('./utils');

/**
 * Initialises a new instance of the OAuth class.
 */
function OAuth(options) {
    this._consumerKey = options.consumerKey;
    this._consumerSecret = options.consumerSecret;
    this._token = options.token;
    this._tokenSecret = options.tokenSecret;
}

OAuth.prototype.request = function(options, callback) {
    utils.extend(options, {
        consumerKey: this._consumerKey,
        consumerSecret: this._consumerSecret,
        method: 'GET',
        headers: {
            'Accept': '*/*',
            'Connection': 'close'
        },
        nonce: this._generateNonce(32),
        signature: null,
        signatureMethod: 'HMAC-SHA1',
        timestamp: Math.floor(new Date().getTime()/1000),
        token: this._token,        
        tokenSecret: this._tokenSecret,
        version: "1.0"       
    });
    
    if (options.method == 'POST') {
        // Ensure the content type is set. POST requests use 'application/x-www-form-urlencoded' by default.
        utils.extend(options.headers, {
            'Content-Type': 'application/x-www-form-urlencoded'
        });        
        // Ensure the content length is set if the body is a string.
        if (options.body && typeof options.body == 'string') {
            utils.extend(options.headers, {
                'Content-Length': options.body.length
            });
        }
    }
    
    // Build the request signature hash.
    options.signature = this._getRequestSignature(options);
    
    // Add the Authorization header.
    options.headers['Authorization'] = this._getAuthorisationHeader(options);
    
    // Parse the URL so we can access the component parts for the request.
    var parts = url.parse(options.url);
    
    var request = https.request({
        host: parts.host,
        method: options.method,
        path: parts.path,
        headers: options.headers
    }, callback);
    
    // Send the body of the request if its a POST.
    if (options.method == 'POST' && options.body) {
        request.write(options.body);
    }
    
    return request;
};

/**
 * Generates nonce string. The term "nonce" means ‘number used once’ and is a unique and usually random string that is meant to uniquely identify each signed request.
 */
OAuth.prototype._generateNonce = function(size) {
    var nonce = [],
        chars = ['a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z','A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z','0','1','2','3','4','5','6','7','8','9'],
        pos;
    for (var i = 0; i < size; i++) {
        pos = Math.floor(Math.random() * chars.length);
        nonce[i]=  chars[pos];
    }
    return nonce.join('');  
};

/**
 * Gets the OAuth signature for the request.
 */
OAuth.prototype._getRequestSignature = function(options) {
    var parts = url.parse(options.url);
    dictionary = querystring.parse(parts.query);

    // Add each query string parameter to a key/value pair array so they can be sorted.
    var parameters = [];
    for (var key in dictionary) {
        parameters.push({ key: encodeURIComponent(key), value: encodeURIComponent(dictionary[key]) });
    };
    
    // Include any POST parameters in the body if required.
    if (options.headers['Content-Type'] == 'application/x-www-form-urlencoded' && options.body) {
        dictionary = querystring.parse(options.body);
        for (var key in dictionary) {
            parameters.push({ key: encodeURIComponent(key), value: encodeURIComponent(dictionary[key]) });
        };
    }
    
    // Include the standard OAuth parameters.
    parameters.push({ key: encodeURIComponent('oauth_consumer_key'), value: encodeURIComponent(options.consumerKey) });
    parameters.push({ key: encodeURIComponent('oauth_nonce'), value: encodeURIComponent(options.nonce) });
    parameters.push({ key: encodeURIComponent('oauth_signature_method'), value: encodeURIComponent(options.signatureMethod) });
    parameters.push({ key: encodeURIComponent('oauth_timestamp'), value: encodeURIComponent(options.timestamp) });
    parameters.push({ key: encodeURIComponent('oauth_token'), value: encodeURIComponent(options.token) });
    parameters.push({ key: encodeURIComponent('oauth_version'), value: encodeURIComponent(options.version) });

    // Sort the parameters by key and then by value. 
    parameters.sort(function(a,b) {
        var result = a.key.localeCompare(b.key);
        if (result === 0) {
            a.value.localeCompare(b.value);
        }
        return result;
    });

    // Build the parameters string by concatinating the key/value pairs.
    var parameterString = '';
    parameters.forEach(function (element, index) {
        parameterString = parameterString + element.key + '=' + element.value + '&';
    });  
    parameterString = parameterString.substring(0, parameterString.length - 1);
    
    // Prepend the protocol and the URL (minus the query string).
    signatureString = encodeURIComponent(parts.href.substring(0, parts.href.indexOf(parts.search))) + '&' + encodeURIComponent(parameterString);
    signatureString = options.method.toUpperCase() + '&' + signatureString;

    // Build the signing key from the consumer secret the token secret.
    signingKey = encodeURIComponent(options.consumerSecret) + '&' + encodeURIComponent(options.tokenSecret);

    // Create the signature hash from the signature string and the signing key.
    var signature = encodeURIComponent(crypto.createHmac('sha1', signingKey).update(signatureString).digest('base64'));
    return signature;
};

/**
 * Gets the OAuth authorisation string for the request.
 */
OAuth.prototype._getAuthorisationHeader = function(options) {
    var header = 'OAuth oauth_consumer_key="' + options.consumerKey + '"';
    header = header + ', oauth_nonce="' + options.nonce + '"';
    header = header + ', oauth_signature="' + options.signature + '"';
    header = header + ', oauth_signature_method="' + options.signatureMethod + '"';
    header = header + ', oauth_timestamp="' + options.timestamp + '"';
    header = header + ', oauth_token="' + options.token + '"';
    header = header + ', oauth_version="' + options.version + '"';
    return header;
};

/**
 * Expose constructor.
 */
exports.OAuth = OAuth;