var Module = require("./lib/module");

var logger = null;

//TODO: refactor this module so it fully encapsulates express

var init = function (dependencies, callback) {
    this._ = {};

    this.app = global.app;
    this.server = global.server;
    logger = dependencies.log;


    logger.log(this.name, "done initializing express");
    callback();
};

var onEvent = function (eventName, args) {

};

var expressModule = new Module("express", {
    init: init,
    onEvent: onEvent,
    dependencies: ["log"]
});

expressModule.extend({



});

exports = module.exports = expressModule;
