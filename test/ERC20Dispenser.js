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
  const percentages = [10, 25, 50, 100, 50, 50, 50, 50, 25, 25, 25, 25];
  const expectedAmounts = percentages.map(percent => (MAX_TOKENS_A_MONTH * BigInt(percent)) / 100n);
  const MONTH = 2592000;
  const DAY = 86400;
  

  async function withdraw(signer) {
    await dispenser.connect(signer).withdraw();
  }


  function checkHalvingThreshold(initialValue) {
    let value = initialValue;
    let iterations = 0; 

    while (value > LIMIT_TOKENS) {
      if (value /2n <= LIMIT_TOKENS) {
        break;  
      }
      value /= 2n;  
      iterations += 1;  
    }

    return iterations;
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

    it("should set the total tokens to distribute correctly", async function () {
        expect(await dispenser.getTotalTokensToDistribute()).to.equal(TOTAL_TOKENS_TO_DISTRIBUTE);
    });
  
    it("should set the maximum tokens per month correctly", async function () {
        expect(await dispenser.getMaxTokensAMonth()).to.equal(MAX_TOKENS_A_MONTH);
    });
  
    it("should set the limit tokens correctly", async function () {
        expect(await dispenser.getLimtTokens()).to.equal(LIMIT_TOKENS);
    });
  
    it("should start with total withdrawn as 0", async function () {
        expect(await dispenser.getTotalWithdrawn()).to.equal(0);
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
  
    it("should have the correct initial first year distribution amounts", async function () {  
        const firstYearAmounts = await dispenser.getFirstYearAmounts();
        for (let i = 0; i < 12; i++) {
            expect(firstYearAmounts[i]).to.equal(expectedAmounts[i]);
        }
    });
  
    it("should have the correct token balance at the dispenser", async function () {
        expect(await token.balanceOf(DISPENSER_ADDRESS)).to.equal(TOTAL_TOKENS_TO_DISTRIBUTE);
    });
  });


  describe("Withdraw exceptions", function () {
    this.beforeEach(deployAnSetContracts);

    it("shouldn't be able to withdraw more than once in a month", async function () {
        await withdraw(beneficiary);
  
        await helpers.time.increase(MONTH - 5000);

        expect(await dispenser._canWithdraw()).to.equal(false);

        await expect(withdraw(beneficiary))
        .to.be.revertedWith("Can't");

        await snapshot.restore();
    });

    it("shouldn't be able to withdraw if msg.sender is not beneficiary", async function () {
        expect(await dispenser._canWithdraw()).to.equal(true);

        await expect(withdraw(deployer))
        .to.be.revertedWith("Only the beneficiary.");
    });

    it("shouldn't be able to withdraw when the dispenser is empy", async function () {

        // Increase time to + 2 years
        await helpers.time.increase(MONTH * 24);
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

    it("should withdraw every month according to the schedule and the rest after payout drops to less than 100 tokens", async function () {

        expect(await token.balanceOf(BENEFICIARY_ADDRESS)).to.equal(0);

        let prevBalance = 0n;
        
        // Withdraw first 12 months
        for (let i = 0; i < 12; i++) {
          await withdraw(beneficiary);
          expect(await token.balanceOf(BENEFICIARY_ADDRESS)).to.equal(prevBalance + expectedAmounts[i]);

          await helpers.time.increase(MONTH);

          prevBalance = prevBalance + expectedAmounts[i];
        }
        
        const iterationsBeforeWithdrawalStops = checkHalvingThreshold(expectedAmounts[11]);
        let currentAmount = expectedAmounts[11] / 2n;
        
        // Withdraw the remaining portions after halving
        for (let i = 0; i < iterationsBeforeWithdrawalStops; i++) {
          await withdraw(beneficiary);
    
          let newBalance = await token.balanceOf(BENEFICIARY_ADDRESS);
          expect(newBalance).to.equal(prevBalance + currentAmount);
    
          prevBalance += currentAmount;
          currentAmount = currentAmount / 2n; 
    
          await helpers.time.increase(MONTH);
        }
 
        // Withdraw the rest after payot is less then or equal 100
        contractBalance = await token.balanceOf(DISPENSER_ADDRESS);
        beneficiaryBalance = await token.balanceOf(BENEFICIARY_ADDRESS);

        await withdraw(beneficiary);

        expect(await token.balanceOf(BENEFICIARY_ADDRESS)).to.equal(contractBalance + beneficiaryBalance);
        expect(await dispenser._canWithdraw()).to.equal(false);

        await snapshot.restore();
    });
  });


  describe("Edge Cases", function () {
    this.beforeEach(deployAnSetContracts);

    it("should withdraw the correct amount in a random month (1)", async function () {
      // Increase time for 15 days 
      await helpers.time.increase(DAY * 15);

      expect(await dispenser._canWithdraw()).to.equal(true);

      await withdraw(beneficiary);

      expect(await token.balanceOf(BENEFICIARY_ADDRESS)).to.equal(expectedAmounts[0]);
      const time1 = await helpers.time.latest();

      await snapshot.restore();
    });

    it("should withdraw the correct amount in a random month (2)", async function () {
      // Increase time for 45 days 
      await helpers.time.increase(MONTH + (DAY * 15));

      expect(await dispenser._canWithdraw()).to.equal(true);

      await withdraw(beneficiary);

      expect(await token.balanceOf(BENEFICIARY_ADDRESS)).to.equal(expectedAmounts[1]);
      const time1 = await helpers.time.latest();

      await snapshot.restore();
    });

    it("should withdraw the correct amount in a random month (3)", async function () {
      // Increase time for 2,5 month
      await helpers.time.increase((MONTH * 2) + (DAY * 15));

      expect(await dispenser._canWithdraw()).to.equal(true);

      await withdraw(beneficiary);

      expect(await token.balanceOf(BENEFICIARY_ADDRESS)).to.equal(expectedAmounts[2]);

      await snapshot.restore();
    });

    it("should withdraw the correct amount in a random month (4)", async function () {
      // Increase time for 3,5 month
      await helpers.time.increase((MONTH * 3) + (DAY * 15));

      expect(await dispenser._canWithdraw()).to.equal(true);

      await withdraw(beneficiary);

      expect(await token.balanceOf(BENEFICIARY_ADDRESS)).to.equal(expectedAmounts[3]);

      await snapshot.restore();
    });

    it("should withdraw the correct amount in a random month (5)", async function () {
      // Increase time for 4,5 month
      await helpers.time.increase((MONTH * 4) + (DAY * 15));

      expect(await dispenser._canWithdraw()).to.equal(true);

      await withdraw(beneficiary);

      expect(await token.balanceOf(BENEFICIARY_ADDRESS)).to.equal(expectedAmounts[4]);

      await snapshot.restore();
    });

    it("should withdraw the correct amount in a random month (6)", async function () {
      // Increase time for 5,5 month
      await helpers.time.increase((MONTH * 5) + (DAY * 15));

      expect(await dispenser._canWithdraw()).to.equal(true);

      await withdraw(beneficiary);

      expect(await token.balanceOf(BENEFICIARY_ADDRESS)).to.equal(expectedAmounts[5]);

      await snapshot.restore();
    });

    it("should withdraw the correct amount in a random month (7)", async function () {
      // Increase time for 6,5 month
      await helpers.time.increase((MONTH * 6) + (DAY * 15));

      expect(await dispenser._canWithdraw()).to.equal(true);

      await withdraw(beneficiary);

      expect(await token.balanceOf(BENEFICIARY_ADDRESS)).to.equal(expectedAmounts[6]);

      await snapshot.restore();
    });

    it("should withdraw the correct amount in a random month (8)", async function () {
      // Increase time for 7,5 month
      await helpers.time.increase((MONTH * 7) + (DAY * 15));

      expect(await dispenser._canWithdraw()).to.equal(true);

      await withdraw(beneficiary);

      expect(await token.balanceOf(BENEFICIARY_ADDRESS)).to.equal(expectedAmounts[7]);

      await snapshot.restore();
    });

    it("should withdraw the correct amount in a random month (9)", async function () {
      // Increase time for 8,5 month
      await helpers.time.increase((MONTH * 8) + (DAY * 15));
      expect(await dispenser._canWithdraw()).to.equal(true);


      await withdraw(beneficiary);

      expect(await token.balanceOf(BENEFICIARY_ADDRESS)).to.equal(expectedAmounts[8]);

      await snapshot.restore();
    });

    it("should withdraw the correct amount in a random month (10)", async function () {
      // Increase time for 9,5 month
      await helpers.time.increase((MONTH * 9) + (DAY * 15));
      expect(await dispenser._canWithdraw()).to.equal(true);


      await withdraw(beneficiary);

      expect(await token.balanceOf(BENEFICIARY_ADDRESS)).to.equal(expectedAmounts[9]);

      await snapshot.restore();
    });

    it("should withdraw the correct amount in a random month (11)", async function () {
      // Increase time for 10,5 month
      await helpers.time.increase((MONTH * 10) + (DAY * 15));
      expect(await dispenser._canWithdraw()).to.equal(true);


      await withdraw(beneficiary);

      expect(await token.balanceOf(BENEFICIARY_ADDRESS)).to.equal(expectedAmounts[10]);

      await snapshot.restore();
    });

    it("should withdraw the correct amount in a random month (12)", async function () {
      // Increase time for 11,5 month
      await helpers.time.increase((MONTH * 11) + (DAY * 15));
      expect(await dispenser._canWithdraw()).to.equal(true);


      await withdraw(beneficiary);

      expect(await token.balanceOf(BENEFICIARY_ADDRESS)).to.equal(expectedAmounts[11]);

      await snapshot.restore();
    });

    it("should withdraw the correct amount in a random month (13)", async function () {
      // Increase time for 12,5 month
      await helpers.time.increase((MONTH * 12) + (DAY * 15));
      expect(await dispenser._canWithdraw()).to.equal(true);


      await withdraw(beneficiary);

      expect(await token.balanceOf(BENEFICIARY_ADDRESS)).to.equal(expectedAmounts[11] / 2n);

      await snapshot.restore();
    });

    it("should withdraw the correct amount in a random month (14)", async function () {
      // Increase time for 13,5 month
      await helpers.time.increase((MONTH * 13) + (DAY * 15));
      expect(await dispenser._canWithdraw()).to.equal(true);


      await withdraw(beneficiary);

      expect(await token.balanceOf(BENEFICIARY_ADDRESS)).to.equal(expectedAmounts[11] / 4n);

      await snapshot.restore();
    });

  })


});
