var Module = require("./lib/module");
var mysql = require('mysql');
var _ = require("underscore");

var config = require("../config/mysql");

var logger = null;


var init = function (dependencies, callback) {
    var self = this;
    this._ = {};

    logger = dependencies.log;

    //var conString = "mysql://"+config.username+":"+config.password+"@"+config.ip+":"+config.port+"/"+config.databaseName;

    console.log(config);

    var connection = mysql.createConnection({
        host     : config.ip,
        user     : config.username,
        password : config.password,
        database : config.databaseName
    });

    connection.connect(function (err) {
        console.log('arguments connect', arguments);
        connection.query('SELECT 1 + 1 AS solution', function(err, rows, fields) {
            console.log('arguments query', arguments);

            console.log('The solution is: ', rows[0].solution);

            logger.log(self.name, "done initializing mysql");

            self._.connection = connection;

            callback(err);

        });
    });


    //connection.end()


//    pg.connect(conString, function(err, client, done) {
//        if(err) {
//            console.log(err);
//            return callback('error fetching client from pool', err);
//        }
//
//        self._.client = client;
////        client.query('SELECT * from products', function(err, result) {
//        client.query('SELECT * from products', function(err, result) {
//            ////call `done()` to release the client back to the pool
//            //done();
//            if(err) {
//                console.log(err);
//                return callback('error running query', err);
//            }
//            console.log(result);
//            logger.log(self.name, "done initializing postgre");
//            callback();
//            //output: 1
//        });
//    });

};

var onEvent = function (eventName, args) {

};

var mysqlModule = new Module("mysql", {
    init: init,
    onEvent: onEvent,
    dependencies: ["log"]
});

mysqlModule.extend({

    exists: function (table, id, callback) {
        var self = this;

        console.log("SELECT  "+table+".id FROM "+table+" WHERE "+table+".id = $1 ");

        self._.connection.query("SELECT "+table+".id FROM "+table+" WHERE "+table+".id = $1 ", [id], function (err, res) {
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


        console.log("SELECT "+rowsString+" FROM "+table+" WHERE "+table+".id = ? ");

        //console.log();
        //var __query = self._.connection.query("SELECT "+rowsString+" FROM "+table+" WHERE "+table+".id = ?", [id+""],function (err, res) {
        console.log(id);
        console.log(typeof id);
        console.log(typeof typeof id.toString());
        var __query = self._.connection.query("SELECT "+rowsString+" FROM "+table+" WHERE "+table+".id = "+ self._.connection.escape(id),function (err, res) {
            console.log("after mysql query", err, res);
            if (err) {
                callback(err, null);
            } else if (res.rowCount == 0) {
                callback(null, null);
            } else {
                callback(null, res[0]);
            }
        });
        console.log("mysql query launched!", __query.sql);
    },

    query: function (query, callback) {
        var self = this;
        self._.connection.query(query, function (err, res, fields) {
            callback(err, res);
        });
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
            valuesSring += "?";
            i++;
        }


        console.log("INSERT INTO "+table+"("+rowsString+") VALUES("+valuesSring+")");

        console.log(rows, _.values(rows));
        var __query = self._.connection.query("INSERT INTO "+table+"("+rowsString+") VALUES("+valuesSring+")", _.values(rows), function (err, res) {
            console.log(err, res);
            if (err) {
                callback(err, null);
            } else {
                callback(null, res.insertId);
            }
        });
        console.log(__query.sql);
    }

});

exports = module.exports = mysqlModule;
