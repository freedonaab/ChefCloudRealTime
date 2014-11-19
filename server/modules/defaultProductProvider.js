var Module = require("./lib/module");
var async = require("async");

var logger = null;
var postgres = null;
var redis = null;

function RedisProductProvider(_redis) {
    var self = this;

    self._ = {};
    self._.redis = _redis;
}


RedisProductProvider.prototype.getProduct = function (productId, callback) {
    this._.redis.client.get("products."+productId, function (err, replies) {
        if (err) {
            callback(err, null);
        } else {
            console.log(replies);
            callback(null, replies);
        }
    });
};

RedisProductProvider.prototype.saveProduct = function (product, callback) {
    this._.redis.client.set("products."+product.id, product, function (err, replies) {
        callback(err, null);
    });
};

var init = function (dependencies, callback) {
    var self = this;

    this._ = {};

    logger = dependencies.log;
    postgres = dependencies.postgres;
    redis = dependencies.redis;

    this._.redisProductProvider = new RedisProductProvider(redis);

    callback();
};

var onEvent = function (eventName, args) {

};

var postgresProductProviderModule = new Module("productProvider", {
    init: init,
    onEvent: onEvent,
    dependencies: ["log", "postgres", "redis"]
});

postgresProductProviderModule.extend({

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
                    postgres.get("products", ["id", "name", "price"], productId, function (err, product) {
                        next(null, { exists: false, product: product });
                    });
                }
            },
            function (data, next) {
                if (data.exists) {
                    next(data.product);
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
            callback(err, product);
        });
    }
});

exports = module.exports = postgresProductProviderModule;
