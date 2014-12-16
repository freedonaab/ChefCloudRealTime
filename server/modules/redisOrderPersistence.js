var Module = require("./lib/module");
var shortid = require("shortid");
var async = require("async");
var _ = require("underscore");
var config = require("../config/index");

var logger = null;
var redis = null;
var database = null;

var init = function (dependencies, callback) {
    this._ = {};

    this._.currentId = 0;

    logger = dependencies.log;
    redis = dependencies.redis;
    database = dependencies[config.database];

    var _express = dependencies.express;

    _express.addListener('/redis/flushall', _flushRedisCallback.bind(this));

    _express.addListener('/restaurants/:restaurantId/orders', _indexPaidOrders.bind(this));
    _express.addListener('/restaurants/:restaurantId/orders/:orderId', _showPaidOrders.bind(this));



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

//debug route
var _indexPaidOrders = function (req, res) {

    var orders_datas = [];

    var orders_result = [];

    async.waterfall([
        function (next) {
            database.query("SELECT orders.id AS \"order_id\", users.id AS \"user_id\", orders.restaurant_id, orders.price, orders.created_by, orders.created_at, users.first_name, users.familly_name, users.email, users.image FROM orders, users WHERE orders.created_by = users.id AND orders.restaurant_id = "+req.params.restaurantId,
                next);
        },
        function (orders, next) {
            console.log("after query orders ", arguments);
            orders_result = orders.rows || orders;
            async.eachSeries(orders_result,
            function (item, next) {
                database.query("SELECT order_products.order_id, order_products.product_id, order_products.quantity, products.name, products.description, products.price FROM order_products, products WHERE products.id = order_products.product_id AND order_products.order_id = "+item.order_id,
                    function (err, res) {
                        console.log("after query order_products", arguments);
                        item.products = res.rows || res;
                        next();
                    }
                );
            }, next);
            //SELECT order_products.order_id, order_products.product_id, order_products.quantity, products.name, products.description, products.price FROM order_products, products WHERE products.id = order_products.product_id AND order_products.order_id = 19
        }
    ], function (err, result) {
        console.log("fater all", err, orders_result);
        res.send(orders_result);
    });
    //postgres.query("SELECT orders.id AS \"order_id\", users.id AS \"user_id\", orders.restaurant_id, orders.price, orders.created_by, orders.created_at, users.first_name, users.familly_name, users.email, users.image FROM orders, users WHERE orders.created_by = users.id AND orders.restaurant_id = "+req.params.restaurantId, function (err, data) {
    //
    //    postgres.query();
    //
    //    console.log(err, data);
    //    res.send(data.rows);
    //});

};

var _showPaidOrders = function (req, res) {
    res.send("{}");
};


var redisOrderPersistenceModule = new Module("orderPersistence", {
    init: init,
    onEvent: onEvent,
    dependencies: ["log", "redis", "express", config.database]
});

//restaurant:$id:orders -> list of order ids
//restaurant:$id:orders:$id -> list of

redisOrderPersistenceModule.extend({

    flushAll: function (callback) {
      var self = this;

        redis.client.flushall(callback);
    },

    payOrder: function (client, orderId, callback) {
        var self = this;
        var _order = null;

        async.waterfall([
            //get order (check if exists)
            function (next) {
                self.getOrder(client, orderId, next);
            },
            function (order, next) {
                //save in postgres
                _order = order;
                database.save("orders", {
                    created_by: client.userId,
                    restaurant_id: client.restaurantId,
                    price: order.total,
                    created_at: new Date()
                }, next);
            },
            function (res, next) {
                console.log("step 1", res, next)
                //save products in postgres
                async.eachSeries(_.values(_order.products),
                    function (item, next) {
                        database.save("order_products", {
                            id: 42,
                            order_id: res,
                            product_id: item.product.id,
                            quantity: item.count
                        }, next);
                    },
                    next
                );
            },
            function (next) {
                //remove from redis
                console.log("step 2", next)
                redis.client.lrem("restaurants:"+client.restaurantId, 0, orderId, next);
            },
            function (_, _next) {
                console.log("step 3", arguments);
                var next = _next;
                if (typeof _ == "function") next = _;
                console.log("step 3", next)
                //remove from redis
                redis.client.del("restaurants:"+client.restaurantId+":orders:"+orderId, next);
            }
        ], function (err, res) {
            console.log("redisOrderPers.getOrder done", err, res);
            if (err) {
                logger.error(self.name, "error while paying restaurants:"+client.restaurantId+":order:"+orderId+" : "+err);
                callback(err);
            } else {
                logger.info(self.name, "order id restaurants:"+client.restaurantId+":orders:"+orderId+" was successfully paid");
                callback(null, res);
            }
        });
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

        console.log("step 1", this);

        async.waterfall([
            function (next) {
                console.log("step 2", client, orderId);
                redis.client.get("restaurants:"+client.restaurantId+":orders:"+orderId, next);
            }
        ], function (err, res) {
            console.log("step 3", err, res);
            if (err) {
                logger.error(self.name, "error while getting order["+orderId+"] from restaurant["+client.restaurantId+"] :"+err);
                callback(err);
            } else {
                res = JSON.parse(res);
                logger.info(self.name, "successfully get restaurants:"+client.restaurantId+":orders:"+orderId);
                console.log("before saving to postgres", res, res.total);
                callback(null, res);
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
                redis.client.lrem("restaurants:"+client.restaurantId, 0, orderId, next);
            },
            function (_, _next) {
                console.log("step 3", arguments);
                var next = _next;
                if (typeof _ == "function") next = _;
                redis.client.del("restaurants:"+client.restaurantId+":orders:"+orderId, next);
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
