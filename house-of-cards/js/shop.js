// shop.js - Shop logic, pricing, inventory
var Shop = (function() {
    'use strict';

    var relicDefinitions = {
        red_box: { id: 'red_box', name: 'Red Box', price: 150, description: '+1 Energy per turn.' },
        hansard: { id: 'hansard', name: 'Hansard', price: 150, description: '+1 card draw per turn.' },
        despatch_box: { id: 'despatch_box', name: 'Despatch Box', price: 200, description: 'Start combat with 2 Strength.' },
        speakers_mace: { id: 'speakers_mace', name: "Speaker's Mace", price: 200, description: 'Start combat: apply 1 Vulnerable to enemy.' },
        whips_little_black_book: { id: 'whips_little_black_book', name: "Whip's Little Black Book", price: 175, description: 'Debuffs also apply 1 Poison.' },
        parliamentary_pass: { id: 'parliamentary_pass', name: 'Parliamentary Pass', price: 175, description: 'Start combat with 8 Block.' },
        division_bell: { id: 'division_bell', name: 'Division Bell', price: 250, description: 'Below 25% HP: gain 15 Block (once/combat).' },
        woolsack: { id: 'woolsack', name: 'Woolsack', price: 200, description: 'Gain 3 Block at end of each turn.' },
        portcullis_badge: { id: 'portcullis_badge', name: 'Portcullis Badge', price: 150, description: '+10 Max HP.' },
        bottle_of_house_claret: { id: 'bottle_of_house_claret', name: 'Bottle of House Claret', price: 300, description: 'Heal 5 HP at start of each combat.' }
    };

    var inventory = null;
    var removalCost = 75;
    var removalCount = 0;

    function generateInventory(playerRelics) {
        var ownedRelicIds = {};
        for (var i = 0; i < playerRelics.length; i++) {
            ownedRelicIds[playerRelics[i].id] = true;
        }

        // 2 Common cards (50-75g)
        var commons = Cards.getRandomCards('common', 2);
        for (var ci = 0; ci < commons.length; ci++) {
            commons[ci].shopPrice = 50 + Math.floor(Math.random() * 26);
        }

        // 2 Uncommon cards (100-150g)
        var uncommons = Cards.getRandomCards('uncommon', 2);
        for (var ui = 0; ui < uncommons.length; ui++) {
            uncommons[ui].shopPrice = 100 + Math.floor(Math.random() * 51);
        }

        // 1 Rare card (200-300g)
        var rares = Cards.getRandomCards('rare', 1);
        for (var ri = 0; ri < rares.length; ri++) {
            rares[ri].shopPrice = 200 + Math.floor(Math.random() * 101);
        }

        // 2 Relics (not already owned)
        var availableRelics = [];
        for (var key in relicDefinitions) {
            if (!ownedRelicIds[key]) {
                availableRelics.push(Object.assign({}, relicDefinitions[key]));
            }
        }
        // Shuffle and take 2
        var shopRelics = [];
        var shuffled = Combat.shuffleArray(availableRelics);
        for (var si = 0; si < Math.min(2, shuffled.length); si++) {
            shopRelics.push(shuffled[si]);
        }

        removalCost = 75 + (removalCount * 25);

        inventory = {
            cards: commons.concat(uncommons).concat(rares),
            relics: shopRelics,
            potionPrice: 50,
            removalCost: removalCost,
            sold: {}
        };

        return inventory;
    }

    function getInventory() {
        return inventory;
    }

    function buyCard(index, gameState) {
        if (!inventory || index >= inventory.cards.length) return false;
        var card = inventory.cards[index];
        if (inventory.sold['card_' + index]) return false;
        if (gameState.gold < card.shopPrice) return false;

        gameState.gold -= card.shopPrice;
        gameState.deck.push(Cards.createCard(card.id));
        inventory.sold['card_' + index] = true;
        return true;
    }

    function buyRelic(index, gameState) {
        if (!inventory || index >= inventory.relics.length) return false;
        var relic = inventory.relics[index];
        if (inventory.sold['relic_' + index]) return false;
        if (gameState.gold < relic.price) return false;

        gameState.gold -= relic.price;
        gameState.relics.push({ id: relic.id, name: relic.name, description: relic.description });
        inventory.sold['relic_' + index] = true;

        // Portcullis Badge immediate effect
        if (relic.id === 'portcullis_badge') {
            gameState.maxHp += 10;
            gameState.hp += 10;
        }

        return true;
    }

    function buyPotion(gameState) {
        if (!inventory) return false;
        if (inventory.sold.potion) return false;
        if (gameState.gold < inventory.potionPrice) return false;

        gameState.gold -= inventory.potionPrice;
        gameState.hp = Math.min(gameState.maxHp, gameState.hp + 20);
        inventory.sold.potion = true;
        return true;
    }

    function removeCard(cardIndex, gameState) {
        if (!inventory) return false;
        if (inventory.sold.removal) return false;
        if (gameState.gold < inventory.removalCost) return false;
        if (cardIndex < 0 || cardIndex >= gameState.deck.length) return false;

        gameState.gold -= inventory.removalCost;
        gameState.deck.splice(cardIndex, 1);
        inventory.sold.removal = true;
        removalCount++;
        return true;
    }

    function getRelicDefinitions() {
        return relicDefinitions;
    }

    function getRandomRelic(ownedRelicIds) {
        var available = [];
        for (var key in relicDefinitions) {
            if (!ownedRelicIds[key]) {
                available.push(Object.assign({}, relicDefinitions[key]));
            }
        }
        if (available.length === 0) return null;
        return available[Math.floor(Math.random() * available.length)];
    }

    function resetRemovalCount() {
        removalCount = 0;
    }

    return {
        generateInventory: generateInventory,
        getInventory: getInventory,
        buyCard: buyCard,
        buyRelic: buyRelic,
        buyPotion: buyPotion,
        removeCard: removeCard,
        getRelicDefinitions: getRelicDefinitions,
        getRandomRelic: getRandomRelic,
        resetRemovalCount: resetRemovalCount
    };
})();
