var Module = require("./lib/module");
var config = require("../config/redis");
var redis = require("redis");

var logger = null;

var init = function (dependencies, callback) {

    var self = this;
    logger = dependencies.log;

    this._ = {};
    this.config = config;
    this.client  = redis.createClient(config.port, config.ip, {});
    this.client.on("error", function (err) {
        logger.error(self.name, "init redis : error " + err);
        callback(err);
    });
    this.client.on("ready", function () {
        logger.log(self.name, "done intializing redis");
        callback(null);
    });
};

var onEvent = function (eventName, args) {

};

var redisModule = new Module("redis", {
    init: init,
    onEvent: onEvent,
    dependencies: ["log"]
});


module.exports = redisModule;
