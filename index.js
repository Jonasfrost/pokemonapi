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
let switched = false;

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
    if (!moveType) return 1;
    const res = await fetch(`https://pokeapi.co/api/v2/type/${moveType}`);
    if (!res.ok) return 1;
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

        // Select random moves
        const rawMoves = getRandomMoves(data.moves, 4);

        // For each selected move, fetch details (cached) and attach as .details
        const detailedMoves = await Promise.all(rawMoves.map(async (mv) => {
            const url = mv.move.url;
            if (moveCache.has(url)) {
                mv.details = moveCache.get(url);
                return mv;
            }
            try {
                const mres = await fetch(url);
                if (!mres.ok) {
                    const fallback = { power: null, type: null, damage_class: null, effect_text: null };
                    mv.details = fallback;
                    moveCache.set(url, fallback);
                    return mv;
                }
                const mdata = await mres.json();
                // Get English effect entry (prefer short_effect)
                let effectText = null;
                if (Array.isArray(mdata.effect_entries)) {
                    const en = mdata.effect_entries.find(e => e.language && e.language.name === 'en');
                    if (en) effectText = en.short_effect || en.effect || null;
                }
                const details = {
                    power: mdata.power ?? null,
                    type: mdata.type?.name ?? null,
                    damage_class: mdata.damage_class?.name ?? null,
                    effect_text: effectText
                };
                mv.details = details;
                moveCache.set(url, details);
                return mv;
            } catch (e) {
                const fallback = { power: null, type: null, damage_class: null, effect_text: null };
                mv.details = fallback;
                moveCache.set(url, fallback);
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
    if (player === 1) {
        team1 = team; document.getElementById('team1-selection').style.display = 'none';
    } else {
        team2 = team; document.getElementById('team2-selection').style.display = 'none';
    }

    if (team1.length && team2.length) {
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

    if (player === 1) {
        currentHp1 = poke.hpCurrent; maxHp1 = poke.hpMax; stats1 = poke.stats; types1 = poke.types;
    } else {
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
        let damageClass = move.details?.damage_class ?? null;
        let effectText = move.details?.effect_text ?? null;

        // Fallback: if no details attached, try fetching once (and cache)
        if ((power === null && damageClass === null) && move.move && move.move.url) {
            const url = move.move.url;
            if (moveCache.has(url)) {
                const d = moveCache.get(url);
                power = d.power; moveType = d.type; damageClass = d.damage_class; effectText = d.effect_text;
                move.details = d;
            } else {
                try {
                    const moveRes = await fetch(url);
                    const moveDetails = await moveRes.json();
                    power = moveDetails.power ?? null;
                    moveType = moveDetails.type?.name ?? null;
                    damageClass = moveDetails.damage_class?.name ?? null;
                    let et = null;
                    if (Array.isArray(moveDetails.effect_entries)) {
                        const en = moveDetails.effect_entries.find(e => e.language && e.language.name === 'en');
                        if (en) et = en.short_effect || en.effect || null;
                    }
                    effectText = et;
                    const d = { power, type: moveType, damage_class: damageClass, effect_text: effectText };
                    move.details = d;
                    moveCache.set(url, d);
                } catch (e) {
                    power = null; moveType = null; damageClass = null; effectText = null;
                    const fallback = { power: null, type: null, damage_class: null, effect_text: null };
                    move.details = fallback;
                    moveCache.set(move.move.url, fallback);
                }
            }
        }

        const isStatus = damageClass === 'status';
        // Build hover text (title) showing power or effect only on hover
        const hoverParts = [];
        if (isStatus) {
            if (effectText) hoverParts.push(`Effect: ${effectText}`);
            else hoverParts.push('Effect: Status move');
        } else {
            hoverParts.push(`Power: ${power ?? 'N/A'}`);
            if (moveType) hoverParts.push(`Type: ${moveType}`);
        }
        const hoverText = hoverParts.join(' | ');

        const button = document.createElement("button");
        // Display only the move name; details appear on hover via title
        button.textContent = move.move.name;
        button.title = hoverText;
        button.setAttribute('aria-label', `${move.move.name}. ${hoverText}`);

        // Determine if this move is currently selected for its player
        const currentSelection = isPoke1 ? selectedAction1 : selectedAction2;
        const isSelected = currentSelection && currentSelection.move && currentSelection.move.move && currentSelection.move.move.name === move.move.name;
        if (isSelected) button.classList.add('selected-move');

        button.onclick = async () => {
            if (waitingForSwitch) return; // extra safety

            // Toggle selection: clicking the same move again will deselect
            if (isPoke1) {
                if (selectedAction1 && selectedAction1.move && selectedAction1.move.move.name === move.move.name) {
                    selectedAction1 = null;
                } else {
                    // Select this move
                    if (isStatus) selectedAction1 = { type: "move", move, moveType, power: 0, isStatus: true, effectText };
                    else selectedAction1 = { type: "move", move, moveType, power };
                }
            } else {
                if (selectedAction2 && selectedAction2.move && selectedAction2.move.move.name === move.move.name) {
                    selectedAction2 = null;
                } else {
                    if (isStatus) selectedAction2 = { type: "move", move, moveType, power: 0, isStatus: true, effectText };
                    else selectedAction2 = { type: "move", move, moveType, power };
                }
            }

            // Re-render both move lists to update selection visual state
            renderMoves('moves1', currentPoke1.moves);
            renderMoves('moves2', currentPoke2.moves);

            // If both players have selections, execute the turn
            if (selectedAction1 && selectedAction2) await executeTurn();
        };
        container.appendChild(button);
    }

    // Add cancel selection button if player has a current selection
    const playerHasSelection = isPoke1 ? !!selectedAction1 : !!selectedAction2;
    if (playerHasSelection) {
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancel selection';
        cancelBtn.className = 'cancel-selection';
        cancelBtn.onclick = () => {
            if (isPoke1) selectedAction1 = null; else selectedAction2 = null;
            // Re-render to update UI
            renderMoves('moves1', currentPoke1.moves);
            renderMoves('moves2', currentPoke2.moves);
        };
        container.appendChild(cancelBtn);
    }
}

// SHOW SWITCH MENU
function showSwitchMenu(player) {
    const menu = document.getElementById(`switch-menu${player}`);
    menu.innerHTML = '';
    const team = player === 1 ? team1 : team2;

    team.forEach((poke, index) => {
        if (poke.hpCurrent > 0) {
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

            // If this team member is currently selected for switch, mark it
            const currentSel = player === 1 ? selectedAction1 : selectedAction2;
            if (currentSel && currentSel.type === 'switch' && currentSel.index === index)
            {
                btn.classList.add('selected-switch');
            }

            btn.onclick = () => {
                // If this is a forced switch due to faint, perform it immediately and end the pending turn
                if (waitingForSwitch && forcedSwitchPlayer === player)
                {
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

                // Normal switch selection during a turn: toggle selection if same index clicked
                const prevSel = player === 1 ? selectedAction1 : selectedAction2;
                if (prevSel && prevSel.type === 'switch' && prevSel.index === index)
                {
                    // Deselect
                    if (player === 1)
                    {
                        selectedAction1 = null;
                    }
                    else
                    {
                        selectedAction2 = null;
                    }
                    addToBattleLog(`${poke.name} switch cancelled.`);
                }
                else
                {
                    // Select this pokemon to switch
                    if (player === 1)
                    {
                        selectedAction1 = { type: "switch", index: index };
                        switched = true;
                    }
                    else
                    {
                        selectedAction2 = { type: "switch", index: index };
                        switched = true;
                    }
                }

                menu.style.display = 'none';

                // If both players have selections, execute the turn
                if (selectedAction1 && selectedAction2)
                {
                    executeTurn()
                    if (switched === true)
                    {
                        addToBattleLog(`${poke.name} switched in!`);
                        switched = false;
                    }
                }
                else
                {
                    // Update moves UI to reflect selection state
                    renderMoves('moves1', currentPoke1.moves);
                    renderMoves('moves2', currentPoke2.moves);
                }
            };
            menu.appendChild(btn);
        }
    });

    // Add a cancel button to allow clearing a previously chosen switch without selecting a new one
    const currentSel = player === 1 ? selectedAction1 : selectedAction2;
    if (currentSel && currentSel.type === 'switch') {
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancel switch selection';
        cancelBtn.className = 'cancel-switch';
        cancelBtn.onclick = () => {
            if (player === 1) selectedAction1 = null; else selectedAction2 = null;
            menu.style.display = 'none';
            addToBattleLog(`Player ${player} cancelled their switch selection.`);
            renderMoves('moves1', currentPoke1.moves);
            renderMoves('moves2', currentPoke2.moves);
        };
        menu.appendChild(cancelBtn);
    }

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

    if (selectedAction1.type === "switch" && selectedAction2.type !== "switch") {
        firstAction = selectedAction1; firstPlayer = 1;
        secondAction = selectedAction2; secondPlayer = 2;
    } else if (selectedAction2.type === "switch" && selectedAction1.type !== "switch") {
        firstAction = selectedAction2; firstPlayer = 2;
        secondAction = selectedAction1; secondPlayer = 1;
    } else if (speed1 >= speed2) {
        firstAction = selectedAction1; firstPlayer = 1;
        secondAction = selectedAction2; secondPlayer = 2;
    } else {
        firstAction = selectedAction2; firstPlayer = 2;
        secondAction = selectedAction1; secondPlayer = 1;
    }

    // FIRST ACTION
    const fainted = await handleAction(firstPlayer, firstAction);

    // SECOND ACTION
    if (fainted) {
        addToBattleLog(`Turn ends because a Pokémon fainted. The opponent cannot act this turn.`);
    } else {
        await handleAction(secondPlayer, secondAction);
    }

    selectedAction1 = null;
    selectedAction2 = null;

    renderMoves('moves1', currentPoke1.moves);
    renderMoves('moves2', currentPoke2.moves);
}

// HANDLE ACTION
async function handleAction(player, action) {
    if (!action) return false;
    if (action.type === "move") return await attack(player, action);
    else if (action.type === "switch") switchActivePokemon(player, action.index);
    return false;
}

// ATTACK FUNCTION
async function attack(player, move) {
    // move may be the selectedAction structure, normalize
    const selected = move;
    const attackerStats = player === 1 ? stats1 : stats2;
    const defenderStats = player === 1 ? stats2 : stats1;
    const attackerTypes = player === 1 ? types1 : types2;
    const defenderTypes = player === 1 ? types2 : types1;
    const moveName = selected.move.move.name;

    // Handle status moves
    const isStatusMove = selected.isStatus || selected.move.details?.damage_class === 'status' || selected.move.details?.damage_class === 'status';
    if (isStatusMove) {
        const effectText = selected.effectText ?? selected.move.details?.effect_text ?? 'Status effect.';
        if (player === 1) addToBattleLog(`${currentPoke1.name} used ${moveName} (status): ${effectText}`);
        else addToBattleLog(`${currentPoke2.name} used ${moveName} (status): ${effectText}`);
        return false; // no faint
    }

    const movePower = selected.power ?? selected.move.details?.power ?? 0;
    const moveType = selected.moveType ?? selected.move.details?.type ?? null;

    const stab = attackerTypes.includes(moveType) ? 1.5 : 1;
    const typeEffectiveness = await getTypeEffectiveness(moveType, defenderTypes);
    const damage = calculateDamage(50, attackerStats.attack, movePower, defenderStats.defense, stab, typeEffectiveness);

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
    if (team.length > 0) {
        waitingForSwitch = true;
        forcedSwitchPlayer = player;

        selectedAction1 = null; selectedAction2 = null;

        showSwitchMenu(player);
    } else {
        showPopup(player === 1 ? "Player 2 wins!" : "Player 1 wins!");
    }
}

console.log("Simon Was Here");
