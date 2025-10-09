function showPopup(message = "Pokemon not found!") {
    document.querySelector(".popup-box p").textContent = message;
    document.getElementById("popup").style.display = "flex";
}

function closePopup() {
    document.getElementById("popup").style.display = "none";
}

//getting a random move from api
function getRandomMoves(movesArray, count = 4) {
    const shuffled = movesArray.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}

//stats for level 50
function calculateStat(base, level = 50, iv = 31, ev = 0, isHP = false) {
    if (isHP) {
        return Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + level + 10;
    } else {
        return Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + 5;
    }
}

//display moves
async function renderMoves(containerId, moves) {
    const container = document.getElementById(containerId);
    container.innerHTML = "";

    // Determine which pokemon this is for and who is the opponent
    const isPoke1 = containerId === 'moves1';
    const opponentHpBarId = isPoke1 ? 'healthBar2' : 'healthBar1';
    const opponentNum = isPoke1 ? 2 : 1;

    for (const move of moves) {
        const response = await fetch(move.move.url);
        const moveDetails = await response.json();
        //how much damage the move does
        const power = moveDetails.power;

        const button = document.createElement("button");
        button.textContent = move.move.name;
        button.onclick = () => {
            // Only apply damage if power is a number
            if (typeof power === 'number' && power > 0) {
                if (opponentNum === 2 && currentHp2 !== null) {
                    currentHp2 = Math.max(0, currentHp2 - power);
                    updateHpBar('healthBar2', currentHp2, maxHp2);
                    if (currentHp2 === 0) showPopup('Pokemon 2 fainted!');
                } else if (opponentNum === 1 && currentHp1 !== null) {
                    currentHp1 = Math.max(0, currentHp1 - power);
                    updateHpBar('healthBar1', currentHp1, maxHp1);
                    if (currentHp1 === 0) showPopup('Pokemon 1 fainted! ');
                }
            } else {
                alert(`Used move: ${move.move.name} (no damage)`);
            }
        };
        container.appendChild(button);
    }
}

// Helper to update HP bar
function updateHpBar(hpBarId, current, max) {
    const bar = document.getElementById(hpBarId);
    bar.value = `HP: ${current} / ${max}`;
}

//fetching pokemon and stats
async function fetchPokemon(inputId, imgId, hpBarId, movesId, notFoundMsg) {
    try {
        const pokemonName = document.getElementById(inputId).value.trim().toLowerCase();
        if (!pokemonName) return;
        const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonName}`);
        if (!response.ok) {
            showPopup(notFoundMsg);
            return;
        }
        const data = await response.json();

        // Sprite
        const img = document.getElementById(imgId);
        img.src = data.sprites.front_default;
        img.style.display = "block";

        // Name display
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

        // Set global HP variables
        if (hpBarId === 'healthBar1') {
            currentHp1 = hpAt50;
            maxHp1 = hpAt50;
        } else if (hpBarId === 'healthBar2') {
            currentHp2 = hpAt50;
            maxHp2 = hpAt50;
        }

        // Display types
        const typeNames = data.types.map(t => t.type.name);
        const typeId = inputId === 'pokemonName1' ? 'type1' : 'type2';
        let typeDiv = document.getElementById(typeId);

        if (!typeDiv)
        {
            // Create type div if it doesn't exist
            typeDiv = document.createElement('div');
            typeDiv.id = typeId;
            typeDiv.className = 'type-container';

            // Insert after HP bar but before img
            const hpBar = spriteHpContainer.querySelector('input[type="text"]');
            spriteHpContainer.insertBefore(typeDiv, hpBar.nextSibling);
        }

        typeDiv.innerHTML = `<strong>Type:</strong> ${typeNames.join(' / ')}`;
        typeDiv.style.display = 'block';

        // Calculate and log all stats at level 50
        const level = 50;
        const iv = 31;
        const ev = 0;
        const statsAt50 = {};
        data.stats.forEach(statObj => {
            const base = statObj.base_stat;
            const name = statObj.stat.name;
            const isHP = name === "hp";
            const statAt50 = calculateStat(base, level, iv, ev, isHP);
            statsAt50[name] = statAt50;
        });
        console.log(`Stats for ${pokemonName} at level 50:`, statsAt50);

        // Vis stats i stats-container
        const statsId = inputId === 'pokemonName1' ? 'stats1' : 'stats2';
        const statsDiv = document.getElementById(statsId);
        statsDiv.innerHTML = `<strong>Stats (Level 50):</strong><br>` +
            Object.entries(statsAt50).map(([key, value]) => `${key.toUpperCase()}: ${value}`).join('<br>');
        statsDiv.style.display = 'block';

        // Moves
        const moves = getRandomMoves(data.moves, 4);
        await renderMoves(movesId, moves);
    }
    catch (error) {
        console.error(error);
        showPopup("Something went wrong while fetching data.");
    }
    console.log("Simon was here")
}
