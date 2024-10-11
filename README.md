# Jupiter Payments with web3js 2.0

This is a simple example of Jupiter's Payments API using web3js 2.0

Payments uses Jupiter's ExactOut functionality, which means you specify the amount of output token you want, and Jupiter will calculate the exact amount of input token you need to send. It sets the `destinationTokenAccount` to the recipient's token address. Note that this address must already exist.

The effect is that the sender sends the input token, and the recipient receives a precise amount of the output token.

See [Jupiter's documentation](https://station.jup.ag/docs/apis/payments-api) for more information.

## Setup

1. Copy the `.env.sample` file to `.env` and set the values
    a. `SENDER_PRIVATE_KEY` is the private key of the account that will send the transaction.
    b. `RPC_URL` is the URL of the Solana RPC node you want to use.

## Running the script

At the top of the script are some variables you can configure:

```ts
const inputMint = address("So11111111111111111111111111111111111111112"); // SOL
const outputMint = address("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"); // USDC
const outputAmount = "0.01";
const recipientAddress = address(
  "EkMGcCfkrs4Eqrd9C4CEhPDRY2Es8SPQs6cGWiBYVKzt"
);
```

Make sure you've run `npm install` to install the dependencies.
Now you can run the script with `npm run start`. 

You should see output like the following:

```
Sending from address Fkc4FN7PPhyGsAcHPW3dBBJ4BvtYkDr2rBFBgFpvy3nB to address EkMGcCfkrs4Eqrd9C4CEhPDRY2Es8SPQs6cGWiBYVKzt
Created quote data for 0.01 EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
Created swap transaction
Sending transaction... 5UUqYcuqwUYGn5WB7DoYNMY2bk1XUiadczKU6aiDskicNAqct8wEWCL3A2mzdqUMAatVht3DSCzW8rgPnn18nHCP
Transaction sent 5UUqYcuqwUYGn5WB7DoYNMY2bk1XUiadczKU6aiDskicNAqct8wEWCL3A2mzdqUMAatVht3DSCzW8rgPnn18nHCP
```
