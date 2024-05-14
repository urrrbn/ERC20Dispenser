# High-Level System Architecture: ERC20Dispenser

## 1. Overview

The `ERC20Dispenser` is a smart contract designed for the automated and controlled distribution of ERC20 tokens to a designated beneficiary over time, incorporating a payout reduction mechanism after the first year.

## 2. System Components

- **ERC20 Token Contract**: The source of ERC20 tokens to be distributed through the `ERC20Dispenser`. This component is compliant with the ERC20 standard to ensure interoperability.
- **ERC20Dispenser Contract**: Manages the distribution of tokens according to predefined rules, including distribution timing and amounts.

## 3. User Roles

- **Beneficiary**: The exclusive role authorized to withdraw tokens from the `ERC20Dispenser`. This role is governed by strict rules encoded in the smart contract.


## 4. Operational Flow

- **Deployment**: The contract is deployed to EVM blockchain, initialized with the addresses of the ERC20 token and the beneficiary.
- **Token Funding**: The ERC20 tokens are transferred by the owner into the `ERC20Dispenser` to enable future distributions.
- **Withdrawal Process**:
  - Withdrawals are permitted once every 30 days by the beneficiary.
  - The contract calculates the allowed amount based on the time elapsed and preset rules.
  - Upon meeting the conditions, the tokens are transferred to the beneficiary’s wallet.
- **Halving Logic**: After the first year, the contract reduces the amount available for monthly withdrawal, following a predetermined halving schedule until a minimum threshold is reached. After that the remaining tokens are distributed to the beneficiary.

## 5. Security

- **Authentication**: Validates that only the designated beneficiary can initiate withdrawals.
- **Validation**: Enforces rules for withdrawal timings and amounts strictly within the contract.

## 7. Deployment Addresses 

### Sepolia:

- **Dispenser Contract Address**: [`0x92aCA42Af480c16048eCEA1758aEB795B65463dE`](https://sepolia.etherscan.io/address/0x39e4c057c104203233DB0ae8f40023834BA2Cc28#code)
- **Token Contract Address**: [`0x39e4c057c104203233DB0ae8f40023834BA2Cc28`](https://sepolia.etherscan.io/token/0x92aca42af480c16048ecea1758aeb795b65463de)