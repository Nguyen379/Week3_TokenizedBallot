import { viem } from "hardhat";
import { createPublicClient, http, createWalletClient, parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import * as dotenv from "dotenv";

dotenv.config();

const providerApiKey = process.env.ALCHEMY_API_KEY || "";
const deployerPrivateKey = process.env.PRIVATE_KEY || "";
const BALLOT_CONTRACT_ADDRESS = process.env.BALLOT_CONTRACT_ADDRESS || "";

async function main() {
  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(`https://eth-sepolia.g.alchemy.com/v2/${providerApiKey}`)
  });

  const account = privateKeyToAccount(`0x${deployerPrivateKey}`);
  const walletClient = createWalletClient({
    account,
    chain: sepolia,
    transport: http(`https://eth-sepolia.g.alchemy.com/v2/${providerApiKey}`)
  });

  const tokenizedBallotContract = await viem.getContractAt("TokenizedBallot", "0xa303307108833e804c763ab3f4438486f7db78be");

  console.log("Voting on proposals...");

  // Vote on proposals
  const voteTx1 = await tokenizedBallotContract.write.vote([0n, parseEther("5")], {
    account: account.address,
  });
  await publicClient.waitForTransactionReceipt({ hash: voteTx1 });
  console.log(`Account ${account.address} voted 5 tokens for proposal 0`);

  // Check voting results
  for (let i = 0; i < 3; i++) {
    const proposal = await tokenizedBallotContract.read.proposals([BigInt(i)]);
    console.log(`Proposal ${i}: ${proposal[0]} has ${proposal[1]} votes`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
