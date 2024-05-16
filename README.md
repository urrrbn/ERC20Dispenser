# ERC20Dispenser: Architecture Specification

## Components
- **ERC20Dispenser Contract**: Manages the distribution of ERC20 tokens to a specified beneficiary.
- **IMyToken Interface**: Interface for the ERC20 token, supporting essential functions such as `decimals`, `balanceOf`, and `transfer`.
- **Beneficiary**: The designated account to receive token distributions, specified at deployment.

## Interactions
### Deployment
- Initializes with the ERC20 token address (`_tokenAddress`) and the beneficiary address (`_beneficiary`).
- Sets initial rules for maximum monthly distribution and total tokens to distribute.

### Token Distribution Rules
- **Maximum Monthly Distribution**: Established at the deployment. The system ensures that under no circumstances the beneficiary can withdraw more than the specified amoun.

### Withdrawal Process
- The beneficiary can initiate a withdrawal every 30 days.
- Withdrawal amounts are calculated based on years elapsed since the `startMoment`.

### Distribution Calculation
- Adjusts monthly distribution percentages based on the time elapsed, increasing to a maximum and then decreasing in subsequent years according to the predifined schedule percentages.

### Halving Post-12th Year and Final Distribution
- Post the 12th year, distribution amounts are halved every four years until reaching 100 tokens or less.
- Once reaching 100 tokens or less, all remaining tokens are distributed at once, and further distributions are stopped.

### End of Distribution
- Deactivates further halving and distribution operations when the monthly payout falls below a critical threshold (100 tokens).

### Utilities and Accessors
- Functions to access operational settings such as total tokens to distribute, maximum tokens per month, start moment, token address, and beneficiary.

## System Constraints and Security Considerations
- **Address Validation**: Ensures non-zero addresses for tokens and beneficiary.
- **Access Control**: Withdrawals are exclusively for the beneficiary.
- **Time Constraints**: Enforces a minimum of 30 days between withdrawals.
- **Token Availability**: Ensures sufficient tokens are available before allowing a withdrawal on the formula level.

## Deployments Addresses 

### Sepolia:

- **Dispenser**: [`0x92aCA42Af480c16048eCEA1758aEB795B65463dE`](https://sepolia.etherscan.io/address/0x19Adc7C55C239e025c85B433E16910F84d46245F)
- **MyToken**: [`0x39e4c057c104203233DB0ae8f40023834BA2Cc28`](https://sepolia.etherscan.io/token/0x92aca42af480c16048ecea1758aeb795b65463de)