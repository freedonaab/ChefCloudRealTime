var Module = require("./lib/module");

var logger = null;
var socketio = null;

var _onSocketIoEvent = function (rpcCall) {
    for (var i in this._.onLoginListeners) {
        var listener = this._.onLoginListeners[i];
        listener(rpcCall);
    }

};

var init = function (dependencies, callback) {
    var self = this;

    this._ = {};
    this._.onLoginListeners = [];

    this._.onSocketIoEvent = _onSocketIoEvent;

    logger = dependencies.log;
    socketio = dependencies.socketio;

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
            default:
                break;
        }
    }

});

exports = module.exports = socketIOClientHandler;
