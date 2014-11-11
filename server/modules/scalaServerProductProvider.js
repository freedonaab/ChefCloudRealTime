var Module = require("./lib/module");

var logger = null;
var scalaServer = null;

var init = function (dependencies, callback) {
    this._ = {};

    logger = dependencies.log;
    scalaServer = dependencies.scalaServer;

    logger.log(this.name, "done initializing scala server product provider");
    callback();
};

var onEvent = function (eventName, args) {

};

var productProviderModule = new Module("productProvider", {
    init: init,
    onEvent: onEvent,
    dependencies: ["log", "scalaServer"]
});

productProviderModule.extend({

    getProduct: function (productId, callback) {
    }

});

exports = module.exports = productProviderModule;
