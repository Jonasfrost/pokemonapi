let team1 = [], team2 = [];
let currentPoke1 = null, currentPoke2 = null;
let currentHp1 = 0, maxHp1 = 0;
let currentHp2 = 0, maxHp2 = 0;
let stats1 = {}, stats2 = {};
let types1 = [], types2 = [];
let selectedAction1 = null, selectedAction2 = null;
let turnCounter = 0;
let waitingForSwitch = false;
let forcedSwitchPlayer = null;
let faintSwitchIn = false;
const moveCache = new Map();


// BATTLE LOG
function addToBattleLog(message) {
    const log = document.getElementById('battle-log');
    const p = document.createElement('p');
    p.textContent = message;
    log.appendChild(p);
    log.scrollTop = log.scrollHeight;
}

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
        data.stats.forEach(statObj =>
        {
            stats[statObj.stat.name] = calculateStat(statObj.base_stat, level, iv, ev, statObj.stat.name === 'hp');
        });
        const hp = stats.hp;

        // Select random moves
        const rawMoves = getRandomMoves(data.moves, 4);

        // For each selected move, fetch details (cached) and attach as .details
        const detailedMoves = await Promise.all(rawMoves.map(async (mv) => {
            const url = mv.move.url;
            if (moveCache.has(url))
            {
                mv.details = moveCache.get(url);
                return mv;
            }
            try {
                const mres = await fetch(url);
                if (!mres.ok) {
                    mv.details = { power: null, type: null };
                    moveCache.set(url, mv.details);
                    return mv;
                }
                const mdata = await mres.json();
                const details = { power: mdata.power ?? null, type: mdata.type?.name ?? null };
                mv.details = details;
                moveCache.set(url, details);
                return mv;
            } catch (e) {
                mv.details = { power: null, type: null };
                moveCache.set(url, mv.details);
                return mv;
            }
        }));

        return {
            name: data.name,
            sprite: data.sprites.front_default,
            stats,
            types: data.types.map(t => t.type.name),
            hpCurrent: hp,
            hpMax: hp,
            moves: detailedMoves
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
    if (player === 1)
    {
        team1 = team; document.getElementById('team1-selection').style.display = 'none';
    }
    else
    {
        team2 = team; document.getElementById('team2-selection').style.display = 'none';
    }

    if (team1.length && team2.length)
    {
        document.getElementById('team-selection').style.display = 'none';
        startBattle();
    }
}

// START BATTLE
function startBattle() {
    document.getElementById('battle-container').style.display = 'flex';
    document.getElementById('battle-log').style.display = 'block'; // show log
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
    const nameDisplay = document.getElementById(`pokemonNameDisplay${player}`);

    if (player === 1)
    {
        currentHp1 = poke.hpCurrent; maxHp1 = poke.hpMax; stats1 = poke.stats; types1 = poke.types;
    }
    else
    {
        currentHp2 = poke.hpCurrent; maxHp2 = poke.hpMax; stats2 = poke.stats; types2 = poke.types;
    }

    nameDisplay.textContent = poke.name.charAt(0).toUpperCase() + poke.name.slice(1);
    hpBar.value = `HP: ${poke.hpCurrent} / ${poke.hpMax}`;
    hpBar.style.display = 'block';
    sprite.src = poke.sprite;
    sprite.style.display = 'block';
    statsDiv.innerHTML = Object.entries(poke.stats).map(([k, v]) => `${k.toUpperCase()}: ${v}`).join('<br>');
    statsDiv.style.display = 'block';
    typeDiv.innerHTML = `Type: ${poke.types.join(' / ')}`;
    typeDiv.style.display = 'block';

    renderMoves(movesContainer.id, poke.moves);
}

// RENDER MOVES
async function renderMoves(containerId, moves) {
    const container = document.getElementById(containerId);
    container.innerHTML = "";
    const isPoke1 = containerId === 'moves1';
    const currentHp = isPoke1 ? currentHp1 : currentHp2;

    // If a forced switch is pending, prevent move selection and show notice
    if (waitingForSwitch) {
        const waitingMsg = document.createElement('p');
        waitingMsg.textContent = `Waiting for Player ${forcedSwitchPlayer} to switch (fainted).`;
        container.appendChild(waitingMsg);
        return;
    }

    if (currentHp <= 0)
    {
        container.innerHTML = '<p>This Pokémon has fainted!</p>'; return;
    }

    for (const move of moves) {
        // Use cached details if present
        let power = move.details?.power ?? null;
        let moveType = move.details?.type ?? null;

        // Fallback: if no details attached, try fetching once (and cache)
        if (power === null && move.move && move.move.url) {
            const url = move.move.url;
            if (moveCache.has(url)) {
                const d = moveCache.get(url);
                power = d.power; moveType = d.type;
                move.details = d;
            } else {
                try {
                    const moveRes = await fetch(url);
                    const moveDetails = await moveRes.json();
                    power = moveDetails.power ?? null;
                    moveType = moveDetails.type?.name ?? null;
                    const d = { power, type: moveType };
                    move.details = d;
                    moveCache.set(url, d);
                } catch (e) {
                    power = null; moveType = null;
                    move.details = { power: null, type: null };
                    moveCache.set(move.move.url, move.details);
                }
            }
        }

        const button = document.createElement("button");
        button.innerHTML = `<strong>${move.move.name}</strong><br><small>Power: ${power ?? 'N/A'}</small>`;
        button.onclick = async () => {
            if (waitingForSwitch) return; // extra safety
            if (typeof power !== 'number' || power <= 0)
            {
                alert(`${move.move.name} does no damage.`);
                return;
            }
            if (isPoke1) selectedAction1 = { type: "move", move, moveType, power };
            else selectedAction2 = { type: "move", move, moveType, power };
            button.classList.add("selected-move");
            container.querySelectorAll("button").forEach(btn => { if (btn !== button) btn.disabled = true; });
            if (selectedAction1 && selectedAction2) await executeTurn();
        };
        container.appendChild(button);
    }
}

// SHOW SWITCH MENU
function showSwitchMenu(player) {
    const menu = document.getElementById(`switch-menu${player}`);
    menu.innerHTML = '';
    const team = player === 1 ? team1 : team2;

    team.forEach((poke, index) => {
        if (poke.hpCurrent > 0)
        {
            const btn = document.createElement('button');
            btn.style.display = 'flex';
            btn.style.flexDirection = 'column';
            btn.style.alignItems = 'center';
            btn.style.gap = '4px';

            const nameDiv = document.createElement('div');
            nameDiv.textContent = poke.name.charAt(0).toUpperCase() + poke.name.slice(1);
            btn.appendChild(nameDiv);

            const img = document.createElement('img');
            img.src = poke.sprite;
            img.alt = poke.name;
            img.width = 60; img.height = 60;
            btn.appendChild(img);

            btn.onclick = () => {
                // If this is a forced switch due to faint, perform it immediately and end the pending turn
                if (waitingForSwitch && forcedSwitchPlayer === player) {
                    menu.style.display = 'none';
                    addToBattleLog(`${poke.name} was switched in due to faint.`);
                    switchActivePokemon(player, index);

                    // Clear forced switch state and any selected actions so the opponent cannot act this turn
                    waitingForSwitch = false;
                    forcedSwitchPlayer = null;
                    selectedAction1 = null; selectedAction2 = null;

                    // Re-render UI
                    renderMoves('moves1', currentPoke1.moves);
                    renderMoves('moves2', currentPoke2.moves);
                    return;
                }

                // Normal switch selection during a turn
                if (player === 1) selectedAction1 = { type: "switch", index: index };
                else selectedAction2 = { type: "switch", index: index };
                menu.style.display = 'none';
                addToBattleLog(`${poke.name} will be switched in!`);
                if (selectedAction1 && selectedAction2) executeTurn();
            };
            menu.appendChild(btn);
        }
    });
    menu.style.display = 'flex';
}

// SWITCH ACTIVE POKEMON
function switchActivePokemon(player, teamIndex) {
    const team = player === 1 ? team1 : team2;
    const newPoke = team.splice(teamIndex, 1)[0];
    const oldPoke = player === 1 ? currentPoke1 : currentPoke2;
    if ((player === 1 ? currentHp1 : currentHp2) > 0) team.push(oldPoke);

    if (player === 1)
    {
        currentPoke1 = newPoke; currentHp1 = newPoke.hpCurrent; maxHp1 = newPoke.hpMax; stats1 = newPoke.stats; types1 = newPoke.types; loadActivePokemon(1, newPoke);
    }
    else
    {
        currentPoke2 = newPoke; currentHp2 = newPoke.hpCurrent; maxHp2 = newPoke.hpMax; stats2 = newPoke.stats; types2 = newPoke.types; loadActivePokemon(2, newPoke);
    }
}

// EXECUTE TURN
async function executeTurn() {
    turnCounter++;
    addToBattleLog(`--- Turn ${turnCounter} ---`);

    const speed1 = currentPoke1.stats.speed;
    const speed2 = currentPoke2.stats.speed;

    let firstAction, secondAction, firstPlayer, secondPlayer;

    if (selectedAction1.type === "switch" && selectedAction2.type !== "switch")
    {
        firstAction = selectedAction1; firstPlayer = 1;
        secondAction = selectedAction2; secondPlayer = 2;
    }
    else if (selectedAction2.type === "switch" && selectedAction1.type !== "switch")
    {
        firstAction = selectedAction2; firstPlayer = 2;
        secondAction = selectedAction1; secondPlayer = 1;
    }
    else if (speed1 >= speed2)
    {
        firstAction = selectedAction1; firstPlayer = 1;
        secondAction = selectedAction2; secondPlayer = 2;
    }
    else
    {
        firstAction = selectedAction2; firstPlayer = 2;
        secondAction = selectedAction1; secondPlayer = 1;
    }

    // FIRST ACTION
    const fainted = await handleAction(firstPlayer, firstAction);

    // SECOND ACTION
    if (fainted)
    {
        addToBattleLog(`Turn ends because a Pokémon fainted. The opponent cannot act this turn.`);
    }
    else
    {
        await handleAction(secondPlayer, secondAction);
    }

    selectedAction1 = null;
    selectedAction2 = null;

    renderMoves('moves1', currentPoke1.moves);
    renderMoves('moves2', currentPoke2.moves);
}

// HANDLE ACTION
async function handleAction(player, action) {
    if (action.type === "move") return await attack(player, action);
    else if (action.type === "switch") switchActivePokemon(player, action.index);
    return false;
}

// ATTACK FUNCTION
async function attack(player, move) {
    const attackerStats = player === 1 ? stats1 : stats2;
    const defenderStats = player === 1 ? stats2 : stats1;
    const attackerTypes = player === 1 ? types1 : types2;
    const defenderTypes = player === 1 ? types2 : types1;
    const moveName = move.move.name;

    const stab = attackerTypes.includes(move.moveType) ? 1.5 : 1;
    const typeEffectiveness = await getTypeEffectiveness(move.moveType, defenderTypes);
    const damage = calculateDamage(50, attackerStats.attack, move.power, defenderStats.defense, stab, typeEffectiveness);

    if (player === 1) {
        currentHp2 = Math.max(0, currentHp2 - damage);
        updateHpBar('healthBar2', currentHp2, maxHp2);
        addToBattleLog(`${currentPoke1.name} used ${moveName} (-${damage} damage!)`);
        if (currentHp2 === 0) { addToBattleLog(`${currentPoke2.name} fainted!`); switchNextPokemon(2); return true; }
    } else {
        currentHp1 = Math.max(0, currentHp1 - damage);
        updateHpBar('healthBar1', currentHp1, maxHp1);
        addToBattleLog(`${currentPoke2.name} used ${moveName} (-${damage} damage!)`);
        if (currentHp1 === 0) { addToBattleLog(`${currentPoke1.name} fainted!`); switchNextPokemon(1); return true; }
    }

    return false;
}

// SWITCH AFTER FAINT
function switchNextPokemon(player) {
    const team = player === 1 ? team1 : team2;
    if (team.length > 0)
    {
        waitingForSwitch = true;
        forcedSwitchPlayer = player;

        selectedAction1 = null; selectedAction2 = null;

        showSwitchMenu(player);
    }
    else
    {
        showPopup(player === 1 ? "Player 2 wins!" : "Player 1 wins!");
    }
}

console.log("Simon Was Here");
