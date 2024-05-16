// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.24;

import "./IMyToken.sol";
// import "hardhat/console.sol";


contract ERC20Dispenser {

    IMyToken private token;
    address private beneficiary;

    uint256 private maxMonhtlyDistribution;
    uint256 private totalTokensToDistribute;

    uint256 private lastWithdrawalTime;
    uint256 private startMoment;
    uint8 private decimals;

    bool private _isDispenserEmpty;


    modifier canWithdraw(){
        require(_canWithdraw() == true, "Can't");
        _;
    }


    constructor(address _tokenAddress, address _beneficiary) {
        require(_tokenAddress != address(0), "Token address cannot be zero.");
        require(_beneficiary != address(0), "Beneficiary address cannot be zero.");

        token = IMyToken(_tokenAddress);
        decimals = token.decimals();

        maxMonhtlyDistribution = 10_000 * 10**decimals;
        totalTokensToDistribute = 700_000 * 10**decimals;

        beneficiary = _beneficiary;
        startMoment = block.timestamp;
    }


    function withdraw() external canWithdraw {
        require(msg.sender == beneficiary, "Only the beneficiary.");

        uint256 currentYear = (block.timestamp - startMoment) / 360 days;
        uint256 amount = calculateMonthlyDistribution(currentYear);

        if (amount == 0) {
            amount = token.balanceOf(address(this)); // Distribute the remaining balance
            _disableHalving();
        }
        
        lastWithdrawalTime = block.timestamp;
        require(token.transfer(beneficiary, amount), "Token transfer failed.");
    }


    function calculateMonthlyDistribution(uint256 currentYear) private view returns (uint256) {
        if (currentYear < 1) return maxMonhtlyDistribution * 10 / 100;
        if (currentYear < 2) return maxMonhtlyDistribution * 25 / 100;
        if (currentYear < 3) return maxMonhtlyDistribution * 50 / 100;
        if (currentYear < 4) return maxMonhtlyDistribution;
        if (currentYear < 8) return maxMonhtlyDistribution * 50 / 100;
        if (currentYear < 12) return maxMonhtlyDistribution * 25 / 100;

        uint256 lastAmount = maxMonhtlyDistribution * 25 / 100;
        uint256 periods = (currentYear - 12) / 4 + 1;

        for (uint256 i = 0; i < periods; i++) {
            lastAmount /= 2;
            if (lastAmount <= 100 * 10**decimals) {
                return 0;
            }
        }

        return lastAmount;
    }


    function _canWithdraw() public view returns(bool){
        return block.timestamp >= lastWithdrawalTime + 30 days && !_isDispenserEmpty;
    }


    function _disableHalving() internal {
        _isDispenserEmpty = true;
    }

    function getTotalTokensToDistribute() external view returns(uint256){
        return totalTokensToDistribute;
    }


    function getMaxTokensAMonth() external view returns(uint256){
        return maxMonhtlyDistribution;
    }


    function getStartMoment() external view returns(uint256){
        return startMoment;
    }


    function getToken() external view returns(address){
        return address(token);
    }


    function getBeneficiary() external view returns(address){
        return beneficiary;
    }
}
