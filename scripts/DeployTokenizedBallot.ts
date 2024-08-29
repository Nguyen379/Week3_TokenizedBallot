// npx ts-node --files ./scripts/DeployTokenizedBallot.ts TOKEN_CONTRACT BLOCK_DURATION PROPOSAL_NAMES
// npx ts-node --files ./scripts/DeployTokenizedBallot.ts 0x2b168b730786420892a8a575823e5fa9e7797983 14400 "Proposal1" "Proposal2" "Proposal3"
// https://sepolia.etherscan.io/tx/0xf0ff28a4fdb003e884e3ba497e09f487cecde17a0d7b7f6a3298b2ab33c094c2
// https://sepolia.etherscan.io/address/0x2f21fdeccb32a0b580e7fbb9517a2a63d3af690f


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

function validateParams(parameters: string[]){
  if (!parameters || parameters.length < 4) {
    console.log(parameters);
    throw new Error("Invalid number of parameters");
  }

  const tokenAddress = parameters[0] as `0x${string}`;
  if (!tokenAddress)
    throw new Error("MyToken contract address not provided");
  if (!/^0x[a-fA-F0-9]{40}$/.test(tokenAddress))
    throw new Error("Invalid MyToken contract address");

  const blockDuration = parameters[1];
  if (isNaN(Number(blockDuration)) || Number(blockDuration) < 1)
    throw new Error("Invalid duration");

  const proposals = parameters.slice(2);
  if (!proposals || proposals.length < 1)
    throw new Error("Proposals not provided");

  return {
    tokenAddress,
    blockDuration,
    proposals,
  };
}

/// MAIN FUNCTION
async function main() {

  const { tokenAddress, blockDuration, proposals } = validateParams(process.argv.slice(2));

  console.log("Proposals: ");
  proposals.forEach((element, index) => {
    console.log(`Proposal #${index + 1}: ${element}`);
  });
  console.log(`ERC20 Token Contract Address: ${tokenAddress}`);

  /// CREATE PUBLICCLIENT TO CONNECT TO SEPOLIA TESTNET USING POKT GATEWAY
  console.log("\nConnecting to blockchain with publicClient...")
  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(`https://eth-sepolia.g.alchemy.com/v2/${providerApiKey}`),
  });
	
  /// - PROVIDE PROOF OF SUCCESSFUL PUBLICCLIENT CREATION
  let blockNumber = await publicClient.getBlockNumber();
  console.log("Last block number:", blockNumber);
  /// - SET pastBlockNumber parameter
  const targetBlockNumber = blockNumber + blockDuration;

  /// SETUP WALLET CLIENT USING MY PRIVATE KEY
  console.log("\nSetting up deployer wallet...")
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
      targetBlockNumber
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
      args: [BigInt(index)]
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
