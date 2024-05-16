const { expect } = require("chai");
const { ethers } = require("hardhat");
const helpers = require("@nomicfoundation/hardhat-network-helpers");

describe("ERC20TokenDispenser", function () {
  let dispenser;
  let token;
  let deployer;
  let beneficiary;
  let DISPENSER_ADDRESS;
  let BENEFICIARY_ADDRESS;
  let TOKEN_ADDRESS;
  let deployTimestamp;
  let snapshot;

  const TOTAL_TOKENS_TO_DISTRIBUTE = ethers.parseEther("700000");
  const MAX_TOKENS_A_MONTH = ethers.parseEther("10000");
  const LIMIT_TOKENS = ethers.parseEther("100");

  // first 12 years peceentages
  const percentages = [10, 25, 50, 100, 50, 50, 50, 50, 25, 25, 25, 25];

  // first 12 years monthly amounts
  const expectedAmounts = percentages.map(percent => (MAX_TOKENS_A_MONTH * BigInt(percent)) / 100n);
  const MONTH = 2592000;
  const DAY = 86400;
  const YEAR = 31556952;
  

  async function withdraw(signer) {
    await dispenser.connect(signer).withdraw();
  }


  async function deployAnSetContracts() {
    [deployer, beneficiary] = await ethers.getSigners();

    BENEFICIARY_ADDRESS = await beneficiary.getAddress();

    const MyToken = await ethers.getContractFactory("MyToken");
    token = await MyToken.deploy();
    await token.waitForDeployment();

    TOKEN_ADDRESS = await token.getAddress();

    deployTimestamp = BigInt((await ethers.provider.getBlock('latest')).timestamp);

    const ERC20Dispenser = await ethers.getContractFactory("ERC20Dispenser");
    dispenser = await ERC20Dispenser.deploy(TOKEN_ADDRESS, BENEFICIARY_ADDRESS);
    await dispenser.waitForDeployment();

    DISPENSER_ADDRESS = await dispenser.getAddress();

    await token.transfer(DISPENSER_ADDRESS, TOTAL_TOKENS_TO_DISTRIBUTE);

    snapshot = await helpers.takeSnapshot();
  } 


  describe("Initialization", function () {

    before(deployAnSetContracts);
  
    it("should set the maximum tokens per month correctly", async function () {
        expect(await dispenser.getMaxTokensAMonth()).to.equal(MAX_TOKENS_A_MONTH);
    });

    it("should have the correct total tokens to distribute", async function () {
        expect(await dispenser.getTotalTokensToDistribute()).to.equal(TOTAL_TOKENS_TO_DISTRIBUTE);
    });
  
    it("should have the correct beneficiary address", async function () {
        expect(await dispenser.getBeneficiary()).to.equal(BENEFICIARY_ADDRESS);
    });
  
    it("should have the correct token address", async function () {
        expect(await dispenser.getToken()).to.equal(TOKEN_ADDRESS);
    });
  
    it("should set start moment correctly around deployment time", async function () {
        const startMoment = await dispenser.getStartMoment();
        expect(startMoment).to.be.gte(deployTimestamp);
        expect(startMoment).to.be.lte(deployTimestamp + 5n);
    });
  
    it("should have the correct token balance at the dispenser", async function () {
        expect(await token.balanceOf(DISPENSER_ADDRESS)).to.equal(TOTAL_TOKENS_TO_DISTRIBUTE);
    });
  });


  describe("Withdraw exceptions", function () {
    this.beforeEach(deployAnSetContracts);

    it("shouldn't be able to withdraw if msg.sender is not beneficiary", async function () {
        await expect(withdraw(deployer))
        .to.be.revertedWith("Only the beneficiary.");
    });


    it("shouldn't be able to withdraw more than once in a month", async function () {
        expect(await dispenser._canWithdraw()).to.equal(true);
        await withdraw(beneficiary);


        expect(await dispenser._canWithdraw()).to.equal(false);
        await expect(withdraw(beneficiary))
        .to.be.revertedWith("Can't");

        await snapshot.restore();
    });

    it("shouldn't be able to withdraw when the dispenser is empyy", async function () {
        // Increase time to + 2 years
        await helpers.time.increase(YEAR * 29);
        expect(await dispenser._canWithdraw()).to.equal(true);
        
        // Withdraw the remaining tokens
        await withdraw(beneficiary);
        
        expect(await dispenser._canWithdraw()).to.equal(false);
        await expect(withdraw(beneficiary))
        .to.be.revertedWith("Can't");

        await snapshot.restore();
    });
  });


  describe("Withdraw", function () {
    before(deployAnSetContracts);

    it("should withdraw every year monthly according to the schedule and the rest after payout drops to less than 100 tokens", async function () {
      
      expect(await token.balanceOf(BENEFICIARY_ADDRESS)).to.equal(0);

      let prevBalance = BigInt(0); 
      async function monthlyWithdrawals(amount) {
        for (let i = 0; i < 12; i++) {
          await withdraw(beneficiary);

          const newBalance = await token.balanceOf(BENEFICIARY_ADDRESS);
          expect(newBalance).to.equal(prevBalance + amount);
          await helpers.time.increase(MONTH);
          // Update prevBalance for the next iteration
          prevBalance = newBalance;
        }
      }

      // Perform withdrawals for the first 12 years using expected amounts
      for (let i = 0; i < expectedAmounts.length; i++) {
        await monthlyWithdrawals(expectedAmounts[i]);
      }

      // Start halving the payout every 4 years after the initial 12 years
      let currentAmount = expectedAmounts[11] / 2n;
      let yearCount = 0;

      while (currentAmount >= ethers.parseEther('100')) { 
        await monthlyWithdrawals(currentAmount);

        yearCount++; // Increment the year counter after each full year of withdrawals

        if (yearCount % 4 === 0) { // Check if 4 years have passed
          currentAmount /= 2n; // Halve the payout every 4 years
        }
      }

      // Withdraw the rest after payot is less then or equal 100
      const beneficiaryBalance = await token.balanceOf(BENEFICIARY_ADDRESS);
      const contractBalance = await token.balanceOf(DISPENSER_ADDRESS);

      await withdraw(beneficiary);

      expect(await token.balanceOf(BENEFICIARY_ADDRESS)).to.equal(contractBalance + beneficiaryBalance);
      expect(await dispenser._canWithdraw()).to.equal(false);
      await snapshot.restore();
    });
  });


  describe("Edge Cases", function () {
    this.beforeEach(deployAnSetContracts);

    it("should withdraw the correct amount in a random month (2)", async function () {
      // Increase time for 45 days 
      await helpers.time.increase(MONTH + (DAY * 15));

      expect(await dispenser._canWithdraw()).to.equal(true);

      await withdraw(beneficiary);

      expect(await token.balanceOf(BENEFICIARY_ADDRESS)).to.equal(expectedAmounts[0]);
      const time1 = await helpers.time.latest();

      await snapshot.restore();
    });

    it("should withdraw the correct amount in a random month (12th)", async function () {
      // Increase time for 1 year
      await helpers.time.increase(YEAR);

      expect(await dispenser._canWithdraw()).to.equal(true);

      await withdraw(beneficiary);

      expect(await token.balanceOf(BENEFICIARY_ADDRESS)).to.equal(expectedAmounts[1]);

      await snapshot.restore();
    });

    it("should withdraw the correct amount in a random year (29th)", async function () {
      // Increase time for 29 years
      await helpers.time.increase(YEAR * 29);

      expect(await dispenser._canWithdraw()).to.equal(true);

      await withdraw(beneficiary);

      expect(await token.balanceOf(BENEFICIARY_ADDRESS)).to.equal(TOTAL_TOKENS_TO_DISTRIBUTE);

      await snapshot.restore();
    });

  })


});
