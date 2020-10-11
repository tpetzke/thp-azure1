var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', async function(req, res, next) {

  const CosmosClientInterface = require("@azure/cosmos").CosmosClient;

  //DB Id
  const dbId = "thpapp1";
  const collectionId = "players";

  // connection strings
  const endpoint = "https://players.documents.azure.com:443/";
  const authKey = "0RRyr4FxX7h9qj5AQsRFv0JQByOdfDF4ddrb52S5xETCq7AV3JqDgns4c560E7ih2CAhZZf8lCJ9QvplTuTJGg==";

  // Instatiate client
  const cosmosClient = new CosmosClientInterface("AccountEndpoint="+endpoint+";AccountKey="+authKey+";");
 
  try {
    // Open reference to DB
    const dbResponse = await cosmosClient.databases.createIfNotExists({id: dbId});
    var db = dbResponse.database;
    const container =  db.container(collectionId);

    console.log(container);

    const querySpec = {
      query: "select * from c"
    };

    const { resources: items } = await container.items.query(querySpec).fetchAll();
    console.log(items);

    res.render('index', { title: 'Express WebSite', db: dbId, collection: collectionId, players: items});
  } catch (error)
  {
    console.log(error);
    res.render('index', { title: 'Error' });
  }

});

module.exports = router;
