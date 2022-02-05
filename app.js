var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var session = require('client-sessions');

// read the .env file and make the value of VARIABLE available via process.env.VARIABLE
require('dotenv').config(); 

// enable application insights
const instrumentationKey = process.env.InstrumentationKey || process.env.APPSETTING_APPINSIGHTS_INSTRUMENTATIONKEY;
let appInsigths = require("applicationinsights");
appInsigths.setup(instrumentationKey)
  .setSendLiveMetrics(true)
  .start();

// CONFIG ITEMS START
//DB Id
const dbId = "thpapp1";
const collectionId = "players";
const dewisCollectionId = "dewis";


// Connection strings
const endpoint = process.env.AccountEndpoint || process.env.CUSTOMCONNSTR_AccountEndpoint;
const authKey = process.env.AccountKey || process.env.CUSTOMCONNSTR_AccountKey;
// CONFIG ITEMS END

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var playerRouter = require('./routes/player');
var adminRouter = require('./routes/admin');

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

  const dewis = db.container(dewisCollectionId);
  req.dewis = dewis;

  res.locals.userid = req.session.userid;
  res.locals.level = req.session.level;
  next();
});


app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/player',playerRouter);
app.use('/admin', adminRouter);

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
