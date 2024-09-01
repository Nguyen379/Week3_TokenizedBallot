// npx ts-node --files ./scripts/CheckVotes.ts

import { viem } from "hardhat";
import { createPublicClient, http, createWalletClient, hexToString } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import * as dotenv from "dotenv";
import {
  abi,
  bytecode,
} from "../artifacts/contracts/TokenizedBallot.sol/TokenizedBallot.json";
dotenv.config();

/// CONSTANTS
const providerApiKey = process.env.ALCHEMY_API_KEY || "";
const deployerPrivateKey = process.env.PRIVATE_KEY || "";

async function main() {
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

	console.log("Proposals:");
	for (let index = 0; index < 3; index++) {
		const proposal = (await publicClient.readContract({
			address: "0x2bd6a1160bb05d2ea9ac57cb4584fca3c32e5d52",
			abi,
			functionName: "proposals",
			args: [BigInt(index)]
		})) as any[];
		const name = hexToString(proposal[0], { size: 32 });
		console.log({ index, name, proposal });
	}
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
