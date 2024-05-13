// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
// Uncomment this line to use console.log
// import "hardhat/console.sol";


contract ERC20Dispenser {
    IERC20 private token;
    address private beneficiary;

    uint256 private constant MAX_TOKENS_A_MONTH = 10_000e18;
    uint256 private constant LIMIT_TOKENS = 100e18;
    uint256 private constant TOTAL_TOKENS_TO_DISTRIBUTE = 700_000e18;

    uint256 public startMonent;
    uint256 public lastWithdrawalMoment;
    uint256 public totalWithdrawn;

    uint256 private _distributionCount;
    bool private _canWithdraw;

    uint256[12] private firstYearAmounts;
}
