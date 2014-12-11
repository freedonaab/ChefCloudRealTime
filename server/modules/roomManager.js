var Module = require("./lib/module");
var async = require("async");
var shortid = require("shortid");
var _ = require("underscore");



var logger = null;
var clientHandler = null;
var authenticator = null;
var orderPersistence = null;
var productProvider = null;


function Client(clientRequest, restaurantId, clientDelegate) {
    this.id = clientRequest.clientId;
    this.restaurantId = restaurantId;
    this.roomId = null;
    this.clientDelegate = clientDelegate;
}

Client.prototype.emit = function (eventName, data) {
    this.clientDelegate.emit(eventName, data);
};

Client.prototype.broadcast = function (eventName, data) {
    this.clientDelegate.broadcast(eventName, data);
};

function Room(restaurantId) {
    this._ = {};
    this._.clients = {};

    this.id = restaurantId;
}

Room.prototype.addClient = function (client) {
    this._.clients[client.clientId] = client;
    client.roomId = this.id;
};

Room.prototype.isClientInRoom = function (clientId) {
    return (this._.clients[clientId] ? true : false);
};

Room.prototype.broadcast = function () {

};

var init = function (dependencies, callback) {
    var self = this;

    this._ = {};
    this._.rooms = {};
    this._.clients = {};


    logger = dependencies.log;
    clientHandler = dependencies.clientHandler;
    authenticator = dependencies.authenticator;
    orderPersistence = dependencies.orderPersistence;
    productProvider = dependencies.productProvider;

    clientHandler.addListener("login", this.onLogin.bind(this));
    clientHandler.addListener("createOrder", this.onCreateOrder.bind(this));
    clientHandler.addListener("deleteOrder", this.onDeleteOrder.bind(this));
    clientHandler.addListener("editOrder", this.onEditOrder.bind(this));
    clientHandler.addListener("payOrder", this.onPayOrder.bind(this));

    logger.log(this.name, "done initializing room manager");
    callback();
};

var onEvent = function (eventName, args) {

};

var roomManagerModule = new Module("roomManager", {
    init: init,
    onEvent: onEvent,
    dependencies: ["log", "clientHandler", "authenticator", "orderPersistence", "productProvider"]
});

var getClientAndRoomFromClientId = function (self, clientId, next) {
    var client = self.getClientFromClientId(clientId);
    if (!client) {
        return next("unknown client ["+clientId+"]");
    }
    var room = self._.rooms[client.roomId];
    if (!room) {
        return next("unknown room ["+client.roomId+"] for client ["+clientId+"]");
    }
    return next(null, client, room);
};

roomManagerModule.extend({

    getClientFromClientId: function (clientId) {
        return this._.clients[clientId];
    },
    onLogin: function (req) {
        var self = this;

        var _client = null;
        async.waterfall([
            function (next) {
                authenticator.getRestaurantFromToken(req.data.token, next);
            },
            //TODO: fetch lists of commands and send it to client
            function (data, next) {
                var client = new Client(req, data.restaurantId, req);
                _client = client;
                logger.info(self.name, "created client with id ["+req.clientId+"] for restaurant["+data.restaurantId+"]");

                var room = self._.rooms[data.restaurantId];
                if (!room) {
                    room = new Room(data.restaurantId);
                    self._.rooms[room.id] = room;
                    logger.info(self.name, "created room with id ["+room.id+"]");
                }

                room.addClient(client);
                self._.clients[client.id] = client;
                next(null, { roomId: room.id, clientId: client.id });
            },
            function (data, next) {
                clientHandler.onClientJoinedRoom(req, data.clientId, data.roomId, next);
            },
            function (next) {
                orderPersistence.getAllOrders(_client, next);
            }
        ], function (err, orders) {
            if (err) {
                req.respond({ success: false, error: err, data: null });
                logger.error(self.name, "client ["+req.clientId+"] couldn't log in because: "+err);
            } else {
                req.respond({ success: true, error: null, data: { orders: orders } });
                logger.info(self.name, "client ["+req.clientId+"] joined room "+req.roomName);
                console.log("client "+req.clientId+" logged in");
            }
        });
    },

    onCreateOrder: function (req) {
        var self = this;
        var client = null;
        var room = null;
        async.waterfall([
            function (next) {
                getClientAndRoomFromClientId(self, req.clientId, next);
            },
            function (__client, __room, next) {
                client = __client;
                room = __room;
                console.log(req.data);
                next();
            },
            //TODO: validate model
            function (next) {
                var products = _.keys(req.data.order.products);
                console.log(products);
                async.mapSeries(products, function (item, next) {
                    productProvider.getProduct(item, function (err, res) {
                        console.log(err, res);
                        if (err || !res) {
                            next("product with id "+item+" does not exists.");
                        } else {
                            next(null, res);
                        }
                    });
                }, function (err, res) {
                    console.log(res);
                    next(err, res);
                });
            },
            function (products, next) {
                //req.data.order.products = products;
                console.log(products);
                console.log(req.data.order.products);
                for (var i = 0; i < products.length; ++i) {
                    console.log(products[i], products[i].id);
                    var product = req.data.order.products[products[i].id];

                    _.extend(product.product, products[i]);
                }
                orderPersistence.saveOrder(client, req.data.order, next);
            },
            function (order, next) {
                client.broadcast("orderCreated", order);
                next(null, order);
            }
            //TODO: broadcast order
        ], function (err, order) {
            if (err) {
                req.respond({ success: false, error: err });
                logger.error(self.name, "createOrder: "+err);
            } else {
                logger.info(self.name, "ceateOrder: success!");
                client.emit("orderCreated", order);
            }
        });
    },

    onEditOrder: function (req) {
        var self = this;
        var client = null;
        var room = null;
        async.waterfall([
            function (next) {
                getClientAndRoomFromClientId(self, req.clientId, next);
            },
            function (__client, __room, next) {
                client = __client;
                room = __room;
                console.log(req.data);
                next();
            },
            //TODO: validate model
            function (next) {
                var products = _.keys(req.data.order.products);
                console.log(products);
                async.mapSeries(products, function (item, next) {
                    productProvider.getProduct(item, function (err, res) {
                        console.log(err, res);
                        if (err || !res) {
                            next("product with id "+item+" does not exists.");
                        } else {
                            next(null, res);
                        }
                    });
                }, function (err, res) {
                    console.log(res);
                    next(err, res);
                });
            },
            function (products, next) {
                //req.data.order.products = products;
                console.log(products);
                console.log(req.data.order.products);
                for (var i = 0; i < products.length; ++i) {
                    console.log(products[i], products[i].id);
                    var product = req.data.order.products[products[i].id];

                    _.extend(product.product, products[i]);
                }
                orderPersistence.saveOrder(client, req.data.order, next);
            },
            function (order, next) {
                client.broadcast("orderEdited", order);
                next(null, order);
            }
            //TODO: broadcast order
        ], function (err, order) {
            if (err) {
                req.respond({ success: false, error: err });
                logger.error(self.name, "editOrder: "+err);
            } else {
                logger.info(self.name, "editOrder: success!");
                client.emit("orderEdited", order);
            }
        });
    },

    onPayOrder: function (req) {
        var self = this;
        var client = null;
        var room = null;
        async.waterfall([
            function (next) {
                getClientAndRoomFromClientId(self, req.clientId, next);
            },
            function (__client, __room, next) {
                client = __client;
                room = __room;
                console.log(req.data);
                next();
            },
            function (next) {
                orderPersistence.deleteOrder(client, req.data.orderId, next);
            },
            //TODO: broadcast order
        ], function (err, order) {
            if (err) {
                req.respond({ success: false, error: err });
                logger.error(self.name, "payOrder: "+err);
            } else {
                logger.info(self.name, "payOrder: success!");
                client.emit("orderPaid", order);
            }
        });
    },

    onDeleteOrder: function (req) {
        var self = this;
        var client = null;
        var room = null;
        async.waterfall([
            function (next) {
                getClientAndRoomFromClientId(self, req.clientId, next);
            },
            function (__client, __room, next) {
                client = __client;
                room = __room;
                console.log(req.data);
                next();
            },
            function (next) {
                orderPersistence.deleteOrder(client, req.data.orderId, next);
            },
            function (next) {
                client.broadcast("orderDeleted", req.data.orderId);
                next(null);
            }
            //TODO: broadcast order
        ], function (err) {
            if (err) {
                req.respond({ success: false, error: err, data: null});
                logger.error(self.name, "deleteOrder: "+err);
            } else {
                logger.info(self.name, "deleteOrder success!");
                client.emit("orderDeleted", { orderId: req.data.orderId });
            }
        });
    }

});

exports = module.exports = roomManagerModule;
