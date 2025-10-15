// ========================
// GLOBAL VARIABLES
// ========================
let team1 = [], team2 = [];
let currentPoke1 = null, currentPoke2 = null;
let currentHp1 = 0, maxHp1 = 0;
let currentHp2 = 0, maxHp2 = 0;
let stats1 = {}, stats2 = {};
let types1 = [], types2 = [];
let selectedMove1 = null, selectedMove2 = null;
let waitingForMove = false;

// POPUP
function showPopup(msg = "Pokemon not found!") {
    document.querySelector(".popup-box p").textContent = msg;
    document.getElementById("popup").style.display = "flex";
}
function closePopup() { document.getElementById("popup").style.display = "none"; }

// STATS
function calculateStat(base, level = 50, iv = 31, ev = 0, isHP = false) {
    if (isHP) return Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + level + 10;
    return Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + 5;
}

// HP BAR
function updateHpBar(hpBarId, current, max) {
    const bar = document.getElementById(hpBarId);
    bar.value = `HP: ${current} / ${max}`;
}

// DAMAGE
function calculateDamage(level, attackStat, power, defenseStat, stab = 1, typeEffectiveness = 1) {
    const randomFactor = Math.floor(Math.random() * (100 - 85 + 1)) + 85;
    const baseDamage = ((((2 * level) / 5 + 2) * attackStat * power / defenseStat) / 50) + 2;
    return Math.floor(baseDamage * stab * typeEffectiveness * randomFactor / 100);
}

// TYPE EFFECTIVENESS
async function getTypeEffectiveness(moveType, defenderTypes) {
    const res = await fetch(`https://pokeapi.co/api/v2/type/${moveType}`);
    const data = await res.json();
    let multiplier = 1;
    defenderTypes.forEach(defType => {
        if (data.damage_relations.double_damage_to.some(t => t.name === defType)) multiplier *= 2;
        if (data.damage_relations.half_damage_to.some(t => t.name === defType)) multiplier *= 0.5;
        if (data.damage_relations.no_damage_to.some(t => t.name === defType)) multiplier *= 0;
    });
    return multiplier;
}

// RANDOM MOVES
function getRandomMoves(movesArray, count = 4) {
    const shuffled = movesArray.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}

// FETCH POKEMON
async function fetchPokemonObject(name) {
    try {
        const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${name}`);
        if (!res.ok) return null;
        const data = await res.json();
        const level = 50, iv = 31, ev = 0;
        const stats = {};
        data.stats.forEach(statObj => {
            stats[statObj.stat.name] = calculateStat(statObj.base_stat, level, iv, ev, statObj.stat.name === 'hp');
        });
        const hp = stats.hp;
        return {
            name: data.name,
            sprite: data.sprites.front_default,
            stats,
            types: data.types.map(t => t.type.name),
            hpCurrent: hp,
            hpMax: hp,
            moves: getRandomMoves(data.moves, 4)
        };
    } catch { return null; }
}

// RANDOMIZE TEAM
async function randomizeTeam(player) {
    for (let i = 1; i <= 6; i++) {
        const randomId = Math.floor(Math.random() * 1025) + 1;
        const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${randomId}`);
        if (!res.ok) continue;
        const data = await res.json();
        document.getElementById(`team${player}-poke${i}`).value = data.name;
    }
}

// SUBMIT TEAM
async function submitTeam(player) {
    const team = [];
    for (let i = 1; i <= 6; i++) {
        const input = document.getElementById(`team${player}-poke${i}`);
        const name = input.value.trim().toLowerCase();
        if (!name) continue;
        const poke = await fetchPokemonObject(name);
        if (poke) team.push(poke);
    }
    if (team.length === 0) {
        showPopup(`Player ${player} must choose at least 1 Pokémon!`);
        return;
    }
    if (player === 1) { team1 = team; document.getElementById('team1-selection').style.display = 'none'; }
    else { team2 = team; document.getElementById('team2-selection').style.display = 'none'; }

    if (team1.length && team2.length) startBattle();
}

// START BATTLE
function startBattle() {
    document.getElementById('battle-container').style.display = 'flex';
    currentPoke1 = team1.shift();
    currentPoke2 = team2.shift();
    loadActivePokemon(1, currentPoke1);
    loadActivePokemon(2, currentPoke2);
}

// LOAD ACTIVE POKEMON
function loadActivePokemon(player, poke) {
    const hpBar = document.getElementById(`healthBar${player}`);
    const sprite = document.getElementById(`pokemonSprite${player}`);
    const statsDiv = document.getElementById(`stats${player}`);
    const typeDiv = document.getElementById(`type${player}`);
    const movesContainer = document.getElementById(`moves${player}`);

    if (player === 1) { currentHp1 = poke.hpCurrent; maxHp1 = poke.hpMax; stats1 = poke.stats; types1 = poke.types; }
    else { currentHp2 = poke.hpCurrent; maxHp2 = poke.hpMax; stats2 = poke.stats; types2 = poke.types; }

    hpBar.value = `HP: ${poke.hpCurrent} / ${poke.hpMax}`;
    hpBar.style.display = 'block';
    sprite.src = poke.sprite; sprite.style.display = 'block';

    statsDiv.innerHTML = Object.entries(poke.stats).map(([k, v]) => `${k.toUpperCase()}: ${v}`).join('<br>');
    statsDiv.style.display = 'block';
    typeDiv.innerHTML = `Type: ${poke.types.join(' / ')}`; typeDiv.style.display = 'block';

    renderMoves(movesContainer.id, poke.moves);
}

// RENDER MOVES
async function renderMoves(containerId, moves) {
    const container = document.getElementById(containerId);
    container.innerHTML = "";

    const isPoke1 = containerId === 'moves1';

    for (const move of moves) {
        const moveRes = await fetch(move.move.url);
        const moveDetails = await moveRes.json();
        const power = moveDetails.power;
        const moveType = moveDetails.type.name;

        const button = document.createElement("button");
        button.innerHTML = `<strong>${move.move.name}</strong><br><small>Power: ${power ?? 'N/A'}</small>`;

        button.onclick = async () => {
            if (typeof power !== 'number' || power <= 0)
            {
                alert(`${move.move.name} does no damage.`); return;
            }
            if (isPoke1) selectedMove1 = { move, moveType, power };
            else selectedMove2 = { move, moveType, power };

            button.classList.add("selected-move");
            container.querySelectorAll("button").forEach(btn => { if (btn !== button) btn.disabled = true; });

            if (selectedMove1 && selectedMove2) await executeTurn();
        };
        container.appendChild(button);
    }
}

// EXECUTE TURN
async function executeTurn() {
    const firstIsPoke1 = stats1.speed >= stats2.speed;
    const firstMove = firstIsPoke1 ? selectedMove1 : selectedMove2;
    const secondMove = firstIsPoke1 ? selectedMove2 : selectedMove1;
    await attack(firstIsPoke1 ? 1 : 2, firstMove);
    if (currentHp1 > 0 && currentHp2 > 0) await attack(firstIsPoke1 ? 2 : 1, secondMove);

    selectedMove1 = null; selectedMove2 = null;
    renderMoves('moves1', currentPoke1.moves);
    renderMoves('moves2', currentPoke2.moves);
}

// ATTACK FUNCTION
async function attack(player, move) {
    const attackerStats = player === 1 ? stats1 : stats2;
    const defenderStats = player === 1 ? stats2 : stats1;
    const attackerTypes = player === 1 ? types1 : types2;
    const defenderTypes = player === 1 ? types2 : types1;
    const defenderHp = player === 1 ? currentHp2 : currentHp1;

    const stab = attackerTypes.includes(move.moveType) ? 1.5 : 1;
    const typeEffectiveness = await getTypeEffectiveness(move.moveType, defenderTypes);
    const damage = calculateDamage(50, attackerStats.attack, move.power, defenderStats.defense, stab, typeEffectiveness);

    if (player === 1) { currentHp2 = Math.max(0, currentHp2 - damage); updateHpBar('healthBar2', currentHp2, maxHp2); if (currentHp2 === 0) switchNextPokemon(2); }
    else { currentHp1 = Math.max(0, currentHp1 - damage); updateHpBar('healthBar1', currentHp1, maxHp1); if (currentHp1 === 0) switchNextPokemon(1); }
}
 
// SWITCH TO NEXT POKEMON AFTER FAINT
function switchNextPokemon(player) {
    if (player === 1 && team1.length > 0) { currentPoke1 = team1.shift(); loadActivePokemon(1, currentPoke1); }
    else if (player === 2 && team2.length > 0) { currentPoke2 = team2.shift(); loadActivePokemon(2, currentPoke2); }
    else showPopup(player === 1 ? "Player 2 wins!" : "Player 1 wins!");
}
function showSwitchMenu(player) {
    const menu = document.getElementById(`switch-menu${player}`);
    menu.innerHTML = '';
    const team = player === 1 ? team1 : team2;

    team.forEach((poke, index) => {
        if (poke.hpCurrent > 0) { // only show alive Pokémon
            const btn = document.createElement('button');
            btn.textContent = poke.name;
            btn.onclick = () => {
                switchActivePokemon(player, index);
                menu.style.display = 'none';
            };
            menu.appendChild(btn);
        }
    });

    menu.style.display = 'block';
}

// SWITCH ACTIVE POKEMON
function switchActivePokemon(player, teamIndex) {
    const team = player === 1 ? team1 : team2;
    const newPoke = team.splice(teamIndex, 1)[0]; // remove from team array
    const oldPoke = player === 1 ? currentPoke1 : currentPoke2;

    // push old active Pokémon back to team (if it still has HP)
    if ((player === 1 ? currentHp1 : currentHp2) > 0) team.push(oldPoke);

    // set new active Pokémon
    if (player === 1) {
        currentPoke1 = newPoke;
        currentHp1 = newPoke.hpCurrent;
        maxHp1 = newPoke.hpMax;
        stats1 = newPoke.stats;
        types1 = newPoke.types;
        loadActivePokemon(1, newPoke);
    } else {
        currentPoke2 = newPoke;
        currentHp2 = newPoke.hpCurrent;
        maxHp2 = newPoke.hpMax;
        stats2 = newPoke.stats;
        types2 = newPoke.types;
        loadActivePokemon(2, newPoke);
    }
}
console.log("Simon was here")
