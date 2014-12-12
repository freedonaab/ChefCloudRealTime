var Module = require("./lib/module");
var shortid = require("shortid");


var httpServer = require('http').createServer();
var SocketIOServer = require('socket.io');

//var io = require('socket.io')(server);

var logger = null;
var express = null;

function RPCCall(socket, eventName, rpcId, data) {
    this._ = {};
    this._.socket = socket;
    this._.rpcID = rpcId;
    this.eventName = eventName;
    this.data = data;
    this.clientId = this._.socket._.id;
    this.roomName = null;
}

RPCCall.prototype.respond = function (data) {
    var rpcData = {
        rpcId: this._.rpcID,
        data: data
    };
    this._.socket.emit(this.eventName+"_response", rpcData);
};

RPCCall.prototype.join = function (roomName) {
    this.roomName = roomName;
    this._.socket.join(roomName);
};

RPCCall.prototype.leave = function (roomName) {
    this.roomName = null;
    this._.socket.leave(roomName);
};

RPCCall.prototype.emit = function (eventName, data) {
    var rpcData = {
        rpcId: null,
        data: data
    };
    this._.socket.emit(eventName, rpcData);
};


RPCCall.prototype.broadcast = function (eventName, data) {
    if (this.roomName != null) {
        var rpcData = {
            rpcId: null,
            data: data
        };
        this._.socket.broadcast.to(this.roomName).emit(eventName, rpcData);
    }
};

var addCommandToSocket = function (socket, commandName) {
    var self = this;
    var _func = function (msg) {

        var rpcCall =  new RPCCall(socket, commandName, msg.rpcId, msg.data);

        for (var i in self._.listeners) {
            var listener = self._.listeners[i];
            listener(rpcCall);
        }
        logger.info(self.name, "command ["+commandName+"] called by ["+socket._.id+"] ");
    };
    socket.on(commandName, _func);
};

var init = function (dependencies, callback) {

    var self = this;

    logger = dependencies.log;
    express = dependencies.express;

    this._ = {};
    this._.io = new SocketIOServer(express.server);
    this._.commands = [];
    this._.addCommandToSocket = addCommandToSocket.bind(this);

    //TODO move route definition to socketio client handler
    this._.io.on('connection', function(socket) {

        socket._ = {};
        socket._.id = shortid.generate();

        logger.info(self.name, "connected to websocket "+socket._.id);


        for (var i in self._.commands) {
            var commandName = self._.commands[i];
            self._.addCommandToSocket(socket, commandName);
        }

    });
    this._.io.on('error', function (err) {
        logger.error(self.name, "error : "+err);
    });

    this._.io.listen(3001);

    this._.listeners = [];

    logger.log(self.name, "done initializing socketio");
    callback();
};

var onEvent = function (eventName, args) {

};

var socketioModule = new Module("socketio", {
    init: init,
    onEvent: onEvent,
    dependencies: ["log", "express"]
});

socketioModule.extend({

    addCommand: function (commandName) {
        this._.commands.push(commandName);
    },

    addListener: function (listener) {
        this._.listeners.push(listener);
    }
});

exports = module.exports = socketioModule;
