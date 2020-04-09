const cheerio = require('cheerio')
const request = require('request')
const fs = require('fs')

var données = []

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms)
    })
}

function récupérer_phonétique(mot) {
    request({
        method: 'GET',
        url: 'https://www.larousse.fr/dictionnaires/francais-anglais/' + mot
    }, (err, res, body) => {
        if (err) return console.error(err)

        if (res.statusCode != 404) {
            let $ = cheerio.load(body)

            //Récup de la phonétique du mot
            let phonétique = $('#BlocArticle > div > div.ZoneEntree > span:nth-child(4)').text()
            if (phonétique == "[")
                phonétique = $('#BlocArticle > div > div.ZoneEntree > span:nth-child(5)').text()
            if (phonétique.includes(","))
                phonétique = phonétique.substring(0, phonétique.indexOf(','))

            if (phonétique != "") {
                //Ajout dans la liste
                données.push(mot + "/" + phonétique)
                console.log(mot + "/" + phonétique)
            }

        } else {
            console.error(res.statusCode + ":" + mot)
        }
    })
}

async function récupérer_liste_mots() {
    let lettres = "abcdefghijklmnopqrstuvwxyz"

    for (var i = 0; i < 29; i++) { //lettres.length; i++) {
        //TODO faire varier l'index
        lettre = lettres.charAt(i)
        for (var index = 0; index < 30; index++) {
            request({
                method: 'GET',
                url: 'https://www.larousse.fr/index/dictionnaires/francais-anglais/' + lettre + '/' + index
            }, (err, res, body) => {
                if (err)
                    return console.error(lettre + "/////" + err)

                let $ = cheerio.load(body)
                $("body > div.page > section.content.bilingue > ul").children().each(function () {
                    let m = $(this).text()
                    if (!m.includes(".") && m.toUpperCase() != m) {
                        récupérer_phonétique(m)
                    }
                })
            })  
            await sleep(7000)
        }
    }
}

récupérer_liste_mots().then(function () {
    //Mots complémentaires courants
    données.push("à" + "/" + "a")

    fs.writeFileSync("phonétiques.json", JSON.stringify(données))
})