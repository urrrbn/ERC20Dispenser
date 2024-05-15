// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.24;

import "./IMyToken.sol";
// import "hardhat/console.sol";


contract ERC20Dispenser {

    IMyToken private token;
    address private beneficiary;

    uint8 private decimals;
    uint256 private maxTokensAMonth = 10_000 * (10**decimals);
    uint256 private limitTokens = 100 * (10**decimals);
    uint256 private totalTokensToDistribute = 700_000 * 10**decimals;

    uint256 public startMoment;
    uint256 public totalWithdrawn;
    uint256 public lastWithdrawalTime;
    uint256[12] private firstYearAmounts;

    bool private _isDispenserEmpty;


    modifier onlyBeneficiary(){
        require(msg.sender == beneficiary, "Only the beneficiary.");
        _;
    }

    modifier canWithdraw(){
        require(_canWithdraw() == true, "Can't");
        _;
    }

    constructor(address _tokenAddress, address _beneficiary) {
        require(_tokenAddress != address(0), "Token address cannot be zero.");
        require(_beneficiary != address(0), "Beneficiary address cannot be zero.");

        token = IMyToken(_tokenAddress);
        decimals = token.decimals();
        maxTokensAMonth = 10_000 * (10**decimals);
        limitTokens = 100 * (10**decimals);
        totalTokensToDistribute = 700_000 * 10**decimals;
        beneficiary = _beneficiary;
        _isDispenserEmpty = false;
        startMoment = block.timestamp;
        
        _initializeFirstYearAmounts();
    }


    function _initializeFirstYearAmounts() internal {
        uint8[12] memory initialPercentages = [10, 25, 50, 100, 50, 50, 50, 50, 25, 25, 25, 25];

        for (uint256 i = 0; i < initialPercentages.length; i++) {
            firstYearAmounts[i] = (maxTokensAMonth * initialPercentages[i]) / 100;
        }
    }


    function withdraw() external onlyBeneficiary canWithdraw{
        uint256 currentMonth = (block.timestamp - startMoment) / 30 days;
        uint256 payout;

        payout = _calculatePayoutForCurrentMonth(currentMonth);
 
        if(payout == 0){
            payout = token.balanceOf(address(this));
            _disableHalving();
        }    
        lastWithdrawalTime = block.timestamp;
        _executePayout(payout);
    }


    function _calculatePayoutForCurrentMonth(uint256 currentMonth) internal view returns (uint256) {
        uint256 payout;

        if (currentMonth < 12) {
            payout = firstYearAmounts[currentMonth];
        } else {
            uint256 halvingPeriods = currentMonth - 12 + 1;
            uint256 lastAmount = firstYearAmounts[11];
            for (uint256 i = 0; i < halvingPeriods; i++) {
                lastAmount /= 2;
                if (lastAmount <= limitTokens) {
                    lastAmount = 0;
                }
            }
            payout = lastAmount;
        }

        return payout;
    }


    function _executePayout(uint256 payout) internal {
        require(token.transfer(beneficiary, payout), "Token transfer failed.");
        totalWithdrawn += payout;
    }


    function _disableHalving() internal {
        _isDispenserEmpty = true;
    }


    function _canWithdraw() public view returns(bool){
        if(block.timestamp >= lastWithdrawalTime + 30 days && !_isDispenserEmpty){
            return true;
        }else{
            return false;
        }
    }


    function getTotalTokensToDistribute() external view returns(uint256){
        return totalTokensToDistribute;
    }


    function getMaxTokensAMonth() external view returns(uint256){
        return maxTokensAMonth;
    }


    function getLimtTokens() external view returns(uint256){
        return limitTokens;
    }


    function getStartMoment() external view returns(uint256){
        return startMoment;
    }


    function getTotalWithdrawn() external view returns(uint256){
        return totalWithdrawn;
    }


    function getToken() external view returns(address){
        return address(token);
    }


    function getBeneficiary() external view returns(address){
        return beneficiary;
    }

    function getFirstYearAmounts() external view returns(uint256[12] memory){
        return firstYearAmounts;
    }
}
