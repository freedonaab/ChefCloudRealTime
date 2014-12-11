var Module = require("./lib/module");
var shortid = require("shortid");
var async = require("async");

var logger = null;
var redis = null;
var postgres = null;

var init = function (dependencies, callback) {
    this._ = {};

    this._.currentId = 0;

    logger = dependencies.log;
    redis = dependencies.redis;


    var _express = dependencies.express;
    _express.addListener('/redis/flushall', _flushRedisCallback.bind(this));

    logger.log(this.name, "done initializing redis order persistence");
    callback();
};

var onEvent = function (eventName, args) {

};

//debug route
var _flushRedisCallback = function (req, res) {
    var self = this;

    self.flushAll(function (err) {
        if (err) {
            res.send("NOT OK -> ", err)
        } else {
            res.send("OK");
        }
    });
};

var redisOrderPersistenceModule = new Module("orderPersistence", {
    init: init,
    onEvent: onEvent,
    dependencies: ["log", "redis", "express"]
});

//restaurant:$id:orders -> list of order ids
//restaurant:$id:orders:$id -> list of

redisOrderPersistenceModule.extend({

    flushAll: function (callback) {
      var self = this;

        redis.client.flushall(callback);
    },

    saveOrder: function (client, order, callback) {
        var self = this;

        order.id = shortid.generate();
        order.dailyId = this._.currentId;
        this._.currentId++;
        //dummy save for now

        async.waterfall([
            function (next) {
                redis.client.set("restaurants:"+client.restaurantId+":orders:"+order.id, JSON.stringify(order), next);
            },
            function (replies, next) {
                redis.client.lpush("restaurants:"+client.restaurantId, order.id, next);
            }
        ], function (err, res) {
            if (err) {
                logger.error(self.name, "error while saving restaurants:"+client.restaurantId+":order:"+order.id+" : "+err);
                callback(err);
            } else {
                logger.info(self.name, "created order with id restaurants:"+client.restaurantId+":orders:"+order.id);
                callback(null, order);
            }
        });

    },

    getOrder: function (client, orderId, callback) {
        var self = this;

        async.waterfall([
            function (next) {
                redis.client.get(self.name, "restaurants:"+client.restaurantId+":orders:"+orderId, next);
            }
        ], function (err, res) {
            if (err) {
                logger.error(self.name, "error while getting order["+order.id+"] from restaurant["+client.restaurantId+"] :"+err);
                callback(err);
            } else {
                logger.info(self.name, "successfully get restaurants:"+client.restaurantId+":orders:"+order.id);
                callback(null, order);
            }
        });
    },

    getAllOrders: function (client, callback) {
        var self = this;

        async.waterfall([
            function (next) {
                redis.client.lrange("restaurants:"+client.restaurantId, 0, -1, next);
            },
            function (orderIds, next) {

                async.map(orderIds, function (orderId, next) {
                    redis.client.get("restaurants:"+client.restaurantId+":orders:"+orderId, next);
                }, next);
            }

        ], function (err, orders) {
            console.log(err, orders);
            if (err) {
                logger.error(self.name, "error while getting all orders from restaurant["+client.restaurantId+"] :"+err);
                callback(err);
            } else {
                logger.info(self.name, "successfully get all orders from restaurant["+client.restaurantId+"]");
                callback(null, orders);
            }
        });
    },

    deleteOrder: function (client, orderId, callback) {
        var self = this;

        async.waterfall([
            function (next) {
                redis.client.del("restaurants:"+client.restaurantId+":orders:"+orderId, next);
            },
            function (res, next) {
                redis.client.lrem("restaurants:"+client.restaurantId, 0, orderId, next);
            }
        ], function (err) {
            if (err) {
                logger.error(self.name, "error while deleting all orders from restaurant["+client.restaurantId+"] :"+err);
                callback(err);
            } else {
                logger.info(self.name, "successfully deleted all orders from restaurant["+client.restaurantId+"]");
                callback(null);
            }
        });
    }

});

exports = module.exports = redisOrderPersistenceModule;
