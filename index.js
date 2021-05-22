/* Crypto Alog Trading Bot v3 */
/* global prices */

const credentials = require('./credentials.js');
const ftx = require('./ftx.js');
const s1 = require('./s1.js');

global.prices = {};

const markets = [{
    market: 'BTC/USD',
    side: 'BUY',
  },{
    market: 'BTC-1231',
    side: 'SELL',
  }];

const init = async () => {
  for (let batch = 1; batch <= 20; batch++) {
    console.log(`### Starting Order Execution Test - Batch ${batch} ###`);
    const promise1 = s1.test1();
    const promise2 = s1.test2();
    await Promise.all([promise1, promise2]);
  }
  console.log(`### Execution Finished ###`);
}

const updateHandler = (update) => {
  if (update.channel && update.channel === 'ticker') {
    prices[update.market].askPrice = update.data.ask;
    prices[update.market].bidPrice = update.data.bid;
    prices[update.market].askSize = update.data.askSize;
    prices[update.market].bidSize = update.data.bidSize;
    prices[update.market].midPrice = (prices[update.market].askPrice + prices[update.market].bidPrice) / 2;
  }
};

const marketsArray = [];
markets.forEach((marketData) => {
  marketsArray.push(marketData.market);
  prices[marketData.market] = {};
});

ftx.connectSockets(updateHandler, marketsArray);

process.on('uncaughtException', function(err) {
	console.log('Uncaught Exception 101: ' + err);
	console.error(err.stack);
});

process.on('unhandledRejection', (reason, p) => {
	console.log('Unhandled Rejection 102: ' + p);
	console.log(reason);
});

init();
