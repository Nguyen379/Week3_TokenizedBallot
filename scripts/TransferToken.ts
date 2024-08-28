// npx ts-node --files ./scripts/TransferTokens.ts CONTRACT_ADDRESS TO_ADDRESS AMOUNT

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
const minterPrivateKey = process.env.PRIVATE_KEY || "";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (questionText: string) =>
  new Promise<string>((resolve) => rl.question(questionText, resolve));

function validateParams(parameters: string[]) {
  if (!parameters || parameters.length != 3) {
		console.log(parameters);
    throw new Error("Invalid number of parameters");
  }

  const myTokenContractAddress = parameters[0] as `0x${string}`;
  if (!myTokenContractAddress)
    throw new Error("MyToken contract address not provided");
  if (!/^0x[a-fA-F0-9]{40}$/.test(myTokenContractAddress))
    throw new Error("Invalid MyToken contract address");

  const toAddress = parameters[1] as `0x${string}`;
  if (!toAddress) throw new Error("Receiver address not provided");
  if (!/^0x[a-fA-F0-9]{40}$/.test(toAddress))
    throw new Error("Invalid receiver contract address");

  const MINT_VALUE = parameters[2];
  if (isNaN(Number(MINT_VALUE))) throw new Error("Invalid amount to mint");

  return { myTokenContractAddress, toAddress, MINT_VALUE };
}

function cropAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

async function main() {
  // Receiving parameters
  const { myTokenContractAddress, toAddress, MINT_VALUE } = validateParams(
    process.argv.slice(2)
  );

  // Create public client
  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(`https://eth-sepolia.g.alchemy.com/v2/${providerApiKey}`),
  });
  const blockNumber = await publicClient.getBlockNumber();
  console.log("Last block number:", blockNumber);

  // create wallet client
  const account = privateKeyToAccount(`0x${minterPrivateKey}`);
  const minter = createWalletClient({
    account,
    chain: sepolia,
    transport: http(`https://eth-sepolia.g.alchemy.com/v2/${providerApiKey}`),
  });
  console.log("Deployer address:", minter.account.address);
  const balance = await publicClient.getBalance({
    address: minter.account.address,
  });
  console.log(
    "Deployer balance:",
    formatEther(balance),
    minter.chain.nativeCurrency.symbol
  );

  // Mint Tokens
  const answer = await question(
    `Confirm minting ${MINT_VALUE} to ${toAddress} (Y/n): `
  );
  if (answer.toString().trim().toLowerCase() != "n") {
    const hash = await minter.writeContract({
      address: myTokenContractAddress,
      abi,
      functionName: "mint",
      args: [toAddress, BigInt(MINT_VALUE)],
    });
    console.log("Transaction hash:", hash);
    console.log("Waiting for confirmations...");
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log(`Transaction confirmed: ${receipt.status}`);
    console.log(`Block: ${receipt.blockNumber}`);
    console.log(
      `[Minted] ${MINT_VALUE.toString()} decimal units to account ${cropAddress(
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
