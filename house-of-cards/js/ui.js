// ui.js - DOM rendering, screen transitions
var UI = (function() {
    'use strict';

    var currentScreen = 'title';
    var selectedCardForRemoval = -1;

    function showScreen(screenId) {
        Animations.screenTransition(function() {
            var screens = document.querySelectorAll('.screen');
            for (var i = 0; i < screens.length; i++) {
                screens[i].classList.remove('active');
            }
            var target = document.getElementById(screenId);
            if (target) {
                target.classList.add('active');
                currentScreen = screenId;
            }
        });
    }

    function showScreenImmediate(screenId) {
        var screens = document.querySelectorAll('.screen');
        for (var i = 0; i < screens.length; i++) {
            screens[i].classList.remove('active');
        }
        var target = document.getElementById(screenId);
        if (target) {
            target.classList.add('active');
            currentScreen = screenId;
        }
    }

    // === TITLE SCREEN ===
    function renderTitle(hasSave) {
        var cont = document.getElementById('continue-btn');
        if (cont) {
            cont.style.display = hasSave ? 'inline-block' : 'none';
        }
        showScreenImmediate('title-screen');
    }

    // === LEVEL BRIEFING ===
    function renderBriefing(level, enemy) {
        var titles = [
            '', 'Candidate Selection', 'By-Election', 'General Election',
            'Ministerial Selection', 'Cabinet Selection', 'Leadership Election',
            'General Election as PM'
        ];
        document.getElementById('briefing-level').textContent = 'Level ' + level + ': ' + (titles[level] || '');
        document.getElementById('briefing-enemy-name').textContent = enemy.name;
        document.getElementById('briefing-enemy-title').textContent = enemy.title;
        document.getElementById('briefing-enemy-hp').textContent = 'HP: ' + enemy.maxHp;
        document.getElementById('briefing-enemy-initials').textContent = enemy.initials;

        var specialText = '';
        if (enemy.special === 'vulnerableImmune3') specialText = 'Immune to Vulnerable for 3 turns.';
        else if (enemy.special === 'autoBlock3') specialText = 'Gains 3 Block every 3 turns automatically.';
        else if (enemy.special === 'damageReduction1') specialText = 'Takes 1 less damage from all attacks.';
        else if (enemy.special === 'desperationBuff') specialText = 'Below 30% HP: gains 3 Strength + 10 Block (once).';
        else if (enemy.special === 'strengthGain4') specialText = 'Gains 1 Strength every 4 turns.';
        else if (enemy.special === 'phased') specialText = 'Three phases. Gains power at each transition.';
        if (enemy.startBlock > 0) specialText += ' Starts with ' + enemy.startBlock + ' Block.';
        if (enemy.startStrength > 0) specialText += ' Starts with ' + enemy.startStrength + ' Strength.';
        document.getElementById('briefing-special').textContent = specialText;

        showScreen('briefing-screen');
    }

    // === COMBAT SCREEN ===
    function renderCombat(combatState) {
        if (!combatState) return;
        var p = combatState.player;
        var e = combatState.enemy;

        // Player stats
        document.getElementById('player-hp-text').textContent = p.hp + '/' + p.maxHp;
        document.getElementById('player-hp-fill').style.width = (p.hp / p.maxHp * 100) + '%';
        document.getElementById('player-block').textContent = p.block > 0 ? p.block : '';
        document.getElementById('player-block').style.display = p.block > 0 ? 'flex' : 'none';
        document.getElementById('player-energy').textContent = p.energy;

        // Energy pips
        var maxE = p.maxEnergy + p.permanentEffects.bonusEnergy;
        document.getElementById('energy-max').textContent = maxE;

        // Player status
        renderStatusIcons('player-status', p.status);

        // Enemy stats
        document.getElementById('enemy-name').textContent = e.name;
        document.getElementById('enemy-hp-text').textContent = e.hp + '/' + e.maxHp;
        document.getElementById('enemy-hp-fill').style.width = (e.hp / e.maxHp * 100) + '%';
        document.getElementById('enemy-block').textContent = e.block > 0 ? e.block : '';
        document.getElementById('enemy-block').style.display = e.block > 0 ? 'flex' : 'none';
        document.getElementById('enemy-initials').textContent = e.initials;

        // Enemy intent
        renderIntent(e.nextMove);

        // Enemy status
        renderStatusIcons('enemy-status', e.status);

        // Minion
        var minionEl = document.getElementById('enemy-minion');
        if (e.minion && e.minion.hp > 0) {
            minionEl.style.display = 'block';
            minionEl.innerHTML = '<div class="minion-portrait">SpAd</div><div class="minion-hp">' +
                e.minion.hp + '/' + e.minion.maxHp + ' HP</div><div class="minion-intent">Attacks for ' +
                e.minion.damage + '</div>';
        } else {
            minionEl.style.display = 'none';
        }

        // Hand
        renderHand(p.hand, combatState);

        // Deck counts
        document.getElementById('draw-count').textContent = p.drawPile.length;
        document.getElementById('discard-count').textContent = p.discardPile.length;
        document.getElementById('exhaust-count').textContent = p.exhaustPile.length;

        // Discard prompt
        var discardPrompt = document.getElementById('discard-prompt');
        if (combatState.pendingDiscard > 0) {
            discardPrompt.style.display = 'block';
            discardPrompt.textContent = 'Select ' + combatState.pendingDiscard + ' card(s) to discard';
        } else {
            discardPrompt.style.display = 'none';
        }

        // Relics bar
        renderRelicsBar(p.relics);

        // Gold display
        var goldEl = document.getElementById('combat-gold');
        if (goldEl) goldEl.textContent = Game.getState().gold + 'g';
    }

    function renderHand(hand, combatState) {
        var container = document.getElementById('hand-container');
        container.innerHTML = '';
        var total = hand.length;
        var fanSpread = Math.min(8, 40 / Math.max(total, 1));

        for (var i = 0; i < hand.length; i++) {
            var card = hand[i];
            var el = createCardElement(card, i, total, fanSpread);

            // Click handler
            if (combatState.pendingDiscard > 0) {
                el.addEventListener('click', (function(idx) {
                    return function() { Game.handleDiscard(idx); };
                })(i));
                el.classList.add('discard-mode');
            } else if (Combat.canPlayCard(card)) {
                el.addEventListener('click', (function(idx) {
                    return function() { Game.handleCardPlay(idx); };
                })(i));
                el.classList.add('playable');
            } else {
                el.classList.add('unplayable');
            }

            container.appendChild(el);
        }
    }

    function createCardElement(card, index, total, fanSpread) {
        var el = document.createElement('div');
        el.className = 'card card-type-' + card.type + ' card-rarity-' + card.rarity;
        el.dataset.index = index;

        // Fan rotation
        if (total > 1 && fanSpread) {
            var mid = (total - 1) / 2;
            var rotation = (index - mid) * fanSpread;
            var yOffset = Math.abs(index - mid) * 8;
            el.style.transform = 'rotate(' + rotation + 'deg) translateY(' + yOffset + 'px)';
            el.dataset.rotation = rotation;
            el.dataset.yoffset = yOffset;
        }

        var costText = card.cost >= 0 ? card.cost : 'X';
        el.innerHTML =
            '<div class="card-cost">' + costText + '</div>' +
            '<div class="card-name">' + card.name + '</div>' +
            '<div class="card-type-badge">' + card.type.toUpperCase() + '</div>' +
            '<div class="card-description">' + card.description + '</div>' +
            (card.exhaust ? '<div class="card-exhaust">Exhaust</div>' : '');

        return el;
    }

    function renderStatusIcons(containerId, status) {
        var container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = '';

        var labels = {
            strength: { icon: '\u2694', label: 'Strength', color: '#e74c3c' },
            dexterity: { icon: '\u26e8', label: 'Dexterity', color: '#3498db' },
            vulnerable: { icon: '\u26a0', label: 'Vulnerable', color: '#e67e22' },
            weak: { icon: '\u25bc', label: 'Weak', color: '#9b59b6' },
            frail: { icon: '\u2606', label: 'Frail', color: '#7f8c8d' },
            poison: { icon: '\u2620', label: 'Poison', color: '#27ae60' },
            regeneration: { icon: '\u2661', label: 'Regen', color: '#2ecc71' },
            thorns: { icon: '\u2742', label: 'Thorns', color: '#e74c3c' }
        };

        for (var key in status) {
            if (status[key] > 0 && labels[key]) {
                var info = labels[key];
                var badge = document.createElement('div');
                badge.className = 'status-badge';
                badge.style.borderColor = info.color;
                badge.title = info.label + ': ' + status[key];
                badge.innerHTML = '<span class="status-icon">' + info.icon + '</span><span class="status-count">' + status[key] + '</span>';
                container.appendChild(badge);
            }
        }
    }

    function renderIntent(move) {
        var el = document.getElementById('enemy-intent');
        if (!el) return;
        if (!move) {
            el.textContent = '???';
            return;
        }

        var intentText = '';
        switch (move.type) {
            case 'attack':
            case 'multi_attack':
                var hits = move.hits || 1;
                intentText = '\u2694 ' + move.damage + (hits > 1 ? 'x' + hits : '');
                el.className = 'enemy-intent intent-attack';
                break;
            case 'block':
                intentText = '\u26e8 ' + move.block;
                el.className = 'enemy-intent intent-block';
                break;
            case 'mixed':
                intentText = '\u2694 ' + move.damage + ' / \u26e8 ' + move.block;
                el.className = 'enemy-intent intent-mixed';
                break;
            case 'buff':
            case 'block_buff':
                intentText = '\u2b06 Buff';
                el.className = 'enemy-intent intent-buff';
                break;
            case 'debuff':
            case 'attack_debuff':
            case 'block_debuff':
                if (move.damage) {
                    intentText = '\u2694 ' + move.damage + ' + debuff';
                } else if (move.block) {
                    intentText = '\u26e8 ' + move.block + ' + debuff';
                } else {
                    intentText = '\u2b07 Debuff';
                }
                el.className = 'enemy-intent intent-debuff';
                break;
            case 'heal':
            case 'block_heal':
            case 'heal_cleanse':
                intentText = '\u2661 Heal';
                el.className = 'enemy-intent intent-heal';
                break;
            case 'curse':
            case 'attack_curse':
                intentText = '\u2620 Curse';
                el.className = 'enemy-intent intent-curse';
                break;
            case 'summon':
                intentText = '\u2726 Summon';
                el.className = 'enemy-intent intent-buff';
                break;
            case 'attack_special':
                intentText = '\u2694 ???';
                el.className = 'enemy-intent intent-attack';
                break;
            default:
                intentText = '???';
                el.className = 'enemy-intent';
        }
        el.textContent = intentText;
    }

    function renderRelicsBar(relics) {
        var container = document.getElementById('relics-bar');
        if (!container) return;
        container.innerHTML = '';
        for (var i = 0; i < relics.length; i++) {
            var r = relics[i];
            var badge = document.createElement('div');
            badge.className = 'relic-badge';
            badge.title = r.name + ': ' + r.description;
            badge.textContent = r.name.charAt(0);
            container.appendChild(badge);
        }
    }

    function updateCombatLog(log) {
        var el = document.getElementById('combat-log');
        if (!el) return;
        el.innerHTML = '';
        var start = Math.max(0, log.length - 8);
        for (var i = start; i < log.length; i++) {
            var line = document.createElement('div');
            line.className = 'log-line';
            line.textContent = log[i];
            el.appendChild(line);
        }
        el.scrollTop = el.scrollHeight;
    }

    // === REWARD SCREEN ===
    function renderReward(reward, cardChoices) {
        var container = document.getElementById('reward-content');
        container.innerHTML = '';

        // Gold
        if (reward.gold) {
            var goldDiv = document.createElement('div');
            goldDiv.className = 'reward-item';
            goldDiv.textContent = '+' + reward.gold + ' Gold';
            container.appendChild(goldDiv);
        }

        // Heal
        if (reward.healAmount) {
            var healDiv = document.createElement('div');
            healDiv.className = 'reward-item';
            healDiv.textContent = 'Healed ' + reward.healAmount + ' HP';
            container.appendChild(healDiv);
        }

        // Full heal
        if (reward.fullHeal) {
            var fhDiv = document.createElement('div');
            fhDiv.className = 'reward-item';
            fhDiv.textContent = 'Fully Healed!';
            container.appendChild(fhDiv);
        }

        // Max HP bonus
        if (reward.maxHpBonus) {
            var mhDiv = document.createElement('div');
            mhDiv.className = 'reward-item';
            mhDiv.textContent = '+' + reward.maxHpBonus + ' Max HP';
            container.appendChild(mhDiv);
        }

        // Card removal option
        if (reward.allowRemove) {
            var removeDiv = document.createElement('div');
            removeDiv.className = 'reward-item reward-remove';
            removeDiv.textContent = 'Remove a card from your deck';
            removeDiv.addEventListener('click', function() {
                renderDeckForRemoval();
            });
            container.appendChild(removeDiv);
        }

        // Card choices
        if (cardChoices && cardChoices.length > 0) {
            var choiceLabel = document.createElement('div');
            choiceLabel.className = 'reward-label';
            choiceLabel.textContent = 'Choose a card to add to your deck:';
            container.appendChild(choiceLabel);

            var cardsDiv = document.createElement('div');
            cardsDiv.className = 'reward-cards';
            for (var i = 0; i < cardChoices.length; i++) {
                var card = cardChoices[i];
                var cardEl = createCardElement(card, i);
                cardEl.classList.add('reward-card');
                cardEl.addEventListener('click', (function(c) {
                    return function() { Game.handleRewardCard(c); };
                })(card));
                cardsDiv.appendChild(cardEl);
            }
            container.appendChild(cardsDiv);

            var skipBtn = document.createElement('button');
            skipBtn.className = 'btn btn-secondary';
            skipBtn.textContent = 'Skip Card';
            skipBtn.addEventListener('click', function() { Game.handleRewardSkip(); });
            container.appendChild(skipBtn);
        }

        // Relic reward
        if (reward.grantRelic) {
            var relicDiv = document.createElement('div');
            relicDiv.className = 'reward-item';
            var relic = reward.relicGranted;
            if (relic) {
                relicDiv.textContent = 'Relic: ' + relic.name + ' - ' + relic.description;
            }
            container.appendChild(relicDiv);
        }

        showScreen('reward-screen');
    }

    function renderDeckForRemoval() {
        var modal = document.getElementById('deck-modal');
        modal.classList.add('active');
        var container = document.getElementById('deck-modal-cards');
        container.innerHTML = '';
        document.getElementById('deck-modal-title').textContent = 'Select a card to remove:';

        var deck = Game.getState().deck;
        for (var i = 0; i < deck.length; i++) {
            var card = deck[i];
            var el = createCardElement(card, i);
            el.classList.add('deck-view-card');
            el.addEventListener('click', (function(idx) {
                return function() {
                    Game.handleRewardRemove(idx);
                    modal.classList.remove('active');
                };
            })(i));
            container.appendChild(el);
        }

        var closeBtn = document.createElement('button');
        closeBtn.className = 'btn btn-secondary modal-close-btn';
        closeBtn.textContent = 'Cancel';
        closeBtn.addEventListener('click', function() {
            modal.classList.remove('active');
        });
        container.appendChild(closeBtn);
    }

    // === SHOP SCREEN ===
    function renderShop(inventory, gameState) {
        var container = document.getElementById('shop-content');
        container.innerHTML = '';

        // Gold display
        var goldEl = document.createElement('div');
        goldEl.className = 'shop-gold';
        goldEl.id = 'shop-gold';
        goldEl.textContent = 'Gold: ' + gameState.gold + 'g';
        container.appendChild(goldEl);

        // Cards for sale
        var cardsLabel = document.createElement('div');
        cardsLabel.className = 'shop-section-label';
        cardsLabel.textContent = 'Cards';
        container.appendChild(cardsLabel);

        var cardsDiv = document.createElement('div');
        cardsDiv.className = 'shop-cards';
        for (var i = 0; i < inventory.cards.length; i++) {
            var card = inventory.cards[i];
            var sold = inventory.sold['card_' + i];
            var cardWrap = document.createElement('div');
            cardWrap.className = 'shop-item' + (sold ? ' sold' : '');

            var cardEl = createCardElement(card, i);
            cardEl.classList.add('shop-card');
            cardWrap.appendChild(cardEl);

            var priceEl = document.createElement('div');
            priceEl.className = 'shop-price';
            priceEl.textContent = sold ? 'SOLD' : card.shopPrice + 'g';
            cardWrap.appendChild(priceEl);

            if (!sold) {
                cardWrap.addEventListener('click', (function(idx) {
                    return function() { Game.handleShopBuyCard(idx); };
                })(i));
            }
            cardsDiv.appendChild(cardWrap);
        }
        container.appendChild(cardsDiv);

        // Relics for sale
        var relicsLabel = document.createElement('div');
        relicsLabel.className = 'shop-section-label';
        relicsLabel.textContent = 'Relics';
        container.appendChild(relicsLabel);

        var relicsDiv = document.createElement('div');
        relicsDiv.className = 'shop-relics';
        for (var ri = 0; ri < inventory.relics.length; ri++) {
            var relic = inventory.relics[ri];
            var rSold = inventory.sold['relic_' + ri];
            var relicWrap = document.createElement('div');
            relicWrap.className = 'shop-item shop-relic-item' + (rSold ? ' sold' : '');
            relicWrap.innerHTML = '<div class="shop-relic-name">' + relic.name + '</div>' +
                '<div class="shop-relic-desc">' + relic.description + '</div>' +
                '<div class="shop-price">' + (rSold ? 'SOLD' : relic.price + 'g') + '</div>';
            if (!rSold) {
                relicWrap.addEventListener('click', (function(idx) {
                    return function() { Game.handleShopBuyRelic(idx); };
                })(ri));
            }
            relicsDiv.appendChild(relicWrap);
        }
        container.appendChild(relicsDiv);

        // Services
        var servicesLabel = document.createElement('div');
        servicesLabel.className = 'shop-section-label';
        servicesLabel.textContent = 'Services';
        container.appendChild(servicesLabel);

        var servicesDiv = document.createElement('div');
        servicesDiv.className = 'shop-services';

        // HP Potion
        var potionSold = inventory.sold.potion;
        var potionBtn = document.createElement('div');
        potionBtn.className = 'shop-item shop-service' + (potionSold ? ' sold' : '');
        potionBtn.innerHTML = '<div class="shop-service-name">HP Potion</div>' +
            '<div class="shop-service-desc">Heal 20 HP</div>' +
            '<div class="shop-price">' + (potionSold ? 'SOLD' : '50g') + '</div>';
        if (!potionSold) {
            potionBtn.addEventListener('click', function() { Game.handleShopBuyPotion(); });
        }
        servicesDiv.appendChild(potionBtn);

        // Card Removal
        var remSold = inventory.sold.removal;
        var remBtn = document.createElement('div');
        remBtn.className = 'shop-item shop-service' + (remSold ? ' sold' : '');
        remBtn.innerHTML = '<div class="shop-service-name">Card Removal</div>' +
            '<div class="shop-service-desc">Remove a card from your deck</div>' +
            '<div class="shop-price">' + (remSold ? 'SOLD' : inventory.removalCost + 'g') + '</div>';
        if (!remSold) {
            remBtn.addEventListener('click', function() { Game.handleShopRemoveCard(); });
        }
        servicesDiv.appendChild(remBtn);

        container.appendChild(servicesDiv);

        showScreen('shop-screen');
    }

    function renderShopDeckView(gameState) {
        var modal = document.getElementById('deck-modal');
        modal.classList.add('active');
        var container = document.getElementById('deck-modal-cards');
        container.innerHTML = '';
        document.getElementById('deck-modal-title').textContent = 'Select a card to remove:';

        var deck = gameState.deck;
        for (var i = 0; i < deck.length; i++) {
            var card = deck[i];
            var el = createCardElement(card, i);
            el.classList.add('deck-view-card');
            el.addEventListener('click', (function(idx) {
                return function() {
                    Game.handleShopRemoveCardConfirm(idx);
                    modal.classList.remove('active');
                };
            })(i));
            container.appendChild(el);
        }

        var closeBtn = document.createElement('button');
        closeBtn.className = 'btn btn-secondary modal-close-btn';
        closeBtn.textContent = 'Cancel';
        closeBtn.addEventListener('click', function() {
            modal.classList.remove('active');
        });
        container.appendChild(closeBtn);
    }

    // === DECK VIEW ===
    function renderDeckView(deck) {
        var modal = document.getElementById('deck-modal');
        modal.classList.add('active');
        var container = document.getElementById('deck-modal-cards');
        container.innerHTML = '';
        document.getElementById('deck-modal-title').textContent = 'Your Deck (' + deck.length + ' cards):';

        for (var i = 0; i < deck.length; i++) {
            var el = createCardElement(deck[i], i);
            el.classList.add('deck-view-card');
            container.appendChild(el);
        }
    }

    function closeDeckModal() {
        var modal = document.getElementById('deck-modal');
        modal.classList.remove('active');
    }

    // === VICTORY SCREEN ===
    function renderVictory(stats) {
        document.getElementById('victory-turns').textContent = 'Turns: ' + (stats.turns || 0);
        document.getElementById('victory-gold').textContent = 'Gold Earned: ' + (stats.goldEarned || 0);
        document.getElementById('victory-deck-size').textContent = 'Final Deck Size: ' + (stats.deckSize || 0);
        document.getElementById('victory-relics').textContent = 'Relics: ' + (stats.relicCount || 0);
        showScreen('victory-screen');
    }

    // === GAME OVER ===
    function renderGameOver(level) {
        document.getElementById('gameover-level').textContent = 'Defeated at Level ' + level;
        showScreen('gameover-screen');
    }

    return {
        showScreen: showScreen,
        showScreenImmediate: showScreenImmediate,
        renderTitle: renderTitle,
        renderBriefing: renderBriefing,
        renderCombat: renderCombat,
        renderReward: renderReward,
        renderShop: renderShop,
        renderShopDeckView: renderShopDeckView,
        renderDeckView: renderDeckView,
        closeDeckModal: closeDeckModal,
        renderVictory: renderVictory,
        renderGameOver: renderGameOver,
        updateCombatLog: updateCombatLog,
        createCardElement: createCardElement,
        renderDeckForRemoval: renderDeckForRemoval
    };
})();
