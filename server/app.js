var express = require("express");
var ModuleManager = require("./modules/lib/moduleManager");
var modules = require("./config/modules");
var config = require("./config/index");
var path = require("path");

//var app = express();

//app.get('/', function (req, res) {
//	res.send("hello world");
//});
//
//app.get('/socket', function(req, res){
//	res.sendFile(path.join(__dirname ,'..','client','index.html'));
//});

//init all modules
var moduleManager = new ModuleManager();
for (var i in modules) {
	var moduleName = modules[i];
	var module = require("./modules/"+moduleName);
	moduleManager.registerModule(module);
	console.log("done registering module "+module.name);
}

//init database
var databaseModule = require("./modules/"+config.database);
moduleManager.registerModule(databaseModule);
console.log("done registering module "+databaseModule.name);

moduleManager.initialize(function (err) {
	if (err) {
		console.log("error: "+err);
		return;
	}
	var log = moduleManager.getModule("log");

	log.custom("global","All modules are sucessfully initlialized", "green");
});


//var server = app.listen(8080, function () {
//
//	global.server = server;
//	global.app = app;
//	console.log("listening on port 3000");
//
//});
