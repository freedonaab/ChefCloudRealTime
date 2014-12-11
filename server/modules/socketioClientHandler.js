var Module = require("./lib/module");

var logger = null;
var socketio = null;

var _onSocketIoEvent = function (rpcCall) {
    var listeners = this._.listeners[rpcCall.eventName] || [];

    for (var i in listeners) {
        var listener = listeners[i];
        listener(rpcCall);
    }

};

var init = function (dependencies, callback) {
    var self = this;

    this._ = {};
    this._.listeners = {};
    this._.onLoginListeners = [];
    this._.onCreateOrderListeners = [];

    this._.onSocketIoEvent = _onSocketIoEvent;

    logger = dependencies.log;
    socketio = dependencies.socketio;

    socketio.addCommand("login");
    socketio.addCommand("createOrder");
    socketio.addCommand("deleteOrder");
    socketio.addCommand("editOrder");
    socketio.addCommand("payOrder");

    socketio.addListener(this._.onSocketIoEvent.bind(this));

    logger.log(this.name, "done initializing socketio client handler");
    callback();
};

var onEvent = function (eventName, args) {

};

var socketIOClientHandler = new Module("clientHandler", {
    init: init,
    onEvent: onEvent,
    dependencies: ["log", "socketio"]
});

socketIOClientHandler.extend({

    addListener: function (eventName, listener) {
        var listeners = this._.listeners[eventName];
        if (!listeners) {
            this._.listeners[eventName] = [];
        }
        this._.listeners[eventName].push(listener);
    },
    onClientJoinedRoom: function (req, clientId, roomName, callback) {
        req.join("restaurant:"+roomName);
        callback();
    }

});

exports = module.exports = socketIOClientHandler;
