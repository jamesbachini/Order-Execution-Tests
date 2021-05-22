/* Execution Module */
/* global prices */

const utils = require('./utils.js');
const credentials = require('./credentials.js');
const ftx = require('./ftx.js');

const calcPrice = (trade) => {
	let price = 0;
	if (trade.longShort === 'LONG') {
		price = prices[trade.targetMarket].bidPrice * 1.05;
	}
	if (trade.longShort === 'SHORT') {
		prices[trade.targetMarket].askPrice / 1.05;
	}
	return price;
}

const execution = {
	executeTrade: async (trade,remaining=false) => {
		const ts = new Date().getTime();
		const price = calcPrice(trade);
		trade.currentPrice = price;
		if (remaining) {
			trade.targetSize = remaining;
		} else {
			trade.targetSize = trade.size;
		}
		if (trade.targetSize < prices[trade.targetMarket].sizeIncrement) {
			utils.log(`${trade.subAccount} ${new Date().toLocaleTimeString()} MIN SIZE ERROR ${trade.targetSize} ${trade.size}`);
			return false;
		}
		trade.side = false;
		if (trade.longShort === 'LONG') trade.side = 'BUY';
		if (trade.longShort === 'SHORT') trade.side = 'SELL';
		if (typeof trade.placeOnly === 'undefined') trade.placeOnly = true;
		if (typeof trade.reduceOnly === 'undefined') trade.reduceOnly = false;
		//utils.log(`${trade.subAccount} ${new Date().toLocaleTimeString()} OPENING ${trade.targetMarket} ${trade.longShort} ${trade.currentPrice} ${trade.targetSize}`);
		trade.openID = await ftx.order(trade.side, trade.targetMarket, utils.numberString(trade.targetSize), utils.numberString(trade.currentPrice), credentials[trade.subAccount],false,trade.placeOnly).catch((err) => utils.log(err));
		setTimeout(() => {
			execution.checkOrder(trade);
		}, 1000);
	},

	checkOrder: async (trade) => {
		const price = calcPrice(trade);
		if (trade.currentPrice !== price) {
			const res1 = await ftx.cancel(trade.targetMarket, trade.openID, credentials[trade.subAccount]).catch((err) => utils.log(err));
			if (res1 && utils.round(res1.executedQty) >= trade.targetSize) {
				trade.executedQty = utils.round(res1.executedQty); // for taker spot  * 0.999405
				trade.remainingQty = trade.executedQty;
				trade.executedPrice = utils.round(res1.price);
				utils.log(`${trade.subAccount} ${new Date().toLocaleTimeString()} EXECUTED ${trade.targetMarket} ${trade.longShort} ${trade.currentPrice} ${trade.executedQty}`);
			} else if (res1 && utils.round(res1.executedQty) > 0) {
				trade.executedQty = utils.round(res1.executedQty);
				const remaining = utils.round(trade.targetSize - trade.executedQty); // partial fill
				execution.executeTrade(trade,remaining);
			} else {
				execution.executeTrade(trade,trade.targetSize); // Get it done
			}
		} else {
			setTimeout(() => { execution.checkOrder(trade); }, 100);
		}
	},

	test1: async () => {
		await new Promise(r => setTimeout(r, 6000));
		console.log('hi1');
	},

	test2: async () => {
		await new Promise(r => setTimeout(r, 4000));
		console.log('hi2');
	},

}

module.exports = execution;