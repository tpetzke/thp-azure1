var express = require('express');
const Email = require('../classes/email');

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

/* GET Imprint page */
router.get('/imprint', async function(req, res, next) {
  
  // Open reference to DB collection <players>
  const container =  req.container;

  var querySpec;
  querySpec = {
    query: "SELECT * FROM c where c.tournament.name > ' '"
  };

  const { resources: tournaments } = await container.items.query(querySpec).fetchAll();
  res.render('imprint', { tournament: tournaments[0].tournament });
});

/*GET Login Page
  Read the Tournament data to presented on the homepage from the database */
router.get('/login', async function(req, res, next) {

  // Open reference to DB collection <players>
  const container =  req.container;

  var querySpec;
  querySpec = {
    query: "SELECT * FROM c where c.tournament.name > ' '"
  };

  const { resources: tournaments } = await container.items.query(querySpec).fetchAll();
  
  res.render('login', { tournament: tournaments[0].tournament, message : "Authentifizierung notwendig"});
});

/* POST Login
  Verify User ID and Password and forward to the admin dash board */
router.post('/login', async function(req, res, next) {

  bcrypt = require("bcryptjs");

  // Open reference to DB collection <players>
  const container =  req.container;

  var querySpec;
  querySpec = {
    query: "SELECT * FROM c where c.tournament.name > ' '"
  };

  const { resources: tournaments } = await container.items.query(querySpec).fetchAll();
  
  var userid = req.body.userid.trim();
  var password = req.body.password.trim();

  querySpec = {
    query: "SELECT * FROM c where c.userid = @userid",
    parameters: [ { name: "@userid", value: userid } ]
  };

  const { resources: users } = await container.items.query(querySpec).fetchAll();
    
  if (users.length) {

    bcrypt.compare(password, users[0].password, function(err, success) {
      if (success) {   // Successful Login
        // sets a cookie with the user's info
        req.session.userid = userid;
        res.locals.userid = userid;
        req.session.level = users[0].level;
        res.locals.level = users[0].level;
        console.log("User: "+userid+" successfully authenticated");

        res.redirect("/admin/dashboard");
      } else {
          res.render('login', { tournament: tournaments[0].tournament, message: "Ungültige User Id oder Passwort" });
      };    
    });   
  } else {
      res.render('login', { tournament: tournaments[0].tournament, message: "Ungültige User Id oder Passwort" });
  }
});

/*GET Logout
  Destroy the session and forward to index */
router.get('/logout', function(req, res, next) {
  req.session.destroy();
  res.redirect('/');  
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
  
  res.render('clublist', { tournament: tournaments[0].tournament, clubs:clubs });
});

/* GET club page.
   Read the Tournament data and the player list per club to assemble a club view
   in the http req the field "club" points to the name of the requested club */
router.get('/club', async function(req, res, next) {

  const container =  req.container;

  var querySpec;
  querySpec = {
    query: "SELECT * FROM c where c.tournament.name > ' '"
  };
  const { resources: tournaments } = await container.items.query(querySpec).fetchAll();

  var club_name = req.query.club;
  
  querySpec = {
    query: "SELECT * FROM c where c.Club = @club",
    parameters: [
      {
        name: "@club",
        value: club_name
      }
    ]
  };

  const { resources: players } = await container.items.query(querySpec).fetchAll();

  players.sort(function(a, b) { if(a.Firstname+a.Lastname > b.Firstname+b.Lastname) return 1; else return -1}); 
 
  res.render('club', { ClubName: club_name, tournament: tournaments[0].tournament, data: players });
});

/* GET group page.
   Read the Tournament data and the Group List to assemble a Group view
   in the http req the field "idx" points to the index of the requested group in the group array */
router.get('/group', async function(req, res, next) {

  const container =  req.container;

  var querySpec;
  querySpec = {
    query: "SELECT * FROM c where c.tournament.name > ' '"
  };
  const { resources: tournaments } = await container.items.query(querySpec).fetchAll();
  
  var idx = parseInt(req.query.idx, 0);
  var group_name = "";

  if (idx <0 || idx >= tournaments[0].tournament.groups.length) idx = 0;
  group_name = tournaments[0].tournament.groups[idx];

  // special query syntax required as Group is a reserved word
  querySpec = {
    query: "SELECT * FROM c where c[\"Group\"] = @group",
    parameters: [
      {
        name: "@group",
        value: group_name
      }
    ]
  };
  console.log(querySpec);
  const { resources: players } = await container.items.query(querySpec).fetchAll();

  players.sort(function(a, b) { 
    var twz_a = 0, twz_b = 0; 
    if (a.hasOwnProperty("DWZ")) twz_a = a.DWZ; 
    if (b.hasOwnProperty("DWZ")) twz_b = b.DWZ; 
    if (a.hasOwnProperty("ELO") && a.ELO>twz_a) twz_a = a.ELO; 
    if (b.hasOwnProperty("ELO") && b.ELO>twz_b) twz_b = b.ELO; 
    return twz_b - twz_a; 
  });
  res.render('group', { GroupName: group_name, tournament: tournaments[0].tournament, data: players });
});

/* GET player maintenance page to allow a player to modify its own details. The player id is given in the request as id together with a secret key.
   The secret key is calculated from later numbers of the datetime property (seconds and milliseconds) 
  Read the Tournament data and player from the DB to prefill the player input fields */
router.get('/edit4p/id/:id/:key', async function(req, res, next) {

  // Get the tournament reference
  const container =  req.container;

  var querySpec;
  querySpec = {
    query: "SELECT * FROM c where c.tournament.name > ' '"
  };
  const { resources: tournaments } = await container.items.query(querySpec).fetchAll();

  var id = req.params.id;
  var key = req.params.key;

  querySpec = {
    query: "SELECT * FROM c WHERE c.id = @id",
    parameters: [{ "name": "@id", "value": id}]
  };
  const { resources: players } = await container.items.query(querySpec).fetchAll();

  var secret;
  if (players.length && key == (secret = Email.getSecret(players[0].datetime))) {

        res.render('modplayer4p', { tournament: tournaments[0].tournament, player: players[0], key: secret }); 
  } else res.redirect("/");
});
    
/* POST player maintenance page to allow a player to modify its own details. 
   The secret key is calculated from later numbers of the datetime property (seconds and milliseconds) 
   Read the Tournament data and player from the DB to prefill the player input fields */
router.post('/edit4p', async function(req, res, next) {

  // Get the tournament reference
  const container =  req.container;

  if (req.body.submitted == "save")
  {
    // Get our form values. These rely on the "name" attributes
    var firstname = req.body.firstname.trim();
    var lastname = req.body.lastname.trim();
    var title = req.body.title.trim();
    var dwz = req.body.dwz;
    var elo = req.body.elo;
    var email = req.body.email;
    var group = req.body.group;
    var sex = req.body.sex;
    var club = req.body.club.trim();
    var yob = req.body.yob;
    var country = req.body.country.trim().toUpperCase();
    var id = req.body.id;
    var key = req.body.key;

    // lookup the player in the database
    var querySpec = {
      query: "SELECT * FROM c WHERE c.id = @id",
      parameters: [{ "name": "@id", "value": id}]
    };
    const { resources: players } = await container.items.query(querySpec).fetchAll();
    
    if (players.length && key == Email.getSecret(players[0].datetime)) {
      var player = players[0];

      // Update player in the database    
      var updateplayer = { id: id, _rid: player._rid, Title: title, Firstname: firstname, Lastname: lastname, DWZ: dwz, ELO: elo, YOB: yob, Country: country, Group: group, Sex: sex, Club: club, email: email, datetime: player.datetime, status: player.status, paymentstatus: player.paymentstatus, dewis: player.dewisid };
      const { resource : updated } = container.item(id).replace(updateplayer);
            
      // And forward to success page
      res.render("confirmupdate", { player: updateplayer, message: "Die Anmeldung wurde aktualisiert" });
    } else res.redirect("/"); 
    
  } else if (req.body.submitted == "delete") {

    var id = req.body.id;
    var key = req.body.key;
    
    // lookup the player in the database
    var querySpec = {
      query: "SELECT * FROM c WHERE c.id = @id",
      parameters: [{ "name": "@id", "value": id}]
    };
    const { resources: players } = await container.items.query(querySpec).fetchAll();

    if (players.length && key == Email.getSecret(players[0].datetime)) {

      var player = players[0];
      console.log("Deleting player: "+ player.Lastname +" id: "+id);

      const { resource : result } = await container.item(id, id).delete();
      res.render("confirmupdate", { player: player, message: "Die Anmeldung wurde gelöscht" });
    } else res.redirect("/");
  } else res.redirect("/"); 
});

module.exports = router;
