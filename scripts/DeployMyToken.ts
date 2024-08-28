// npx ts-node --files ./scripts/DeployMyToken.ts
// https://sepolia.etherscan.io/address/0x2b168b730786420892a8a575823e5fa9e7797983

import { createPublicClient, http, createWalletClient, formatEther } from "viem";

import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { abi, bytecode } from "../artifacts/contracts/MyToken.sol/MyToken.json";
import * as dotenv from "dotenv";
dotenv.config();

const providerApiKey = process.env.ALCHEMY_API_KEY || "";
const deployerPrivateKey = process.env.PRIVATE_KEY || "";

async function main() {
	// Create public client
  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(`https://eth-sepolia.g.alchemy.com/v2/${providerApiKey}`),
  });
  const blockNumber = await publicClient.getBlockNumber();
  console.log("Last block number:", blockNumber);

	// create wallet client
  const account = privateKeyToAccount(`0x${deployerPrivateKey}`);
  const deployer = createWalletClient({
    account,
    chain: sepolia,
    transport: http(`https://eth-sepolia.g.alchemy.com/v2/${providerApiKey}`),
  });
  console.log("Deployer address:", deployer.account.address);
  const balance = await publicClient.getBalance({
    address: deployer.account.address,
  });
  console.log(
    "Deployer balance:",
    formatEther(balance),
    deployer.chain.nativeCurrency.symbol
  );

  // DEPLOY MYERC20TOKEN CONTRACT TO TESTNET
  console.log("\nDeploying MyERC20Token contract...");
  const deployment = await deployer.deployContract({
    abi,
    bytecode: bytecode as `0x${string}`,
  });
  // - LOG PROOF OF SUCCESSFUL CONTRACT DEPLOYMENT TRANSACTION
  console.log("Contract deployment transaction hash:", deployment);
  // - REQUEST DEPLOYMENT TRANSACTION RECEIPT
  console.log("Waiting for confirmations...");
  const deploymentReceipt = await publicClient.waitForTransactionReceipt({
    hash: deployment,
  });
  const contractAddress = deploymentReceipt.contractAddress;
  // - LOG CONTRACT ADDRESS FROM RECEIPT
  console.log("MyERC20 contract deployed to:", contractAddress, "\n");
  // - JUAN'S TYPE CHECK FOR CONTRACTADDRESS (TO AVOID TYPESCRIPT ERROR)
  if (!contractAddress) {
    console.log("Contract deployment failed");
    return;
    }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
