// cards.js - All card definitions for House of Cards
var Cards = (function() {
    'use strict';

    // Card types
    var TYPE = {
        ATTACK: 'attack',
        SKILL: 'skill',
        POWER: 'power',
        CURSE: 'curse'
    };

    // Card rarities
    var RARITY = {
        STARTER: 'starter',
        COMMON: 'common',
        UNCOMMON: 'uncommon',
        RARE: 'rare',
        CURSE: 'curse'
    };

    // All card definitions
    var definitions = {
        // === STARTER CARDS ===
        pointed_question: {
            id: 'pointed_question',
            name: 'Pointed Question',
            type: TYPE.ATTACK,
            rarity: RARITY.STARTER,
            cost: 1,
            description: 'Deal 6 damage.',
            effect: function(combat) {
                combat.dealDamage(6);
            }
        },
        party_line: {
            id: 'party_line',
            name: 'Party Line',
            type: TYPE.SKILL,
            rarity: RARITY.STARTER,
            cost: 1,
            description: 'Gain 5 Block.',
            effect: function(combat) {
                combat.gainBlock(5);
            }
        },
        sound_bite: {
            id: 'sound_bite',
            name: 'Sound Bite',
            type: TYPE.ATTACK,
            rarity: RARITY.STARTER,
            cost: 1,
            description: 'Deal 4 damage. Draw 1 card.',
            effect: function(combat) {
                combat.dealDamage(4);
                combat.drawCards(1);
            }
        },
        talking_points: {
            id: 'talking_points',
            name: 'Talking Points',
            type: TYPE.SKILL,
            rarity: RARITY.STARTER,
            cost: 1,
            description: 'Gain 4 Block. Draw 1 card.',
            effect: function(combat) {
                combat.gainBlock(4);
                combat.drawCards(1);
            }
        },

        // === COMMON CARDS ===
        opposition_research: {
            id: 'opposition_research',
            name: 'Opposition Research',
            type: TYPE.ATTACK,
            rarity: RARITY.COMMON,
            cost: 1,
            description: 'Deal 8 damage.',
            effect: function(combat) {
                combat.dealDamage(8);
            }
        },
        media_leak: {
            id: 'media_leak',
            name: 'Media Leak',
            type: TYPE.ATTACK,
            rarity: RARITY.COMMON,
            cost: 1,
            description: 'Deal 5 damage. Apply 1 Poison.',
            effect: function(combat) {
                combat.dealDamage(5);
                combat.applyStatus('enemy', 'poison', 1);
            }
        },
        backbench_rebellion: {
            id: 'backbench_rebellion',
            name: 'Backbench Rebellion',
            type: TYPE.ATTACK,
            rarity: RARITY.COMMON,
            cost: 2,
            description: 'Deal 12 damage.',
            effect: function(combat) {
                combat.dealDamage(12);
            }
        },
        filibuster: {
            id: 'filibuster',
            name: 'Filibuster',
            type: TYPE.SKILL,
            rarity: RARITY.COMMON,
            cost: 2,
            description: 'Gain 12 Block.',
            effect: function(combat) {
                combat.gainBlock(12);
            }
        },
        spin_doctor: {
            id: 'spin_doctor',
            name: 'Spin Doctor',
            type: TYPE.SKILL,
            rarity: RARITY.COMMON,
            cost: 1,
            description: 'Gain 6 Block.',
            effect: function(combat) {
                combat.gainBlock(6);
            }
        },
        three_line_whip: {
            id: 'three_line_whip',
            name: 'Three-Line Whip',
            type: TYPE.SKILL,
            rarity: RARITY.COMMON,
            cost: 1,
            description: 'Gain 4 Block. Apply 1 Weak.',
            effect: function(combat) {
                combat.gainBlock(4);
                combat.applyStatus('enemy', 'weak', 1);
            }
        },
        canvassing: {
            id: 'canvassing',
            name: 'Canvassing',
            type: TYPE.ATTACK,
            rarity: RARITY.COMMON,
            cost: 1,
            description: 'Deal 3 damage twice.',
            effect: function(combat) {
                combat.dealDamage(3);
                combat.dealDamage(3);
            }
        },
        early_day_motion: {
            id: 'early_day_motion',
            name: 'Early Day Motion',
            type: TYPE.SKILL,
            rarity: RARITY.COMMON,
            cost: 0,
            description: 'Draw 2 cards.',
            effect: function(combat) {
                combat.drawCards(2);
            }
        },
        dodge_the_question: {
            id: 'dodge_the_question',
            name: 'Dodge the Question',
            type: TYPE.SKILL,
            rarity: RARITY.COMMON,
            cost: 1,
            description: 'Gain 7 Block.',
            effect: function(combat) {
                combat.gainBlock(7);
            }
        },
        planted_story: {
            id: 'planted_story',
            name: 'Planted Story',
            type: TYPE.ATTACK,
            rarity: RARITY.COMMON,
            cost: 1,
            description: 'Deal 4 damage. Apply 1 Vulnerable.',
            effect: function(combat) {
                combat.dealDamage(4);
                combat.applyStatus('enemy', 'vulnerable', 1);
            }
        },
        constituency_surgery: {
            id: 'constituency_surgery',
            name: 'Constituency Surgery',
            type: TYPE.SKILL,
            rarity: RARITY.COMMON,
            cost: 1,
            description: 'Heal 3 HP.',
            effect: function(combat) {
                combat.healPlayer(3);
            }
        },
        urgent_question: {
            id: 'urgent_question',
            name: 'Urgent Question',
            type: TYPE.ATTACK,
            rarity: RARITY.COMMON,
            cost: 2,
            description: 'Deal 9 damage. Draw 1 card.',
            effect: function(combat) {
                combat.dealDamage(9);
                combat.drawCards(1);
            }
        },
        point_of_order: {
            id: 'point_of_order',
            name: 'Point of Order',
            type: TYPE.SKILL,
            rarity: RARITY.COMMON,
            cost: 0,
            exhaust: true,
            description: 'Gain 3 Block. Exhaust.',
            effect: function(combat) {
                combat.gainBlock(3);
            }
        },

        // === UNCOMMON CARDS ===
        pmqs_zinger: {
            id: 'pmqs_zinger',
            name: 'PMQs Zinger',
            type: TYPE.ATTACK,
            rarity: RARITY.UNCOMMON,
            cost: 2,
            description: 'Deal 14 damage. Apply 1 Vulnerable.',
            effect: function(combat) {
                combat.dealDamage(14);
                combat.applyStatus('enemy', 'vulnerable', 1);
            }
        },
        leaked_memo: {
            id: 'leaked_memo',
            name: 'Leaked Memo',
            type: TYPE.ATTACK,
            rarity: RARITY.UNCOMMON,
            cost: 1,
            description: 'Apply 3 Poison.',
            effect: function(combat) {
                combat.applyStatus('enemy', 'poison', 3);
            }
        },
        cash_for_questions: {
            id: 'cash_for_questions',
            name: 'Cash for Questions',
            type: TYPE.ATTACK,
            rarity: RARITY.UNCOMMON,
            cost: 0,
            exhaust: true,
            description: 'Deal 3 damage. Gain 5 gold. Exhaust.',
            effect: function(combat) {
                combat.dealDamage(3);
                combat.gainGold(5);
            }
        },
        ministerial_broadcast: {
            id: 'ministerial_broadcast',
            name: 'Ministerial Broadcast',
            type: TYPE.SKILL,
            rarity: RARITY.UNCOMMON,
            cost: 1,
            description: 'Gain 10 Block.',
            effect: function(combat) {
                combat.gainBlock(10);
            }
        },
        whips_office: {
            id: 'whips_office',
            name: "Whips' Office",
            type: TYPE.SKILL,
            rarity: RARITY.UNCOMMON,
            cost: 2,
            description: 'Gain 8 Block. Apply 1 Weak and 1 Frail.',
            effect: function(combat) {
                combat.gainBlock(8);
                combat.applyStatus('enemy', 'weak', 1);
                combat.applyStatus('enemy', 'frail', 1);
            }
        },
        lobby_journalist: {
            id: 'lobby_journalist',
            name: 'Lobby Journalist',
            type: TYPE.SKILL,
            rarity: RARITY.UNCOMMON,
            cost: 1,
            description: 'Draw 3 cards. Discard 1.',
            needsDiscard: 1,
            effect: function(combat) {
                combat.drawCards(3);
                combat.requireDiscard(1);
            }
        },
        dark_arts_dossier: {
            id: 'dark_arts_dossier',
            name: 'Dark Arts Dossier',
            type: TYPE.ATTACK,
            rarity: RARITY.UNCOMMON,
            cost: 2,
            exhaust: true,
            description: 'Deal 6 damage. Apply 2 Poison. Exhaust.',
            effect: function(combat) {
                combat.dealDamage(6);
                combat.applyStatus('enemy', 'poison', 2);
            }
        },
        emergency_budget: {
            id: 'emergency_budget',
            name: 'Emergency Budget',
            type: TYPE.SKILL,
            rarity: RARITY.UNCOMMON,
            cost: 0,
            exhaust: true,
            description: 'Gain 1 Energy. Draw 1 card. Exhaust.',
            effect: function(combat) {
                combat.gainEnergy(1);
                combat.drawCards(1);
            }
        },
        royal_commission: {
            id: 'royal_commission',
            name: 'Royal Commission',
            type: TYPE.SKILL,
            rarity: RARITY.UNCOMMON,
            cost: 1,
            description: 'Apply 2 Weak.',
            effect: function(combat) {
                combat.applyStatus('enemy', 'weak', 2);
            }
        },
        select_committee: {
            id: 'select_committee',
            name: 'Select Committee',
            type: TYPE.ATTACK,
            rarity: RARITY.UNCOMMON,
            cost: 1,
            description: 'Deal 5 damage. +5 if enemy is Vulnerable.',
            effect: function(combat) {
                var bonus = combat.enemyHasStatus('vulnerable') ? 5 : 0;
                combat.dealDamage(5 + bonus);
            }
        },
        focus_group: {
            id: 'focus_group',
            name: 'Focus Group',
            type: TYPE.SKILL,
            rarity: RARITY.UNCOMMON,
            cost: 1,
            description: 'Gain Block equal to hand size x2.',
            effect: function(combat) {
                var handSize = combat.getHandSize();
                combat.gainBlock(handSize * 2);
            }
        },
        pairing_arrangement: {
            id: 'pairing_arrangement',
            name: 'Pairing Arrangement',
            type: TYPE.SKILL,
            rarity: RARITY.UNCOMMON,
            cost: 1,
            description: 'Attacks give 3 Block this turn.',
            effect: function(combat) {
                combat.addTurnEffect('attacksGiveBlock', 3);
            }
        },
        u_turn: {
            id: 'u_turn',
            name: 'U-Turn',
            type: TYPE.SKILL,
            rarity: RARITY.UNCOMMON,
            cost: 1,
            exhaust: true,
            description: 'Return a random card from discard to hand. Exhaust.',
            effect: function(combat) {
                combat.returnFromDiscard();
            }
        },
        private_members_bill: {
            id: 'private_members_bill',
            name: "Private Members' Bill",
            type: TYPE.ATTACK,
            rarity: RARITY.UNCOMMON,
            cost: 2,
            description: 'Deal 8 damage. If this kills, gain 15 gold.',
            killBonus: 15,
            effect: function(combat) {
                combat.dealDamage(8, { killBonus: 15 });
            }
        },

        // === RARE CARDS ===
        vote_of_no_confidence: {
            id: 'vote_of_no_confidence',
            name: 'Vote of No Confidence',
            type: TYPE.ATTACK,
            rarity: RARITY.RARE,
            cost: 3,
            exhaust: true,
            description: 'Deal 25 damage. Exhaust.',
            effect: function(combat) {
                combat.dealDamage(25);
            }
        },
        nuclear_option: {
            id: 'nuclear_option',
            name: 'Nuclear Option',
            type: TYPE.ATTACK,
            rarity: RARITY.RARE,
            cost: 3,
            description: 'Deal damage equal to 3x your Block. Set Block to 0.',
            effect: function(combat) {
                var dmg = combat.getPlayerBlock() * 3;
                combat.setPlayerBlock(0);
                combat.dealDamage(dmg, { ignoreStrength: true });
            }
        },
        teflon_coating: {
            id: 'teflon_coating',
            name: 'Teflon Coating',
            type: TYPE.POWER,
            rarity: RARITY.RARE,
            cost: 2,
            description: 'At the start of each turn, heal 3 HP.',
            effect: function(combat) {
                combat.applyStatus('player', 'regeneration', 3);
            }
        },
        campaign_war_chest: {
            id: 'campaign_war_chest',
            name: 'Campaign War Chest',
            type: TYPE.POWER,
            rarity: RARITY.RARE,
            cost: 1,
            description: 'Gain 1 additional Energy each turn.',
            effect: function(combat) {
                combat.addPermanentEffect('bonusEnergy', 1);
            }
        },
        prickly_reputation: {
            id: 'prickly_reputation',
            name: 'Prickly Reputation',
            type: TYPE.POWER,
            rarity: RARITY.RARE,
            cost: 1,
            description: 'Gain 3 Thorns.',
            effect: function(combat) {
                combat.applyStatus('player', 'thorns', 3);
            }
        },
        media_empire: {
            id: 'media_empire',
            name: 'Media Empire',
            type: TYPE.POWER,
            rarity: RARITY.RARE,
            cost: 2,
            description: 'Draw 1 additional card each turn.',
            effect: function(combat) {
                combat.addPermanentEffect('bonusDraw', 1);
            }
        },
        landslide_victory: {
            id: 'landslide_victory',
            name: 'Landslide Victory',
            type: TYPE.ATTACK,
            rarity: RARITY.RARE,
            cost: 2,
            description: 'Deal 7 damage for each active Power.',
            effect: function(combat) {
                var powers = combat.getActivePowerCount();
                combat.dealDamage(7 * Math.max(1, powers));
            }
        },
        speakers_ruling: {
            id: 'speakers_ruling',
            name: "Speaker's Ruling",
            type: TYPE.SKILL,
            rarity: RARITY.RARE,
            cost: 0,
            exhaust: true,
            description: 'Remove all enemy Strength. Exhaust.',
            effect: function(combat) {
                combat.removeEnemyStatus('strength');
            }
        },
        snap_election: {
            id: 'snap_election',
            name: 'Snap Election',
            type: TYPE.SKILL,
            rarity: RARITY.RARE,
            cost: 0,
            exhaust: true,
            description: 'Discard your hand. Draw 5 cards. Exhaust.',
            effect: function(combat) {
                combat.discardHand();
                combat.drawCards(5);
            }
        },
        manifesto_pledge: {
            id: 'manifesto_pledge',
            name: 'Manifesto Pledge',
            type: TYPE.POWER,
            rarity: RARITY.RARE,
            cost: 3,
            description: 'Whenever you play a Skill, deal 4 damage.',
            effect: function(combat) {
                combat.addPermanentEffect('skillsDealDamage', 4);
            }
        },

        // === CURSES ===
        expenses_scandal: {
            id: 'expenses_scandal',
            name: 'Expenses Scandal',
            type: TYPE.CURSE,
            rarity: RARITY.CURSE,
            cost: -1,
            unplayable: true,
            description: 'Unplayable. Lose 2 HP if in hand at end of turn.',
            endOfTurnEffect: function(combat) {
                combat.damagePlayer(2);
            }
        },
        whip_withdrawn: {
            id: 'whip_withdrawn',
            name: 'Whip Withdrawn',
            type: TYPE.CURSE,
            rarity: RARITY.CURSE,
            cost: -1,
            unplayable: true,
            description: 'Unplayable. If in hand at end of turn, lose 1 energy next turn.',
            endOfTurnEffect: function(combat) {
                combat.addPermanentEffect('energyPenalty', 1);
            }
        },
        caught_on_camera: {
            id: 'caught_on_camera',
            name: 'Caught on Camera',
            type: TYPE.CURSE,
            rarity: RARITY.CURSE,
            cost: -1,
            unplayable: true,
            ethereal: true,
            description: 'Unplayable. Cannot be discarded. Ethereal.',
            effect: function() {}
        }
    };

    // Create a card instance from a definition
    function createCard(id) {
        var def = definitions[id];
        if (!def) return null;
        return {
            id: def.id,
            uid: id + '_' + Math.random().toString(36).substr(2, 9),
            name: def.name,
            type: def.type,
            rarity: def.rarity,
            cost: def.cost,
            description: def.description,
            exhaust: def.exhaust || false,
            unplayable: def.unplayable || false,
            ethereal: def.ethereal || false,
            needsDiscard: def.needsDiscard || 0,
            killBonus: def.killBonus || 0,
            effect: def.effect,
            endOfTurnEffect: def.endOfTurnEffect || null,
            startOfTurnEffect: def.startOfTurnEffect || null
        };
    }

    // Build the starter deck
    function getStarterDeck() {
        var deck = [];
        for (var i = 0; i < 4; i++) deck.push(createCard('pointed_question'));
        for (var j = 0; j < 4; j++) deck.push(createCard('party_line'));
        deck.push(createCard('sound_bite'));
        deck.push(createCard('talking_points'));
        return deck;
    }

    // Get cards by rarity
    function getCardsByRarity(rarity) {
        var result = [];
        for (var key in definitions) {
            if (definitions[key].rarity === rarity) {
                result.push(key);
            }
        }
        return result;
    }

    // Get random cards for rewards/shop
    function getRandomCards(rarity, count) {
        var pool = getCardsByRarity(rarity);
        var result = [];
        var used = {};
        while (result.length < count && result.length < pool.length) {
            var idx = Math.floor(Math.random() * pool.length);
            if (!used[pool[idx]]) {
                used[pool[idx]] = true;
                result.push(createCard(pool[idx]));
            }
        }
        return result;
    }

    return {
        TYPE: TYPE,
        RARITY: RARITY,
        definitions: definitions,
        createCard: createCard,
        getStarterDeck: getStarterDeck,
        getCardsByRarity: getCardsByRarity,
        getRandomCards: getRandomCards
    };
})();
