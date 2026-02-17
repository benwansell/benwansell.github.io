// enemies.js - All 7 level opponents + AI behavior
var Enemies = (function() {
    'use strict';

    var enemies = [
        // Level 1: Candidate Selection
        {
            id: 'brenda_cartwright',
            name: 'Cllr. Brenda Cartwright',
            title: 'Seasoned Local Councillor',
            initials: 'BC',
            level: 1,
            maxHp: 45,
            startBlock: 8,
            special: null,
            specialUsed: {},
            damageReduction: 0,
            moves: {
                leaflet_drop: { name: 'Leaflet Drop', type: 'attack', damage: 5 },
                local_knowledge: { name: 'Local Knowledge', type: 'block', block: 6 },
                ward_walkabout: { name: 'Ward Walkabout', type: 'mixed', damage: 3, block: 4 },
                old_guard_rally: { name: 'Old Guard Rally', type: 'buff', buff: { target: 'self', status: 'strength', amount: 2 }, maxUses: 1 }
            },
            chooseMove: function(combat, turnNum) {
                if (turnNum === 1 && !this.specialUsed.old_guard_rally) {
                    this.specialUsed.old_guard_rally = true;
                    return 'old_guard_rally';
                }
                var moves = ['leaflet_drop', 'local_knowledge', 'ward_walkabout'];
                return moves[turnNum % moves.length];
            },
            reward: { gold: 30, cardChoices: 3, cardRarity: 'common' }
        },
        // Level 2: By-Election
        {
            id: 'nigel_thornberry',
            name: 'Sir Nigel Thornberry',
            title: 'Pompous Ex-Barrister',
            initials: 'NT',
            level: 2,
            maxHp: 60,
            startBlock: 0,
            special: 'vulnerableImmune3',
            specialUsed: {},
            damageReduction: 0,
            immuneTurns: 3,
            moves: {
                cross_examination: { name: 'Cross-Examination', type: 'attack', damage: 8 },
                legal_brief: { name: 'Legal Brief', type: 'block', block: 8 },
                hostile_witness: { name: 'Hostile Witness', type: 'attack_debuff', damage: 6, debuff: { target: 'player', status: 'vulnerable', amount: 1 } },
                objection: { name: 'Objection!', type: 'debuff', debuff: { target: 'player', status: 'weak', amount: 1 } },
                closing_argument: { name: 'Closing Argument', type: 'attack', damage: 14, condition: 'playerBelow50' }
            },
            chooseMove: function(combat, turnNum) {
                if (combat.getPlayerHpPercent() < 50) {
                    return 'closing_argument';
                }
                var cycle = ['cross_examination', 'legal_brief', 'hostile_witness', 'objection'];
                return cycle[turnNum % cycle.length];
            },
            reward: { gold: 40, cardChoices: 3, cardRarity: 'common_uncommon', allowRemove: true }
        },
        // Level 3: General Election
        {
            id: 'maggie_wu',
            name: 'Margaret "Maggie" Wu',
            title: 'Slick Ex-Consultant',
            initials: 'MW',
            level: 3,
            maxHp: 75,
            startBlock: 0,
            special: 'autoBlock3',
            specialUsed: {},
            damageReduction: 0,
            donorDinnerCount: 0,
            moves: {
                targeted_ad: { name: 'Targeted Ad Campaign', type: 'attack', damage: 10 },
                pr_firewall: { name: 'PR Firewall', type: 'block', block: 10 },
                negative_campaigning: { name: 'Negative Campaigning', type: 'attack_debuff', damage: 7, debuff: { target: 'player', status: 'poison', amount: 1 } },
                donor_dinner: { name: 'Donor Dinner', type: 'buff', buff: { target: 'self', status: 'strength', amount: 3 }, maxUses: 2 },
                ground_war: { name: 'Ground War', type: 'multi_attack', damage: 5, hits: 2 },
                october_surprise: { name: 'October Surprise', type: 'curse', curse: 'expenses_scandal', maxUses: 1 }
            },
            chooseMove: function(combat, turnNum) {
                if (turnNum === 2 && !this.specialUsed.october_surprise) {
                    this.specialUsed.october_surprise = true;
                    return 'october_surprise';
                }
                if (turnNum === 4 && this.donorDinnerCount < 2) {
                    this.donorDinnerCount++;
                    return 'donor_dinner';
                }
                var cycle = ['targeted_ad', 'pr_firewall', 'negative_campaigning', 'ground_war'];
                return cycle[turnNum % cycle.length];
            },
            onTurnEnd: function(combat, turnNum) {
                if (turnNum % 3 === 0) {
                    combat.gainEnemyBlock(3);
                }
            },
            reward: { gold: 50, cardChoices: 3, cardRarity: 'uncommon', healAmount: 15 }
        },
        // Level 4: Ministerial Selection
        {
            id: 'charles_pemberton',
            name: 'Rt. Hon. Charles Pemberton-Smythe',
            title: '12-Year Veteran Minister',
            initials: 'CP',
            level: 4,
            maxHp: 90,
            startBlock: 0,
            special: 'damageReduction1',
            specialUsed: {},
            damageReduction: 1,
            moves: {
                withering_putdown: { name: 'Withering Put-Down', type: 'attack_debuff', damage: 9, debuff: { target: 'player', status: 'weak', amount: 1 } },
                old_boy_network: { name: 'Old Boy Network', type: 'block', block: 12 },
                departmental_block: { name: 'Departmental Block', type: 'block_debuff', block: 8, debuff: { target: 'player', status: 'frail', amount: 1 } },
                whisky_and_whispers: { name: 'Whisky & Whispers', type: 'debuff', debuff: { target: 'player', status: 'poison', amount: 2 } },
                call_in_favour: { name: 'Call in a Favour', type: 'buff', buff: { target: 'self', status: 'strength', amount: 4 }, maxUses: 1 },
                establishment_stitch_up: { name: 'Establishment Stitch-Up', type: 'curse', curse: 'whip_withdrawn', maxUses: 1 },
                backroom_deal: { name: 'Backroom Deal', type: 'heal', heal: 8 }
            },
            chooseMove: function(combat, turnNum) {
                if (turnNum === 1 && !this.specialUsed.call_in_favour) {
                    this.specialUsed.call_in_favour = true;
                    return 'call_in_favour';
                }
                if (turnNum === 3 && !this.specialUsed.establishment_stitch_up) {
                    this.specialUsed.establishment_stitch_up = true;
                    return 'establishment_stitch_up';
                }
                if (combat.getEnemyHpPercent() < 40) {
                    return 'backroom_deal';
                }
                var cycle = ['withering_putdown', 'old_boy_network', 'departmental_block', 'whisky_and_whispers'];
                return cycle[turnNum % cycle.length];
            },
            reward: { gold: 60, cardChoices: 3, cardRarity: 'uncommon_rare', maxHpBonus: 5 }
        },
        // Level 5: Cabinet Selection
        {
            id: 'harriet_ashworth',
            name: 'Dame Harriet Ashworth',
            title: 'Survived Three Leadership Changes',
            initials: 'HA',
            level: 5,
            maxHp: 105,
            startBlock: 0,
            special: 'desperationBuff',
            specialUsed: {},
            damageReduction: 0,
            curseCount: 0,
            minionSummoned: false,
            moves: {
                leaked_email: { name: 'Leaked Private Email', type: 'attack', damage: 12 },
                cabinet_solidarity: { name: 'Cabinet Solidarity', type: 'block', block: 14 },
                kompromat: { name: 'Kompromat', type: 'debuff', debuff: [{ target: 'player', status: 'poison', amount: 3 }, { target: 'player', status: 'vulnerable', amount: 1 }] },
                whitehall_machine: { name: 'Whitehall Machine', type: 'block_buff', block: 10, buff: { target: 'self', status: 'strength', amount: 2 } },
                media_blitz: { name: 'Media Blitz', type: 'multi_attack', damage: 7, hits: 3 },
                civil_service_brief: { name: 'Civil Service Brief', type: 'block_heal', block: 6, heal: 5 },
                skeletons_in_closet: { name: 'Skeletons in Closet', type: 'curse', curse: 'expenses_scandal', maxUses: 2 },
                patronage_network: { name: 'Patronage Network', type: 'summon', minion: { name: 'SpAd', hp: 15, damage: 4 }, maxUses: 1 }
            },
            chooseMove: function(combat, turnNum) {
                if (turnNum === 2 && !this.minionSummoned) {
                    this.minionSummoned = true;
                    return 'patronage_network';
                }
                if (this.curseCount < 2 && turnNum === 5) {
                    this.curseCount++;
                    return 'skeletons_in_closet';
                }
                var cycle = ['leaked_email', 'cabinet_solidarity', 'kompromat', 'whitehall_machine', 'media_blitz', 'civil_service_brief'];
                return cycle[turnNum % cycle.length];
            },
            onDamaged: function(combat) {
                if (!this.specialUsed.desperation && combat.getEnemyHpPercent() < 30) {
                    this.specialUsed.desperation = true;
                    combat.applyStatus('enemy_self', 'strength', 3);
                    combat.gainEnemyBlock(10);
                    combat.addCombatLog('Dame Harriet enters desperation mode!');
                }
            },
            reward: { gold: 75, cardChoices: 3, cardRarity: 'rare', grantRelic: true }
        },
        // Level 6: Leadership Election
        {
            id: 'sebastian_fox',
            name: 'Sebastian Fox',
            title: 'Media Darling Rival',
            initials: 'SF',
            level: 6,
            maxHp: 120,
            startBlock: 0,
            special: 'strengthGain4',
            specialUsed: {},
            damageReduction: 0,
            moves: {
                viral_moment: { name: 'Viral Moment', type: 'attack_debuff', damage: 14, debuff: { target: 'player', status: 'vulnerable', amount: 1 } },
                party_machine: { name: 'Party Machine', type: 'block', block: 15 },
                grassroots_rally: { name: 'Grassroots Rally', type: 'block_buff', block: 8, buff: { target: 'self', status: 'strength', amount: 3 } },
                poison_pen: { name: 'Poison Pen Column', type: 'debuff', debuff: { target: 'player', status: 'poison', amount: 4 } },
                debate_haymaker: { name: 'Debate Haymaker', type: 'attack', damage: 20, condition: 'afterTurn5' },
                charm_offensive: { name: 'Charm Offensive', type: 'heal_cleanse', heal: 10 },
                dirty_tricks: { name: 'Dirty Tricks', type: 'attack_curse', damage: 8, curse: 'expenses_scandal' },
                endorsement_cascade: { name: 'Endorsement Cascade', type: 'buff', buff: [{ target: 'self', status: 'strength', amount: 2 }, { target: 'self', status: 'dexterity', amount: 2 }] },
                media_saturation: { name: 'Media Saturation', type: 'debuff', debuff: [{ target: 'player', status: 'weak', amount: 2 }, { target: 'player', status: 'frail', amount: 2 }] }
            },
            chooseMove: function(combat, turnNum) {
                if (turnNum > 5 && combat.getPlayerHpPercent() < 60) {
                    return 'debate_haymaker';
                }
                if (turnNum === 3) return 'endorsement_cascade';
                if (combat.getEnemyHpPercent() < 40) return 'charm_offensive';
                var cycle = ['viral_moment', 'party_machine', 'grassroots_rally', 'poison_pen', 'dirty_tricks', 'media_saturation'];
                return cycle[turnNum % cycle.length];
            },
            onTurnEnd: function(combat, turnNum) {
                if (turnNum > 0 && turnNum % 4 === 0) {
                    combat.applyStatus('enemy_self', 'strength', 1);
                    combat.addCombatLog('Sebastian gains strength from media momentum!');
                }
            },
            reward: { gold: 100, cardChoices: 2, cardRarity: 'rare', grantRelic: true, fullHeal: true }
        },
        // Level 7: General Election as PM (Final Boss)
        {
            id: 'alexandra_steel',
            name: 'Rt. Hon. Alexandra Steel',
            title: 'Opposition Leader',
            initials: 'AS',
            level: 7,
            maxHp: 150,
            startBlock: 0,
            special: 'phased',
            specialUsed: {},
            damageReduction: 0,
            startStrength: 2,
            startDexterity: 2,
            phase: 1,
            phaseTriggers: { 2: false, 3: false },
            moves: {
                // Phase 1
                policy_announcement: { name: 'Policy Announcement', type: 'attack', damage: 10, phase: 1 },
                bus_tour: { name: 'Bus Tour', type: 'block', block: 12, phase: 1 },
                manifesto_launch: { name: 'Manifesto Launch', type: 'buff', buff: { target: 'self', status: 'strength', amount: 3 }, phase: 1 },
                canvass_blitz: { name: 'Canvass Blitz', type: 'multi_attack', damage: 6, hits: 2, phase: 1 },
                opposition_day: { name: 'Opposition Day Motion', type: 'debuff', debuff: [{ target: 'player', status: 'poison', amount: 2 }, { target: 'player', status: 'vulnerable', amount: 1 }], phase: 1 },
                // Phase 2
                debate_knockout: { name: 'Debate Knockout', type: 'attack', damage: 18, phase: 2 },
                fact_check: { name: 'Fact Check', type: 'attack_debuff', damage: 10, debuff: { target: 'player', status: 'weak', amount: 2 }, phase: 2 },
                crowd_pleaser: { name: 'Crowd Pleaser', type: 'block_heal', block: 10, heal: 8, phase: 2 },
                tax_bombshell: { name: 'Tax Bombshell', type: 'debuff', debuff: { target: 'player', status: 'poison', amount: 4 }, phase: 2 },
                gotcha_question: { name: 'Gotcha Question', type: 'curse', curse: 'expenses_scandal', phase: 2 },
                rally_the_base: { name: 'Rally the Base', type: 'buff', buff: { target: 'self', status: 'strength', amount: 4 }, phase: 2 },
                presidential_broadcast: { name: 'Presidential Broadcast', type: 'block', block: 20, phase: 2 },
                // Phase 3
                exit_poll_shock: { name: 'Exit Poll Shock', type: 'attack', damage: 22, phase: 3 },
                swing_seat_surge: { name: 'Swing Seat Surge', type: 'multi_attack', damage: 8, hits: 3, phase: 3 },
                concession_denied: { name: 'Concession Denied', type: 'heal', heal: 12, phase: 3 },
                count_and_recount: { name: 'Count and Recount', type: 'block_debuff', block: 15, debuff: { target: 'player', status: 'frail', amount: 2 }, phase: 3 },
                landslide_bid: { name: 'Landslide Bid', type: 'attack', damage: 30, condition: 'playerBelow40HP', phase: 3 },
                last_minute_smear: { name: 'Last Minute Smear', type: 'debuff', debuff: [{ target: 'player', status: 'poison', amount: 3 }, { target: 'player', status: 'vulnerable', amount: 2 }, { target: 'player', status: 'weak', amount: 1 }], phase: 3 },
                desperate_gambit: { name: 'Desperate Gambit', type: 'attack_special', phase: 3 }
            },
            chooseMove: function(combat, turnNum) {
                var hp = combat.getEnemyHp();
                // Check phase transitions
                if (hp <= 99 && !this.phaseTriggers[2]) {
                    this.phaseTriggers[2] = true;
                    this.phase = 2;
                    combat.applyStatus('enemy_self', 'strength', 2);
                    combat.addCombatLog('Alexandra enters Phase 2! She gains 2 Strength!');
                }
                if (hp <= 49 && !this.phaseTriggers[3]) {
                    this.phaseTriggers[3] = true;
                    this.phase = 3;
                    combat.applyStatus('enemy_self', 'strength', 3);
                    combat.gainEnemyBlock(15);
                    combat.addCombatLog('Alexandra enters Phase 3! She gains 3 Strength and 15 Block!');
                }

                if (this.phase === 1) {
                    var p1 = ['policy_announcement', 'bus_tour', 'manifesto_launch', 'canvass_blitz', 'opposition_day'];
                    return p1[turnNum % p1.length];
                } else if (this.phase === 2) {
                    if (combat.getPlayerHp() < 40) return 'debate_knockout';
                    if (turnNum === 6) return 'gotcha_question';
                    var p2 = ['debate_knockout', 'fact_check', 'crowd_pleaser', 'tax_bombshell', 'rally_the_base', 'presidential_broadcast'];
                    return p2[turnNum % p2.length];
                } else {
                    if (combat.getPlayerHp() < 40) return 'landslide_bid';
                    if (combat.getEnemyHpPercent() < 15) return 'desperate_gambit';
                    var p3 = ['exit_poll_shock', 'swing_seat_surge', 'concession_denied', 'count_and_recount', 'last_minute_smear'];
                    return p3[turnNum % p3.length];
                }
            },
            reward: { gold: 0, victory: true }
        }
    ];

    function getEnemy(level) {
        return JSON.parse(JSON.stringify(enemies[level - 1]));
    }

    function createEnemyInstance(level) {
        var template = enemies[level - 1];
        var enemy = {
            id: template.id,
            name: template.name,
            title: template.title,
            initials: template.initials,
            level: template.level,
            hp: template.maxHp,
            maxHp: template.maxHp,
            block: template.startBlock,
            damageReduction: template.damageReduction || 0,
            status: {},
            specialUsed: {},
            phase: template.phase || 1,
            phaseTriggers: template.phaseTriggers ? JSON.parse(JSON.stringify(template.phaseTriggers)) : {},
            donorDinnerCount: 0,
            curseCount: 0,
            minionSummoned: false,
            immuneTurns: template.immuneTurns || 0,
            nextMove: null,
            minion: null,
            startStrength: template.startStrength || 0,
            startDexterity: template.startDexterity || 0
        };

        // Bind chooseMove to the instance
        enemy.chooseMove = template.chooseMove.bind(enemy);
        if (template.onTurnEnd) enemy.onTurnEnd = template.onTurnEnd.bind(enemy);
        if (template.onDamaged) enemy.onDamaged = template.onDamaged.bind(enemy);

        // Start statuses
        if (template.startStrength) {
            enemy.status.strength = template.startStrength;
        }
        if (template.startDexterity) {
            enemy.status.dexterity = template.startDexterity;
        }

        // Move definitions
        enemy.moveDefs = template.moves;
        enemy.reward = template.reward;
        enemy.special = template.special;

        return enemy;
    }

    return {
        getEnemy: getEnemy,
        createEnemyInstance: createEnemyInstance
    };
})();
