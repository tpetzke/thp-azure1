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
let appInsights = require("applicationinsights");
appInsights.setup(instrumentationKey)
  .setAutoCollectRequests(true)
  .setAutoDependencyCorrelation(true)
  .setAutoCollectPerformance(true, true)
  .setAutoCollectExceptions(true)
  .setAutoCollectDependencies(true)
  .setAutoCollectConsole(true)
  .setUseDiskRetryCaching(true)
  .setSendLiveMetrics(true)
  .setDistributedTracingMode(appInsights.DistributedTracingModes.AI_AND_W3C)
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

// track requests
app.use((req, res, next) => { appInsights.defaultClient.trackRequest(req, res); next(); });

// store the app insights instrumentation key
//app.set('instrumentationKey',instrumentationKey);

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

// make the instrumentation key available to the templates
app.use(function(req, res, next) {
  res.locals.instrumentationKey = instrumentationKey;
  next();
});

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

  var querySpec = { query: "SELECT * FROM c where c.tournament.name > ' '" };
  const { resources: tournaments } = await container.items.query(querySpec).fetchAll();

  // empty database, we must init it first with a default tournament and a root admin
  if (tournaments.length == 0)
  {
    var dbutils = require('./routes/dbutils');
    await dbutils.dbInit(container, null, function() { });
    console.log("DB initialised...");
  }

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
