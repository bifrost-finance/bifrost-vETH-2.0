// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;

import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

interface ISLPCore {
    function addReward(uint256 amount) external;

    function removeReward(uint256 amount) external;

    function depositWithdrawal() external payable;
}

interface ISLPDeposit {
    function depositETH() external payable;
}

contract WithdrawalVault is OwnableUpgradeable {
    /* ========== EVENTS ========== */

    event RewardAdded(address indexed sender, uint256 amount);
    event RewardRemoved(address indexed sender, uint256 amount);
    event Withdrawn(address indexed sender, uint256 amount);
    event WithdrawalNodeIncreased(address indexed sender, uint256 number);

    /* ========== CONSTANTS ========== */

    uint256 public constant DEPOSIT_ETH = 32 ether;

    /* ========== STATE VARIABLES ========== */

    ISLPCore public slpCore;
    ISLPDeposit public slpDeposit;
    address public operator;

    uint256 public withdrawalNodeNumber;
    uint256 public totalWithdrawalAmount;

    mapping(uint256 => bool) public rewardDays;

    function initialize(address _slpDeposit, address _operator) public initializer {
        require(_slpDeposit != address(0), "Invalid SLP deposit address");
        require(_operator != address(0), "Invalid operator address");
        super.__Ownable_init();

        slpDeposit = ISLPDeposit(_slpDeposit);
        operator = _operator;
    }

    /* ========== MUTATIVE FUNCTIONS ========== */

    function withdrawWithdrawals(uint256 _amount) external onlyOperator {
        require(_amount > 0, "Zero amount");
        require(_amount <= address(this).balance, "Not enough balance");
        require(totalWithdrawalAmount + _amount <= withdrawalNodeNumber * DEPOSIT_ETH, "Exceed total ETH");
        totalWithdrawalAmount = totalWithdrawalAmount + _amount;
        slpCore.depositWithdrawal{value: _amount}();

        emit Withdrawn(msg.sender, _amount);
    }

    function increaseWithdrawalNode(uint256 n) external onlyOperator {
        require(
            (withdrawalNodeNumber + n) * DEPOSIT_ETH <= totalWithdrawalAmount + address(this).balance,
            "Exceed total ETH"
        );
        withdrawalNodeNumber += n;

        emit WithdrawalNodeIncreased(msg.sender, n);
    }

    function addReward(uint256 _rewardAmount) external onlyOperator {
        uint256 paidAt = getTodayTimestamp();
        require(!rewardDays[paidAt], "Paid today");
        rewardDays[paidAt] = true;

        require(
            _rewardAmount <= (totalWithdrawalAmount + address(this).balance) - (withdrawalNodeNumber * DEPOSIT_ETH),
            "Exceed total ETH"
        );
        require(_rewardAmount <= address(this).balance, "Not enough ETH");
        slpCore.addReward(_rewardAmount);
        slpDeposit.depositETH{value: _rewardAmount}();

        emit RewardAdded(msg.sender, _rewardAmount);
    }

    function removeReward(uint256 _rewardAmount) external onlyOperator {
        uint256 rewardAt = getTodayTimestamp();
        require(!rewardDays[rewardAt], "Paid today");
        rewardDays[rewardAt] = true;

        slpCore.removeReward(_rewardAmount);

        emit RewardRemoved(msg.sender, _rewardAmount);
    }

    function setSLPCore(address _slpCore) external onlyOwner {
        require(_slpCore != address(0), "Invalid SLP core address");
        slpCore = ISLPCore(_slpCore);
    }

    function setOperator(address _operator) external onlyOwner {
        require(_operator != address(0), "Invalid operator address");
        operator = _operator;
    }

    /* ========== VIEWS ========== */

    function getTodayTimestamp() public view returns (uint256) {
        return (block.timestamp / (1 days)) * (1 days);
    }

    /* ========== MODIFIER ========== */

    modifier onlyOperator() {
        require(msg.sender == operator, "Caller is not operator");
        _;
    }
}
