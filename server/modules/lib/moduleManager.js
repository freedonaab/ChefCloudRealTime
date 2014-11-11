var async = require("async");

//TODO refactor this class so it becomes a module as well


function ModuleManager() {
    this._ = {};
    this._.modules = {};
}

ModuleManager.prototype.getModule = function (name) {
    return this._.modules[name];
};

ModuleManager.prototype.registerModule = function (module) {
    var oldModule = this.getModule(module.name);
    if (oldModule ) {
        console.log("ModuleManager: module with name "+module.name+" already registered!");
        return;
    }
    this._.modules[module.name] = module;
};

ModuleManager.prototype.isModuleFullyInitialized = function (module) {
    //if (!module.initialized) return false;
    for (var i in module.dependencies) {
        var dependencyModuleName = module.dependencies[i];
        var dependencyModule = this.getModule(dependencyModuleName);
        if (dependencyModule == null || !dependencyModule.initialized) {
            return false;
        }
    }
    return true;
};

ModuleManager.prototype.areAllModuleFullyInitialized = function () {
    for (var moduleName in this._.modules) {
        var module = this.getModule(moduleName);
        if (!module.initialized || !this.isModuleFullyInitialized(module)) {
            return false;
        }
    }
    return true;
};

ModuleManager.prototype.initialize = function (callback) {
    var self = this;
    var moduleNames = Object.keys(self._.modules);
    var _currentModuleName = null;
    var _currentModule = null;
    var _currentIndex = -1;


    var _initSingleModule = function (module, callback) {
        var dependencies = {};
        for (var i in module.dependencies) {
            var dependencyName = module.dependencies[i];
            var dependencyModule = self.getModule(dependencyName);
            dependencies[dependencyName] = dependencyModule;
        }
        console.log("initializing module "+module.name);
        module.initialize(dependencies, callback);
    };

    var _initModuleDependencies = function (module, callback) {
        async.eachSeries(module.dependencies, function (moduleDependencyName, next) {
            var moduleDependency = self.getModule(moduleDependencyName);
            if (moduleDependency == null) return callback("ModuleManager initialization failed because module ["+moduleDependencyName+"] couldn't be find");
            if (self.isModuleFullyInitialized(moduleDependency)) _initSingleModule(moduleDependency, next);
            else _initModuleDependencies(moduleDependency, next);
        }, callback);
    };

    async.whilst(function () {
        //console.log("async.whilst: "+!self.areAllModuleFullyInitialized());
        return !self.areAllModuleFullyInitialized();
    }, function (next) {
        if (_currentModuleName == null || _currentModule == null) {
            _currentIndex++;
            _currentModuleName = moduleNames[_currentIndex];
            _currentModule = self._.modules[_currentModuleName];
            if (_currentModule  == null) {
                 return next("ModuleManager initialization failed because module ["+_currentModuleName+"] couldn't be find");
            }
        }
        if (!self.isModuleFullyInitialized(_currentModule)) {
            async.waterfall([
                function (next) {
                    _initModuleDependencies(_currentModule, next);
                },
                function (next) {
                    _initSingleModule(_currentModule, next);
                },
                function (next) {
                    _currentModule = null;
                    _currentModuleName = null;
                    next();
                }
            ], next);
        } else if (!_currentModule.initialized) {
            _initSingleModule(_currentModule, function (err) {
                if (err) next(err);
                else {
                    _currentModule = null;
                    _currentModuleName = null;
                    next();
                }
            });
        } else {
            _currentModule = null;
            _currentModuleName = null;
            next();
        }
    }, function (err) {
        callback(err);
    });
};

module.exports = ModuleManager;