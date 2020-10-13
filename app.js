var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var session = require('client-sessions');

// CONFIG ITEMS START
//DB Id
const dbId = "thpapp1";
const collectionId = "players";

// Connection strings
const endpoint = "https://players.documents.azure.com:443/";
const authKey = "0RRyr4FxX7h9qj5AQsRFv0JQByOdfDF4ddrb52S5xETCq7AV3JqDgns4c560E7ih2CAhZZf8lCJ9QvplTuTJGg==";
// CONFIG ITEMS END

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// make our session object usable, timeout 30 minutes
app.use(session({
  cookieName: 'session',
  secret: 'tournament-website-geheimnis',
  duration: 30 * 60 * 1000,
  activeDuration: 5 * 60 * 1000,
  httpOnly: true,
  secure: true,
  ephemeral: true
}));

// Make our db and session user name accessible to our router
app.use(async function (req, res, next) {

  // Instatiate Azure Cosmos client
  const CosmosClientInterface = require("@azure/cosmos").CosmosClient;
  const cosmosClient = new CosmosClientInterface("AccountEndpoint="+endpoint+";AccountKey="+authKey+";");
  // Open reference to DB
  //const db = await cosmosClient.databases.createIfNotExists({id: dbId});
  const db = cosmosClient.database(dbId);
  const container = db.container(collectionId);

  req.container = container;
  req.dewisdb = 0;
  res.locals.userid = req.session.userid;
  res.locals.level = req.session.level;
  next();
});


app.use('/', indexRouter);
app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
