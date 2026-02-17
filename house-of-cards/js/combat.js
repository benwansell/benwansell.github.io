// combat.js - Turn engine, damage resolution, status effects
var Combat = (function() {
    'use strict';

    var state = null;

    function init(player, enemy) {
        state = {
            player: {
                hp: player.hp,
                maxHp: player.maxHp,
                block: 0,
                energy: 3,
                maxEnergy: 3,
                status: {},
                drawPile: [],
                hand: [],
                discardPile: [],
                exhaustPile: [],
                deck: player.deck,
                relics: player.relics || [],
                powers: [],
                turnEffects: {},
                permanentEffects: {
                    bonusEnergy: 0,
                    bonusDraw: 0,
                    skillsDealDamage: 0,
                    attacksGiveBlock: 0
                }
            },
            enemy: enemy,
            turnNum: 0,
            combatLog: [],
            pendingDiscard: 0,
            discardCallback: null,
            combatOver: false,
            goldEarned: 0
        };

        // Initialize draw pile with shuffled deck
        state.player.drawPile = shuffleArray(player.deck.map(function(c) {
            return Object.assign({}, c, {
                effect: Cards.definitions[c.id] ? Cards.definitions[c.id].effect : c.effect,
                endOfTurnEffect: Cards.definitions[c.id] ? Cards.definitions[c.id].endOfTurnEffect : null,
                startOfTurnEffect: Cards.definitions[c.id] ? Cards.definitions[c.id].startOfTurnEffect : null
            });
        }));

        // Apply relic start-of-combat effects
        applyRelicEffects('combatStart');

        return state;
    }

    function shuffleArray(arr) {
        var a = arr.slice();
        for (var i = a.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var temp = a[i];
            a[i] = a[j];
            a[j] = temp;
        }
        return a;
    }

    function applyRelicEffects(timing) {
        if (!state) return;
        var relics = state.player.relics;
        for (var i = 0; i < relics.length; i++) {
            var r = relics[i];
            if (timing === 'combatStart') {
                if (r.id === 'red_box') state.player.permanentEffects.bonusEnergy += 1;
                if (r.id === 'hansard') state.player.permanentEffects.bonusDraw += 1;
                if (r.id === 'despatch_box') state.player.status.strength = (state.player.status.strength || 0) + 2;
                if (r.id === 'speakers_mace') state.enemy.status.vulnerable = (state.enemy.status.vulnerable || 0) + 1;
                if (r.id === 'parliamentary_pass') state.player.block = 8;
                if (r.id === 'portcullis_badge') { /* handled in game.js maxHp */ }
                if (r.id === 'bottle_of_house_claret') healPlayer(5);
            }
            if (timing === 'turnEnd') {
                if (r.id === 'woolsack') gainBlock(3);
            }
        }
    }

    function startPlayerTurn() {
        if (state.combatOver) return;
        state.turnNum++;
        state.player.block = 0;
        var penalty = state.player.permanentEffects.energyPenalty || 0;
        state.player.energy = Math.max(0, state.player.maxEnergy + state.player.permanentEffects.bonusEnergy - penalty);
        state.player.permanentEffects.energyPenalty = 0;
        state.player.turnEffects = {};

        // Apply start-of-turn status effects
        if (state.player.status.regeneration && state.player.status.regeneration > 0) {
            healPlayer(state.player.status.regeneration);
            state.player.status.regeneration--;
            if (state.player.status.regeneration <= 0) delete state.player.status.regeneration;
        }

        // Poison damage to player
        if (state.player.status.poison && state.player.status.poison > 0) {
            damagePlayer(state.player.status.poison);
            state.player.status.poison--;
            if (state.player.status.poison <= 0) delete state.player.status.poison;
            if (state.player.hp <= 0) {
                state.combatOver = true;
                return;
            }
        }

        // Curse start-of-turn effects
        for (var i = 0; i < state.player.hand.length; i++) {
            if (state.player.hand[i].startOfTurnEffect) {
                state.player.hand[i].startOfTurnEffect(combatAPI);
            }
        }

        // Draw cards
        var drawCount = 5 + state.player.permanentEffects.bonusDraw;
        drawCards(drawCount);

        addCombatLog('--- Turn ' + state.turnNum + ' ---');
    }

    function drawCards(count) {
        for (var i = 0; i < count; i++) {
            if (state.player.drawPile.length === 0) {
                if (state.player.discardPile.length === 0) return;
                state.player.drawPile = shuffleArray(state.player.discardPile);
                state.player.discardPile = [];
                addCombatLog('Deck reshuffled.');
            }
            var card = state.player.drawPile.pop();
            state.player.hand.push(card);
        }
    }

    function canPlayCard(card) {
        if (state.combatOver) return false;
        if (card.unplayable) return false;
        if (state.pendingDiscard > 0) return false;
        if (card.cost > state.player.energy) return false;
        return true;
    }

    function playCard(cardIndex) {
        if (state.combatOver) return false;
        var card = state.player.hand[cardIndex];
        if (!card || !canPlayCard(card)) return false;

        state.player.energy -= card.cost;
        state.player.hand.splice(cardIndex, 1);

        addCombatLog('Played: ' + card.name);

        // Execute card effect
        if (card.effect) {
            card.effect(combatAPI);
        }

        // Manifesto Pledge: skills deal damage
        if (card.type === 'skill' && state.player.permanentEffects.skillsDealDamage > 0) {
            dealDamage(state.player.permanentEffects.skillsDealDamage);
        }

        // Pairing Arrangement: attacks give block
        if (card.type === 'attack' && state.player.turnEffects.attacksGiveBlock) {
            gainBlock(state.player.turnEffects.attacksGiveBlock);
        }

        // Whip's Little Black Book: debuffs also apply poison
        // (handled in applyStatus)

        if (card.exhaust) {
            state.player.exhaustPile.push(card);
        } else {
            state.player.discardPile.push(card);
        }

        // Check if enemy died
        if (state.enemy.hp <= 0) {
            state.enemy.hp = 0;
            state.combatOver = true;
        }

        // Check minion
        if (state.enemy.minion && state.enemy.minion.hp <= 0) {
            state.enemy.minion = null;
            addCombatLog('SpAd defeated!');
        }

        return true;
    }

    function endPlayerTurn() {
        if (state.combatOver) return;

        // Curse end-of-turn effects
        var handCopy = state.player.hand.slice();
        for (var i = 0; i < handCopy.length; i++) {
            if (handCopy[i].endOfTurnEffect) {
                handCopy[i].endOfTurnEffect(combatAPI);
            }
        }

        if (state.player.hp <= 0) {
            state.combatOver = true;
            return;
        }

        // Woolsack relic
        applyRelicEffects('turnEnd');

        // Discard hand (except ethereal curses)
        var remaining = [];
        for (var j = 0; j < state.player.hand.length; j++) {
            var c = state.player.hand[j];
            if (c.ethereal) {
                remaining.push(c);
            } else {
                state.player.discardPile.push(c);
            }
        }
        state.player.hand = remaining;

        // Tick down player debuffs
        tickStatus(state.player.status);

        // Enemy turn
        executeEnemyTurn();
    }

    function executeEnemyTurn() {
        if (state.combatOver) return;

        var enemy = state.enemy;

        // Enemy poison
        if (enemy.status.poison && enemy.status.poison > 0) {
            enemy.hp -= enemy.status.poison;
            addCombatLog(enemy.name + ' takes ' + enemy.status.poison + ' poison damage.');
            enemy.status.poison--;
            if (enemy.status.poison <= 0) delete enemy.status.poison;
            if (enemy.hp <= 0) {
                enemy.hp = 0;
                state.combatOver = true;
                return;
            }
        }

        // Reset enemy block
        enemy.block = 0;

        // Immune turns countdown
        if (enemy.immuneTurns > 0) {
            enemy.immuneTurns--;
        }

        // Choose and execute move
        var moveId = enemy.chooseMove(combatAPI, state.turnNum);
        var move = enemy.moveDefs[moveId];
        if (!move) {
            // Fallback to first available move
            for (var key in enemy.moveDefs) {
                move = enemy.moveDefs[key];
                moveId = key;
                break;
            }
        }

        addCombatLog(enemy.name + ' uses ' + move.name + '!');
        executeEnemyMove(move);

        // Minion attack
        if (enemy.minion && enemy.minion.hp > 0) {
            var minionDmg = enemy.minion.damage;
            damagePlayer(minionDmg);
            addCombatLog('SpAd attacks for ' + minionDmg + '!');
        }

        // Enemy onTurnEnd
        if (enemy.onTurnEnd) {
            enemy.onTurnEnd(combatAPI, state.turnNum);
        }

        // Tick down enemy debuffs
        tickStatus(enemy.status);

        // Declare next intent
        var nextMoveId = enemy.chooseMove(combatAPI, state.turnNum + 1);
        enemy.nextMove = enemy.moveDefs[nextMoveId] || null;

        if (state.player.hp <= 0) {
            state.combatOver = true;
        }
    }

    function executeEnemyMove(move) {
        if (!move) return;
        var enemy = state.enemy;
        var str = enemy.status.strength || 0;
        var isWeak = enemy.status.weak && enemy.status.weak > 0;

        switch (move.type) {
            case 'attack':
                var dmg = (move.damage || 0) + str;
                if (isWeak) dmg = Math.floor(dmg * 0.75);
                damagePlayer(dmg);
                break;
            case 'multi_attack':
                for (var i = 0; i < (move.hits || 1); i++) {
                    var md = (move.damage || 0) + str;
                    if (isWeak) md = Math.floor(md * 0.75);
                    damagePlayer(md);
                    if (state.player.hp <= 0) break;
                }
                break;
            case 'block':
                var dex = enemy.status.dexterity || 0;
                enemy.block += (move.block || 0) + dex;
                break;
            case 'mixed':
                var mixDmg = (move.damage || 0) + str;
                if (isWeak) mixDmg = Math.floor(mixDmg * 0.75);
                damagePlayer(mixDmg);
                var mixDex = enemy.status.dexterity || 0;
                enemy.block += (move.block || 0) + mixDex;
                break;
            case 'buff':
                var buffs = Array.isArray(move.buff) ? move.buff : [move.buff];
                for (var bi = 0; bi < buffs.length; bi++) {
                    var b = buffs[bi];
                    if (b.target === 'self') {
                        enemy.status[b.status] = (enemy.status[b.status] || 0) + b.amount;
                        addCombatLog(enemy.name + ' gains ' + b.amount + ' ' + b.status + '.');
                    }
                }
                break;
            case 'debuff':
                var debuffs = Array.isArray(move.debuff) ? move.debuff : [move.debuff];
                for (var di = 0; di < debuffs.length; di++) {
                    var d = debuffs[di];
                    if (d.target === 'player') {
                        state.player.status[d.status] = (state.player.status[d.status] || 0) + d.amount;
                        addCombatLog('You gain ' + d.amount + ' ' + d.status + '.');
                    }
                }
                break;
            case 'attack_debuff':
                var adDmg = (move.damage || 0) + str;
                if (isWeak) adDmg = Math.floor(adDmg * 0.75);
                damagePlayer(adDmg);
                var ad = Array.isArray(move.debuff) ? move.debuff : [move.debuff];
                for (var adi = 0; adi < ad.length; adi++) {
                    if (ad[adi].target === 'player') {
                        state.player.status[ad[adi].status] = (state.player.status[ad[adi].status] || 0) + ad[adi].amount;
                    }
                }
                break;
            case 'block_debuff':
                var bdDex = enemy.status.dexterity || 0;
                enemy.block += (move.block || 0) + bdDex;
                var bd = Array.isArray(move.debuff) ? move.debuff : [move.debuff];
                for (var bdi = 0; bdi < bd.length; bdi++) {
                    if (bd[bdi].target === 'player') {
                        state.player.status[bd[bdi].status] = (state.player.status[bd[bdi].status] || 0) + bd[bdi].amount;
                    }
                }
                break;
            case 'block_buff':
                var bbDex = enemy.status.dexterity || 0;
                enemy.block += (move.block || 0) + bbDex;
                var bb = Array.isArray(move.buff) ? move.buff : [move.buff];
                for (var bbi = 0; bbi < bb.length; bbi++) {
                    if (bb[bbi].target === 'self') {
                        enemy.status[bb[bbi].status] = (enemy.status[bb[bbi].status] || 0) + bb[bbi].amount;
                    }
                }
                break;
            case 'heal':
                enemy.hp = Math.min(enemy.maxHp, enemy.hp + (move.heal || 0));
                addCombatLog(enemy.name + ' heals for ' + move.heal + '.');
                break;
            case 'block_heal':
                var bhDex = enemy.status.dexterity || 0;
                enemy.block += (move.block || 0) + bhDex;
                enemy.hp = Math.min(enemy.maxHp, enemy.hp + (move.heal || 0));
                break;
            case 'heal_cleanse':
                enemy.hp = Math.min(enemy.maxHp, enemy.hp + (move.heal || 0));
                // Remove debuffs
                delete enemy.status.weak;
                delete enemy.status.vulnerable;
                delete enemy.status.frail;
                delete enemy.status.poison;
                addCombatLog(enemy.name + ' cleanses all debuffs!');
                break;
            case 'curse':
                var curseCard = Cards.createCard(move.curse);
                if (curseCard) {
                    state.player.discardPile.push(curseCard);
                    addCombatLog('A ' + curseCard.name + ' was added to your deck!');
                }
                break;
            case 'attack_curse':
                var acDmg = (move.damage || 0) + str;
                if (isWeak) acDmg = Math.floor(acDmg * 0.75);
                damagePlayer(acDmg);
                var acCurse = Cards.createCard(move.curse);
                if (acCurse) {
                    state.player.discardPile.push(acCurse);
                    addCombatLog('A ' + acCurse.name + ' was added to your deck!');
                }
                break;
            case 'summon':
                enemy.minion = { name: move.minion.name, hp: move.minion.hp, maxHp: move.minion.hp, damage: move.minion.damage };
                addCombatLog(enemy.name + ' summons a ' + move.minion.name + '!');
                break;
            case 'attack_special':
                // Desperate Gambit: damage = missing HP / 3
                var missing = enemy.maxHp - enemy.hp;
                var spDmg = Math.floor(missing / 3) + str;
                if (isWeak) spDmg = Math.floor(spDmg * 0.75);
                damagePlayer(spDmg);
                addCombatLog('Desperate Gambit deals ' + spDmg + ' damage!');
                break;
        }
    }

    function tickStatus(statusObj) {
        var ticking = ['weak', 'vulnerable', 'frail'];
        for (var i = 0; i < ticking.length; i++) {
            var s = ticking[i];
            if (statusObj[s] && statusObj[s] > 0) {
                statusObj[s]--;
                if (statusObj[s] <= 0) delete statusObj[s];
            }
        }
    }

    // === Combat API (passed to card effects) ===
    function dealDamage(amount, options) {
        options = options || {};
        var str = state.player.status.strength || 0;
        if (!options.ignoreStrength) amount += str;
        var isWeak = state.player.status.weak && state.player.status.weak > 0;
        if (isWeak) amount = Math.floor(amount * 0.75);

        var isVuln = state.enemy.status.vulnerable && state.enemy.status.vulnerable > 0;
        if (isVuln) amount = Math.floor(amount * 1.5);

        // Damage reduction
        amount = Math.max(0, amount - (state.enemy.damageReduction || 0));

        // Block absorbs
        if (state.enemy.block > 0) {
            if (state.enemy.block >= amount) {
                state.enemy.block -= amount;
                amount = 0;
            } else {
                amount -= state.enemy.block;
                state.enemy.block = 0;
            }
        }

        state.enemy.hp -= amount;
        if (amount > 0) {
            addCombatLog('Dealt ' + amount + ' damage.');

            // Thorns check (enemy thorns)
            // (player thorns handled elsewhere)

            // Kill bonus
            if (options.killBonus && state.enemy.hp <= 0) {
                state.goldEarned += options.killBonus;
                addCombatLog('Kill bonus: +' + options.killBonus + ' gold!');
            }

            // onDamaged callback
            if (state.enemy.onDamaged) {
                state.enemy.onDamaged(combatAPI);
            }
        }

        // Trigger animations via callback
        if (state.onDamageDealt) state.onDamageDealt(amount, 'enemy');
    }

    function damagePlayer(amount) {
        // Check vulnerable
        var isVuln = state.player.status.vulnerable && state.player.status.vulnerable > 0;
        if (isVuln) amount = Math.floor(amount * 1.5);

        // Block absorbs
        if (state.player.block > 0) {
            if (state.player.block >= amount) {
                state.player.block -= amount;
                amount = 0;
            } else {
                amount -= state.player.block;
                state.player.block = 0;
            }
        }

        state.player.hp -= amount;
        if (state.player.hp < 0) state.player.hp = 0;

        if (amount > 0) {
            addCombatLog('Took ' + amount + ' damage.');

            // Division Bell relic
            if (state.player.hp > 0) {
                for (var i = 0; i < state.player.relics.length; i++) {
                    if (state.player.relics[i].id === 'division_bell' && !state.player.relics[i].used) {
                        var threshold = state.player.maxHp * 0.25;
                        if (state.player.hp <= threshold) {
                            state.player.block += 15;
                            state.player.relics[i].used = true;
                            addCombatLog('Division Bell activates! +15 Block!');
                        }
                    }
                }
            }

            // Thorns
            if (state.player.status.thorns && state.player.status.thorns > 0) {
                state.enemy.hp -= state.player.status.thorns;
                addCombatLog('Thorns deals ' + state.player.status.thorns + ' damage back!');
            }
        }

        if (state.onDamageDealt) state.onDamageDealt(amount, 'player');
    }

    function gainBlock(amount) {
        var dex = state.player.status.dexterity || 0;
        amount += dex;
        var isFrail = state.player.status.frail && state.player.status.frail > 0;
        if (isFrail) amount = Math.floor(amount * 0.75);
        state.player.block += Math.max(0, amount);
    }

    function gainEnemyBlock(amount) {
        state.enemy.block += amount;
    }

    function healPlayer(amount) {
        state.player.hp = Math.min(state.player.maxHp, state.player.hp + amount);
        addCombatLog('Healed ' + amount + ' HP.');
    }

    function applyStatus(target, status, amount) {
        if (target === 'enemy') {
            // Check vulnerable immunity
            if (status === 'vulnerable' && state.enemy.immuneTurns > 0) {
                addCombatLog(state.enemy.name + ' is immune to Vulnerable!');
                return;
            }
            state.enemy.status[status] = (state.enemy.status[status] || 0) + amount;

            // Whip's Little Black Book: debuffs also apply poison
            var debuffs = ['weak', 'vulnerable', 'frail'];
            if (debuffs.indexOf(status) !== -1) {
                for (var i = 0; i < state.player.relics.length; i++) {
                    if (state.player.relics[i].id === 'whips_little_black_book') {
                        state.enemy.status.poison = (state.enemy.status.poison || 0) + 1;
                        addCombatLog("Whip's Little Black Book applies 1 Poison!");
                        break;
                    }
                }
            }
        } else if (target === 'player') {
            state.player.status[status] = (state.player.status[status] || 0) + amount;
        } else if (target === 'enemy_self') {
            state.enemy.status[status] = (state.enemy.status[status] || 0) + amount;
        }
    }

    function removeEnemyStatus(status) {
        delete state.enemy.status[status];
        addCombatLog('Removed all enemy ' + status + '!');
    }

    function enemyHasStatus(status) {
        return state.enemy.status[status] && state.enemy.status[status] > 0;
    }

    function getHandSize() {
        return state.player.hand.length;
    }

    function getPlayerBlock() {
        return state.player.block;
    }

    function setPlayerBlock(val) {
        state.player.block = val;
    }

    function gainEnergy(amount) {
        state.player.energy += amount;
    }

    function loseEnergy(amount) {
        state.player.energy = Math.max(0, state.player.energy - amount);
    }

    function gainGold(amount) {
        state.goldEarned += amount;
    }

    function addTurnEffect(key, value) {
        state.player.turnEffects[key] = value;
    }

    function addPermanentEffect(key, value) {
        state.player.permanentEffects[key] = (state.player.permanentEffects[key] || 0) + value;
    }

    function getActivePowerCount() {
        return state.player.powers.length;
    }

    function discardHand() {
        while (state.player.hand.length > 0) {
            var c = state.player.hand.pop();
            if (!c.ethereal) {
                state.player.discardPile.push(c);
            }
        }
    }

    function returnFromDiscard() {
        if (state.player.discardPile.length === 0) return;
        var idx = Math.floor(Math.random() * state.player.discardPile.length);
        var card = state.player.discardPile.splice(idx, 1)[0];
        state.player.hand.push(card);
        addCombatLog('Returned ' + card.name + ' from discard to hand.');
    }

    function requireDiscard(count) {
        state.pendingDiscard = count;
    }

    function discardCard(cardIndex) {
        if (state.pendingDiscard <= 0) return false;
        var card = state.player.hand[cardIndex];
        if (!card) return false;
        state.player.hand.splice(cardIndex, 1);
        state.player.discardPile.push(card);
        state.pendingDiscard--;
        return true;
    }

    function getPlayerHpPercent() {
        return (state.player.hp / state.player.maxHp) * 100;
    }

    function getEnemyHpPercent() {
        return (state.enemy.hp / state.enemy.maxHp) * 100;
    }

    function getPlayerHp() {
        return state.player.hp;
    }

    function getEnemyHp() {
        return state.enemy.hp;
    }

    function addCombatLog(msg) {
        state.combatLog.push(msg);
    }

    function getState() {
        return state;
    }

    function isPlayerTurn() {
        return state && !state.combatOver && state.pendingDiscard === 0;
    }

    function isCombatOver() {
        return state ? state.combatOver : true;
    }

    function playerWon() {
        return state && state.combatOver && state.enemy.hp <= 0;
    }

    function playerLost() {
        return state && state.combatOver && state.player.hp <= 0;
    }

    // Public combat API passed to card effects and enemy AI
    var combatAPI = {
        dealDamage: dealDamage,
        damagePlayer: damagePlayer,
        gainBlock: gainBlock,
        gainEnemyBlock: gainEnemyBlock,
        healPlayer: healPlayer,
        applyStatus: applyStatus,
        removeEnemyStatus: removeEnemyStatus,
        enemyHasStatus: enemyHasStatus,
        getHandSize: getHandSize,
        getPlayerBlock: getPlayerBlock,
        setPlayerBlock: setPlayerBlock,
        gainEnergy: gainEnergy,
        loseEnergy: loseEnergy,
        gainGold: gainGold,
        addTurnEffect: addTurnEffect,
        addPermanentEffect: addPermanentEffect,
        getActivePowerCount: getActivePowerCount,
        discardHand: discardHand,
        returnFromDiscard: returnFromDiscard,
        drawCards: drawCards,
        requireDiscard: requireDiscard,
        addCombatLog: addCombatLog,
        getPlayerHpPercent: getPlayerHpPercent,
        getEnemyHpPercent: getEnemyHpPercent,
        getPlayerHp: getPlayerHp,
        getEnemyHp: getEnemyHp
    };

    return {
        init: init,
        startPlayerTurn: startPlayerTurn,
        canPlayCard: canPlayCard,
        playCard: playCard,
        endPlayerTurn: endPlayerTurn,
        discardCard: discardCard,
        drawCards: drawCards,
        getState: getState,
        isPlayerTurn: isPlayerTurn,
        isCombatOver: isCombatOver,
        playerWon: playerWon,
        playerLost: playerLost,
        shuffleArray: shuffleArray
    };
})();
