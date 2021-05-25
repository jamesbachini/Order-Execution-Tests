# Order Execution Tests

Order execution strategies for delta neutral crypto trading on FTX

I set up a trading bot to test different methods of getting in and out of a delta neutral position as cost effectively as possible.

Full blog post with more details at: https://jamesbachini.com/order-execution-strategy/

## Test

Trade in and out of a delta neutral position for 0.02 Bitcoin divided up in to 40 batches.

Starting balance for each sub account was $1000

Rotated in and out of position three times over an 18 hour period on the 24-25th May 2021

## Results

S1  -  Market Orders
Account Value: $993.23  -  Average Batch Time: 3.3 secs

S2  - Limit Future, Market Spot
Account Value: $997.65  -  Average Batch Time: 25.6 secs

S3  - Balanced Limit Orders
Account Value: $999.24  -  Average Batch Time: 26.5 secs

S4  - Market Maker
Account Value: $998.80  -  Average Batch Time: 169.9 secs

S5  -  Cross Chain Moving Average
Account Value: $1000.30  -  Average Batch Time: 47.3 secs
