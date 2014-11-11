var Module = require("./lib/module");
var async = require("async");
var logger = null;
var clientHandler = null;
var authenticator = null;


function Client(clientRequest, restaurant) {
    //this.id =
}

function Room() {

}

var init = function (dependencies, callback) {
    var self = this;

    this._ = {};

    logger = dependencies.log;
    clientHandler = dependencies.clientHandler;
    authenticator = dependencies.authenticator;


    clientHandler.addListener("login", this.onLogin.bind(this));

    logger.log(this.name, "done initializing room manager");
    callback();
};

var onEvent = function (eventName, args) {

};

var roomManagerModule = new Module("roomManager", {
    init: init,
    onEvent: onEvent,
    dependencies: ["log", "clientHandler", "authenticator"]
});

roomManagerModule.extend({

    onLogin: function (req) {
        var self = this;
        async.waterfall([
            function (next) {
                authenticator.getRestaurantFromToken(req.data.token, next);
            },
            //TODO: fetch lists of commands and send it to client
            function (restaurantId, next) {
                req.join("restaurant:"+restaurantId);
                next();
            }
        ], function (err, res) {
            if (err) {
                req.respond({ success: false, error: err });
                logger.error(self.name, "client ["+req.clientId+"] couldn't log in because: "+err);
            } else {
                req.respond({ success: true, error: null });
                logger.info(self.name, "client ["+req.clientId+"] joined room "+req.roomName);
            }
        });
        //console.log(req.data.token);
        console.log("client "+req.clientId+" logged in");
    }

});

exports = module.exports = roomManagerModule;
