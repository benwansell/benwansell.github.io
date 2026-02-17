// game.js - Game state, save/load, orchestration
var Game = (function() {
    'use strict';

    var SAVE_KEY = 'houseOfCards_save';

    var state = {
        hp: 60,
        maxHp: 60,
        gold: 0,
        level: 1,
        deck: [],
        relics: [],
        totalTurns: 0,
        totalGold: 0,
        inCombat: false,
        phase: 'title' // title, briefing, combat, reward, shop, victory, gameover
    };

    // === INITIALIZATION ===
    function init() {
        setupEventListeners();
        var hasSave = !!localStorage.getItem(SAVE_KEY);
        UI.renderTitle(hasSave);
    }

    function setupEventListeners() {
        document.getElementById('new-game-btn').addEventListener('click', newGame);
        document.getElementById('continue-btn').addEventListener('click', loadGame);
        document.getElementById('start-combat-btn').addEventListener('click', startCombat);
        document.getElementById('end-turn-btn').addEventListener('click', endTurn);
        document.getElementById('view-deck-btn').addEventListener('click', viewDeck);
        document.getElementById('deck-modal-close').addEventListener('click', function() {
            UI.closeDeckModal();
        });
        document.getElementById('shop-continue-btn').addEventListener('click', shopContinue);
        document.getElementById('gameover-restart-btn').addEventListener('click', newGame);
        document.getElementById('victory-restart-btn').addEventListener('click', newGame);
    }

    function newGame() {
        state = {
            hp: 60,
            maxHp: 60,
            gold: 0,
            level: 1,
            deck: Cards.getStarterDeck(),
            relics: [],
            totalTurns: 0,
            totalGold: 0,
            inCombat: false,
            phase: 'briefing'
        };
        Shop.resetRemovalCount();
        showLevelBriefing();
    }

    // === LEVEL FLOW ===
    function showLevelBriefing() {
        state.phase = 'briefing';
        var enemy = Enemies.createEnemyInstance(state.level);
        UI.renderBriefing(state.level, enemy);
    }

    function startCombat() {
        state.phase = 'combat';
        state.inCombat = true;

        var enemy = Enemies.createEnemyInstance(state.level);
        var playerData = {
            hp: state.hp,
            maxHp: state.maxHp,
            deck: state.deck,
            relics: state.relics
        };

        Combat.init(playerData, enemy);

        // Determine first enemy intent
        var combatState = Combat.getState();
        var firstMoveId = enemy.chooseMove({
            getPlayerHpPercent: function() { return (combatState.player.hp / combatState.player.maxHp) * 100; },
            getEnemyHpPercent: function() { return (enemy.hp / enemy.maxHp) * 100; },
            getPlayerHp: function() { return combatState.player.hp; },
            getEnemyHp: function() { return enemy.hp; }
        }, 1);
        enemy.nextMove = enemy.moveDefs[firstMoveId] || null;

        Combat.startPlayerTurn();

        UI.showScreen('combat-screen');
        setTimeout(function() {
            refreshCombat();
        }, 500);
    }

    function refreshCombat() {
        var combatState = Combat.getState();
        UI.renderCombat(combatState);
        UI.updateCombatLog(combatState.combatLog);
    }

    function handleCardPlay(index) {
        var combatState = Combat.getState();
        if (!combatState || combatState.combatOver) return;

        var card = combatState.player.hand[index];
        if (!card) return;

        // Get card element for animation
        var handContainer = document.getElementById('hand-container');
        var cardEls = handContainer.querySelectorAll('.card');
        var cardEl = cardEls[index] || null;

        // Track if it's a power card
        var isPower = card.type === 'power';

        Animations.cardPlay(cardEl, function() {
            var success = Combat.playCard(index);
            if (!success) return;

            // Track powers
            if (isPower) {
                combatState.player.powers.push(card.id);
            }

            refreshCombat();

            // Check combat end
            if (Combat.isCombatOver()) {
                setTimeout(handleCombatEnd, 800);
            }
        });

        // Animate damage
        var enemyPortrait = document.getElementById('enemy-portrait');
        if (card.type === 'attack') {
            setTimeout(function() {
                Animations.damageFlash(enemyPortrait);
            }, 200);
        }
    }

    function handleDiscard(index) {
        var success = Combat.discardCard(index);
        if (success) refreshCombat();
    }

    function endTurn() {
        var combatState = Combat.getState();
        if (!combatState || combatState.combatOver) return;
        if (combatState.pendingDiscard > 0) return;

        // Disable end turn button briefly
        var btn = document.getElementById('end-turn-btn');
        btn.disabled = true;

        Combat.endPlayerTurn();

        // Enemy attack animation
        var enemyPortrait = document.getElementById('enemy-portrait');
        var playerArea = document.getElementById('player-area');
        Animations.enemyLunge(enemyPortrait);

        setTimeout(function() {
            if (Combat.isCombatOver()) {
                refreshCombat();
                setTimeout(handleCombatEnd, 600);
            } else {
                Combat.startPlayerTurn();
                refreshCombat();
                btn.disabled = false;
            }
        }, 600);
    }

    function handleCombatEnd() {
        state.inCombat = false;
        var combatState = Combat.getState();
        state.hp = combatState.player.hp;
        state.totalTurns += combatState.turnNum;

        if (Combat.playerWon()) {
            var enemy = combatState.enemy;
            var reward = enemy.reward;

            if (reward.victory) {
                // Final boss defeated!
                state.phase = 'victory';
                UI.renderVictory({
                    turns: state.totalTurns,
                    goldEarned: state.totalGold,
                    deckSize: state.deck.length,
                    relicCount: state.relics.length
                });
                localStorage.removeItem(SAVE_KEY);
                return;
            }

            // Apply gold reward
            state.gold += reward.gold + combatState.goldEarned;
            state.totalGold += reward.gold + combatState.goldEarned;

            // Apply heal
            if (reward.healAmount) {
                state.hp = Math.min(state.maxHp, state.hp + reward.healAmount);
            }
            if (reward.fullHeal) {
                state.hp = state.maxHp;
            }

            // Apply max HP bonus
            if (reward.maxHpBonus) {
                state.maxHp += reward.maxHpBonus;
                state.hp += reward.maxHpBonus;
            }

            // Grant relic
            if (reward.grantRelic) {
                var ownedIds = {};
                for (var i = 0; i < state.relics.length; i++) {
                    ownedIds[state.relics[i].id] = true;
                }
                var relic = Shop.getRandomRelic(ownedIds);
                if (relic) {
                    state.relics.push({ id: relic.id, name: relic.name, description: relic.description });
                    reward.relicGranted = relic;
                    if (relic.id === 'portcullis_badge') {
                        state.maxHp += 10;
                        state.hp += 10;
                    }
                }
            }

            // Generate card choices
            var cardChoices = [];
            if (reward.cardChoices > 0) {
                var rarity = reward.cardRarity;
                if (rarity === 'common') {
                    cardChoices = Cards.getRandomCards('common', reward.cardChoices);
                } else if (rarity === 'common_uncommon') {
                    var pool = Cards.getRandomCards('common', 2).concat(Cards.getRandomCards('uncommon', 2));
                    cardChoices = Combat.shuffleArray(pool).slice(0, reward.cardChoices);
                } else if (rarity === 'uncommon') {
                    cardChoices = Cards.getRandomCards('uncommon', reward.cardChoices);
                } else if (rarity === 'uncommon_rare') {
                    var pool2 = Cards.getRandomCards('uncommon', 2).concat(Cards.getRandomCards('rare', 2));
                    cardChoices = Combat.shuffleArray(pool2).slice(0, reward.cardChoices);
                } else if (rarity === 'rare') {
                    cardChoices = Cards.getRandomCards('rare', reward.cardChoices);
                }
            }

            state.phase = 'reward';
            UI.renderReward(reward, cardChoices);
            saveGame();
        } else {
            // Player lost
            state.phase = 'gameover';
            UI.renderGameOver(state.level);
            localStorage.removeItem(SAVE_KEY);
        }
    }

    // === REWARD HANDLERS ===
    function handleRewardCard(card) {
        state.deck.push(Cards.createCard(card.id));
        proceedFromReward();
    }

    function handleRewardSkip() {
        proceedFromReward();
    }

    function handleRewardRemove(cardIndex) {
        if (cardIndex >= 0 && cardIndex < state.deck.length) {
            state.deck.splice(cardIndex, 1);
        }
    }

    function proceedFromReward() {
        if (state.level >= 7) {
            // Should not reach here if victory handled above
            state.phase = 'victory';
            return;
        }

        // Go to shop
        state.phase = 'shop';
        var inventory = Shop.generateInventory(state.relics);
        UI.renderShop(inventory, state);
        saveGame();
    }

    // === SHOP HANDLERS ===
    function handleShopBuyCard(index) {
        var success = Shop.buyCard(index, state);
        if (success) {
            UI.renderShop(Shop.getInventory(), state);
        }
    }

    function handleShopBuyRelic(index) {
        var success = Shop.buyRelic(index, state);
        if (success) {
            UI.renderShop(Shop.getInventory(), state);
        }
    }

    function handleShopBuyPotion() {
        var success = Shop.buyPotion(state);
        if (success) {
            UI.renderShop(Shop.getInventory(), state);
        }
    }

    function handleShopRemoveCard() {
        UI.renderShopDeckView(state);
    }

    function handleShopRemoveCardConfirm(cardIndex) {
        var success = Shop.removeCard(cardIndex, state);
        if (success) {
            UI.renderShop(Shop.getInventory(), state);
        }
    }

    function shopContinue() {
        state.level++;
        saveGame();
        showLevelBriefing();
    }

    // === DECK VIEW ===
    function viewDeck() {
        if (state.inCombat) {
            var combatState = Combat.getState();
            var allCards = combatState.player.drawPile
                .concat(combatState.player.hand)
                .concat(combatState.player.discardPile)
                .concat(combatState.player.exhaustPile);
            UI.renderDeckView(allCards);
        } else {
            UI.renderDeckView(state.deck);
        }
    }

    // === SAVE/LOAD ===
    function saveGame() {
        var saveData = {
            hp: state.hp,
            maxHp: state.maxHp,
            gold: state.gold,
            level: state.level,
            deck: state.deck.map(function(c) { return c.id; }),
            relics: state.relics,
            totalTurns: state.totalTurns,
            totalGold: state.totalGold,
            phase: state.phase
        };
        try {
            localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
        } catch(e) {
            console.warn('Save failed:', e);
        }
    }

    function loadGame() {
        try {
            var data = JSON.parse(localStorage.getItem(SAVE_KEY));
            if (!data) return newGame();

            state.hp = data.hp;
            state.maxHp = data.maxHp;
            state.gold = data.gold;
            state.level = data.level;
            state.deck = data.deck.map(function(id) { return Cards.createCard(id); }).filter(Boolean);
            state.relics = data.relics || [];
            state.totalTurns = data.totalTurns || 0;
            state.totalGold = data.totalGold || 0;
            state.inCombat = false;

            if (data.phase === 'shop') {
                state.phase = 'shop';
                var inventory = Shop.generateInventory(state.relics);
                UI.renderShop(inventory, state);
            } else {
                showLevelBriefing();
            }
        } catch(e) {
            console.warn('Load failed:', e);
            newGame();
        }
    }

    function getState() {
        return state;
    }

    return {
        init: init,
        getState: getState,
        handleCardPlay: handleCardPlay,
        handleDiscard: handleDiscard,
        handleRewardCard: handleRewardCard,
        handleRewardSkip: handleRewardSkip,
        handleRewardRemove: handleRewardRemove,
        handleShopBuyCard: handleShopBuyCard,
        handleShopBuyRelic: handleShopBuyRelic,
        handleShopBuyPotion: handleShopBuyPotion,
        handleShopRemoveCard: handleShopRemoveCard,
        handleShopRemoveCardConfirm: handleShopRemoveCardConfirm
    };
})();

// Start game when DOM ready
document.addEventListener('DOMContentLoaded', function() {
    Game.init();
});
