var _ = require("underscore");
var noOp = function () {};

/**/
function Module(name, params) {

    params = params || {};

    this._ = {};
    this.name = name;
    this.initialized = false;
    this._.init = params.init || noOp;
    this._.onEvent = params.onEvent || noOp;
    this.dependencies = params.dependencies || [];
}

Module.prototype.initialize = function (dependencies, callback) {
    var self = this;
    if (!this.initialized) {
        var _init = self._.init.bind(self);
        _init(dependencies, function (err) {
            self.initialized  = true;
            callback(err);
        });
    } else {
        callback();
    }
};

Module.prototype.on = function (eventName, args, callback) {
    var self = this;
    var _on = self._.onEvent.bind(self);
    _on(eventName, args, callback);
};

Module.prototype.extend = function (params) {
    for (var key in params) {
        if (_.isFunction(params[key])) {
            this[key] = params[key].bind(this);
        } else {
            this[key] = params[key];
        }
    }
};

module.exports = Module;
