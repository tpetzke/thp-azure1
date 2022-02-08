var express = require('express');
var router = express.Router();

const Email = require('../classes/email');
  
/* GET add player Step 1 
   Record Firstname and Lastname of the user */
router.get('/addplayer1', function(req, res, next) {
  
  let appInsights = require("applicationinsights");
  appInsights.defaultClient.trackEvent({name: 'Add Player 1 view'});

  res.render('addplayer1');
});

/* POST add player Step 1 
   Firstname and Lastname are entered. 
   Lookup the user in the DEWIS Database 
   Lookup the tournament data and forward to step 2 */
router.post('/lookup_player', async function(req, res, next) {

  // Set our internal DB variable
  // Open reference to DB collection <players>
  const dewis =  req.dewis;           // dewis container
  const container = req.container;    // player container 

  var firstname = req.body.firstname.trim();
  var lastname = req.body.lastname.trim();
  var duplicatecheck = req.body.duplicatecheck;   // true if coming from addplayer1, false if coming from dupliacte already

  firstname = firstname.charAt(0).toUpperCase() + firstname.slice(1);
  lastname = lastname.charAt(0).toUpperCase() + lastname.slice(1);

  var querySpec;

  if (duplicatecheck == "true")
  {
    querySpec = {
      query: "SELECT * FROM c WHERE c.Firstname = @firstname AND c.Lastname = @lastname",
      parameters: [
        { name: "@firstname", value: firstname },
        { name: "@lastname", value: lastname }
      ]
    };
    const { resources: players } = await container.items.query(querySpec).fetchAll();

    if (players.length) {
        res.render('duplicate', { player: players[0] });
    } else {

      querySpec = {
        query: "SELECT * FROM c WHERE c.Name = @name",
        parameters: [ { name: "@name", value: lastname+','+firstname } ]
      };

      const { resources: dewisPlayers } = await dewis.items.query(querySpec).fetchAll();

      querySpec = {
        query: "SELECT * FROM c where c.tournament.name > ' '"
      };
      const { resources: tournaments } = await container.items.query(querySpec).fetchAll();

      let appInsights = require("applicationinsights");
      appInsights.defaultClient.trackEvent({name: 'Add Player 2 view'});
      
      res.render('addplayer2', { title: 'Spieler anmelden', firstname : firstname, lastname : lastname, tournament : tournaments[0].tournament, dewis: dewisPlayers });
    
    }
  } else {
 
    querySpec = {
      query: "SELECT * FROM c WHERE c.Name = @name",
      parameters: [ { name: "@name", value: lastname+','+firstname } ]
    };
    const { resources: players } = await dewis.items.query(querySpec).fetchAll();

    querySpec = {
      query: "SELECT * FROM c where c.tournament.name > ' '"
    };
    const { resources: tournaments } = await container.items.query(querySpec).fetchAll();

    let appInsights = require("applicationinsights");
    appInsights.defaultClient.trackEvent({name: 'Add Player 2 view'});

    res.render('addplayer2', { title: 'Spieler anmelden', firstname : firstname, lastname : lastname, tournament : tournaments[0].tournament, dewis: dewisPlayers[0] });
  };
});

/* POST to Verify Service */
router.post('/verifyplayer', function (req, res) {

  // Get our form values. These rely on the "name" attributes
  var firstname = req.body.firstname.trim();
  var lastname = req.body.lastname.trim();
  var dwz = req.body.dwz;
  var elo = req.body.elo;
  var email = req.body.email;
  var group = req.body.group;
  var sex = req.body.sex;
  var club = req.body.club.trim();
  var dewisid = req.body.dewisid;
  var datetime = Date.now();
  var capacity = req.body.capacity;
  var title = req.body.title.trim().toUpperCase();
  var yob = req.body.YOB;
  var country = req.body.country.trim().toUpperCase();;
 
  firstname = firstname.charAt(0).toUpperCase() + firstname.slice(1);
  lastname = lastname.charAt(0).toUpperCase() + lastname.slice(1);
  club = club.charAt(0).toUpperCase() + club.slice(1);

  let appInsights = require("applicationinsights");
  appInsights.defaultClient.trackEvent({name: 'Add Player 3 view'});

  // And forward to verify page
  res.render("addplayer3", { Title: title, Firstname: firstname, Lastname: lastname, DWZ: dwz, ELO: elo, YOB: yob, Country: country, Group: group, Sex: sex, Club: club, email: email, datetime: datetime, dewisid: dewisid, capacity : capacity });
});

/* POST to Add Player Service */
router.post('/addplayer', async function (req, res) {

  if (req.body.submitted == "save")
  {
    // Set our internal DB variable
    const container = req.container;    // player container 

    // Get our form values. These rely on the "name" attributes
    var title = req.body.title;
    var firstname = req.body.firstname.trim();
    var lastname = req.body.lastname.trim();
    var dwz = req.body.dwz;
    var elo = req.body.elo;
    var yob = req.body.yob;
    var country = req.body.country.toUpperCase();
    var email = req.body.email;
    var group = req.body.group;
    var sex = req.body.sex;
    var club = req.body.club.trim();
    var dewisid = req.body.dewisid;
    var datetime = req.body.datetime;
    var capacity = req.body.capacity;
    var status = "confirmed";         // init to default, will be checked below again 
    var paymentstatus = "open";

    var group_desc = group;
    if (sex=="female") group_desc += " (weiblich)";

    var querySpec;
    querySpec = {
      query: "SELECT * FROM c where c.tournament.name > ' '"
    };
    const { resources: tournaments } = await container.items.query(querySpec).fetchAll();

    querySpec = {
      query: "select value count(1) from c where c.Firstname > ''"
    };

    const { resources: playercnt } = await container.items.query(querySpec).fetchAll();
      
    // determine the status for the player. If less than tournament capacity players are registered the status is confirmed otherwise waitlisted
    var currentPlayerCnt = parseInt(playercnt);
    if (capacity > 0 && currentPlayerCnt >= capacity) status="waitlisted";


    // Insert player to the database    
    var newplayer = { Title: title, Firstname: firstname, Lastname: lastname, DWZ: dwz, ELO: elo, YOB: yob, Country: country, Group: group, Sex: sex, Club: club, email: email, datetime: datetime, status: status, paymentstatus: paymentstatus, dewis: dewisid };
    
    const { resource : createdItem } = await container.items.create(newplayer);
    console.log(createdItem);

    // calculate the URLs
    var idx = 0;
    for (var i=0; i<tournaments[0].tournament.groups.length; i++) if (tournaments[0].tournament.groups[i] == group) idx = i;
    var secret = Email.getSecret(newplayer.datetime);
    var playerUrl = req.protocol + '://' + req.get('host') + "/edit4p/id/"+createdItem.id+"/"+secret;
    var groupUrl = req.protocol + '://' + req.get('host') + "/group?idx="+idx;

    var links = {"player":playerUrl, "group": groupUrl};

    if (tournaments[0].tournament.sentmails == "true")
    {
      Email.sendConfirmation(tournaments[0].tournament, newplayer, currentPlayerCnt, links);
      let appInsights = require("applicationinsights");
      appInsights.defaultClient.trackEvent({name: 'Mail Sent', properties:{ak:group}});
    }

    // And forward to success page
    res.render("success", { player: newplayer, Group: group_desc, status: status, capacity: capacity, playercnt : currentPlayerCnt, tournament: tournaments[0].tournament, links: links});
  } else res.redirect("/");
});

module.exports = router;
