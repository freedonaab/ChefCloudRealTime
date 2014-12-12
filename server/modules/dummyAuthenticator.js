var Module = require("./lib/module");

var logger = null;

var init = function (dependencies, callback) {
    this._ = {};

    logger = dependencies.log;


    logger.log(this.name, "done initializing dummy authenticator");
    callback();
};

var onEvent = function (eventName, args) {

};


var dummyAuthenticatorModule = new Module("authenticator", {
    init: init,
    onEvent: onEvent,
    dependencies: ["log"]
});

dummyAuthenticatorModule.extend({

    getRestaurantFromToken: function (login_info, callback) {
        callback(null, login_info);
        //if (token === "42") {
        //    callback(null, {restaurantId: 42});
        //} else if (token === "12") {
        //    callback(null, {restaurantId: 12});
        //} else {
        //    callback("unknown restaurantId "+token, null);
        //}
    }

});

exports = module.exports = dummyAuthenticatorModule;
