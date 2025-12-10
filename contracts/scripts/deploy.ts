import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("🐝 Deploying Beehive contracts...");
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

  // Check if we're on local network (need to deploy mock USDT)
  const network = await ethers.provider.getNetwork();
  const isLocal = network.chainId === 31337n;
  
  let usdtAddress: string;
  
  if (isLocal) {
    // Deploy Mock USDT for local testing
    console.log("\n1️⃣ Deploying MockUSDT (local testing)...");
    const MockUSDT = await ethers.getContractFactory("MockUSDT");
    const mockUSDT = await MockUSDT.deploy();
    await mockUSDT.waitForDeployment();
    usdtAddress = await mockUSDT.getAddress();
    console.log("✅ MockUSDT deployed to:", usdtAddress);
  } else {
    // Use real USDT for mainnet/testnet
    // BSC Mainnet USDT: 0x55d398326f99059fF775485246999027B3197955
    // BSC Testnet: Use a mock or test token
    usdtAddress = process.env.USDT_ADDRESS || "0x55d398326f99059fF775485246999027B3197955";
    console.log("\n1️⃣ Using existing USDT at:", usdtAddress);
  }

  // Get platform wallet from env or use deployer
  const platformWallet = process.env.PLATFORM_WALLET || deployer.address;
  
  // Base URI for NFT metadata
  const baseURI = process.env.METADATA_BASE_URI || "https://api.beehive.io/metadata/";

  console.log("\n📋 Configuration:");
  console.log("Platform Wallet:", platformWallet);
  console.log("USDT Address:", usdtAddress);
  console.log("Base URI:", baseURI);

  // Step 2: Deploy BCC Token
  console.log("\n2️⃣ Deploying BCCToken...");
  const BCCToken = await ethers.getContractFactory("BCCToken");
  const bccToken = await BCCToken.deploy();
  await bccToken.waitForDeployment();
  const bccAddress = await bccToken.getAddress();
  console.log("✅ BCCToken deployed to:", bccAddress);

  // Step 3: Deploy BeehiveMembership
  console.log("\n3️⃣ Deploying BeehiveMembership...");
  const BeehiveMembership = await ethers.getContractFactory("BeehiveMembership");
  const membership = await BeehiveMembership.deploy(usdtAddress, platformWallet, baseURI);
  await membership.waitForDeployment();
  const membershipAddress = await membership.getAddress();
  console.log("✅ BeehiveMembership deployed to:", membershipAddress);

  // Step 4: Deploy BeehiveRewards
  console.log("\n4️⃣ Deploying BeehiveRewards...");
  const BeehiveRewards = await ethers.getContractFactory("BeehiveRewards");
  const rewards = await BeehiveRewards.deploy(usdtAddress);
  await rewards.waitForDeployment();
  const rewardsAddress = await rewards.getAddress();
  console.log("✅ BeehiveRewards deployed to:", rewardsAddress);

  // Step 5: Link contracts
  console.log("\n5️⃣ Linking contracts...");
  
  const tx1 = await membership.setRewardsContract(rewardsAddress);
  await tx1.wait();
  console.log("✅ Membership.setRewardsContract done");

  const tx2 = await rewards.setMembershipContract(membershipAddress);
  await tx2.wait();
  console.log("✅ Rewards.setMembershipContract done");

  const tx3 = await rewards.setBCCToken(bccAddress);
  await tx3.wait();
  console.log("✅ Rewards.setBCCToken done");

  const tx4 = await bccToken.addMinter(rewardsAddress);
  await tx4.wait();
  console.log("✅ BCCToken.addMinter done");

  // Step 6: Fund contracts for local testing
  if (isLocal) {
    console.log("\n6️⃣ Funding contracts for local testing...");
    const MockUSDT = await ethers.getContractFactory("MockUSDT");
    const mockUSDT = MockUSDT.attach(usdtAddress);
    
    // Transfer USDT to rewards contract for payouts
    const fundTx = await mockUSDT.transfer(rewardsAddress, ethers.parseUnits("100000", 6));
    await fundTx.wait();
    console.log("✅ Transferred 100,000 USDT to rewards contract");
    
    // Transfer BCC to rewards contract for payouts
    const bccFundTx = await bccToken.transfer(rewardsAddress, ethers.parseUnits("1000000", 18));
    await bccFundTx.wait();
    console.log("✅ Transferred 1,000,000 BCC to rewards contract");
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("🎉 DEPLOYMENT COMPLETE!");
  console.log("=".repeat(60));
  console.log("\n📝 Contract Addresses:");
  console.log(`USDT:              ${usdtAddress}`);
  console.log(`BCCToken:          ${bccAddress}`);
  console.log(`BeehiveMembership: ${membershipAddress}`);
  console.log(`BeehiveRewards:    ${rewardsAddress}`);
  
  console.log("\n📋 Environment Variables (copy to .env):");
  console.log(`NEXT_PUBLIC_USDT_CONTRACT=${usdtAddress}`);
  console.log(`NEXT_PUBLIC_BCC_TOKEN_CONTRACT=${bccAddress}`);
  console.log(`NEXT_PUBLIC_MEMBERSHIP_CONTRACT=${membershipAddress}`);
  console.log(`NEXT_PUBLIC_REWARDS_CONTRACT=${rewardsAddress}`);

  if (!isLocal) {
    console.log("\n🔍 Verification Commands:");
    console.log(`npx hardhat verify --network ${network.name} ${bccAddress}`);
    console.log(`npx hardhat verify --network ${network.name} ${membershipAddress} "${usdtAddress}" "${platformWallet}" "${baseURI}"`);
    console.log(`npx hardhat verify --network ${network.name} ${rewardsAddress} "${usdtAddress}"`);
  } else {
    console.log("\n💡 Local Testing Tips:");
    console.log("- Use Hardhat account #0 in MetaMask (has 10,000 ETH + 1M USDT)");
    console.log("- Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80");
    console.log("- Get more test USDT: call mockUSDT.faucet(address, amount)");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
