// npx ts-node --files ./scripts/TransferToken.ts TOKEN_ADDRESS SENDER_PRIVATE_KEY TO_ADDRESS AMOUNT
// https://sepolia.etherscan.io/tx/0x8cc7945e2dbd0ee9f5d031ee1204b1d4fe97d96e18cc5354d77deeb08a11c2a7
import {
  createPublicClient,
  http,
  createWalletClient,
  formatEther,
} from "viem";

import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { abi, bytecode } from "../artifacts/contracts/MyToken.sol/MyToken.json";
import * as dotenv from "dotenv";
import * as readline from "readline";
dotenv.config();

const providerApiKey = process.env.ALCHEMY_API_KEY || "";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (questionText: string) =>
  new Promise<string>((resolve) => rl.question(questionText, resolve));

function validateParams(parameters: string[]) {
  if (!parameters || parameters.length != 4) {
    console.log(parameters);
    throw new Error("Invalid number of parameters");
  }

  const myTokenContractAddress = parameters[0] as `0x${string}`;
  if (!myTokenContractAddress)
    throw new Error("MyToken contract address not provided");
  if (!/^0x[a-fA-F0-9]{40}$/.test(myTokenContractAddress))
    throw new Error("Invalid MyToken contract address");

  let senderPrivateKey = parameters[1] as string;
  if (!senderPrivateKey) throw new Error("Sender private key not provided");
  senderPrivateKey = senderPrivateKey.startsWith("0x")
    ? senderPrivateKey.slice(2)
    : senderPrivateKey;

  const toAddress = parameters[2] as `0x${string}`;
  if (!toAddress) throw new Error("Receiver address not provided");
  if (!/^0x[a-fA-F0-9]{40}$/.test(toAddress))
    throw new Error("Invalid receiver address");

  const TRANSFER_VALUE = parameters[3];
  if (isNaN(Number(TRANSFER_VALUE)))
    throw new Error("Invalid amount to transfer");

  return {
    myTokenContractAddress,
    senderPrivateKey,
    toAddress,
    TRANSFER_VALUE,
  };
}

function cropAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

async function main() {
  // Receiving parameters
  const {
    myTokenContractAddress,
    senderPrivateKey,
    toAddress,
    TRANSFER_VALUE,
  } = validateParams(process.argv.slice(2));

  // Create public client
  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(`https://eth-sepolia.g.alchemy.com/v2/${providerApiKey}`),
  });
  const blockNumber = await publicClient.getBlockNumber();
  console.log("Last block number:", blockNumber);

  // create wallet client
  const account = privateKeyToAccount(`0x${senderPrivateKey}`);
  const sender = createWalletClient({
    account,
    chain: sepolia,
    transport: http(`https://eth-sepolia.g.alchemy.com/v2/${providerApiKey}`),
  });
  console.log("Deployer address:", sender.account.address);
  const balance = await publicClient.getBalance({
    address: sender.account.address,
  });
  console.log(
    "Deployer balance:",
    formatEther(balance),
    sender.chain.nativeCurrency.symbol
  );

  // Mint Tokens
  const answer = await question(
    `Confirm transfer ${TRANSFER_VALUE} MyToken tokens to ${toAddress} (Y/n): `
  );
  if (answer.toString().trim().toLowerCase() != "n") {
    const hash = await sender.writeContract({
      address: myTokenContractAddress,
      abi,
      functionName: "transfer",
      args: [toAddress, BigInt(TRANSFER_VALUE)],
    });
    console.log("Transaction hash:", hash);
    console.log("Waiting for confirmations...");
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log(`Transaction confirmed: ${receipt.status}`);
    console.log(`Block: ${receipt.blockNumber}`);
    console.log(
      `Transferred ${TRANSFER_VALUE.toString()} decimal units to account ${cropAddress(
        toAddress
      )}\n`
    );
  } else {
    console.log("Operation cancelled");
  }
  rl.close();
  process.exit();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
