import { ethers } from "ethers";
import { readFileSync } from "fs";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  console.log("Deploying StacksBit Escrow to Flare Coston2...");

  // Connect to Coston2
  const provider = new ethers.JsonRpcProvider(
    "https://coston2-api.flare.network/ext/C/rpc"
  );

  const privateKey = process.env.PRIVATE_KEY || "";
  const deployer = new ethers.Wallet(privateKey, provider);
  console.log("Deploying with account:", deployer.address);

  const balance = await provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "C2FLR");

  // Load compiled contract
  const artifactPath = "./artifacts/contracts/StacksBitEscrow.sol/StacksBitEscrow.json";
  const artifact = JSON.parse(readFileSync(artifactPath, "utf8"));

  const factory = new ethers.ContractFactory(
    artifact.abi,
    artifact.bytecode,
    deployer
  );

  const escrow = await factory.deploy();
  await escrow.waitForDeployment();

  const address = await escrow.getAddress();
  console.log("✅ StacksBit Escrow deployed to:", address);
  console.log("🔗 Explorer: https://coston2.testnet.flarescan.com/address/" + address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});