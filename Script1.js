// Clean consolidated script.js for PokeApi demo
// Contains: fetchData, sliding, Pokemons loop, child message handling, login/register, user card rendering

// Globals
let i = 1;
let pokeLoop = true;
let cardCounter = 0;
let fightButton;
let addTeamButton;
let groupCounter = 0;
let teamIds = [];


// Demo in-memory data
let users = ['Administrator', 'Manager', 'Cleric', 'Scribe'];
let passwords = ['Password01', 'Password', 'Admin', 'P@ssword'];
let pokemons = [[2, 18, 30], [6, 15, 34], [8, 22, 38], [12, 25, 40]];

// Entrypoint: if Index2.html, register child handlers; else start main page flows
if (window.location.href.includes('Index3.html')) {
    registerChildHandlers();
} else if (window.location.href.includes('Index2.html')) {

    document.getElementById('loginButton').addEventListener('click', () => startButtonsOpen('loginButton'));
    document.getElementById('loginButton').addEventListener('mouseover', () => startButtonsOpen('loginButton'));
    document.getElementById('loginButton').addEventListener('mouseout', () => startButtonsClose('loginButton'));

    document.getElementById('fightButton').addEventListener('click', () => startButtonsOpen('fightButton'));
    document.getElementById('fightButton').addEventListener('mouseover', () => startButtonsOpen('fightButton'));
    document.getElementById('fightButton').addEventListener('mouseout', () => startButtonsClose('fightButton'));
    firstPokemons();
    Pokemons();
}



function registerChildHandlers() {
    window.addEventListener('message', (ev) => {
        try { handleChildMessage(ev.data, ev); } catch (e) { console.error('message handler', e); }
    });
    try { if (window.opener) window.opener.postMessage({ type: 'child-ready' }, '*'); } catch (e) { }
}

function handleChildMessage(msg) {
    if (!msg || !msg.type) return;
    if (msg.type === 'show-starters') return setStarterVisible(true);
    if (msg.type === 'hide-starters') return setStarterVisible(false);
    if (msg.type === 'userPokemons') {
        const arr = msg.data || [];
        if (typeof UserSide === 'function') return UserSide(arr);
        const container = document.getElementById('yourPokemons');
        if (!container) return;
        container.innerText = '';
        (async () => {
            for (const id of arr) {
                const p = document.createElement('p'); p.textContent = `Loading ${id}...`; container.appendChild(p);
                try { const r = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`); const d = await r.json(); p.textContent = `${d.name} (NO. ${d.id})`; } catch (e) { p.textContent = `Pokemon ${id} kunne ikke hentes`; }
            }
        })();
    }
}

function setStarterVisible(show) {
    try {
        const el = document.getElementById('starter-Pokemon') || document.getElementById('starter-Pokemons');
        if (!el) return;
        if (show) { el.classList.remove('hidden'); el.style.display = ''; }
        else { el.classList.add('hidden'); el.style.display = 'none'; }
    } catch (e) { console.warn(e); }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function firstPokemons() {
    do {
        try {
            const d = await fetchData(i);
            const b = i % 3 + 1;
            const el = (id) => document.getElementById(id);
            if (el(`${b}namePokemon`)) el(`${b}namePokemon`).innerText = d.name;
            if (el(`${b}idPokemon`)) el(`${b}idPokemon`).innerText = `NO. 00${d.id}`;
            if (el(`${b}HTPokemon`)) el(`${b}HTPokemon`).innerText = `HT: ${d.height}`;
            if (el(`${b}WTPokemon`)) el(`${b}WTPokemon`).innerText = `WT: ${d.weight} lbs.`;
            if (el(`${b}hpPokemon`)) el(`${b}hpPokemon`).innerText = `HP - ${d.stats[0].base_stat}`;
            if (el(`${b}attackPokemon`)) el(`${b}attackPokemon`).innerText = `Attack - ${d.stats[1].base_stat}`;
            if (el(`${b}defensePokemon`)) el(`${b}defensePokemon`).innerText = `Defense - ${d.stats[2].base_stat}`;
            if (el(`${b}specialAPokemon`)) el(`${b}specialAPokemon`).innerText = `special-Attack - ${d.stats[3].base_stat}`;
            if (el(`${b}specialDPokemon`)) el(`${b}specialDPokemon`).innerText = `special-Defense - ${d.stats[4].base_stat}`;
            if (el(`${b}speedPokemon`)) el(`${b}speedPokemon`).innerText = `Speed - ${d.stats[5].base_stat}`;
            if (d.types.length > 1) {
                if (el(`${b}typePokemon`)) el(`${b}typePokemon`).innerText = `type - ${d.types[0].type.name} / ${d.types[1].type.name}`;
                if (el(`${b}typeSymbol`)) el(`${b}typeSymbol`).src = await typeSymbol(d.types[0].type.name);
                if (el(`${b}2typeSymbol`)) {
                    el(`${b}2typeSymbol`).src = await typeSymbol(d.types[1].type.name);
                    el(`${b}2typeSymbol`).style.display = "block";
                }
            }
            else {
                if (el(`${b}typePokemon`)) el(`${b}typePokemon`).innerText = `type - ${d.types[0].type.name}`;
                if (el(`${b}typeSymbol`)) el(`${b}typeSymbol`).src = await typeSymbol(d.types[0].type.name);
            }


            const img = el(`${b}pokemonImage`); if (img) img.src = d.sprites.front_default || '';
        } catch (e) { console.error(e); }
        i++;
    } while (i <= 3);
}

async function sliding() {
    const row = document.getElementById("row");

    const pokeCard = document.createElement("div");
    pokeCard.classList.add("pokemoncard")
    makeCard(i, pokeCard);
    row.appendChild(pokeCard);

    let slide = i - 3;
    slide = slide * 33.333333333333333333333333333333334;
    if (i >= 27) {
        slide += 1.5;
        if (i >= 37) {
            slide += 1.5;
            if (i >= 47) {
                slide += 1;
                if (i >= 60) {
                    slide += 1.5;
                    if (i >= 75) {
                        slide += 1.5;
                        if (i >= 90) {
                            slide += 1.5;
                            if (i >= 105) {
                                slide += 1.5;
                            }
                        }
                    }
                }
            }
        }
    }

    row.style.transform = `translateX(-${slide}vw)`;
    pokeCard.style.display = "block";
    i++;
}

async function Pokemons() { do { await sleep(10000); sliding(); } while (i < 1302 && pokeLoop); }

async function typeSymbol(type) { const map = { bug: 'https://github.com/Lpopp30/ApiPokemon/blob/main/bug_type_symbol_galar_by_jormxdos_dffvl73-pre.png?raw=true', dark: 'https://github.com/Lpopp30/ApiPokemon/blob/main/darkness_type_symbol_tcg_by_jormxdos_dfgddck-fullview.png?raw=true', fire: 'https://github.com/Lpopp30/ApiPokemon/blob/main/fire_type_symbol_galar_by_jormxdos_dffvl1m-pre.png?raw=true', flying: 'https://github.com/Lpopp30/ApiPokemon/blob/main/flying_type_symbol_galar_by_jormxdos_dffvl6n-fullview.png?raw=true', grass: 'https://github.com/Lpopp30/ApiPokemon/blob/main/grass_type_symbol_tcg_by_jormxdos_dfgdda7-fullview.png?raw=true', poison: 'https://github.com/Lpopp30/ApiPokemon/blob/main/poison_type_lvl_0_by_jormxdos_dh8zwty-pre.png?raw=true' }; return map[type] || ''; }

function openLogin() {
    const l = document.getElementById('login');
    if (l) l.style.display = 'block';
    const sb = document.getElementById('start-buttons');
    if (sb) sb.style.opacity = '0.3';
    const r = document.getElementById('row');
    if (r) r.style.opacity = '0.3'; pokeLoop = false;
}

function closeLogin() {
    if (document.getElementById('login')) document.getElementById('login').style.display = 'none';
    if (document.getElementById('start-buttons')) document.getElementById('start-buttons').style.opacity = '1';
    if (document.getElementById('row')) document.getElementById('row').style.opacity = '1';
    pokeLoop = true;
    try {
        Pokemons();

    } catch (e) { }
}

async function loginData(userName, passw0rd, action) {
    const username = userName.value.trim();
    const password = passw0rd.value;
    console.log('[loginData]', action, username);
    if (action === 'Login') {
        const userIndex = users.indexOf(username);
        if (userIndex !== -1) {
            if (passwords[userIndex] === password) {
                const newWin = window.open('Index2.html', '_blank');
                const userPokemons = pokemons[userIndex] || [];
                try {
                    if (!userPokemons || userPokemons.length === 0) newWin && newWin.postMessage({ type: 'show-starters' }, '*');
                    else newWin && newWin.postMessage({ type: 'hide-starters' }, '*');
                } catch (e) { }
                if (!newWin) { alert('Popup blocked — allow popups'); return; }
                try { newWin.focus(); } catch (e) { }
                let called = false;
                function onLoad() {
                    try {
                        if (typeof newWin.UserSide === 'function') {
                            newWin.UserSide(userPokemons);
                            called = true;
                        }
                    } catch (e) { console.error(e); } try { newWin.removeEventListener('load', onLoad); } catch (e) { }
                }
                try { newWin.addEventListener('load', onLoad); } catch (e) { }
                setTimeout(() => { if (!called) { try { newWin.postMessage({ type: 'userPokemons', data: userPokemons }, '*'); } catch (e) { console.error(e); } } }, 500);
            } else alert('Your password is incorrect.');
        } else alert('Your username is incorrect.');
    } else if (action === 'Register') {
        if (users.includes(username)) alert('Username exists.'); else if (username.length < 5) alert('Username must be 5+ chars'); else if (password.length < 8) alert('Password must be 8+ chars'); else { users.push(username); passwords.push(password); pokemons.push([]); alert('Registration successful!'); }
    }
}

function startButtonsOpen(button) {
    document.getElementById(button).src = 'https://github.com/Lpopp30/ApiPokemon/blob/main/diyg9dk-352e1c6d-1cf7-4d71-875b-276d08ab3b20.png?raw=true';
    document.getElementById(button).style.width = '7%';
    document.getElementById(button).style.paddingLeft = '30px';
    document.getElementById(button).style.paddingRight = '48px';

}

function startButtonsClose(button) {
    document.getElementById(button).src = 'https://github.com/Lpopp30/ApiPokemon/blob/main/original-dbe29920e290da99d214598ac9e2001f.jpg?raw=true';
    document.getElementById(button).style.width = '10%';
    document.getElementById(button).style.paddingLeft = '15px';
    document.getElementById(button).style.paddingRight = '15px';

}

async function fetchUserPokemon(pokemon, choose) {
    let card = null;
    try {
        const d = await fetchData(pokemon);
        const row = document.getElementById('userRow');
        if (!row) return null;
        card = document.createElement('div');
        card.classList.add('userPokemoncard');
        card.setAttribute('data-pokemon-id', String(pokemon));
        cardCounter += 1;
        card.id = `user-poke-${d.id}-${cardCounter}`;
        // Build card contents: image, title, id and stats
        await makeCard(pokemon, card);
        row.appendChild(card);
        if (choose) card.addEventListener('click', () => chooseStarter(pokemon));
        else card.addEventListener('click', () => chooseFighter(pokemon));
    } catch (e) { console.error(e); }
    return card;
}

async function UserSide(userPokemons) {
    console.log('UserSide', userPokemons);
    if (!userPokemons || userPokemons.length === 0) return setStarterVisible(true);
    setStarterVisible(false);
    for (const id of userPokemons) await fetchUserPokemon(id, false);
}

async function fetchGeneration(gen) {
    try {
        const r = await fetch(`https://pokeapi.co/api/v2/generation/${gen}`);
        if (!r.ok) throw new Error('fetch failed'); const d = await r.json();
        const starters = (d.pokemon_species || []).slice(0, 3);
        const ids = extractSpeciesIds(starters);
        for (const id of ids) fetchUserPokemon(id, true);
    } catch (e) { console.error(e); }
    setStarterVisible(false);
}

async function chooseStarter(Id) {

    pokemons.push([Id]);
    const starterCards = document.getElementsByClassName('userPokemoncard');
    for (let i = starterCards.length - 1; i >= 0; i--) {
        const card = starterCards[i];
        card.parentNode.removeChild(card);
    }
    console.log(pokemons);
    UserSide([Id]);
    //await fetchUserPokemon(Id,false);
}

async function chooseFighter(Id) {
    const choose = document.getElementsByClassName('dropdown-content')[0];

    if (fightButton == undefined && addTeamButton == undefined) {
        fightButton = document.createElement("button");
        fightButton.innerText = "Fight";

        fightButton.onclick;
        choose.appendChild(fightButton);

        addTeamButton = document.createElement("button");
        addTeamButton.innerText = "Add to Team";

        choose.appendChild(addTeamButton);
    }
    fightButton.id = 'Fight' + Id;
    addTeamButton.id = 'add' + Id;


    document.onmousemove = async function (e) {
        x = e.clientX;
        y = e.clientY;
        return await x, y;
    }
    if (x && y) {
        document.getElementsByClassName('dropdown-content')[0].style.left = x + "px";
        document.getElementsByClassName('dropdown-content')[0].style.top = y + "px";
        document.getElementsByClassName('dropdown-content')[0].style.display = "block";
        if (!teamIds.includes(Id) && addTeamButton.id == 'add' + Id) {
            addTeamButton.addEventListener('click', () => team(Id, 'add'));
            if (addTeamButton.addEventListener('click', () => team(Id, 'add'))) {
                choose.removeChild(fightButton);
                choose.removeChild(addTeamButton);
            }

        }
    }

}

function extractSpeciesIds(arr) {
    if (!Array.isArray(arr)) return [];
    return arr.map(s => {
        const u = s && s.url ? s.url : '';
        const m = u.match(/\/(\d+)\/?$/);
        return m ? Number(m[1]) : null;
    }).filter(n => n !== null);
}

async function makeCard(poke, card) {
    const heading = document.createElement("h3");
    heading.classList.add("heading")

    const pokecardh3 = document.createElement("span");
    pokecardh3.classList.add("PokeName")
    heading.appendChild(pokecardh3);

    const pokeCardHp = document.createElement("span");
    heading.appendChild(pokeCardHp);

    const pokeCardTypeSymbol = document.createElement("img");
    pokeCardTypeSymbol.setAttribute('alt', 'Symbol Image');
    pokeCardTypeSymbol.classList.add("types")
    heading.appendChild(pokeCardTypeSymbol);

    const pokeCardTypeSymbol2 = document.createElement("img");
    pokeCardTypeSymbol2.setAttribute('alt', 'Symbol Image');
    pokeCardTypeSymbol2.classList.add("types2")
    heading.appendChild(pokeCardTypeSymbol2);

    card.appendChild(heading);

    const pokeCardImg = document.createElement("img");
    pokeCardImg.setAttribute('alt', 'Pokemon Image');
    pokeCardImg.classList.add("sprites")
    card.appendChild(pokeCardImg);

    const infoBar = document.createElement("div");
    infoBar.classList.add("infoBar")

    const pokeCardId = document.createElement("span");
    infoBar.appendChild(pokeCardId);

    const pokeCardHT = document.createElement("span");
    infoBar.appendChild(pokeCardHT);

    const pokeCardWT = document.createElement("span");
    infoBar.appendChild(pokeCardWT);

    card.appendChild(infoBar);

    const pokeCardAttack = document.createElement("p");
    card.appendChild(pokeCardAttack);

    const pokeCardDefense = document.createElement("p");
    card.appendChild(pokeCardDefense);

    const pokeCardSpAttack = document.createElement("p");
    card.appendChild(pokeCardSpAttack);

    const pokeCardSpDefense = document.createElement("p");
    card.appendChild(pokeCardSpDefense);

    const pokeCardSpeed = document.createElement("p");
    card.appendChild(pokeCardSpeed);

    const pokeCardtype = document.createElement("p");
    card.appendChild(pokeCardtype);

    try {
        const data = await fetchData(poke);
        pokecardh3.innerText = `${data.name}`;
        pokeCardHT.innerText = `  HT: ${data.height} `;
        pokeCardWT.innerText = `  WT: ${data.weight} lbs.`;
        pokeCardHp.innerText = `  HP - ${data.stats[0].base_stat}`;
        pokeCardAttack.innerText = `Attack - ${data.stats[1].base_stat}`;
        pokeCardDefense.innerText = `Defense - ${data.stats[2].base_stat}`;
        pokeCardSpAttack.innerText = `special-Attack - ${data.stats[3].base_stat}`;
        pokeCardSpDefense.innerText = `special-Defense - ${data.stats[4].base_stat}`;
        pokeCardSpeed.innerText = `Speed - ${data.stats[5].base_stat}`;
        let imageUrl = data.sprites.front_default;

        // Set the image source
        pokeCardImg.src = imageUrl;
        if (data.id <= 9) {
            pokeCardId.innerText = `NO. 00${data.id} `;
        }
        else if (10 <= data.id && data.id <= 99) {
            pokeCardId.innerText = `NO. 0${data.id} `;
        }
        else {
            pokeCardId.innerText = `NO. ${data.id} `;
        }

        if (data.types.length == 2) {
            pokeCardTypeSymbol2.style.display = "block";
            pokeCardtype.innerText = `Type - ${data.types[0].type.name} / ${data.types[1].type.name}`;
            pokeCardTypeSymbol.src = await typeSymbol(data.types[0].type.name, 0);
            pokeCardTypeSymbol2.src = await typeSymbol(data.types[1].type.name, 0);
            if (pokecardh3.innerText.length <= 8) {
                pokecardh3.style.paddingRight = "42%";
            }
            else if (pokecardh3.innerText.length <= 12) {
                pokecardh3.style.paddingRight = "42%";
            }
        }
        else {
            pokeCardtype.innerText = `Type - ${data.types[0].type.name}`;
            pokeCardTypeSymbol.src = await typeSymbol(data.types[0].type.name, 0);
            if (data.types[1]) {
                const typeImg2 = document.createElement('img');
                const src2 = await typeSymbol(data.types[1].type.name);
                typeImg2.src = src2;
                typeImg2.classList.add('types2');
                typeImg2.alt = data.types[1].type.name;
                c.appendChild(typeImg2);
            }
            if (pokecardh3.innerText.length <= 8) {

                pokecardh3.style.paddingRight = "49%";
            }
            else if (pokecardh3.innerText.length <= 9) {
                pokecardh3.style.paddingRight = "49%";
            }
            else {
                pokecardh3.style.paddingRight = "40%";
            }
        }
    }
    catch (e) { console.log(e) }
}

async function fetchData(pokemon) {
    try {
        const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemon}`);
        if (!res.ok) throw new Error('fetch failed');
        return await res.json();
    }
    catch (e) {
        console.error(e);
        return null;
    }
}

async function team(Id, choose) {


    const teamPlace = document.getElementsByClassName('team')[0];
    const teamMember = document.createElement('p');
    teamMember.id = Id;

    if (choose == "add" && !teamIds.includes(Id)) {
        groupCounter++;
        teamIds.push(Id);

        const data = await fetchData(Id)

        const deleteMember = document.createElement('button');
        deleteMember.innerText = "X";
        deleteMember.classList.add("deleteMember")
        deleteMember.addEventListener('click', () => team(Id, 'delete'));
        teamMember.appendChild(deleteMember);

        const teamMemberName = document.createElement('p');
        teamMemberName.innerText = `${data.name}`;
        teamMember.appendChild(teamMemberName);

        const Img = document.createElement("img");
        Img.setAttribute('alt', 'Pokemon Image');
        Img.classList.add("sprites")
        let ImageUrl = data.sprites.front_default;
        Img.src = ImageUrl;
        teamMember.appendChild(Img);

        const teamMemberId = document.createElement('p');
        teamMemberId.innerText = `NO. ${Id}`;
        teamMember.appendChild(teamMemberId);

        teamMember.style.marginTop = "-15px";

        if (teamPlace) teamPlace.appendChild(teamMember);
    }


    if (choose == "delete") {

        console.log(Id);
        await Promise.resolve(); // allow any pending pushes to finish

        const member = document.getElementById(Id);

        if (member && teamPlace.contains(member)) {
            teamPlace.removeChild(member);
            console.log(member, teamPlace);
            console.log("Removed team member:", Id);
        }

        const index = teamIds.indexOf(Id);
        if (index !== -1) {
            teamIds = teamIds.splice(index, 1);
            groupCounter--;
            return teamIds, groupCounter;
        }
        console.log(teamIds);
    }
    return true;

}