import "dotenv/config";

import {
  address,
  Blockhash,
  createKeyPairFromBytes,
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  FullySignedTransaction,
  getAddressFromPublicKey,
  getBase58Encoder,
  getBase64Encoder,
  getCompiledTransactionMessageDecoder,
  getSignatureFromTransaction,
  getTransactionDecoder,
  sendAndConfirmTransactionFactory,
  signTransaction,
  TransactionWithBlockhashLifetime,
} from "@solana/web3.js";

import {
  fetchMaybeToken,
  fetchMint,
  findAssociatedTokenPda,
  TOKEN_PROGRAM_ADDRESS,
} from "@solana-program/token";

// Things you might want to configure
// The sender will convert from inputMint to exactly outputAmount of outputMint, and then send it to recipientAddress
const inputMint = address("So11111111111111111111111111111111111111112"); // SOL
const outputMint = address("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"); // USDC
const outputAmount = 0.01;
const recipientAddress = address(
  "EkMGcCfkrs4Eqrd9C4CEhPDRY2Es8SPQs6cGWiBYVKzt"
);

const senderPrivateKey = process.env.SENDER_PRIVATE_KEY;
if (!senderPrivateKey) {
  throw new Error("SENDER_PRIVATE_KEY is not set");
}

const base58Encoder = getBase58Encoder();
const senderKeypair = await createKeyPairFromBytes(
  base58Encoder.encode(senderPrivateKey)
);
const senderAddress = await getAddressFromPublicKey(senderKeypair.publicKey);
console.log(
  "Sending from address",
  senderAddress,
  "to address",
  recipientAddress
);

const rpcUrl = process.env.RPC_URL;
if (!rpcUrl) {
  throw new Error("RPC_URL is not set");
}
const rpcSubscriptionsUrl = rpcUrl.replace("https://", "wss://");
const rpc = createSolanaRpc(rpcUrl);
const rpcSubscriptions = createSolanaRpcSubscriptions(rpcSubscriptionsUrl);
const sendAndConfirmTransaction = sendAndConfirmTransactionFactory({
  rpc,
  rpcSubscriptions,
});

// 1. fetch swap info
const outputTokenAccount = await fetchMint(rpc, outputMint);
const outputAmountUnits = Math.round(
  outputAmount * Math.pow(10, outputTokenAccount.data.decimals)
);
const quoteUrl = `https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${outputAmountUnits}&swapMode=ExactOut&autoSlippage=true`;
const quoteResponse = await fetch(quoteUrl).then((res) => res.json());
console.log(`Created quote data for ${outputAmount} ${outputMint}`);

// 2. create swap transaction
const [recipientTokenAddress] = await findAssociatedTokenPda({
  owner: recipientAddress,
  mint: outputMint,
  tokenProgram: TOKEN_PROGRAM_ADDRESS,
});

const existingRecipientTokenAccount = await fetchMaybeToken(
  rpc,
  recipientTokenAddress
);
if (!existingRecipientTokenAccount.exists) {
  throw new Error("Recipient output token account does not exist");
}

const requestBody = {
  userPublicKey: senderAddress,
  wrapAndUnwrapSol: true,
  useSharedAccounts: true,
  prioritizationFeeLamports: "auto",
  asLegacyTransaction: false,
  useTokenLedger: false,
  destinationTokenAccount: recipientTokenAddress, // output to recipient
  dynamicComputeUnitLimit: true,
  quoteResponse,
  skipUserAccountsRpcCalls: false,
};

const swapTransactionResponse = await fetch(
  "https://quote-api.jup.ag/v6/swap",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  }
);

const { swapTransaction: swapTransactionBase64, lastValidBlockHeight } =
  await swapTransactionResponse.json();
console.log("Created swap transaction");

// 3. send the transaction
const base64Encoder = getBase64Encoder();
const transactionBytes = base64Encoder.encode(swapTransactionBase64);

const transactionDecoder = getTransactionDecoder();
const decodedTransaction = transactionDecoder.decode(transactionBytes);

const signedTransaction = await signTransaction(
  [senderKeypair],
  decodedTransaction
);

const compiledTransactionMessageDecoder =
  getCompiledTransactionMessageDecoder();
const compiledTransactionMessage = compiledTransactionMessageDecoder.decode(
  signedTransaction.messageBytes
);
const blockhash = compiledTransactionMessage.lifetimeToken as Blockhash;

const signedTransactionWithLifetime: FullySignedTransaction &
  TransactionWithBlockhashLifetime = {
  ...signedTransaction,
  lifetimeConstraint: {
    blockhash,
    lastValidBlockHeight: BigInt(lastValidBlockHeight),
  },
};
const transactionSignature = getSignatureFromTransaction(
  signedTransactionWithLifetime
);

console.log("Sending transaction...", transactionSignature);
await sendAndConfirmTransaction(signedTransactionWithLifetime, {
  commitment: "confirmed",
});
console.log("Transaction sent", transactionSignature);
