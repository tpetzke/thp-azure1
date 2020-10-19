var express = require('express');
var router = express.Router();

const TrnInfo = require('../classes/trninfo');
const Email = require('../classes/email');
const { resource } = require('../app');

/* Global function that checks for a user in the http request and if not present forwards to the login page 
   this is included in the function call that require a looged in user */ 
function requireLogin (req, res, next) {
  if (!req.session.userid) {
    res.redirect('/login');
  } else {
    next();
  }
};

/* GET Dashboard */
router.get('/dashboard', requireLogin, async function(req, res, next) {

  // Open reference to DB collection <players>
  const container =  req.container;

  var querySpec;
  querySpec = {
    query: "SELECT * FROM c where c.tournament.name > ' '"
  };
  const { resources: tournaments } = await container.items.query(querySpec).fetchAll();

  querySpec = {
    query: "SELECT * FROM c where c.Lastname > ''"
  };
  const { resources: players } = await container.items.query(querySpec).fetchAll();

  const trnInfo = new TrnInfo(tournaments[0].tournament, players);
    
  res.render('dashboard', { trnInfo: trnInfo });
});

/* GET setup page.
   Read the Tournament data from the DB to prefill the tournament input fields */
router.get('/setup', requireLogin, async function(req, res, next) {
  
  // Open reference to DB collection <players>
  const container =  req.container;

  var querySpec;
  querySpec = {
    query: "SELECT * FROM c where c.tournament.name > ' '"
  };
  const { resources: tournaments } = await container.items.query(querySpec).fetchAll();

  res.render('setup', { tournament: tournaments[0].tournament, _id: tournaments[0].id, _rev: tournaments[0]._rid  });
});
  
/* POST to Tournament Update */
router.post('/setup', async function (req, res) {

  // Open reference to DB collection <players>
  const container =  req.container;

  var querySpec;
  querySpec = {
    query: "SELECT * FROM c where c.tournament.name > ' '"
  };
  const { resources: tournaments } = await container.items.query(querySpec).fetchAll();

  // Get our form values. These rely on the "name" attributes
  var _id = req.body._id;
  var _rev = req.body._rev;
  var name = req.body.name;
  var shortname = req.body.shortname;
  var date = req.body.date;
  var capacity = req.body.capacity;
  var location = req.body.location
  var description = req.body.description;
  var announcement= req.body.announcement;
  var groups = req.body.groups.split(",");
  var entryfee = req.body.entryfee;
  var paymentdeadline = req.body.paymentdeadline;
  var recipient = req.body.recipient.trim();
  var IBAN = req.body.IBAN;
  var email = req.body.email;
  var sentmails = req.body.sentmails ? "true" : "false";
  var imprint = req.body.imprint;

  for (i=0; i<groups.length; i++) groups[i] = groups[i].trim();

  var action = req.body.submit;
  
  // Update tournament in the database    
  var tournament_doc = {
    id: _id,
    tournament: {
    name: name,
    shortname: shortname,
    email: email,
    sentmails: sentmails,
    location: location,
    date: date,
    url: announcement,
    description : description,
    capacity : capacity,
    groups: groups,
    entryfee: entryfee,
    paymentdeadline: paymentdeadline,
    recipient: recipient,
    IBAN: IBAN,
    imprint : imprint
  }} 
  
  if (action=="update")
  {
    console.log('Updating tournament with id: '+_id);
    const { resources : replaced} = await container.item(_id).replace(tournament_doc);
    res.redirect("/admin/dashboard");
  }  

  if (action=="back")
  {
    res.redirect("/admin/dashboard");
  }  

  if (action=="init")  // TODO:fixme
  {
    var dbname = db.config.db;
    console.log("Init Request received for database: " + dbname+" Deleting all players");
  
    querySpec = {
      query: "SELECT * FROM c where c.Lastname > ' '"
    };
    const { resources: players } = await container.items.query(querySpec).fetchAll();

    for (i=0; i< players.length; i++) {
      const { resource : result } = await container.item(players[i].id, players[i].id).delete();
    }
    res.redirect("/admin/dashboard");
  }
});


/* GET all player page.
   Read the Tournament data from the DB to prefill the tournament input fields */
router.get('/allplayer', requireLogin, async function(req, res, next) {

  // Open reference to DB collection <players>
  const container =  req.container;

  var querySpec;
  querySpec = {
    query: "SELECT * FROM c where c.tournament.name > ' '"
  };
  const { resources: tournaments } = await container.items.query(querySpec).fetchAll();

  querySpec = {
    query: "SELECT * FROM c WHERE c.Lastname > '' ORDER BY c.datetime"   // FixMe  ORDER BY c.status, c.datetime but requires composite index in azure cosmos collection
  };
  const { resources: players } = await container.items.query(querySpec).fetchAll();

  var d = Date.now();
  if (tournaments[0].tournament.paymentdeadline != "0") {
    for (i = 0; i < players.length; i++) {
      if (players[i].paymentstatus == "open" && d > (parseInt(players[i].datetime) + (24*60*60*1000 * parseInt(tournaments[0].tournament.paymentdeadline)))) players[i].paymentstatus = "overdue";
    };
  };

  res.render('allplayer', { tournament: tournaments[0].tournament, players: players });
});

/* Post to the refresh playerlist
   Refresh the player list data by reading the dewis database and checking capacity constraints */
router.post('/refreshplayerlist', async function(req, res, next) {

  // Open reference to DB collection <players>
  const container =  req.container;
  const dewisContainer = req.dewis;

  // Get our form values. These rely on the "name" attributes
  var capacity = parseInt(req.body.capacity);
  
  // sort players by status and then by datetime, confirmed players are always ordered before waitlisted players
  var querySpec;
  querySpec = {
    query: "SELECT * FROM c WHERE c.Lastname > '' ORDER BY c.status"
  };
  const { resources: players } = await container.items.query(querySpec).fetchAll();
    
  querySpec = {
    query: "SELECT * FROM c"
  };
  const { resources: dewis } = await dewisContainer.items.query(querySpec).fetchAll();

  console.log("players found: " + players.length + "  dewis records found: " + dewis.length);

  confirmedPlayers = 0;

  players.forEach(async element => {

    // check whether we have to change the status of the player due to cancellations or capacity changes
    var newstatus; 
    var newdwz = element.DWZ;
    var newelo = element.ELO;
    var newclub = element.Club;
    var newyob = element.YOB;
    var newtitle = typeof element.Title !== "undefined" ? element.Title : "";
    var name = element.Lastname+","+element.Firstname;

    newstatus = element.status;
    if (confirmedPlayers  < capacity) newstatus = "confirmed"; 
    
    j=0;
    while(j<dewis.length && dewis[j].Name !== name) j++;
    if (j < dewis.length) {
      newdwz = dewis[j].DWZ;
      newelo = dewis[j].ELO;
      newclub = dewis[j].Club;
      newyob = dewis[j].YOB;
      newtitle = dewis[j].Titel;
    }

    if ((newdwz !== element.DWZ) ||
        (newelo !== element.ELO) ||
        (newclub !== element.Club) ||
        (newyob !== element.YOB) ||
        (newtitle !== element.Titel) ||
        (newstatus !== element.status)) {

        var player = {id: element.id, _rid: element._rid, Title: newtitle, Firstname: element.Firstname, Lastname: element.Lastname, DWZ: newdwz, ELO: newelo, YOB: newyob, Country: element.Country, paymentstatus: element.paymentstatus, Group: element.Group, Sex: element.Sex, Club: newclub, email: element.email, dewis: element.dewis, status: newstatus, datetime: element.datetime };
        const { resources : replaced } = await container.item(element.id).replace(player);
    }
    confirmedPlayers++;
  });

  res.redirect('/admin/allplayer');
});  


/* GET single player maintenance page. The player id is given in the request as _id.
  Read the Tournament data and player from the DB to prefill the player input fields */
router.get('/player/id/:id', requireLogin, async function(req, res, next) {

  // Set our internal DB variable
  var container = req.container;
  var id = req.params.id;

  var querySpec;
  querySpec = {
    query: "SELECT * FROM c where c.tournament.name > ' '"
  };
  const { resources: tournaments } = await container.items.query(querySpec).fetchAll();

  var querySpec;
  querySpec = {
    query: "SELECT * FROM c where c.id = @id",
    parameters: [ { "name": "@id", "value": id} ]
  };
  const { resources: players } = await container.items.query(querySpec).fetchAll();

  if (players.length) res.render('modplayer', { tournament: tournaments[0].tournament, player: players[0] }); else res.redirect("/");
});

/* POST from the modify player page
    we have to check whether the pressed button was the save button then we save 
    we will forward in both cases back to the player listing */
router.post('/modifyplayer', requireLogin, async function(req, res, next) {

  // Set our internal DB variable
  var container = req.container;

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
    var status = req.body.status;
    var paymentstatus = req.body.paymentstatus;
    var yob = req.body.yob;
    var country = req.body.country;
    var id = req.body.id;

    var querySpec;
    querySpec = {
      query: "SELECT * FROM c WHERE c.id = @id",
      parameters: [ { "name": "@id", "value": id} ]
    };
    const { resources: players } = await container.items.query(querySpec).fetchAll();

    var player = players[0];
    var statuschange2confirmed = (player.status == "waitlisted" && status == "confirmed");  // check whether there is a change from waitlisted to confirmed
      
    // Update player in the database    
    var updateplayer = { id: id, _rid: player._rid, Title: title, Firstname: firstname, Lastname: lastname, DWZ: dwz, ELO: elo, YOB: yob, Country: country, Group: group, Sex: sex, Club: club, email: email, datetime: player.datetime, status: status, paymentstatus: paymentstatus, dewis: player.dewisid };
    const { resources : replaced } = await container.item(id).replace(updateplayer);
    
    // send a notification mail to the player that he is now confirmed
    if (statuschange2confirmed) 
    {
      querySpec = {
        query: "SELECT * FROM c where c.tournament.name > ' '"
      };
      const { resources: tournaments } = await container.items.query(querySpec).fetchAll();

      querySpec = {
        query: "SELECT value count(1) FROM c WHERE c.status = 'confirmed'"
      };
      var idx = 0;
      for (var i=0; i<tournaments[0].tournament.groups.length; i++) if (tournaments[0].tournament.groups[i] == group) idx = i;
      var secret = Email.getSecret(player.datetime);
      var playerUrl = req.protocol + '://' + req.get('host') + "/edit4p/id/"+id+"/"+secret;
      var groupUrl = req.protocol + '://' + req.get('host') + "/group?idx="+idx;
  
      var links = {"player":playerUrl, "group": groupUrl};
      const { resources: count } = await container.items.query(querySpec).fetchAll();
      if (tournaments[0].tournament.sentmails == "true") Email.sendConfirmation(tournaments[0].tournament, updateplayer, parseInt(count), links);
    }

    res.redirect("/admin/allplayer");
  } else if (req.body.submitted == "delete") {

    var id = req.body.id;
    console.log("Deleting player: " + id);
    const { resource : result } = await container.item(id, id).delete();
    res.redirect("/admin/allplayer");

  } else res.redirect("/admin/allplayer");
});

/* GET Password Page 
   find the current user in the DB and forward to the set password page */
router.get('/password', requireLogin, async function(req, res, next) {

  // Open reference to DB collection <players>
  const container =  req.container;

  var querySpec;
  querySpec = {
    query: "SELECT * FROM c where c.tournament.name > ' '"
  };
  const { resources: tournaments } = await container.items.query(querySpec).fetchAll();
  
  var userid = req.session.userid;

  querySpec = {
    query: "SELECT * FROM c WHERE c.userid = @userid",
    parameters: [ { "name": "@userid", "value": userid} ]
  };
  const { resources: users } = await container.items.query(querySpec).fetchAll();

  if (users.length)
        res.render('password', { tournament: tournaments[0].tournament, userid: userid }); else res.redirect("/admin/dashboard");
});

/* POST Password Page 
   change the password for the current user */
router.post('/password', requireLogin, async function(req, res, next) {

  // Open reference to DB collection <players>
  const container =  req.container;
  
  var userid = req.session.userid;
  var pw = req.body.password1.trim();        // Password is hashed below

  querySpec = {
    query: "SELECT * FROM c WHERE c.userid = @userid",
    parameters: [ { "name": "@userid", "value": userid} ]
  };
  const { resources: users } = await container.items.query(querySpec).fetchAll();

  if (users.length) {

    var u = users[0];
    bcrypt = require("bcryptjs");
    bcrypt.hash(pw, 10, function(err, hash) {
      
      var updateuser = { id: u.id, _rid: u._rid, userid: u.userid, password: hash, level: u.level };
      const { resources: replaced } = container.item(u.id).replace(updateuser);

      res.redirect("/admin/dashboard");
    }) 
  } else res.redirect("/admin/dashboard");
});

  /* GET userlist Page 
   This page lists the currently defined users and webmasters */
router.get('/userlist', requireLogin, async function(req, res, next) {

  // Open reference to DB collection <players>
  const container =  req.container;

  var querySpec;
  querySpec = {
    query: "SELECT * FROM c where c.tournament.name > ' '"
  };
  const { resources: tournaments } = await container.items.query(querySpec).fetchAll();

  querySpec = {
    query: "SELECT * FROM c WHERE c.userid > ''",
  };
  const { resources: users } = await container.items.query(querySpec).fetchAll();

  res.render('userlist', { tournament: tournaments[0].tournament, users: users, message: "Aktuell zugelassende Portal Nutzer" });
});    

  /* GET Webmaster Page 
   The page can be used to create a new or to change an existing webmaster 
   if userid is 0 then a new webmaster is created otherwise the existing one with that id modified */
router.get('/webmaster/id/:id/:action', requireLogin, async function(req, res, next) {

  // Open reference to DB collection <players>
  const container =  req.container;

  var querySpec;
  querySpec = {
    query: "SELECT * FROM c where c.tournament.name > ' '"
  };
  const { resources: tournaments } = await container.items.query(querySpec).fetchAll();
  
  var id = req.params.id;
  var action = req.params.action;
  
  if (action == "new")  // create a new webmaster
  {
    var title = "Weiteren Turnierleiter Account anlegen";
    res.render('webmaster', { tournament: tournaments[0].tournament, title: title, id: "", userid: "", level: "root" });

  } else if (action == "edit") {
    var title = "Turnierleiter Account aktualisieren";

    querySpec = {
      query: "SELECT * FROM c WHERE c.id = @id",
      parameters: [{"name": "@id", "value": id}]
    };
    const { resources: users } = await container.items.query(querySpec).fetchAll();
 
    if (users.length) {   
        res.render('webmaster', { tournament: tournaments[0].tournament, title: title, id: id, userid: users[0].userid, level: users[0].level });
    } else res.redirect("/admin/dashboard");
  
  } else if (action == "delete") {

    querySpec = {
      query: "SELECT * FROM c WHERE c.id = @id",
      parameters: [{"name": "@id", "value": id}]
    };
    const { resources: users } = await container.items.query(querySpec).fetchAll();

    if (users.length) {
      console.log("deleting user with id: "+id);
      const { resource : result } = await container.item(id, id).delete();
      res.redirect('/admin/userlist');  
    } else res.redirect('/admin/userlist');
  
  } else res.redirect('/admin/userlist');
});
  
/* POST Webmaster Page 
   If we get an empty _id value we insert a new webmaster otherwise we look for the one with the _id and update it */
router.post('/webmaster', requireLogin, async function(req, res, next) {

  var bcrypt = require("bcryptjs");

  // Open reference to DB collection <players>
  const container =  req.container;

  var querySpec;
  querySpec = {
    query: "SELECT * FROM c where c.tournament.name > ' '"
  };
  const { resources: tournaments } = await container.items.query(querySpec).fetchAll();
  
  var id = req.body.id;                      // document-id in cosmos
  var userid = req.body.userid.trim();       // userid of admin, eg. the email address
  var password = req.body.password1.trim();  // Password is hashed below before written to the database
  var level = req.body.level;
  var message = "";  

  if (res.locals.level == "root") {         // check whether the user level is high enough to modify user data

    querySpec = {
        query: "SELECT * FROM c WHERE c.userid = @userid",
        parameters: [{"name": "@userid", "value": userid}]
    };
    console.log(querySpec);
    const { resources: users } = await container.items.query(querySpec).fetchAll();
    console.log(users);
    
    var usercnt = users.length;      // check how many users with that userid exist already

    if (id == "")
    {
      if (usercnt == 0)
      {
        bcrypt.hash(password, 10, async function(err, hash) {
              
          var webmaster = { userid: userid, password: hash, level: level };
      
          const { resource: createdItem } = await container.items.create(webmaster);
          res.redirect("/admin/userlist");
          message = "Neuen Nutzer mit User Id: "+userid+" angelegt";
        })
      } else message="Fehler! Userid "+userid+" already exists";
      console.log(message);
    } else {

      querySpec = {
          query: "SELECT * FROM c WHERE c.id = @id",
          parameters: [{"name": "@id", "value": id}]
      };

      const { resources: users } = await container.items.query(querySpec).fetchAll();
  
      if (users.length) {
        if (userid == users[0].userid || !usercnt)
        {  
          bcrypt.hash(password, 10, function(err, hash) {

          var webmaster = { id: users[0].id, _rid: users[0].rid, userid: userid, password: hash, level: level };
          const { resource: replaced } = container.item(id).replace(webmaster);
          res.redirect("/admin/userlist");
          message = "Nutzer Daten für "+userid+" aktualisiert";
          });
        } else message="Fehler! Userid "+userid+" already exists";
      }
      console.log(message);
    }
  } else console.log("Berechtigungsfehler!");
});

router.get('/download/group/:name', requireLogin, async function(req, res, next) {

  // Open reference to DB collection <players>
  const container =  req.container;

  var groupName = req.params.name;

  // special query syntax required as Group is a reserved word
  var querySpec = {
    query: "SELECT * FROM c where c.status = 'confirmed' and c.Lastname > '' and c[\"Group\"] = @group",
    parameters: [ 
      {
        name: "@group",
        value: groupName
      }
    ]
  };
  const { resources: players } = await container.items.query(querySpec).fetchAll();
  
  players.sort(function(a, b) { 
    var twz_a = 0, twz_b = 0; 
    if (a.hasOwnProperty("DWZ")) twz_a = a.DWZ; 
    if (b.hasOwnProperty("DWZ")) twz_b = b.DWZ; 
    if (a.hasOwnProperty("ELO") && a.ELO>twz_a) twz_a = a.ELO; 
    if (b.hasOwnProperty("ELO") && b.ELO>twz_b) twz_b = b.ELO; 
    return twz_b - twz_a; 
  });

  var tm = new Date();
  var ts = tm.toString().slice(4,15).replace(/\s+/g, '');

  var swiss = [];
  for (i=0; i< players.length; i++) {
    p = players[i];
    var cntry = typeof p.Country == "undefined" ? "GER" : p.Country;
    var attr = p.Sex == "female" ? "w" : "";

    var swiss_player = {  "Name": p.Lastname + ', ' + p.Firstname,
                          "Verein": p.Club,
                          "Land": cntry,
                          "ELO": p.ELO,
                          "DWZ" : p.DWZ,
                          "Title": p.Title,
                          "YOB": p.YOB,
                          "PKZ" : "",
                          "FIDE-ID" : "",
                          "TNr-ID" : "",
                          "Attr" : attr,
                          "Sel" : "" 
                        }
    swiss.push(swiss_player);                    
  }
    
  const { Parser } = require('json2csv');
  const fields = ['Name', 'Verein', 'Land', 'ELO', 'DWZ', 'Title', 'YOB', 'PKZ', 'FIDE-ID', 'TNr-ID', 'Attr', 'Sel'];
  const json2csvParser = new Parser({ fields, delimiter: ';', header: false, withBOM: true });
  const csv = json2csvParser.parse(swiss);

  res.writeHead(200, {"Content-Type": "text/csv", 'Content-Disposition': 'attachment; filename=\"' + 'Spieler-' + groupName + '-'+ ts + '.LST\"'});
  res.end(csv);
});


module.exports = router;
