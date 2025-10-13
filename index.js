let currentHp1 = null, maxHp1 = null;
let currentHp2 = null, maxHp2 = null;
let stats1 = {}, stats2 = {};
let types1 = [], types2 = []; // gemmer typer

// Popup functions
function showPopup(message = "Pokemon not found!") {
    document.querySelector(".popup-box p").textContent = message;
    document.getElementById("popup").style.display = "flex";
}
function closePopup() {
    document.getElementById("popup").style.display = "none";
}

// Reset fainted Pokémon
function resetCard(num) {
    const card = document.getElementById(`pokemon${num}`);
    const input = document.getElementById(`pokemonName${num}`);
    if (card) card.style.display = "none";
    if (input) input.value = "";
    if (num === 1) { currentHp1 = null; maxHp1 = null; stats1 = {}; types1 = []; }
    if (num === 2) { currentHp2 = null; maxHp2 = null; stats2 = {}; types2 = []; }

    // Clear moves, stats, type display
    const moves = document.getElementById(`moves${num}`);
    const statsDiv = document.getElementById(`stats${num}`);
    const typeDiv = document.getElementById(`type${num}`);
    if (moves) moves.innerHTML = "";
    if (statsDiv) { statsDiv.innerHTML = ""; statsDiv.style.display = "none"; }
    if (typeDiv) { typeDiv.innerHTML = ""; typeDiv.style.display = "none"; }
}

// Random moves
function getRandomMoves(movesArray, count = 4) {
    const shuffled = movesArray.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}

//Ramdom pokemon
async function fetchRandomPokemon(inputId, imgId, hpBarId, movesId, notFoundMsg) {
    try {
        const randomId = Math.floor(Math.random() * 898) + 1; // Pokémon IDs range from 1 to 898
        const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${randomId}`);
        if (!res.ok) {
            showPopup(notFoundMsg); return;
        }
        const data = await res.json();
        // Set input value to the fetched Pokémon's name
        const input = document.getElementById(inputId);
        input.value = data.name;
        // Call the regular fetch function to handle the rest
        await fetchPokemon(inputId, imgId, hpBarId, movesId, notFoundMsg);
    } catch (err) {
        console.error(err);
        showPopup("Something went wrong while fetching data.");
    }
}


// Stat calculation
function calculateStat(base, level = 50, iv = 31, ev = 0, isHP = false) {
    if (isHP) return Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + level + 10;
    else return Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + 5;
}

// Update HP bar
function updateHpBar(hpBarId, current, max) {
    const bar = document.getElementById(hpBarId);
    bar.value = `HP: ${current} / ${max}`;
}

// Damage formula
function calculateDamage(level, attackStat, attackPower, defenseStat, stab = 1, typeEffectiveness = 1) {
    const randomFactor = Math.floor(Math.random() * (100 - 85 + 1)) + 85; // 85–100%
    const baseDamage = (((((2 * level) / 5 + 2) * attackStat * attackPower / defenseStat) / 50) + 2);
    return Math.floor(baseDamage * stab * typeEffectiveness * randomFactor / 100);
}

// Type effectiveness check
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

// Render moves with STAB + type effectiveness
async function renderMoves(containerId, moves) {
    const container = document.getElementById(containerId);
    container.innerHTML = "";

    const isPoke1 = containerId === 'moves1';
    const opponentNum = isPoke1 ? 2 : 1;

    for (const move of moves)
    {
        const moveRes = await fetch(move.move.url);
        const moveDetails = await moveRes.json();
        const power = moveDetails.power;
        const moveType = moveDetails.type.name;

        const button = document.createElement("button");
        button.textContent = move.move.name;
        button.onclick = async () => {
            //til udregning af skade
            if (typeof power === 'number' && power > 0)
            {
                const attackerStats = isPoke1 ? stats1 : stats2;
                const defenderStats = isPoke1 ? stats2 : stats1;
                const attackerTypes = isPoke1 ? types1 : types2;
                const defenderTypes = isPoke1 ? types2 : types1;

                if (!attackerStats.attack || !defenderStats.defense)
                {
                    alert("Stats not ready yet!");
                    return;
                }

                // STAB move type matches Pokémon type
                const stab = attackerTypes.includes(moveType) ? 1.5 : 1;

                // Type effectiveness
                const typeEffectiveness = await getTypeEffectiveness(moveType, defenderTypes);

                const damage = calculateDamage(50, attackerStats.attack, power, defenderStats.defense, stab, typeEffectiveness);

                //fainted pokemon
                if (opponentNum === 2 && currentHp2 !== null)
                {
                    currentHp2 = Math.max(0, currentHp2 - damage);
                    updateHpBar('healthBar2', currentHp2, maxHp2);
                    if (currentHp2 === 0)
                    {
                        resetCard(2);
                        showPopup("pokemon 1 won")
                    }
                }
                else if (opponentNum === 1 && currentHp1 !== null)
                {
                    currentHp1 = Math.max(0, currentHp1 - damage);
                    updateHpBar('healthBar1', currentHp1, maxHp1);
                    if (currentHp1 === 0)
                    {
                        resetCard(1);
                        showPopup("pokemon 2 won")
                    }
                }
            }
            else
            {
                alert(`Used move: ${move.move.name} (no damage)`);
            }
        };
        container.appendChild(button);
    }
}

// Fetch Pokémon and stats
async function fetchPokemon(inputId, imgId, hpBarId, movesId, notFoundMsg) {
    try {
        const pokemonName = document.getElementById(inputId).value.trim().toLowerCase();
        if (!pokemonName) return;
        const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonName}`);
        if (!res.ok)
        {
            showPopup(notFoundMsg); return;
        }
        const data = await res.json();

        // Sprite
        const img = document.getElementById(imgId);
        img.src = data.sprites.front_default;
        img.style.display = "block";

        // Name
        const card = document.getElementById(inputId).closest('.pokemon-card');
        const spriteHpContainer = card.querySelector('.sprite-hp-container');
        let nameDiv = spriteHpContainer.querySelector('.pokemon-name');
        if (!nameDiv) {
            nameDiv = document.createElement('div');
            nameDiv.className = 'pokemon-name';
            spriteHpContainer.insertBefore(nameDiv, spriteHpContainer.firstChild);
        }
        nameDiv.textContent = data.name.charAt(0).toUpperCase() + data.name.slice(1);
        nameDiv.style.display = 'block';

        // HP
        const hpBase = data.stats.find(stat => stat.stat.name === "hp")?.base_stat || 0;
        const hpAt50 = calculateStat(hpBase, 50, 31, 0, true);
        const healthBar = document.getElementById(hpBarId);
        healthBar.value = `HP: ${hpAt50} / ${hpAt50}`;
        healthBar.style.display = "block";

        // Stats
        const level = 50, iv = 31, ev = 0;
        const statsAt50 = {};
        data.stats.forEach(statObj => {
            const base = statObj.base_stat;
            const name = statObj.stat.name;
            statsAt50[name] = calculateStat(base, level, iv, ev, name === "hp");
        });

        if (hpBarId === 'healthBar1')
        {
            currentHp1 = hpAt50; maxHp1 = hpAt50; stats1 = statsAt50;
            types1 = data.types.map(t => t.type.name);
        }
        else
        {
            currentHp2 = hpAt50; maxHp2 = hpAt50; stats2 = statsAt50;
            types2 = data.types.map(t => t.type.name);
        }

        // Display types
        const typeId = inputId === 'pokemonName1' ? 'type1' : 'type2';
        let typeDiv = document.getElementById(typeId);
        if (!typeDiv)
        {
            typeDiv = document.createElement('div');
            typeDiv.id = typeId;
            typeDiv.className = 'type-container';
            const hpBarEl = spriteHpContainer.querySelector('input[type="text"]');
            spriteHpContainer.insertBefore(typeDiv, hpBarEl.nextSibling);
        }
        typeDiv.innerHTML = `<strong>Type:</strong> ${data.types.map(t => t.type.name).join(' / ')}`;
        typeDiv.style.display = 'block';

        // Display stats
        const statsId = inputId === 'pokemonName1' ? 'stats1' : 'stats2';
        const statsDiv = document.getElementById(statsId);
        statsDiv.innerHTML = `<strong>Stats (Level 50):</strong><br>` +
            Object.entries(statsAt50).map(([k, v]) => `${k.toUpperCase()}: ${v}`).join('<br>');
        statsDiv.style.display = 'block';

        // Moves
        const moves = getRandomMoves(data.moves, 4);
        await renderMoves(movesId, moves);

    } catch (err) {
        console.error(err);
        showPopup("Something went wrong while fetching data.");
    }
}
console.log("Simon was here");
