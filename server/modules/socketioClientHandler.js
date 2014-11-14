var Module = require("./lib/module");

var logger = null;
var socketio = null;

var _onSocketIoEvent = function (rpcCall) {
    var listeners = [];
    if (rpcCall.eventName === "login") {
        listeners = this._.onLoginListeners;
    } else if (rpcCall.eventName === "createOrder") {
        listeners = this._.onCreateOrderListeners;
    } else {
        listeners = [];
    }
    for (var i in listeners) {
        var listener = listeners[i];
        listener(rpcCall);
    }

};

var init = function (dependencies, callback) {
    var self = this;

    this._ = {};
    this._.onLoginListeners = [];
    this._.onCreateOrderListeners = [];

    this._.onSocketIoEvent = _onSocketIoEvent;

    logger = dependencies.log;
    socketio = dependencies.socketio;

    socketio.addCommand("login");
    socketio.addCommand("createOrder");
    socketio.addCommand("test");

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
        switch (eventName) {
            case "login":
                this._.onLoginListeners.push(listener);
                break;
            case "createOrder":
                this._.onCreateOrderListeners.push(listener);
                break;
            default:
                break;
        }
    },
    onClientJoinedRoom: function (req, clientId, roomName, callback) {
        req.join("restaurant:"+roomName);
        callback();
    }

});

exports = module.exports = socketIOClientHandler;
