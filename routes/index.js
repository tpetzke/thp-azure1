var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', async function(req, res, next) {

  try {
    // Open reference to DB collection <players>
    const container =  req.container;

    var querySpec;
    querySpec = {
      query: "SELECT * FROM c where c.tournament.name > ' '"
    };

    const { resources: tournaments } = await container.items.query(querySpec).fetchAll();
  
    querySpec = {
      query: "select value count(1) from c where c.Firstname > ''"
    };

    const { resources: items } = await container.items.query(querySpec).fetchAll();
    console.log(items);

    res.render('index', { tournament: tournaments[0].tournament, playercnt: items });
  } catch (error)
  {
    console.log(error);
    res.render('index', { title: 'Error' });
  }

});

/* GET clublist page.
Read the Tournament data and the Club List from the View to assemble an overview page of clubs */
router.get('/clublist', async function(req, res, next) {
  
  // Open reference to DB collection <players>
  const container =  req.container;

  var querySpec;
  querySpec = {
    query: "SELECT * FROM c where c.tournament.name > ' '"
  };
  const { resources: tournaments } = await container.items.query(querySpec).fetchAll();

  querySpec = {
    query: "SELECT count(1) as val, c.Club as key FROM c where c.Club > '' group by c.Club"
  };
  const { resources: clubs } = await container.items.query(querySpec).fetchAll();
  console.log(clubs);
  res.render('clublist', { tournament: tournaments[0].tournament, clubs:clubs });
});

module.exports = router;
