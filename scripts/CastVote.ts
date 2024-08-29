// npx ts-node --files ./scripts/CastVote.ts BALLOT_ADDRESS PROPOSAL_INDEX AMOUNT
// npx ts-node --files ./scripts/CastVote.ts 0x2f21fdeccb32a0b580e7fbb9517a2a63d3af690f 1 100

import { viem } from "hardhat";
import { createPublicClient, http, createWalletClient, hexToString } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import * as dotenv from "dotenv";
import * as readline from "readline";
import {
  abi,
  bytecode,
} from "../artifacts/contracts/TokenizedBallot.sol/TokenizedBallot.json";
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
  if (!parameters || parameters.length != 3) {
		console.log(parameters);
    throw new Error("Invalid number of parameters");
  }

  const ballotAddress = parameters[0] as `0x${string}`;
  if (!ballotAddress)
    throw new Error("MyToken contract address not provided");
  if (!/^0x[a-fA-F0-9]{40}$/.test(ballotAddress))
    throw new Error("Invalid MyToken contract address");

  const proposalIndex = parameters[1];
	if (isNaN(Number(proposalIndex))) throw new Error("Invalid valid");


  const VOTES = parameters[2];
  if (isNaN(Number(VOTES))) throw new Error("Invalid number of votes");

  return { ballotAddress, proposalIndex, VOTES };
}

async function main() {
	const { ballotAddress, proposalIndex, VOTES } = validateParams(process.argv.slice(2));

	const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(`https://eth-sepolia.g.alchemy.com/v2/${providerApiKey}`)
  });

  const account = privateKeyToAccount(`0x${deployerPrivateKey}`);
  const deployer = createWalletClient({
    account,
    chain: sepolia,
    transport: http(`https://eth-sepolia.g.alchemy.com/v2/${providerApiKey}`)
  });

	// Attaching the contract and checking the selected option
	const proposal = (await publicClient.readContract({
		address: ballotAddress,
		abi,
		functionName: "proposals",
		args: [BigInt(proposalIndex)],
	})) as any[];
	const name = hexToString(proposal[0], { size: 32 });

	// Sending transaction on user confirmation
	const answer = await question(`Confirm cast ${VOTES} to ${name} (Y/n): `);
	if (answer.toString().trim().toLowerCase() != "n") {
		const hash = await deployer.writeContract({
			address: ballotAddress,
			abi,
			functionName: "vote",
			args: [proposalIndex, VOTES],
		});
		console.log("Transaction hash:", hash);
		console.log("Waiting for confirmations...");
		const receipt = await publicClient.waitForTransactionReceipt({ hash });
		console.log(`Transaction confirmed: ${receipt.status}`);
		console.log("CastVote deployed to:", receipt.contractAddress);
		
		if (!receipt.contractAddress) {
			console.log("Cast vote failed");
		} else {
			// Check voting results
			const proposalCount = await publicClient.readContract({
				address: ballotAddress,
				abi,
				functionName: "proposals",
				args: [],
			}) as any;

			console.log("Proposals:");
			for (let index = 0; index < proposalCount; index++) {
				const proposal = (await publicClient.readContract({
					address: receipt.contractAddress as `0x${string}`,
					abi,
					functionName: "proposals",
					args: [BigInt(index)]
				})) as any[];
				const name = hexToString(proposal[0], { size: 32 });
				console.log({ index, name, proposal });
			}
		}
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
