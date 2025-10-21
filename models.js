import { DamageCalculator } from "../services/DamageCalculator.js";
import { TypeEffectivenessService } from "../services/TypeEffectivenessService.js";

// Opretter en metode til at lave pokemon
export class Pokemon {
    constructor({ name, sprite, stats, types, moves }) {
        this.name = name;
        this.sprite = sprite;
        this.stats = stats;
        this.types = types;
        this.moves = moves;
        this.currentHp = stats.hp;
    }

    isFainted() {
        return this.currentHp <= 0;
    }

    takeDamage(amount) {
        this.currentHp = Math.max(0, this.currentHp - amount);
    }

    healFull() {
        this.currentHp = this.stats.hp;
    }
}

//opretter en metode til at lave moves
export class Move {
    constructor({ name, power, type, category, effect }) {
        this.name = name;
        this.power = power;
        this.type = type;
        this.category = category;
        this.effect = effect;
    }

    isStatusMove() {
        return this.category === 'status';
    }
}

// opretter en metode til at lave player
export class Player {
    constructor(name, team) {
        this.name = name;
        this.team = team;
        this.activeIndex = 0;
    }

    get active() {
        return this.team[this.activeIndex];
    }

    switchTo(index) {
        this.activeIndex = index;
    }

    hasRemainingPokemon() {
        return this.team.some(p => !p.isFainted());
    }
}

//opretter en metode til at lave battle
export class Battle {
    constructor(player1, player2, renderer) {
        this.player1 = player1;
        this.player2 = player2;
        this.turn = 1;
        this.renderer = renderer;
    }

    async executeTurn(move1, move2) {
        const first = this.player1.active.stats.speed >= this.player2.active.stats.speed ? this.player1 : this.player2;
        const second = first === this.player1 ? this.player2 : this.player1;

        await this.performMove(first, second, first === this.player1 ? move1 : move2);
        if (!second.active.isFainted()) {
            await this.performMove(second, first, second === this.player1 ? move1 : move2);
        }
        this.turn++;
        this.renderer.updateUI();
    }

    async performMove(attacker, defender, move) {
        if (move.isStatusMove()) {
            this.renderer.log(`${attacker.name}'s ${move.name} had no damage effect.`);
            return;
        }
        const stab = attacker.active.types.includes(move.type) ? 1.5 : 1;
        const eff = await TypeEffectivenessService.getMultiplier(move.type, defender.active.types);
        const dmg = DamageCalculator.calculate(50, attacker.active.stats.attack, move.power, defender.active.stats.defense, stab, eff);
        defender.active.takeDamage(dmg);
        this.renderer.log(`${attacker.active.name} used ${move.name}! (-${dmg} HP)`);
    }
}
