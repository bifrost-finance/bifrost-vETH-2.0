// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;

import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

interface ISLPCore {
    function addReward(uint256 amount) external;
}

interface ISLPDeposit {
    function depositETH() external payable;
}

contract MevVault is OwnableUpgradeable {
    /* ========== EVENTS ========== */

    event RewardReceived(address indexed sender, uint256 amount);
    event RewardPaid(address indexed sender, address receiver, uint256 amount);

    /* ========== CONSTANTS ========== */

    uint256 public constant REWARD_DURATION = 30;
    uint256 public constant REWARD_DURATION_DAYS = REWARD_DURATION * 1 days;

    /* ========== STATE VARIABLES ========== */

    struct Reward {
        uint256 total;
        uint256 perDay;
        uint256 paid;
        uint256 pending;
        uint256 lastPaidAt;
        uint256 finishAt;
    }

    // record reward
    Reward public reward;
    // date timestamp at 00:00:00 => reward paid
    mapping(uint256 => bool) public rewardDays;

    ISLPCore public slpCore;
    ISLPDeposit public slpDeposit;

    function initialize(address _slpCore, address _slpDeposit) public initializer {
        require(_slpDeposit != address(0), "Invalid SLP deposit address");
        super.__Ownable_init();

        reward.lastPaidAt = getTodayTimestamp();
        reward.finishAt = reward.lastPaidAt;
        slpCore = ISLPCore(_slpCore);
        slpDeposit = ISLPDeposit(_slpDeposit);
    }

    /* ========== MUTATIVE FUNCTIONS ========== */

    function payReward() external onlyOwner {
        uint256 paidAt = getTodayTimestamp();
        require(!rewardDays[paidAt], "Paid today");
        rewardDays[paidAt] = true;

        uint256 rewardAmount = reward.pending + (reward.perDay * getDays());
        require(reward.paid + rewardAmount <= reward.total, "Pay amount exceeds range");

        reward.lastPaidAt = paidAt <= reward.finishAt ? paidAt : reward.finishAt;
        reward.paid = reward.paid + rewardAmount;
        reward.pending = 0;

        slpCore.addReward(rewardAmount);
        slpDeposit.depositETH{value: rewardAmount}();

        emit RewardPaid(msg.sender, address(slpDeposit), rewardAmount);
    }

    receive() external payable {
        require(msg.value >= REWARD_DURATION, "Reward amount is too low");

        reward.pending = reward.pending + (reward.perDay * getDays());
        reward.lastPaidAt = getTodayTimestamp();
        reward.finishAt = reward.lastPaidAt + REWARD_DURATION_DAYS;
        reward.total = reward.total + msg.value;
        reward.perDay = (reward.total - reward.paid - reward.pending) / REWARD_DURATION;

        emit RewardReceived(msg.sender, msg.value);
    }

    /* ========== VIEWS ========== */

    function getTodayTimestamp() public view returns (uint256) {
        return (block.timestamp / (1 days)) * (1 days);
    }

    function getDays() private view returns (uint256 times) {
        uint256 endAt = block.timestamp <= reward.finishAt ? block.timestamp : reward.finishAt;
        times = (endAt - reward.lastPaidAt) / (1 days);
    }
}