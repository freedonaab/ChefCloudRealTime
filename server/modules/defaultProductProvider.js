var Module = require("./lib/module");
var async = require("async");
var config = require("../config/index");

var logger = null;
var database = null;
var redis = null;

function RedisProductProvider(_redis) {
    var self = this;

    self._ = {};
    self._.redis = _redis;
}


RedisProductProvider.prototype.getProduct = function (productId, callback) {
    console.log("redis: getting product : id :"+productId);
    this._.redis.client.get("products."+productId, function (err, replies) {
        console.log("redis: getting product : result :", err, replies);
        if (err) {
            callback(err, null);
        } else {
            callback(null, JSON.parse(replies));
        }
    });
};

RedisProductProvider.prototype.saveProduct = function (product, callback) {
    this._.redis.client.set("products."+product.id, JSON.stringify(product), function (err, replies) {
        callback(err, null);
    });
};

var init = function (dependencies, callback) {
    var self = this;

    this._ = {};

    logger = dependencies.log;
    database = dependencies[config.database];
    redis = dependencies.redis;

    this._.redisProductProvider = new RedisProductProvider(redis);

    callback();
};

var onEvent = function (eventName, args) {

};

var defaultProductProviderModule = new Module("productProvider", {
    init: init,
    onEvent: onEvent,
    dependencies: ["log", config.database, "redis"]
});

defaultProductProviderModule.extend({

    productExists: function (productId, callback) {
        var self = this;

        //postgres.get("products", ["id", "name", "price"], productId, callback);
    },

    getProduct: function (productId, callback) {
        var self = this;
        async.waterfall([
            function (next) {
                self._.redisProductProvider.getProduct(productId, next);
            },
            function (product, next) {
                if (product) {
                    next(null, { exists: true, product: product });
                } else {
                    database.get("products", ["id", "name", "price"], productId, function (err, product) {
                        next(null, { exists: false, product: product });
                    });
                }
            },
            function (data, next) {
                if (data.exists) {
                    next(null, data.product);
                } else {
                    if (data.product) {
                        self._.redisProductProvider.saveProduct(data.product, function (err) {
                            next(err, data.product);
                        });
                    } else {
                        next("product with id "+productId+"not found", null);
                    }
                }
            }
        ], function (err, product) {
            console.log("final callback: result: ", err, product);
            callback(err, product);
        });
    }
});

exports = module.exports = defaultProductProviderModule;
