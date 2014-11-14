var Module = require("./lib/module");
var shortid = require("shortid");

var logger = null;
var redis = null;

var init = function (dependencies, callback) {
    this._ = {};

    this._.currentId = 0;

    logger = dependencies.log;
    redis = dependencies.redis;


    logger.log(this.name, "done initializing redis order persistence");
    callback();
};

var onEvent = function (eventName, args) {

};

var redisOrderPersistenceModule = new Module("orderPersistence", {
    init: init,
    onEvent: onEvent,
    dependencies: ["log", "redis"]
});

redisOrderPersistenceModule.extend({

    saveOrder: function (order, callback) {
        var self = this;

        order.id = shortid.generate();
        order.dailyId = this._.currentId;
        this._.currentId++;
        //dummy save for now
        redis.client.set("orders:"+order.id, order, function (err, replies) {
            if (err) {
                logger.error(self.name, "error while saving order["+order.id+"] : "+err);
                callback(err);
            } else {
                logger.info(self.name, "created order with id orders:"+order.id+" in redis");
                callback(null, order);
            }
        });
    }

});

exports = module.exports = redisOrderPersistenceModule;
