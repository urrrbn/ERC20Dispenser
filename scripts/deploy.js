const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  const TOTAL_TOKENS_TO_DISTRIBUTE = ethers.parseEther("700000");
  const BENEFICIARY_ADDRESS = '0x2732a66C3E959BAF91ffD7BEAeF882adC23d9cA7';

  console.log("Deploying contracts with the account:", await deployer.getAddress());

  const DISPENSER = await ethers.getContractFactory("ERC20Dispenser");
  const TOKEN = await ethers.getContractFactory("MyToken");

  const token = await TOKEN.deploy();
  await token.waitForDeployment();

  const TOKEN_ADDRESS = await token.getAddress();

  const dispenser = await DISPENSER.deploy(TOKEN_ADDRESS, BENEFICIARY_ADDRESS);
  await dispenser.waitForDeployment();

  DISPENSER_ADDRESS = await dispenser.getAddress();

  await token.transfer(DISPENSER_ADDRESS, TOTAL_TOKENS_TO_DISTRIBUTE);

  console.log('DISPENSER deployed to:', DISPENSER_ADDRESS);
  console.log('Token deployed to:', TOKEN_ADDRESS);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });