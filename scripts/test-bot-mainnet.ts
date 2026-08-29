import { ethers } from "ethers";
import * as dotenv from "dotenv";
import * as fs from "fs";

dotenv.config();

const CONTRACT_ADDRESS = "0x7D4d65AA41dA0e321ad52e46E9120F07D55B5284";
const RPC_URL = "https://rpc.botchain.ai";
const PRIVATE_KEY = process.env.PRIVATE_KEY!;

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log("Testing on BOT Chain Mainnet with account:", wallet.address);

  const balance = await provider.getBalance(wallet.address);
  console.log("Balance:", ethers.formatEther(balance), "BOT");

  const artifact = JSON.parse(
    fs.readFileSync("./artifacts/contracts/StacksBitEscrow.sol/StacksBitEscrow.json", "utf8")
  );
  const escrow = new ethers.Contract(CONTRACT_ADDRESS, artifact.abi, wallet);

  // Step 1 — Register merchant
  console.log("\n1. Registering merchant on mainnet...");
  const tx1 = await escrow.registerMerchant("StacksBit Mainnet Merchant", "mainnet@stacksbit.com");
  await tx1.wait();
  console.log("✅ Merchant registered! TX:", tx1.hash);

  // Step 2 — Create payment
  console.log("\n2. Creating payment on mainnet...");
  const tx2 = await escrow.createPayment("Mainnet test payment");
  const receipt2 = await tx2.wait();
  console.log("✅ Payment created! TX:", tx2.hash);

  // Get payment ID
  const iface = new ethers.Interface(artifact.abi);
  let paymentId = BigInt(1);
  for (const log of receipt2.logs) {
    try {
      const parsed = iface.parseLog(log);
      if (parsed?.name === "PaymentCreated") {
        paymentId = parsed.args[0];
        break;
      }
    } catch {
      continue;
    }
  }
  console.log("   Payment ID:", paymentId.toString());

  console.log("\n🎉 BOT Chain Mainnet flow verified!");
  console.log("Contract Explorer: https://scan.botchain.ai/address/" + CONTRACT_ADDRESS);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});