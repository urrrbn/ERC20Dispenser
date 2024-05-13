require("dotenv").config();
require("@nomicfoundation/hardhat-toolbox");
require("solidity-coverage");

module.exports = {
  networks: {
    sepolia: {
      url: `https://sepolia.infura.io/v3/${process.env.SEPOLIA_API_KEY}`,
      accounts: [`${process.env.DEPLOYER_PRIVATE_KEY}`], 
      allowUnlimitedContractSize: true
    }
  },
  contractSizer: {
    alphaSort: true,
    runOnCompile: true,
    disambiguatePaths: false,
  },
  etherscan: {
    apiKey: {
      sepolia: process.env.ETHERSCAN_API_KEY
    }
  },
  solidity: {
    compilers: [
      {
        version: "0.8.24",
        settings: {
          optimizer: {
            enabled: true, 
            runs: 200     
          }
        },
      },
    ],
  }
  
};
