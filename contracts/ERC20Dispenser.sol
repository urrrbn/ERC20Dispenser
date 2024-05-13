// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
// Uncomment this line to use console.log
import "hardhat/console.sol";


contract ERC20Dispenser {
    IERC20 private token;
    address private beneficiary;

    uint256 private constant MAX_TOKENS_A_MONTH = 10_000e18;
    uint256 private constant LIMIT_TOKENS = 100e18;
    uint256 private constant TOTAL_TOKENS_TO_DISTRIBUTE = 700_000e18;

    uint256 public startMoment;
    uint256 public totalWithdrawn;
    uint256[12] private firstYearAmounts;

    bool private _isDispenserEmpty;


    modifier onlyBeneficiary(){
        require(msg.sender == beneficiary, "Only the beneficiary.");
        _;
    }

    constructor(address _tokenAddress, address _beneficiary) {
        require(_tokenAddress != address(0), "Token address cannot be zero.");
        require(_beneficiary != address(0), "Beneficiary address cannot be zero.");

        token = IERC20(_tokenAddress);
        beneficiary = _beneficiary;
        _isDispenserEmpty = true;
        startMoment = block.timestamp;
        _initializeFirstYearAmounts();
    }


    function _initializeFirstYearAmounts() internal {
        uint8[12] memory initialPercentages = [10, 25, 50, 100, 50, 50, 50, 50, 25, 25, 25, 25];

        for (uint256 i = 0; i < initialPercentages.length; i++) {
            firstYearAmounts[i] = (MAX_TOKENS_A_MONTH * initialPercentages[i]) / 100;
        }
    }


    function withdraw() external onlyBeneficiary{
        uint256 currentMonth = (block.timestamp - startMoment) / 30 days;
        require(currentMonth < 12 || totalWithdrawn < TOTAL_TOKENS_TO_DISTRIBUTE, "Distribution finished.");

        uint256 payout = _calculatePayoutForCurrentMonth(currentMonth);

        _executePayout(payout);
    }


    function _calculatePayoutForCurrentMonth(uint256 currentMonth) internal view returns (uint256) {
        uint256 payout;

        if (currentMonth < 12) {
            payout = firstYearAmounts[currentMonth];
        } else {
            // Calculate halved payouts after the first year
            uint256 halvingPeriods = currentMonth - 12;
            uint256 lastAmount = firstYearAmounts[11];
            for (uint256 i = 0; i < halvingPeriods; i++) {
                lastAmount /= 2;
                if (lastAmount <= LIMIT_TOKENS) {
                    // Do something
                }
            }
            payout = lastAmount;
        }

        if (totalWithdrawn + payout > TOTAL_TOKENS_TO_DISTRIBUTE) {
            payout = TOTAL_TOKENS_TO_DISTRIBUTE - totalWithdrawn; 
        }

        return payout;
    }

    function _executePayout(uint256 payout) internal {
        require(token.transfer(beneficiary, payout), "Token transfer failed.");
        totalWithdrawn += payout;
    }
}
