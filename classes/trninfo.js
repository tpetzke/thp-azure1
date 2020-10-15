const internal = {};

module.exports = internal.TrnInfo = class {

    constructor(tournament, players) {
        console.log("Initialize TrnInfo object");
        this.tournament = tournament;
        this.players = players;

        this.players.sort((a, b) => { 
            var twz_a = 0, twz_b = 0; 
            if (a.hasOwnProperty("DWZ")) twz_a = a.DWZ; 
            if (b.hasOwnProperty("DWZ")) twz_b = b.DWZ; 
            if (a.hasOwnProperty("ELO") && a.ELO>twz_a) twz_a = a.ELO; 
            if (b.hasOwnProperty("ELO") && b.ELO>twz_b) twz_b = b.ELO; 
            return twz_b - twz_a; 
          });

        this._playersPerGroup = this.collectPlayersPerGroup();
        this._clubs = this.collectClubCounts();
        this._avgdwz = this.collectAvgDWZ();
    }

    getTournamentName() {
        return this.tournament.name;
    }

    getSex(sex) {
        var cnt = 0, i;
        for (i=0; i<this.players.length; i++) if (this.players[i].Sex==sex) cnt++;
        return cnt;
    }

    getGroups() {
        return this.tournament.groups;
    }

    getPlayerCnt() {
        return this.players.length;
    }

    getGroupCnt() {
        return this.tournament.groups.length;
    }

    getStatusCnt(status) {
        var cnt = 0, i;
        for (i=0; i<this.players.length; i++) if (this.players[i].status==status) cnt++;
        return cnt;
    }

    getPlayerPerGroup() {
        return this._playersPerGroup;
    }

    getGroupNames() {
        return this.tournament.groups;
    }

    getClubCnt() {
        return this._clubs.length;
    }

    getTop5ClubNames() {
        var names = [], i = 0;
        for (i = 0; i < 5 && i < this._clubs.length; i++) names.push(this._clubs[i].club);
        return names;
    }

    getTop5ClubCounts() {
        var counts = [], i = 0;
        for (i = 0; i < 5 && i < this._clubs.length; i++) counts.push(this._clubs[i].count);
        return counts;
    }

    getTopClubNameByIdx(idx) {
        if (idx < this._clubs.length) return this._clubs[idx].club;
        return ""; 
    }

    getTopClubCountByIdx(idx) {
        if (idx < this._clubs.length) return this._clubs[idx].count;
        return ""; 
    }

    getPlayerNameByIdx(idx)
    {
        if (idx < this.players.length) return (this.players[i].Title != "" ? this.players[i].Title + " " : "") + this.players[i].Firstname + " " + this.players[i].Lastname;
        return "";
    }

    getPlayerDWZByIdx(idx)
    {
        if (idx < this.players.length) return this.players[i].DWZ;
        return "";
    }

    getPlayerELOByIdx(idx)
    {
        if (idx < this.players.length) return this.players[i].ELO;
        return "";
    }

    getPlayerAttrByIdx(idx)
    {
        if (idx < this.players.length && this.players[i].Sex=="female") return "w";
        return "";
    }

    // get the budget in € if all confirmed players less the free players pay their entry fee
    getTournamentBudget() {
        var cnt = 0, i;
        for (i = 0; i < this.players.length; i++) 
            if (this.players[i].status == "confirmed" && this.players[i].paymentstatus != "free") cnt++;
        
        return cnt * this.tournament.entryfee;    
    }

    // get the already received payments 
    getTournamentIncome() {
        var cnt = 0, i;
        for (i = 0; i < this.players.length; i++) 
            if (this.players[i].paymentstatus == "paid") cnt++;
        
        return cnt * this.tournament.entryfee;    
    }

    // get number of overedue payments 
    getTournamentOverdueCnt() {
        var cnt = 0, i; 
        var d = Date.now();
        if (this.tournament.paymentdeadline != "0") {
            for (i = 0; i < this.players.length; i++) {
                if (this.players[i].paymentstatus == "open" && d > (parseInt(this.players[i].datetime) + (24*60*60*1000 * parseInt(this.tournament.paymentdeadline)))) cnt++;
            }
        }
        return cnt;    
    }

    getAverageDWZfor(who) {
        if (who == "male") return this._avgdwz[1]; else
        if (who == "female") return this._avgdwz[2]; else
        if (who == "tournament") return this._avgdwz[0];
        return 0;
    }

    collectPlayersPerGroup() {
        var i = 0, j = 0, pPG = [];
        for (i = 0; i < this.tournament.groups.length; i++) pPG.push(0);
        for (i = 0; i < this.players.length; i++) {
            for (j=0; j < this.tournament.groups.length; j++) if (this.tournament.groups[j] == this.players[i].Group) pPG[j]++;
        }
        return pPG;
    }

    collectClubCounts() {
        var names = [], clubs = [], i = 0, cnt = 0;
        for (i = 0; i < this.players.length; i++) if (typeof this.players[i].Club !== "undefined") names.push(this.players[i].Club);
        names.sort();

        var currentClub = "";
        for (i = 0; i < names.length; i++) {
            if (names[i] !== currentClub) {
                 if (cnt) clubs.push({"club":currentClub,"count":cnt});
                currentClub = names[i];
                cnt = 1;
            } else cnt++;       
        }
        if (cnt) clubs.push({"club":currentClub,"count":cnt});  // push also the last club to the list
        clubs.sort((a, b) => (a.count < b.count) ? 1 : -1);
    
        return clubs;
    }

    // 0: Tournament DWZ, 1: Males, 2: Females
    collectAvgDWZ() {
        var dwzs = [0, 0, 0], cnts = [0, 0, 0], i, dwz;
        
        for (i = 0; i < this.players.length; i++) if (this.players[i].status == "confirmed") {
            cnts[0]++;
            dwz = (typeof this.players[i].DWZ !== "undefined" && this.players[i].DWZ !== "") ? parseInt(this.players[i].DWZ) : 700;
            dwzs[0] += dwz;
            var idx = this.players[i].Sex == "male" ? 1 : 2;
            cnts[idx]++; 
            dwzs[idx]+= dwz;
        }
        for (i=0; i<3; i++) dwzs[i] = cnts[i] > 0 ? Number.parseFloat(dwzs[i] / cnts[i]).toFixed(1) : 0;

        return dwzs;
    } 
 
    getPlayersperDWZBand() {
        var bands = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];  // <700, 900, 1100, 1300, 1500, 1700, 1900, 2100, 2300, >2300;
        var i, dwz;
        for (i = 0; i < this.players.length; i++) if (this.players[i].status == "confirmed") { 
            dwz = this.players[i].DWZ;
            if (dwz < 700) bands[0]++; else
            if (dwz >= 2300) bands[9]++; else
            bands[Math.trunc((dwz-700)/200)+1]++;
        }
        return bands;
    } 

}

