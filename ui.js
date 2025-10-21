// oprretter metode til at opdatere UI
export class BattleRenderer {
    constructor(battle) {
        this.battle = battle;
    }

    updateUI() {
        const p1 = this.battle.player1.active;
        const p2 = this.battle.player2.active;

        document.getElementById("pokemonNameDisplay1").textContent = p1.name;
        document.getElementById("pokemonNameDisplay2").textContent = p2.name;
        document.getElementById("healthBar1").value = `HP: ${p1.currentHp}/${p1.stats.hp}`;
        document.getElementById("healthBar2").value = `HP: ${p2.currentHp}/${p2.stats.hp}`;
    }

    log(message) {
        const log = document.getElementById("battle-log");
        const p = document.createElement("p");
        p.textContent = message;
        log.appendChild(p);
        log.scrollTop = log.scrollHeight;
    }
}

