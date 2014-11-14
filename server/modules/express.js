var Module = require("./lib/module");
var express = require("express");

var config = require("../config/express");

var logger = null;

//TODO: refactor routing
var init = function (dependencies, callback) {
    var self = this;

    this._ = {};

    this._.listeners = {};

    this.app = express();


    this.app.get('/', function (req, res) {
        res.send("hello world");
    });

    this.app.get('/socket', function(req, res) {
        res.sendFile(path.join(__dirname ,'..','client','index.html'));
    });

    //debug route
    this.app.get('/redis/flushall', function (req, res) {
        for (var i = 0; i < self._.listeners['/redis/flushall'].length; ++i) {
            self._.listeners['/redis/flushall'][i](req, res);
        }
    });


    this.server = this.app.listen(config.port, function () {
        logger.log(this.name, "listening on port "+config.port);
        logger.log(this.name, "done initializing express");
        callback();
    });

    logger = dependencies.log;


};

var onEvent = function (eventName, args) {

};

var expressModule = new Module("express", {
    init: init,
    onEvent: onEvent,
    dependencies: ["log"]
});

expressModule.extend({

    addListener: function (route, listener) {
        var self = this;
        var listeners = self._.listeners[route];
        if (!listeners) {
            self._.listeners[route] = [];
        }
        self._.listeners[route].push(listener);
    }

});

exports = module.exports = expressModule;
