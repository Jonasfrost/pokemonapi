// ------------------ UTILITY FUNCTIONS ------------------
function calculateStat(base, level = 50, iv = 31, ev = 0, isHP = false) {
    if (isHP) return Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + level + 10;
    return Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + 5;
}

function calculateDamage(level, attackStat, power, defenseStat, stab = 1, typeEffectiveness = 1) {
    const randomFactor = Math.floor(Math.random() * (100 - 85 + 1)) + 85;
    const baseDamage = ((((2 * level) / 5 + 2) * attackStat * power / defenseStat) / 50) + 2;
    return Math.floor(baseDamage * stab * typeEffectiveness * randomFactor / 100);
}

// Get type effectiveness using PokeAPI
async function getTypeEffectiveness(moveType, defenderTypes) {
    if (!moveType || !defenderTypes || defenderTypes.length === 0) return 1;
    try {
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
    } catch {
        return 1;
    }
}

// Normalize stat name from effect text to stat key used in pokemon.stats
function normalizeStatName(raw) {
    if (!raw) return null;
    let s = raw.toLowerCase().trim();
    s = s.replace(/[^a-z\s-]/g, '');
    s = s.replace(/\s+/g, ' ');
    // common mappings
    s = s.replace(/special attack/, 'special-attack');
    s = s.replace(/special defense/, 'special-defense');
    s = s.replace(/sp\.atk|spatk/, 'special-attack');
    s = s.replace(/sp\.def|spdef/, 'special-defense');
    s = s.replace(/attack/, 'attack');
    s = s.replace(/defense/, 'defense');
    s = s.replace(/speed/, 'speed');
    s = s.replace(/hp/, 'hp');
    s = s.replace(/ /g, '-');
    return s;
}
function parseAndApplyStatEffects(effectText, attacker, defender, playerWhoMoved, ui) {
    if (!effectText) {
        return;
    }
    const text = effectText.toLowerCase();
    // convert written numbers to digits for one..six
    const wordNums = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6 };
    let normalized = text.replace(/\b(one|two|three|four|five|six)\b/g, (m) => wordNums[m]);

    // regex to capture (raise|lower|increase|decrease) [the] [user/target] 's? STAT by N
    const re = /(raise|raises|raised|lower|lowers|lowered|increase|increases|increased|decrease|decreases|decreased)\s+(?:the\s+)?(?:(user|target|ally|opponent|enemy|foe)'?s?\s+)?([a-z \-]+?)\s+by\s+(\d+)/i;
    const m = normalized.match(re);
    if (m) {
        const verb = m[1];
        let who = m[2];
        const statRaw = m[3];
        const num = parseInt(m[4], 10) || 0;
        const statKey = normalizeStatName(statRaw);
        if (!statKey) {
            return;
        }
        // determine target: if who indicates user -> attacker, otherwise target/unspecified -> defender
        let targetPoke = defender;
        if (who) {
            who = who.toLowerCase();
            if (who.startsWith('user') || who.startsWith('ally')) {
                targetPoke = attacker;
            }
            else {
                targetPoke = defender;
            }
        }
        // verb indicates raise or lower
        const lowers = /lower|decrease|decreases|lowered/.test(verb);
        const delta = lowers ? -num : num;
        applyStatChange(targetPoke, statKey, delta, ui);
    }
}

// Change color of HP bar based on percentage
function lerpRgb(a, b, t) {
    return [
        Math.round(a[0] + (b[0] - a[0]) * t),
        Math.round(a[1] + (b[1] - a[1]) * t),
        Math.round(a[2] + (b[2] - a[2]) * t)
    ];
}
function hpColorForPercent(pct) {
    pct = Math.max(0, Math.min(100, pct));
    const green = [0, 200, 0];
    const yellow = [255, 200, 0];
    const red = [200, 0, 0];

    if (pct >= 50) {
        // interpolate between yellow (50) and green (100)
        const t = (pct - 50) / 50; // 0..1
        const rgb = lerpRgb(yellow, green, t);
        return `rgb(${rgb.join(',')})`;
    }

    if (pct >= 25) {
        // interpolate between red (25) and yellow (50)
        const t = (pct - 25) / 25; // 0..1
        const rgb = lerpRgb(red, yellow, t);
        return `rgb(${rgb.join(',')})`;
    }

    // below 25 => solid red
    return `rgb(${red.join(',')})`;
}

// Calculate miss chance
function miss(move, attacker = null, defender = null, ui = null) {
    if (!move) return false;

    if (move.accuracy === null || typeof move.accuracy === 'undefined') return false;

    const accuracy = Number(move.accuracy) || 0;

    const acc = Math.max(0, Math.min(100, accuracy));

    const roll = Math.floor(Math.random() * 100) + 1;

    const didMiss = roll > acc;

    if (didMiss && ui && typeof ui.log === 'function') {
        if (attacker && defender) ui.log(`${attacker.name}'s ${move.name} missed ${defender.name}!`, 'gray');
        else ui.log(`${move.name} missed!`, 'gray');
    }

    return didMiss;
}

// ------------------ CLASS DEFINITIONS ------------------
class Move {
    constructor({ name, power, type, damageClass, effectText, priority }) {
        this.name = name;
        this.power = power || 0;
        this.type = type || null;
        this.damageClass = damageClass || 'status';
        this.effectText = effectText || '';
        this.priority = typeof priority === 'number' ? priority : 0;
    }

    isStatus() {
        return this.damageClass === 'status';
    }

    calculateDamage(attacker, defender, typeEffectiveness = 1) {
        if (this.isStatus()) return 0;
        const stab = attacker.types.includes(this.type) ? 1.5 : 1;
        return calculateDamage(50, attacker.stats.attack, this.power, defender.stats.defense, stab, typeEffectiveness);
    }


}

class Pokemon {
    constructor({ name, sprite, stats, types, moves }) {
        this.name = name;
        this.sprite = sprite;
        this.stats = stats;
        this.types = types;
        this.moves = moves.map(m => new Move(m));
        this.hpMax = stats.hp;
        this.hpCurrent = stats.hp;
        // track stat stages per stat key (same keys as stats object)
        this.statStages = {};
        Object.keys(stats).forEach(k => this.statStages[k] = 0);
    }

    takeDamage(amount) {
        this.hpCurrent = Math.max(0, this.hpCurrent - amount);
    }

    isFainted() {
        return this.hpCurrent <= 0;
    }
}

class UI {
    constructor() {
        this.logContainer = document.getElementById('battle-log');
    }

    updateHp(pokemon, player) {
        const bar = document.getElementById(`healthBar${player}`);
        const pct = Math.round((pokemon.hpCurrent / Math.max(1, pokemon.hpMax)) * 100);
        bar.value = `HP: ${pokemon.hpCurrent} / ${pokemon.hpMax} (${pct}%)`;
        bar.style.display = 'block';
        // set background color based on percent
        const bg = hpColorForPercent(pct);
        bar.style.backgroundColor = bg;
        // choose text color for contrast (dark text on light bg, white on darker)
        // simple luminance check
        const rgb = bg.match(/\d+/g).map(Number);
        const luminance = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]);
        bar.style.color = luminance > 150 ? '#000' : '#fff';
    }

    renderPokemon(pokemon, player) {
        document.getElementById(`pokemonNameDisplay${player}`).textContent = pokemon.name;
        document.getElementById(`pokemonSprite${player}`).src = pokemon.sprite;
        const statsDiv = document.getElementById(`stats${player}`);
        // show stat stages next to stat values
        statsDiv.innerHTML = Object.entries(pokemon.stats)
            .map(([k, v]) => {
                const stage = pokemon.statStages && pokemon.statStages[k] ? pokemon.statStages[k] : 0;
                const stageLabel = stage !== 0 ? ` (${stage > 0 ? '+' : ''}${stage})` : '';
                return `${k.toUpperCase()}: ${v}${stageLabel}`;
            })
            .join('<br>');
        document.getElementById(`type${player}`).textContent = `Type: ${pokemon.types.join(' / ')}`;
        this.updateHp(pokemon, player);
        this.renderMoves(pokemon, player);
    }

    renderMoves(pokemon, player) {
        const container = document.getElementById(`moves${player}`);
        container.innerHTML = '';
        pokemon.moves.forEach(move => {
            const btn = document.createElement('button');
            btn.textContent = move.name;
            btn.title = move.isStatus() ? `Status: ${move.effectText}` : `Power: ${move.power} | Type: ${move.type} priority: ${move.priority}`;
            btn.onclick = () => Battle.instance.selectMove(player, move);
            container.appendChild(btn);
        });
    }

    // allow optional color for log entries
    log(message, color = null) {
        const p = document.createElement('p');
        p.textContent = message;
        if (color) p.style.color = color;
        this.logContainer.appendChild(p);
        this.logContainer.scrollTop = this.logContainer.scrollHeight;
    }

    showPopup(msg) {
        document.querySelector("#popup p").textContent = msg;
        document.getElementById("popup").style.display = "flex";
    }

    closePopup() {
        document.getElementById("popup").style.display = "none";
    }

    renderSwitchMenu(team, player, onSelect, forForced = false) {
        const menu = document.getElementById(`switch-menu${player}`);
        menu.innerHTML = '';
        team.forEach((poke, index) => {
            if (poke.hpCurrent <= 0) return;
            const btn = document.createElement('button');
            // create a container so image and name align
            const img = document.createElement('img');
            img.src = poke.sprite;
            img.alt = poke.name;
            img.width = 60; img.height = 60;
            const nameSpan = document.createElement('span');
            nameSpan.textContent = poke.name;
            btn.appendChild(img);
            btn.appendChild(nameSpan);

            btn.onclick = () => {
                menu.style.display = 'none';
                if (forForced) {
                    onSelect(index);
                } else {
                    onSelect(index);
                }
            };
            menu.appendChild(btn);
        });
        menu.style.display = 'flex';
    }
}

class Battle {
    constructor(team1, team2, ui) {
        this.team1 = team1;
        this.team2 = team2;
        this.ui = ui;
        this.currentPoke1 = this.team1.shift();
        this.currentPoke2 = this.team2.shift();
        this.selectedMoves = { 1: null, 2: null };
        this.turn = 0; // add turn counter
        Battle.instance = this;
        this.startBattle();
    }

    startBattle() {
        document.getElementById('team-selection').style.display = 'none';
        document.getElementById('battle-container').style.display = 'flex';
        document.getElementById('battle-log').style.display = 'block';
        this.ui.renderPokemon(this.currentPoke1, 1);
        this.ui.renderPokemon(this.currentPoke2, 2);
    }

    selectMove(player, move) {
        this.selectedMoves[player] = move;
        if (this.selectedMoves[1] && this.selectedMoves[2]) {
            this.executeTurn();
        }
    }

    async executeTurn() {
        // increment and display turn counter in the battle log
        this.turn++;
        this.ui.log(`--- Turn ${this.turn} ---`);

        // If either player selected a switch, perform switches first (always)
        const isSwitch1 = this.selectedMoves[1] && this.selectedMoves[1].type === 'switch';
        const isSwitch2 = this.selectedMoves[2] && this.selectedMoves[2].type === 'switch';

        if (isSwitch1 || isSwitch2) {
            // perform switches in a deterministic order (player 1 then player 2)
            if (isSwitch1) {
                const action = this.selectedMoves[1];
                this.performSwitch(1, action.index);
                this.ui.log(`${this.currentPoke1.name} switched in!`);
            }
            if (isSwitch2) {
                const action = this.selectedMoves[2];
                this.performSwitch(2, action.index);
                this.ui.log(`${this.currentPoke2.name} switched in!`);
            }

            // clear the switch selections (they consumed the turn)
            if (isSwitch1) this.selectedMoves[1] = null;
            if (isSwitch2) this.selectedMoves[2] = null;

            // If both players switched, the turn ends here
            if (!this.selectedMoves[1] && !this.selectedMoves[2]) {
                this.selectedMoves = { 1: null, 2: null };
                return;
            }
            // otherwise continue to resolve remaining move(s)
        }

        // determine order for remaining moves based on priority first, then speed
        const move1 = this.selectedMoves[1];
        const move2 = this.selectedMoves[2];

        // If only one move exists, just run it
        if (move1 && !move2) {
            await this.handleMove(1, move1);
            this.selectedMoves = { 1: null, 2: null };
            return;
        }
        if (move2 && !move1) {
            await this.handleMove(2, move2);
            this.selectedMoves = { 1: null, 2: null };
            return;
        }

        if (move1 && move2) {
            const prio1 = move1.priority || 0;
            const prio2 = move2.priority || 0;
            let firstPlayer, secondPlayer;

            if (prio1 > prio2) {
                firstPlayer = 1; secondPlayer = 2;
            } else if (prio2 > prio1) {
                firstPlayer = 2; secondPlayer = 1;
            } else {
                // same priority -> speed tiebreaker
                const speed1 = this.currentPoke1.stats.speed;
                const speed2 = this.currentPoke2.stats.speed;
                firstPlayer = speed1 >= speed2 ? 1 : 2;
                secondPlayer = firstPlayer === 1 ? 2 : 1;
            }

            if (this.selectedMoves[firstPlayer]) {
                await this.handleMove(firstPlayer, this.selectedMoves[firstPlayer]);
            }

            if (!this.currentPoke1.isFainted() && !this.currentPoke2.isFainted()) {
                if (this.selectedMoves[secondPlayer]) {
                    await this.handleMove(secondPlayer, this.selectedMoves[secondPlayer]);
                }
            }
        }
        this.selectedMoves = { 1: null, 2: null };
    }

    async handleMove(player, action) {
        if (!action) return;
        // If action is a switch
        if (action.type === 'switch') {
            this.performSwitch(player, action.index);
            this.ui.log(`${player === 1 ? this.currentPoke1.name : this.currentPoke2.name} switched in!`);
            return;
        }

        // Otherwise it's a Move instance
        const move = action;
        const attacker = player === 1 ? this.currentPoke1 : this.currentPoke2;
        const defender = player === 1 ? this.currentPoke2 : this.currentPoke1;

        // Check if the move misses before proceeding
        const didMiss = miss(move, attacker, defender, this.ui);
        if (didMiss) {
            move.power = 0;
            console.log(`${attacker.name}'s ${move.name} missed!`);
            this.ui.log(`${attacker.name}'s ${move.name} missed!`, 'gray');
            return;
        }
        else
        {
            console.log(`${attacker.name}'s ${move.name} hit!`);
        }

        if (move.isStatus()) {
            this.ui.log(`${attacker.name} used ${move.name} (status): ${move.effectText}....coming soon`);
            // parse and apply any stat effects from the status move
            parseAndApplyStatEffects(move.effectText, attacker, defender, player, this.ui);
            return;
        }

        const typeEffectiveness = await getTypeEffectiveness(move.type, defender.types);
        const damage = move.calculateDamage(attacker, defender, typeEffectiveness);
        defender.takeDamage(damage);
        this.ui.updateHp(defender, player === 1 ? 2 : 1);
        // Log the attack
        this.ui.log(`${attacker.name} used ${move.name} (-${damage} HP)`);

        // Log effectiveness message with appropriate color
        if (typeEffectiveness === 0) {
            this.ui.log("It had no effect.", 'gray');
        } else if (typeEffectiveness > 1) {
            this.ui.log("It's super effective!", 'green');
        } else if (typeEffectiveness < 1) {
            this.ui.log("It's not very effective...", 'red');
        }

        // parse and apply any stat effects from move (works for damage moves that have secondary effects)
        parseAndApplyStatEffects(move.effectText, attacker, defender, player, this.ui);

        if (defender.isFainted()) {
            this.ui.log(`${defender.name} fainted!`);
            await this.forcedSwitch(player === 1 ? 2 : 1);
        }
    }

    performSwitch(player, index) {
        const team = player === 1 ? this.team1 : this.team2;
        const newPoke = team.splice(index, 1)[0];
        const oldPoke = player === 1 ? this.currentPoke1 : this.currentPoke2;
        // only put back the old poke into the team if it hasn't fainted
        if (!oldPoke.isFainted()) {
            team.push(oldPoke);
        }

        if (player === 1) {
            this.currentPoke1 = newPoke;
            this.ui.renderPokemon(newPoke, 1);
        } else {
            this.currentPoke2 = newPoke;
            this.ui.renderPokemon(newPoke, 2);
        }
    }

    async forcedSwitch(player) {
        const team = player === 1 ? this.team1 : this.team2;
        if (team.length === 0) {
            this.ui.showPopup(player === 1 ? "Player 2 wins!" : "Player 1 wins!");
            return;
        }

        this.ui.log(`Player ${player}, choose a Pokémon to switch in!`);
        // For forced switch we immediately swap when selection is made
        this.ui.renderSwitchMenu(team, player, (index) => {
            const newPoke = team.splice(index, 1)[0];
            if (player === 1) this.currentPoke1 = newPoke;
            else this.currentPoke2 = newPoke;
            this.ui.renderPokemon(newPoke, player);
            this.ui.log(`${newPoke.name} was sent out!`);
            document.getElementById(`switch-menu${player}`).style.display = 'none';
        }, true);
    }

    manualSwitch(player) {
        const team = player === 1 ? this.team1 : this.team2;
        // When manually switching, selecting a Pokemon will set the selected action to a switch
        this.ui.renderSwitchMenu(team, player, (index) => {
            // set as selected action to consume this player's turn
            this.selectedMoves[player] = { type: 'switch', index };
            document.getElementById(`switch-menu${player}`).style.display = 'none';
            this.ui.log(`Player ${player} selected a switch.`);
            if (this.selectedMoves[1] && this.selectedMoves[2]) this.executeTurn();
        }, false);
    }
}

// ------------------ FETCH FUNCTIONS ------------------
const moveCache = new Map();

async function fetchPokemon(name) {
    try {
        const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${name.toLowerCase()}`);
        if (!res.ok) return null;
        const data = await res.json();
        const level = 50;
        const stats = {};
        data.stats.forEach(s => stats[s.stat.name] = calculateStat(s.base_stat, level, 31, 0, s.stat.name === 'hp'));
        const moves = data.moves.slice(0, 4).map(m => ({
            name: m.move.name,
            url: m.move.url
        }));
        const detailedMoves = await Promise.all(moves.map(async m => {
            if (moveCache.has(m.url)) {
                return moveCache.get(m.url);
            }
            const res = await fetch(m.url);
            const d = await res.json();
            const moveData = new Move({
                name: m.name,
                power: d.power,
                type: d.type?.name,
                damageClass: d.damage_class?.name,
                effectText: d.effect_entries?.find(e => e.language.name === 'en')?.short_effect || '',
                priority: d.priority || 0
            });
            moveCache.set(m.url, moveData);
            return moveData;
        }));

        return new Pokemon({
            name: data.name,
            sprite: data.sprites.front_default,
            stats,
            types: data.types.map(t => t.type.name),
            moves: detailedMoves
        });
    } catch { return null; }
}

// ------------------ TEAM SUBMISSION ------------------
async function submitTeam(player) {
    const team = [];
    for (let i = 1; i <= 6; i++) {
        const input = document.getElementById(`team${player}-poke${i}`);
        const name = input.value.trim();
        if (!name) continue;
        const poke = await fetchPokemon(name);
        if (poke) team.push(poke);
    }
    if (team.length === 0) return alert(`Player ${player} must select at least 1 Pokémon.`);
    if (player === 1) window.team1 = team;
    else window.team2 = team;

    if (window.team1 && window.team2) new Battle(window.team1, window.team2, new UI());
}

async function randomizeTeam(player) {
    for (let i = 1; i <= 6; i++) {
        const input = document.getElementById(`team${player}-poke${i}`);
        try {
            const randomId = Math.floor(Math.random() * 1025) + 1;
            const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${randomId}`);
            if (!res.ok) { input.value = ''; continue; }
            const data = await res.json();
            input.value = data.name;
        } catch {
            input.value = '';
        }
    }
}

// ------------------ GLOBAL SWITCH BUTTONS ------------------
window.manualSwitch = (player) => {
    if (Battle.instance) Battle.instance.manualSwitch(player);
}

console.log("simon was here"); 