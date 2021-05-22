const request = require('request');
const WebSocket = require('ws');
const crypto = require('crypto');
const utils = require('./utils.js');

let ftxWS = {};
let ftxSocketTimeout = false;

const ftx = {
/* As above but with sub account and postOnly */
	order: (side, market, qty, price, creds, reduce=false, postOnly=true) => {
		return new Promise((resolve, reject) => {  
			const ts = new Date().getTime();
			const query = {
				market,
				side: side.toLowerCase(),
				price,
				size: qty,
				type: 'limit',
				postOnly,
			}
			if (reduce === true) query.reduceOnly = true;
			const queryString = `${ts}POST/api/orders${JSON.stringify(query)}`;
			const signature = crypto.createHmac('sha256', creds.apiSecret).update(queryString).digest('hex');
			const uri = `https://ftx.com/api/orders`;
			const headers = {
				"FTX-KEY": creds.apiKey,
				"FTX-TS": String(ts),
				"FTX-SIGN": signature,
				"FTX-SUBACCOUNT": creds.subAccount
			};
			request({headers,uri,method:'POST',body:query,json:true}, function (err, res, ticket) {
				if (err) reject(err);
				if (ticket && ticket.result && ticket.result.id) {
					resolve(ticket.result.id);
				} else {
					reject(ticket);
				}
			});
		});
	},

	status: (market, orderID, creds) => {
		return new Promise((resolve, reject) => {  
			const ts = new Date().getTime();
			const queryString = `${ts}GET/api/orders/${orderID}`;
			const signature = crypto.createHmac('sha256', creds.apiSecret).update(queryString).digest('hex');
			const uri = `https://ftx.com/api/orders/${orderID}`;
			const headers = {
				"FTX-KEY": creds.apiKey,
				"FTX-TS": String(ts),
				"FTX-SIGN": signature,
				"FTX-SUBACCOUNT": creds.subAccount
			};
			request({headers,uri,method:'GET',json:true}, function (err, res, ticket) {
				if (err) reject(err);
				if (ticket && ticket.success) {
					let status = 'OPEN';
					if (ticket.result.status === 'closed') status = 'CLOSED';
					const standardTicket = {
						status, // OPEN or CLOSED
						price: utils.round(ticket.result.avgFillPrice) || 0,
						executedQty: utils.round(ticket.result.filledSize) || 0,
					}
					resolve(standardTicket);
				} else {
					reject(ticket);
				}
			});
		});
	},

	cancel: (market, orderID, creds) => {
		return new Promise((resolve, reject) => {  
			const ts = new Date().getTime();
			const queryString = `${ts}DELETE/api/orders/${orderID}`;
			const signature = crypto.createHmac('sha256', creds.apiSecret).update(queryString).digest('hex');
			const uri = `https://ftx.com/api/orders/${orderID}`;
			const headers = {
				"FTX-KEY": creds.apiKey,
				"FTX-TS": String(ts),
				"FTX-SIGN": signature,
				"FTX-SUBACCOUNT": creds.subAccount
			};
			request({headers,uri,method:'DELETE',json:true}, async (err, res, ticket) => {
				if (err) reject(err);
				if (ticket && (ticket.success || (ticket.error && ticket.error.includes('already closed')))) {
					const checkOrder = await ftx.status(market,orderID,creds);
					resolve(checkOrder);
				} else {
					reject(ticket);
				}
			});
		});
	},

	position: (market,creds) => {
		return new Promise((resolve, reject) => {  
			const ts = new Date().getTime();
			const queryString = `${ts}GET/api/positions`;
			const signature = crypto.createHmac('sha256', creds.apiSecret).update(queryString).digest('hex');
			const uri = `https://ftx.com/api/positions`;
			const headers = {
				"FTX-KEY": creds.apiKey,
				"FTX-TS": String(ts),
				"FTX-SIGN": signature,
				"FTX-SUBACCOUNT": creds.subAccount
			};
			request({headers,uri,method:'GET',json:true}, async (err, res, ticket) => {
				if (err) reject(err);
				if (ticket && ticket.success) {
					ticket.result.forEach((pos) => {
						if (pos.future && pos.future === market) {
							resolve(utils.round(pos.netSize));
						}
					});
				} else {
					reject(ticket);
				}
			});
		});
	},

	allPositions: (creds) => {
		return new Promise((resolve, reject) => {  
			const ts = new Date().getTime();
			const queryString = `${ts}GET/api/positions`;
			const signature = crypto.createHmac('sha256', creds.apiSecret).update(queryString).digest('hex');
			const uri = `https://ftx.com/api/positions`;
			const headers = {
				"FTX-KEY": creds.apiKey,
				"FTX-TS": String(ts),
				"FTX-SIGN": signature,
				"FTX-SUBACCOUNT": creds.subAccount
			};
			request({headers,uri,method:'GET',json:true}, async (err, res, ticket) => {
				if (err) reject(err);
				if (ticket && ticket.success) {
					resolve(ticket.result);
				} else {
					reject(ticket);
				}
			});
		});
	},

	wallet: (creds) => {
		return new Promise((resolve, reject) => {  
			const ts = new Date().getTime();
			const queryString = `${ts}GET/api/wallet/balances`;
			const signature = crypto.createHmac('sha256', creds.apiSecret).update(queryString).digest('hex');
			const uri = `https://ftx.com/api/wallet/balances`;
			const headers = {
				"FTX-KEY": creds.apiKey,
				"FTX-TS": String(ts),
				"FTX-SIGN": signature,
				"FTX-SUBACCOUNT": creds.subAccount
			};
			request({headers,uri,method:'GET',json:true}, async (err, res, ticket) => {
				if (err) reject(err);
				if (ticket && ticket.success) {
					resolve(ticket.result);
				} else {
					reject(ticket);
				}
			});
		});
	},

	account: (creds) => {
		return new Promise((resolve, reject) => {  
			const ts = new Date().getTime();
			const queryString = `${ts}GET/api/account`;
			const signature = crypto.createHmac('sha256', creds.apiSecret).update(queryString).digest('hex');
			const uri = `https://ftx.com/api/account`;
			const headers = {
				"FTX-KEY": creds.apiKey,
				"FTX-TS": String(ts),
				"FTX-SIGN": signature,
				"FTX-SUBACCOUNT": creds.subAccount
			};
			request({headers,uri,method:'GET',json:true}, async (err, res, ticket) => {
				if (err) reject(err);
				if (ticket && ticket.success) {
					resolve(ticket.result);
				} else {
					reject(ticket);
				}
			});
		});
	},

	connectSockets: (updateHandler, marketsArray) => {
		ftxWS = new WebSocket('wss://ftx.com/ws/');
			
		ftxWS.on('message', (data) => {
			if (data) {
				const update = JSON.parse(data);
				if (!update.data) return false;
				updateHandler(update);
			}
		});

		ftxWS.on('open', () => {
			marketsArray.forEach((market) => {
				ftxWS.send(`{"channel": "ticker", "market": "${market}", "op": "subscribe"}`);
				//ftxWS.send(`{"channel": "trades", "market": "BTC-PERP", "op": "subscribe"}`);
			});
			setInterval(() => {
				if (ftxWS.readyState && ftxWS.readyState === 1) {
					ftxWS.send(`{"op": "ping"}`);
				} else {
					console.log(`FTX Websocket not ready for ping`);
				}
			}, 15000);
		});

		ftxWS.on('error', () => {
			ftx.resetSocket(updateHandler, marketsArray);
		});

		ftxWS.on('close', () => {
			ftx.resetSocket(updateHandler, marketsArray);
		});


		setTimeout(() => {
			ftx.resetSocket(updateHandler, marketsArray);
		},30 * 60000);
	},

	resetSocket: (updateHandler, marketsArray) => {
		ftxWS.terminate();
		console.log('Socket disconnected. Reconnecting...');
		if (ftxSocketTimeout) clearTimeout(ftxSocketTimeout);
		ftxSocketTimeout = setTimeout(() => { 
			try {
				ftx.connectSockets(updateHandler, marketsArray);
			} catch (e) {
				console.log(`Failed to connect sockets. Resetting in 15 seconds...`);
				setTimeout(() => { ftx.resetSocket(updateHandler, marketsArray); }, 15000);
			}
		}, 3000);
	},

}

module.exports = ftx;
