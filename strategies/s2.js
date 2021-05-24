/* strategy Module */
/* global prices */

// https://jamesbachini.com/order-execution-strategy/#Limit-Order-Future,-Market-Order-Spot

const utils = require('./../utils.js');
const credentials = require('./../credentials.js');
const ftx = require('./../ftx.js');

const subAccount = 'S2';
const batchState = {};

const strategy = {

	calcPrice: (trade) => {
		let price = 0;
		if (trade.longShort === 'LONG') {
			price = prices[trade.targetMarket].bidPrice;
       if (batchState.tradeCountDown <= 1) { // market buy second market
        price = prices[trade.targetMarket].bidPrice * 1.05;
       }
		}
		if (trade.longShort === 'SHORT') {
			price = prices[trade.targetMarket].askPrice;
      if (batchState.tradeCountDown <= 1) { // market sell second market
        price = prices[trade.targetMarket].askPrice / 1.05;
      }
    }
		return price;
	},

	initiateTrade: async (markets) => {
		return new Promise((resolve, reject) => {
			batchState.tradeCountDown = markets.length;
			markets.forEach(async (mkt) => {
				const trade = {};
				trade.longShort = mkt.longShort;
				trade.subAccount = subAccount;
				trade.targetMarket = mkt.market;
        if (trade.targetMarket.includes('/')) trade.paused = true; // Pause Spot Market 
				const asset = trade.targetMarket.split(/(-|\/)/g)[0];
				trade.size = mkt.batchSize;
				trade.sizeIncrement = mkt.sizeIncrement;
				trade.priceIncrement = mkt.priceIncrement;
        trade.priceDecimals = utils.countDecimals(mkt.priceIncrement);
				trade.ts = new Date().getTime();
				trade.placeOnly = true;
				trade.promiseResolve = resolve;
				trade.promiseReject = reject;
				if (!batchState.trades) batchState.trades = [];
				batchState.trades.push(trade);
				strategy.executeTrade(trade);
			});
		});
	},

	executeTrade: async (trade,remaining=false) => {
    if (trade.paused === true) {
      setTimeout(() => {
        strategy.executeTrade(trade,remaining);
      }, 1000);
      return false;
    }
		const ts = new Date().getTime();
		const price = strategy.calcPrice(trade);
		trade.currentPrice = price;
		if (remaining) {
			trade.targetSize = remaining;
		} else {
			trade.targetSize = trade.size;
		}
		if (trade.targetSize < trade.sizeIncrement) {
			utils.log(`${trade.subAccount} ${new Date().toLocaleTimeString()} MIN SIZE ERROR ${trade.targetSize} ${trade.size}`);
			strategy.finishTrade(trade);
			return false;
		}
		trade.side = false;
		if (trade.longShort === 'LONG') trade.side = 'BUY';
		if (trade.longShort === 'SHORT') trade.side = 'SELL';
		if (typeof trade.placeOnly === 'undefined') trade.placeOnly = true;
		if (typeof trade.reduceOnly === 'undefined') trade.reduceOnly = false;
		if (batchState.tradeCountDown <= 1) trade.placeOnly = false; // market buy second market
		utils.log(`${trade.subAccount} ${new Date().toLocaleTimeString()} OPENING ${trade.targetMarket} ${trade.longShort} ${trade.currentPrice} ${trade.targetSize}`);
		trade.openID = await ftx.order(trade.side, trade.targetMarket, utils.numberString(trade.targetSize), utils.numberString(trade.currentPrice), credentials[trade.subAccount],false,trade.placeOnly).catch((err) => utils.log(err));
		trade.inTrade = true;
		trade.inExecution = false;
	},

	finishTrade: async (trade) => {
		trade.inTrade = false;
		trade.inExecution = false;
		utils.log(`${trade.subAccount} ${new Date().toLocaleTimeString()} EXECUTED ${trade.targetMarket} ${trade.longShort} ${trade.currentPrice} ${trade.executedQty}`);
		batchState.tradeCountDown -= 1;
    batchState.trades.forEach(async (trade) => { // unpause spot trade on futures completion
      trade.paused = false;
    });
		const ts = new Date().getTime();
		if (batchState.tradeCountDown === 0)	trade.promiseResolve(ts);
	},

	priceUpdate: async () => {
		if (!batchState.trades) return false;
		batchState.trades.forEach(async (trade) => {
			if (!trade.inTrade || trade.inExecution) return false;
			const price = strategy.calcPrice(trade);
			if (trade.currentPrice !== price) {
				trade.inExecution = true;
				const res1 = await ftx.cancel(trade.targetMarket, trade.openID, credentials[trade.subAccount]).catch((err) => utils.log(err));
				if (res1 && utils.round(res1.executedQty) >= trade.targetSize * 0.995) { // allow for fees
					trade.executedQty = utils.round(res1.executedQty);
					trade.executedPrice = utils.round(res1.price);
					strategy.finishTrade(trade);
				} else if (res1 && utils.round(res1.executedQty) > 0) {
					trade.executedQty = utils.round(res1.executedQty);
					const remaining = utils.round(trade.targetSize - trade.executedQty); // partial fill
					strategy.executeTrade(trade,remaining);
				} else {
					strategy.executeTrade(trade,trade.targetSize); // Get it done
				}
			}
		});
	},

}

module.exports = strategy;