const internal = {};

module.exports = internal.Email = class {

    static sendConfirmation(tournament, player, playercnt, links) {
        var ejs = require("ejs");
              
        ejs.renderFile("views/templates/mail.ejs", { tournament: tournament, player: player, playercnt : playercnt, links: links }, function (err, data) {
          if (err) {
              console.log(err);
          } else {
      
            const EMAIL_USER = process.env.EMAIL_USER || process.env.APPSETTING_EMAIL_USER;   
            const EMAIL_PW = process.env.EMAIL_PW || process.env.APPSETTING_EMAIL_PW;   

            if (typeof EMAIL_USER !== 'undefined' && EMAIL_USER !== null && 
                typeof EMAIL_PW !== 'undefined' && EMAIL_PW !== null) {
      
              var nodemailer = require('nodemailer');
              var transporter = nodemailer.createTransport({
                service: 'SendinBlue',
                auth: {
                  user: process.env.EMAIL_USER,
                  pass: process.env.EMAIL_PW
              }
              });
      
              const mailOptions = {
                from: tournament.email,     // sender address
                to: player.email, // list of receivers
                cc: tournament.email,
                subject: tournament.shortname + ' - Meldebestätigung - ' + player.Firstname + ' ' + player.Lastname, // Subject line
                html: data                  // plain text body
              };
      
              transporter.sendMail(mailOptions, function (err, info) {
                if(err)
                  console.log(err)
                else
                  console.log(info);
              });
            } else console.log("UserId and Password for email provider SendinBlue not found in process environment variables");
          };
        });
    }

    static getSecret(datetime) {
      var skey = (datetime % 10000000).toString(), secret = "";
      for (var i=0; i<skey.length; i++) secret += String.fromCharCode(65 + parseInt(skey[0]) + parseInt(skey[i]));
      return secret;  
    }
}