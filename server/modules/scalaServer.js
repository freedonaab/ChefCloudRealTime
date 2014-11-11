var Module = require("./lib/module");
var request = require("request");
var config = require("../config/scalaServer");
var logger = null;

var _request = function (method, route, options, callback) {

    options = options || {};
    options.url = this._.config.ip+":"+this._.config.port;
    options.method = method;
    if (data != null) {
        options.json = data;
    }

    console.log(options.url);

    request(options, callback);
};

var init = function (dependencies, callback) {
    this._ = {};

    this._.config = config;
    this._.request = _request.bind(this);

    logger = dependencies.log;


    logger.log(this.name, "done initializing scala server");
    callback();
};

var onEvent = function (eventName, args) {

};

var scalaServerModule = new Module("scalaServer", {
    init: init,
    onEvent: onEvent,
    dependencies: ["log"]
});

scalaServerModule.extend({

    get: function (route, callback) {
        this.request("GET", route, {}, callback);
    }

});

exports = module.exports = scalaServerModule;
