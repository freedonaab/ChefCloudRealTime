var Module = require("./lib/module");
var pg = require('pg');
var _ = require("underscore");

var config = require("../config/postgres");

var logger = null;


var init = function (dependencies, callback) {
    var self = this;
    this._ = {};

    logger = dependencies.log;

    //var conString = "postgres://"+config.username+":"+config.password+"@"+config.ip+":"+config.port+"/"+config.databaseName;
    var conString = "postgres://"+config.username+":"+config.password+"@"+config.ip+":"+config.port+"/"+config.databaseName;
    //var conString = "postgres://postgres:root@localhost:5432/chefcloud";

    pg.connect(conString, function(err, client, done) {
        if(err) {
            console.log(err);
            return callback('error fetching client from pool', err);
        }

        self._.client = client;
//        client.query('SELECT * from products', function(err, result) {
        client.query('SELECT * from products', function(err, result) {
            ////call `done()` to release the client back to the pool
            //done();
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

var postgreModule = new Module("postgres", {
    init: init,
    onEvent: onEvent,
    dependencies: ["log"]
});

postgreModule.extend({

    exists: function (table, id, callback) {
        var self = this;

        console.log("SELECT  "+table+".id FROM "+table+" WHERE "+table+".id = $1 ");

        self._.client.query("SELECT "+table+".id FROM "+table+" WHERE "+table+".id = $1 ", [id], function (err, res) {
            console.log(err, res);
            if (err) {
                callback(err, null);
            } else if (res.rowCount == 0) {
                callback(null, false);
            } else {
                callback(null, true);
            }
        });
    },

    get: function (table, rows, id, callback) {
        var self = this;

        var rowsString = "";
        for (var i = 0; i < rows.length; ++i) {
            var rowName = rows[i];
            if (i > 0) {
                rowsString += ", ";
            }
            rowsString += table+"."+rowName;
        }


        console.log("SELECT "+rowsString+" FROM "+table+" WHERE "+table+".id = $1 ");

        self._.client.query("SELECT "+rowsString+" FROM "+table+" WHERE "+table+".id = $1 ", [id], function (err, res) {
            console.log(err, res);
            if (err) {
                callback(err, null);
            } else if (res.rowCount == 0) {
                callback(null, null);
            } else {
                callback(null, res.rows[0]);
            }
        });
    },

    query: function (query, callback) {
        var self = this;
        self._.client.query(query, callback);
    },

    save: function (table, rows, callback) {
        var self = this;

        var rowsString = "";
        var i = 0;
        for (var rowKey in rows) {
            var rowValue = rows[rowKey];
            if (i > 0) {
                rowsString += ", ";
            }
            rowsString += rowKey;
            i++;
        }

        var valuesSring = "";
        var i = 1;
        for (var rowKey in rows) {
            if (i > 1) {
                valuesSring += ", ";
            }
            valuesSring += "$"+i;
            i++;
        }


        console.log("INSERT INTO "+table+"("+rowsString+") VALUES("+valuesSring+")");

        console.log(rows, _.values(rows));
        self._.client.query("INSERT INTO "+table+"("+rowsString+") VALUES("+valuesSring+") RETURNING id", _.values(rows), function (err, res) {
            console.log(err, res);
            if (err) {
                callback(err, null);
            } else {
                callback(null, res);
            }
        });
    }

});

exports = module.exports = postgreModule;
