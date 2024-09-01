// npx ts-node --files ./scripts/DelegateVote.ts TOKEN_ADDRESS DELEGATE_ADDRESS
// npx ts-node --files ./scripts/DelegateVote.ts 0x2b168b730786420892a8a575823e5fa9e7797983 0x3aF0630677Cab3c5cEA8BBC67e4e96DaaDE21305
// npx ts-node --files ./scripts/DelegateVote.ts 0x2b168b730786420892a8a575823e5fa9e7797983 0x5aa7Fb0f965572a5639A84EEEcF34BFD9068d58c
// npx ts-node --files ./scripts/DelegateVote.ts 0x2b168b730786420892a8a575823e5fa9e7797983 0xB6E7F3CF13b3000a2B0F5ea0C6202D91C7c3ff94
// https://sepolia.etherscan.io/tx/0x6a23cb9c92e8dad2bb2a4643d7f2b09b8d9c9b989ec67dec1d6710443b10d02a
// https://sepolia.etherscan.io/tx/0xa924098e3f55865a241c3a1700d1f3190e2ccc5e410e00031f0efc38a875dc72
// https://sepolia.etherscan.io/tx/0x10558c89b386a76ee628cc1ba0c9bda5c679909359d7b18d8aac4d87c2a3527c

import { viem } from "hardhat";
import {
  createPublicClient,
  http,
  createWalletClient,
  hexToString,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import * as dotenv from "dotenv";
import * as readline from "readline";
import { abi, bytecode } from "../artifacts/contracts/MyToken.sol/MyToken.json";

dotenv.config();

const providerApiKey = process.env.ALCHEMY_API_KEY || "";
const deployerPrivateKey = process.env.PRIVATE_KEY || "";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (questionText: string) =>
  new Promise<string>((resolve) => rl.question(questionText, resolve));

function validateParams(parameters: string[]) {
  if (!parameters || parameters.length != 2) {
    console.log(parameters);
    throw new Error("Invalid number of parameters");
  }

  const tokenAddress = parameters[0] as `0x${string}`;
  if (!tokenAddress) throw new Error("tokenAddress not provided");
  if (!/^0x[a-fA-F0-9]{40}$/.test(tokenAddress))
    throw new Error("Invalid MyToken contract address");

  const delegateAddress = parameters[1] as `0x${string}`;
  if (!delegateAddress) throw new Error("delegateAddress not provided");
  if (!/^0x[a-fA-F0-9]{40}$/.test(delegateAddress))
    throw new Error("Invalid delegateAddress");

  return { tokenAddress, delegateAddress };
}

async function main() {
  const { tokenAddress, delegateAddress } = validateParams(
    process.argv.slice(2)
  );

  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(`https://eth-sepolia.g.alchemy.com/v2/${providerApiKey}`),
  });

  const account = privateKeyToAccount(`0x${deployerPrivateKey}`);
  const deployer = createWalletClient({
    account,
    chain: sepolia,
    transport: http(`https://eth-sepolia.g.alchemy.com/v2/${providerApiKey}`),
  });

  // Sending transaction on user confirmation
  const answer = await question(
    `Confirm delegating votes to ${delegateAddress} (Y/n): `
  );
  if (answer.toString().trim().toLowerCase() != "n") {
    const hash = await deployer.writeContract({
      address: tokenAddress,
      abi,
      functionName: "delegate",
      args: [delegateAddress],
    });
    console.log("Transaction hash:", hash);
    console.log("Waiting for confirmations...");
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log(`Transaction confirmed: ${receipt.status}`);
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
