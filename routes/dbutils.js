exports.dbInit = async function(container, default_docs, callback) { 

  var querySpec;
  querySpec = {
    query: "SELECT * FROM c where c.tournament.name > ' '"
  };
  const { resources: tournaments } = await container.items.query(querySpec).fetchAll();
  if (!tournaments.length)
  {

    console.log("Initializing database for tournament data");

    // Create an default tournament document
    var tournament_doc = {
        tournament: {
            name: "Turniername",
            shortname: "Kurzname",
            location: "Ort",
            email:"webmaster@onlinde.de",
            sentmails: "sentmails",
            date: "Datum",
            url: "http://link-zur-auschreibung.de",
            description : "Turnierbeschreibung",
            capacity : "0",
            groups: ["Gruppe A"],
            entryfee: "10",
            paymentdeadline: "7",
            recipient: "Veranstalter",
            IBAN: "DE",
            imprint: ""
        }
    };
    const { resource : createdItem } = await container.items.create(tournament_doc);
    console.log("Initial tournament created");
  }

  var querySpec;
  querySpec = {
    query: "SELECT * FROM c where c.userid > ' '"
  };
  const { resources: userids } = await container.items.query(querySpec).fetchAll();
  if (!userids.length)
  {

    // Create an initial default administrator
    var root_doc = {
        userid:"root",
        password:"$2b$10$vKxgstlxIX0iC6XBkqHPGe4oa.NOoFX7sb3Ios5YUcUB5KQhVOHR2",    // the bcyrpt hashed value of "root"
        level:"root"
    }
    const { resource : createdItem } = await container.items.create(root_doc);
    console.log("Initial admin root created");
  }
}
