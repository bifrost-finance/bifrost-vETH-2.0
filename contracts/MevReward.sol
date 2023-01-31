// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";

contract MevReward is OwnableUpgradeable {
    /* ========== EVENTS ========== */

    event RewardReceived(address indexed sender, uint256 amount);
    event RewardPaid(address indexed sender, address receiver, uint256 amount);
    event FeeWithdrawn(address indexed sender, address receiver, uint256 amount);

    /* ========== CONSTANTS ========== */

    uint256 public constant FEE_RATE_DENOMINATOR = 1e4;
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

    struct Fee {
        uint256 feeRate;
        uint256 totalFee;
        uint256 claimedFee;
    }

    Fee public fee;

    Reward public reward;

    address public rewardReceiver;

    function initialize(uint256 _feeRate, address _rewardReceiver) public initializer {
        super.__Ownable_init();

        reward.lastPaidAt = block.timestamp;
        reward.finishAt = block.timestamp;
        rewardReceiver = _rewardReceiver;
        _setFeeRate(_feeRate);
    }

    /* ========== MUTATIVE FUNCTIONS ========== */

    function payReward() external onlyOwner {
        uint256 rewardAmount = reward.pending + (reward.perDay * _getTimes());
        require(reward.paid + rewardAmount <= reward.total, "Pay amount exceeds range");

        uint256 paidAt = (block.timestamp / (1 days)) * (1 days);
        reward.lastPaidAt = paidAt <= reward.finishAt ? paidAt : reward.finishAt;
        reward.paid = reward.paid + rewardAmount;
        reward.pending = 0;

        AddressUpgradeable.sendValue(payable(rewardReceiver), rewardAmount);

        emit RewardPaid(msg.sender, rewardReceiver, rewardAmount);
    }

    function setFeeRate(uint256 _feeRate) external onlyOwner {
        _setFeeRate(_feeRate);
    }

    function withdrawFee(address receiver, uint256 amount) external onlyOwner {
        require(fee.claimedFee + amount <= fee.totalFee, "Withdraw amount exceeds range");
        fee.claimedFee = fee.claimedFee + amount;

        AddressUpgradeable.sendValue(payable(receiver), amount);

        emit FeeWithdrawn(msg.sender, receiver, amount);
    }

    function _setFeeRate(uint256 _feeRate) private {
        require(_feeRate <= FEE_RATE_DENOMINATOR, "Fee rate exceeds range");
        fee.feeRate = _feeRate;
    }

    receive() external payable {
        uint256 feeAmount = (msg.value * fee.feeRate) / FEE_RATE_DENOMINATOR;
        uint256 rewardAmount = msg.value - feeAmount;
        require(rewardAmount >= REWARD_DURATION, "Reward amount is too low");

        reward.pending = reward.pending + (reward.perDay * _getTimes());
        reward.lastPaidAt = (block.timestamp / (1 days)) * (1 days);
        reward.finishAt = reward.lastPaidAt + REWARD_DURATION_DAYS;
        reward.total = reward.total + rewardAmount;
        reward.perDay = (reward.total - reward.paid - reward.pending) / REWARD_DURATION;

        fee.totalFee = fee.totalFee + feeAmount;

        emit RewardReceived(msg.sender, msg.value);
    }

    /* ========== VIEWS ========== */

    function _getTimes() private view returns (uint256 times) {
        uint256 endAt = block.timestamp <= reward.finishAt ? block.timestamp : reward.finishAt;
        times = (endAt - reward.lastPaidAt) / (1 days);
    }
}
