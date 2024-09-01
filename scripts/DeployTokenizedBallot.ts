// npx ts-node --files ./scripts/DeployTokenizedBallot.ts TOKEN_CONTRACT BLOCK_DURATION PROPOSAL_NAMES
// npx ts-node --files ./scripts/DeployTokenizedBallot.ts 0x2b168b730786420892a8a575823e5fa9e7797983 5 "Proposal 1" "Proposal 2" "Proposal 3"
// https://sepolia.etherscan.io/tx/0x37926640f4059ccf211788449d856a2c97aef36c2950bc9b7ddc021a5d004057
// https://sepolia.etherscan.io/address/0x2bd6a1160bb05d2ea9ac57cb4584fca3c32e5d52

import { privateKeyToAccount } from "viem/accounts";
import {
  createPublicClient,
  http,
  createWalletClient,
  formatEther,
  toHex,
  hexToString,
} from "viem";
import { sepolia } from "viem/chains";
import {
  abi,
  bytecode,
} from "../artifacts/contracts/TokenizedBallot.sol/TokenizedBallot.json";
import * as dotenv from "dotenv";
import * as readline from "readline";

dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (questionText: string) =>
  new Promise<string>((resolve) => rl.question(questionText, resolve));

/// CONSTANTS
const providerApiKey = process.env.ALCHEMY_API_KEY || "";
const deployerPrivateKey = process.env.PRIVATE_KEY || "";

function validateParams(parameters: string[]) {
  if (!parameters || parameters.length < 4) {
    console.log(parameters);
    throw new Error("Invalid number of parameters");
  }

  const tokenAddress = parameters[0] as `0x${string}`;
  if (!tokenAddress) throw new Error("MyToken contract address not provided");
  if (!/^0x[a-fA-F0-9]{40}$/.test(tokenAddress))
    throw new Error("Invalid MyToken contract address");

  let blockDuration = Number(parameters[1]);
  if (isNaN(blockDuration) || !(blockDuration >= 1))
    throw new Error("Invalid duration");

  const proposals = parameters.slice(2);
  if (!proposals || proposals.length < 1)
    throw new Error("Proposals not provided");

  return {
    tokenAddress,
    blockDuration: BigInt(blockDuration),
    proposals,
  };
}

/// MAIN FUNCTION
async function main() {
  const { tokenAddress, blockDuration, proposals } = validateParams(
    process.argv.slice(2)
  );

  console.log("Proposals: ");
  proposals.forEach((element, index) => {
    console.log(`Proposal #${index + 1}: ${element}`);
  });
  console.log(`ERC20 Token Contract Address: ${tokenAddress}`);

  /// CREATE PUBLIC CLIENT TO CONNECT TO SEPOLIA TESTNET USING POKT GATEWAY
  console.log("\nConnecting to blockchain with publicClient...");
  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(`https://eth-sepolia.g.alchemy.com/v2/${providerApiKey}`),
  });

  /// Set targetBlockNumber
  let blockNumber: bigint = await publicClient.getBlockNumber();
  console.log("Last block number:", blockNumber);
  const targetBlockNumber: bigint = blockNumber + blockDuration;
  console.log(`Target block number: ${targetBlockNumber}`);

  /// SETUP WALLET CLIENT USING MY PRIVATE KEY
  console.log("\nSetting up deployer wallet...");
  const account = privateKeyToAccount(`0x${deployerPrivateKey}`);
  const deployer = createWalletClient({
    account: account,
    chain: sepolia,
    transport: http(`https://eth-sepolia.g.alchemy.com/v2/${providerApiKey}`),
  });

  /// - LOG DEPLOYER ACCOUNT ADDRESS ON TESTNET
  console.log("Deployer address:", deployer.account.address);
  /// - PROVIDE PROOF OF SUCCESSFUL WALLET CLIENT CREATION
  const balance = await publicClient.getBalance({
    address: deployer.account.address,
  });
  console.log(
    "Deployer balance: ",
    formatEther(balance),
    deployer.chain.nativeCurrency.symbol
  );

  /// DEPLOY TOKENIZED BALLOT CONTRACT TO TESTNET
  console.log("\nDeploying TokenizedBallot contract...");
  const hash = await deployer.deployContract({
    abi,
    bytecode: bytecode as `0x${string}`,
    args: [
      proposals.map((prop) => toHex(prop, { size: 32 })),
      tokenAddress,
      targetBlockNumber,
    ],
  });
  /// - LOG PROOF OF SUCCESSFUL DEPLOYMENT TRANSACTION
  console.log("Transaction hash:", hash);
  /// - REQUEST DEPLOYMENT TRANSACTION RECEIPT
  console.log("Waiting for confirmations...");
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  /// - LOG CONTRACT ADDRESS FROM RECEIPT
  console.log("Ballot contract deployed to:", receipt.contractAddress);
  // - JUAN'S TYPE CHECK FOR CONTRACT ADDRESS (TO AVOID TYPESCRIPT ERROR)
  if (!receipt.contractAddress) {
    console.log("Contract deployment failed");
    return;
  }

  console.log("Proposals:");
  for (let index = 0; index < proposals.length; index++) {
    const proposal = (await publicClient.readContract({
      address: receipt.contractAddress as `0x${string}`,
      abi,
      functionName: "proposals",
      args: [BigInt(index)],
    })) as any[];
    const name = hexToString(proposal[0], { size: 32 });
    console.log({ index, name, proposal });
  }

  // /// CHECK VOTING RIGHTS OF DEPLOYER
  // console.log("\nChecking Deployer's voting rights...");
  // const deployerVotingRights = await publicClient.readContract({
  //   address: tokenAddress as `0x${string}`,
  //   abi: myERC20TokenContractAbi,
  //   functionName: "getVotes",
  //   args: [deployer.account.address]
  // });
  // console.log(`Deployer has ${deployerVotingRights} of voting tokens`)

  // /// DEPLOYER SELF-DELEGATES VOTING RIGHTS
  // const deployerDelegateVotingRights = await deployer.writeContract({
  //   address: tokenAddress as `0x${string}`,
  //   abi: myERC20TokenContractAbi,
  //   functionName: "delegate",
  //   account: deployerAcct,
  //   args: [deployer.account.address],
  // });
  // console.log(`Deployer has delegated himself voting tokens`)

  // await waitForTransactionSuccess(publicClient, deployerDelegateVotingRights);

  // // ? the abi you are using is the abi of the TokenizedBallot contract, not the ERC20 contract
  // // ? thus the error 'Function "getVotes" not found on ABI'.
  // // CHECK VOTING RIGHTS OF DEPLOYER
  // const deployerVotingRightsAfter = await publicClient.readContract({
  //   address: myERC20TokenContract as `0x${string}`,
  //   abi: myERC20TokenContractAbi,
  //   functionName: "getVotes",
  //   args: [deployer.account.address],
  // });
  // console.log(`Deployer has ${deployerVotingRightsAfter} of voting tokens`)
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
