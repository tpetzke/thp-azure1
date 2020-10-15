exports.dbInit = function(db, default_docs, callback) { 
    console.log("Initializing database: " + db.config.db);

    // Insert the views for player and club counting
    var dbview = {  
        "_id":"_design/app",
        "views":{  
           "club-count":    {  
                "reduce":"_count",
                "map":"function (doc) {\n  if (doc.Club) emit(doc.Club, null);\n}"
           },
           "player-count":  {  
                "reduce":"_count",
                "map":"function (doc) {\n  if (doc.Lastname) emit(doc._id, null);\n}"
            },
            "player-confirmed-count": {
              "reduce": "_count",
              "map": "function (doc) {\n  if (doc.Lastname && doc.status==\"confirmed\") emit(doc._id, null);\n}"
            }
        },
        "language":"javascript"
    }
    
    // Insert a query index for the player status and datetime
    var qidx = {
        "_id":"_design/status-dt",
        "language": "query",
        "views": {
          "status-dt-json-index": {
            "map": {
              "fields": {
                "status": "asc",
                "datetime": "asc"
              },
              "partial_filter_selector": {}
            },
            "reduce": "_count",
            "options": {
              "def": {
                "fields": [
                  "status",
                  "datetime"
                ]
              }
            }
          }
        }
    };

    var qidx2 = {
        "_id":"_design/datetime",
        "language": "query",
        "views": {
          "datetime-json-index": {
            "map": {
              "fields": {
                "datetime": "asc"
              },
              "partial_filter_selector": {}
            },
            "reduce": "_count",
            "options": {
              "def": {
                "fields": [
                  "datetime"
                ]
              }
            }
          }
        }
    }

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

    // Create an initial default administrator
    var root_doc = {
        userid:"root",
        password:"$2b$10$vKxgstlxIX0iC6XBkqHPGe4oa.NOoFX7sb3Ios5YUcUB5KQhVOHR2",    // the bcyrpt hashed value of "root"
        level:"root"
    }
    
    var docs = [];
    docs.push(dbview);
    docs.push(qidx);
    docs.push(qidx2);
    if (default_docs == null) {
        docs.push(tournament_doc);
        docs.push(root_doc);
    } else {
        // for (i=0; i<default_docs.length; i++) docs.push(default_docs[i]);
    }

    db.bulk({ docs:docs }, function(err) {
        if (err) console.log(err); else console.log("Initial DB content created");
        callback();
    }); 

}
