import { Pokemon } from "../models/Pokemon.js";
import { Move } from "../models/Move.js";

//opretter en metode til at hente data fra pokeapi
export class PokeApiService {
    static async fetchPokemon(name) {
        const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${name}`);
        if (!res.ok) throw new Error("Pokémon not found");
        const data = await res.json();

        const stats = Object.fromEntries(data.stats.map(s => [s.stat.name, s.base_stat]));
        const types = data.types.map(t => t.type.name);
        const sprite = data.sprites.front_default;
        const moveData = await Promise.all(
            data.moves.slice(0, 4).map(async m => {
                const mvRes = await fetch(m.move.url);
                const mvData = await mvRes.json();
                return new Move({
                    name: mvData.name,
                    power: mvData.power,
                    type: mvData.type.name,
                    category: mvData.damage_class.name,
                    effect: mvData.effect_entries.find(e => e.language.name === 'en')?.short_effect
                });
            })
        );

        return new Pokemon({ name: data.name, sprite, stats, types, moves: moveData });
    }
}

//operrater en metode til at regne damage
export class DamageCalculator {
    static calculate(level, attack, power, defense, stab = 1, effectiveness = 1) {
        const random = Math.floor(Math.random() * (100 - 85 + 1)) + 85;
        const baseDamage = ((((2 * level) / 5 + 2) * attack * power / defense) / 50) + 2;
        return Math.floor(baseDamage * stab * effectiveness * random / 100);
    }
}

//opretter en metode til at regne type effectiveness
export class TypeEffectivenessService {
    static async getMultiplier(moveType, defenderTypes) {
        const res = await fetch(`https://pokeapi.co/api/v2/type/${moveType}`);
        if (!res.ok) return 1;
        const data = await res.json();
        let multiplier = 1;
        for (const defType of defenderTypes) {
            if (data.damage_relations.double_damage_to.some(t => t.name === defType)) multiplier *= 2;
            if (data.damage_relations.half_damage_to.some(t => t.name === defType)) multiplier *= 0.5;
            if (data.damage_relations.no_damage_to.some(t => t.name === defType)) multiplier *= 0;
        }
        return multiplier;
    }
}

