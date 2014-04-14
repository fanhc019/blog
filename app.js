/**
 * Module dependencies.
 */

var express = require('express'),
routes = require('./routes'),
user = require('./routes/user'),
http = require('http'),
path = require('path');
var MongoStore = require('connect-mongo')(express);
var settings = require('./settings');
var flash = require('connect-flash');
var app = express();

app.configure(function() {
    app.set('port', process.env.PORT || 3000);
    app.set('views', __dirname + '/views');
    app.set('view engine', 'ejs');
    app.use(flash());
    app.use(express.favicon());
    app.use(express.logger('dev'));
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(express.cookieParser());
    app.use(express.session({
        secret: settings.cookieSecret,
        key: settings.db,
        //cookie name
        cookie: {
            maxAge: 1000 * 60 * 60 * 24 * 30
        },
        //30 days
        store: new MongoStore({
            db: settings.db
        })
    }));
    app.use(app.router);
    app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development',
function() {
    app.use(express.errorHandler());
});

routes(app); // add routes
http.createServer(app).listen(app.get('port'),
function() {
    console.log("Express server listening on port " + app.get('port'));
});