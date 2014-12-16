var Module = require("./lib/module");
var colors = require('colors');

var init = function (dependencies, callback) {
    this._ = {};

    this.log(this.name, "done initializing log");
    callback();
};

var onEvent = function (eventName, args) {

};

var logModule = new Module("log", {
    init: init,
    onEvent: onEvent,
    dependencies: []
});

var _log = function (moduleName, message) {
    console.log(("[INFO] ["+moduleName+"] : "+message).white);
};

logModule.extend({

    log: _log,
    info: _log,
    warn: function (moduleName, message) {
        console.log(("[WARN] ["+moduleName+"] : "+message).yellow);
    },
    error: function (moduleName, message) {
        console.log(("[ERROR] ["+moduleName+"] : "+message).red);
    },
    custom: function (moduleName, message, color) {
        console.log(("["+moduleName+"] : "+message)[color]);
    }
});

exports = module.exports = logModule;
