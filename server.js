/* RHYMES PROJECT - DEVELOPPE PAR ALEXANDRE FOURNIER */

var fs = require('fs')

//Chargement de la base de données phonétique
let base_phonétique = JSON.parse(fs.readFileSync("phonétiques.json"))
var mots = []
var phonétique = []
base_phonétique.forEach(function (e) {
    //filtrage de valeurs bizarres
    let m = e.substr(0, e.indexOf("/"))
    let p = e.substr(e.indexOf("/") + 1)

    if (p.length < m.length + 4) {
        mots.push(m)
        phonétique.push(p)
    }
})

let voyelles = ["a", "ɑ", "e", "ε", "ɛː", "ə", "i", "ɶ", "ø", "ɔ̃", "o", "ɔ", "u", "y", "ɑ̃", "ɛ̃", "œ̃", "j", "w", "ɥ"]
let consonnes = ["b", "d", "f", "g", "k", "l", "m", "n", "ŋ", "ɲ", "p", "ʁ", "s", "ʃ", "t", "v", "z", "ʒ"]

var flag_assonance_est_de_haut_niveau = true

function lancer_serveur() {
    console.log("💭 Lancement du serveur RHYMES...")

    //Logique de création du serveur
    var express = require('express');
    var app = express();
    var server = require('http').createServer(app);

    var io = require('socket.io')(server);

    app.use(express.static(__dirname + '/public'));

    io.on('connection', function (socket) {
        //ON EST ICI DANS LE SERVEUR (PRIVE)

        //Réception d'une requête du client
        socket.on('envoi_serveur', function (rep) {
            //Envoi de la réponse
            let rep_phonetique = rechercher_phonétique(rep.requete_serveur)
            socket.emit('réponse_serveur', {
                phonétique: rep_phonetique,
                autocomplétion: autocomplétion(rep.requete_serveur),
                assonance: trouver_assonance(rep_phonetique),
                flag_assonance_hn: flag_assonance_est_de_haut_niveau
            })
        })
    })

    server.listen(8080)
    console.log("✅ Serveur lancé ! ✅")
}

function rechercher_phonétique(mot) {
    mot = mot.toLowerCase()
    if (mot.includes(" ")) {
        return rechercher_phonétique(mot.substr(0, mot.indexOf(" "))) + " " + rechercher_phonétique(mot.substr(mot.indexOf(" ") + 1))
    } else if (mot.includes(".")) {
        return rechercher_phonétique(mot.substr(0, mot.indexOf("."))) + "." + rechercher_phonétique(mot.substr(mot.indexOf(".") + 1))
    } else {
        let index = mots.indexOf(mot)
        if (index == -1) { //Le mot entier n'y est pas
            if (mot == " " || mot == "")
                return " "
            if (mot.includes("'")) //Trouver un mot qui s'en rapproche (sans apostrophe, sans le s à la fin, e  tc)
            {
                return mot.substr(0, 1) + rechercher_phonétique(mot.substr(mot.indexOf("'") + 1))
            } else if (mot.endsWith("s")) {
                return rechercher_phonétique(mot.substr(0, mot.length - 1))
            }
            return "(" + mot + ")"
        }
        return phonétique[index]
    }
}

function autocomplétion(mot) {
    while (mot.indexOf(" ") != -1) {
        //Écrémage des espaces pour obtenir le dernier mot
        mot = mot.substr(mot.indexOf(" ") + 1)
    }
    if (mot != " " && mot != "" && !mots.includes(mot)) {
        res_2lettres = ""
        mots.forEach(function (m) {
            if (m.startsWith(mot))
                res_2lettres = m
        })
        if (res_2lettres != "") { //Trouvé un mot avec deux lettres de moins
            return mots[mots.indexOf(res_2lettres)]
        }
    }
    return ""
}

function trouver_assonance(phon) {
    if (phon.includes(" "))
        return /*trouver_assonance(phon.substr(0, phon.indexOf(" "))) + " " +*/ trouver_assonance(phon.substr(phon.indexOf(" ") + 1))
    if (!phon.includes(")")) {
        var liste_voyelles = []

        for (var i = 0; i < phon.length; i++) {
            var lettre = phon[i]
            if (voyelles.includes(lettre)) {
                liste_voyelles.push(lettre)
            }
        }

        if (liste_voyelles != []) {
            if (liste_voyelles.length >= 1) {
                //Recherche assonance basique avec voyelles
                var assonances = []

                //Sélection préliminaire
                phonétique.forEach(function (p) {
                    if (p.includes(liste_voyelles[0]))
                        assonances.push(p)
                })

                //Élimination des mots avec des voyelles absentes sur celui demandé
                assonances = assonances.filter(function (c_actuel) {
                    var res_test = true
                    var i = 0
                    while (i < voyelles.length && res_test) {
                        let v = voyelles[i]
                        if (!liste_voyelles.includes(v)) {
                            if (c_actuel.includes(v)) {
                                res_test = false
                            }
                        }
                        i++
                    }
                    return res_test;
                })

                //Sélection fine des mots restants avec les voyelles restantes et leur ordre
                assonances = assonances.filter(function (c) {
                    var index_voyelle_recherchée = 0
                    var i = 0
                    while (i < c.length && index_voyelle_recherchée < liste_voyelles.length) {
                        var lettre = c[i]
                        if (voyelles.includes(lettre)) {
                            if (lettre != liste_voyelles[index_voyelle_recherchée]) {
                                return false
                            } else {
                                index_voyelle_recherchée++
                            }
                        }
                        i++
                    }
                    if (index_voyelle_recherchée < liste_voyelles.length) {
                        return false
                    }  
                    //Écrémage des intrus qui ont encore des voyelles derrière
                    var autre_voyelle_trouvée = false
                    while(i < c.length && !autre_voyelle_trouvée) {
                        autre_voyelle_trouvée = (voyelles.includes(c[i]))
                        i++
                    }
                    return !autre_voyelle_trouvée
                })

                //Meilleur niveau d'assonance : trouver les bonnes consonnes à la fin
                var assonances_haut_niveau = []

                var i = phon.length - 1
                var trouvé = false
                while (i >= 0 && !trouvé) { //On recherche la dernière voyelle
                    trouvé = (phon[i] == liste_voyelles[liste_voyelles.length - 1])
                    i--
                }
                let fin_mot = phon.substr(i + 2)
                assonances.forEach(function (a) {
                    var i = a.length - 1
                    var trouvé = false
                    while (i >= 0 && !trouvé) { //On recherche la dernière voyelle
                        trouvé = (a[i] == liste_voyelles[liste_voyelles.length - 1])
                        i--
                    }
                    if (fin_mot == a.substr(i + 2)) {
                        assonances_haut_niveau.push(a)
                    }
                })

                //Logique de retour des résultats
                var mots_assonances = []
                if (assonances_haut_niveau.length >= 2) { //On retourne des assonances de haut niveau en vert
                    flag_assonance_est_de_haut_niveau = true
                    //Retour du mot correspondant à la phonétique
                    assonances_haut_niveau.forEach(function (a) {
                        if (a != phon) {
                            if() { //Plusieurs mots avec la même

                            }
                            let m = mots[phonétique.indexOf(a)]
                            if (m.toUpperCase() != m) //élimination des termes relous du Larousse
                                mots_assonances.push(m)
                        }
                    })
                } else { //On retourne des assonances de moyen niveau en orange
                    flag_assonance_est_de_haut_niveau = false
                    //Retour du mot correspondant à la phonétique
                    assonances.forEach(function (a) {
                        if (a != phon) {
                            let m = mots[phonétique.indexOf(a)]
                            if (m.toUpperCase() != m) //élimination des termes relous du Larousse
                                mots_assonances.push(m)
                        }
                    })
                }

                console.log("SORTIE")
                console.log(phon)
                console.log(liste_voyelles)
                console.log(assonances_haut_niveau)
                console.log(flag_assonance_est_de_haut_niveau)
                console.log("-------")

                return mots_assonances
            }
        }
    }

    return []
}

lancer_serveur()