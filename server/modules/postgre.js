var Module = require("./lib/module");
var pg = require('pg');

var logger = null;


var init = function (dependencies, callback) {
    var self = this;
    this._ = {};

    logger = dependencies.log;

    var conString = "postgres://postgres:root@localhost:5432/postgres";

    pg.connect(conString, function(err, client, done) {
        if(err) {
            console.log(err);
            return callback('error fetching client from pool', err);
        }
//        client.query('SELECT * from products', function(err, result) {
        client.query('SELECT NOW() AS theTime', function(err, result) {
            //call `done()` to release the client back to the pool
            done();

            if(err) {
                console.log(err);
                return callback('error running query', err);
            }
            console.log(result);
            logger.log(self.name, "done initializing postgre");
            callback();
            //output: 1
        });
    });

};

var onEvent = function (eventName, args) {

};

var postgreModule = new Module("postgre", {
    init: init,
    onEvent: onEvent,
    dependencies: ["log"]
});

postgreModule.extend({



});

exports = module.exports = postgreModule;
