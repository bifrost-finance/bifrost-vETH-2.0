import { ethers } from 'hardhat'
import { expect } from 'chai'
import { Contract } from 'ethers'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'

describe('MockSLPCore', function () {
  let depositContract: Contract
  let slpDeposit: Contract
  let mevVault: Contract
  let slpCore: Contract
  let vETH1: Contract
  let vETH2: Contract
  let deployer: SignerWithAddress
  let newOwner: SignerWithAddress
  let mockWithdrawalVault: SignerWithAddress
  let attacker: SignerWithAddress
  let user1: SignerWithAddress
  let user2: SignerWithAddress
  let feeReceiver: SignerWithAddress
  let newFeeReceiver: SignerWithAddress
  const DEAD_ADDRESS = '0x000000000000000000000000000000000000dEaD'

  beforeEach(async function () {
    ;[deployer, newOwner, mockWithdrawalVault, attacker, user1, user2, feeReceiver, newFeeReceiver] =
      await ethers.getSigners()

    const DepositContract = await ethers.getContractFactory('DepositContract')
    const VETH1 = await ethers.getContractFactory('vETH1')
    const VETH2 = await ethers.getContractFactory('vETH2')
    const SLPDeposit = await ethers.getContractFactory('SLPDeposit')
    const MevVault = await ethers.getContractFactory('MevVault')
    const SLPCore = await ethers.getContractFactory('MockSLPCore')

    depositContract = await DepositContract.deploy()
    vETH1 = await VETH1.deploy()
    vETH2 = await VETH2.deploy()
    slpDeposit = await SLPDeposit.deploy()
    mevVault = await MevVault.deploy()
    slpCore = await SLPCore.deploy()

    const feeRate = ethers.utils.parseEther('0.05') // 5%
    await vETH2.setSLPCore(deployer.address)
    await vETH2.mint(deployer.address, ethers.utils.parseEther('1'))
    await slpDeposit.initialize(depositContract.address)
    await slpCore.initialize(
      vETH1.address,
      vETH2.address,
      slpDeposit.address,
      mevVault.address,
      mockWithdrawalVault.address,
      feeReceiver.address,
      feeRate
    )
    await vETH2.setSLPCore(slpCore.address)
  })

  it('basic check', async function () {
    const initTokenPoolAmount = ethers.utils.parseEther('1')
    expect(await vETH2.totalSupply()).to.equal(initTokenPoolAmount)
    expect(await slpCore.tokenPool()).to.equal(initTokenPoolAmount)
    expect(await slpCore.vETH1()).to.equal(vETH1.address)
    expect(await slpCore.vETH2()).to.equal(vETH2.address)
    expect(await slpCore.slpDeposit()).to.equal(slpDeposit.address)
    expect(await slpCore.mevVault()).to.equal(mevVault.address)
    expect(await slpCore.withdrawalVault()).to.equal(mockWithdrawalVault.address)
    expect(await slpCore.feeReceiver()).to.equal(feeReceiver.address)
    expect(await slpCore.feeRate()).to.equal(ethers.utils.parseEther('0.05'))
    expect(await slpCore.DEAD_ADDRESS()).to.equal(DEAD_ADDRESS)
    expect(await slpCore.FEE_RATE_DENOMINATOR()).to.equal(ethers.utils.parseEther('1'))
  })

  it('transfer owner should be ok', async function () {
    await slpCore.transferOwnership(newOwner.address)
    expect(await slpCore.owner()).to.equal(newOwner.address)
  })

  it('transfer owner by attacker should revert', async function () {
    await expect(slpCore.connect(attacker).transferOwnership(newOwner.address)).to.revertedWith(
      'Ownable: caller is not the owner'
    )
  })

  it('pause/unpause by owner should be ok', async function () {
    expect(await slpCore.paused()).to.equal(false)
    await slpCore.pause()
    expect(await slpCore.paused()).to.equal(true)
    await slpCore.unpause()
    expect(await slpCore.paused()).to.equal(false)
  })

  it('pause/unpause by attacker should revert', async function () {
    await expect(slpCore.connect(attacker).pause()).revertedWith('Ownable: caller is not the owner')
    await expect(slpCore.connect(attacker).unpause()).revertedWith('Ownable: caller is not the owner')
  })

  it('setFeeRate by owner should be ok', async function () {
    await slpCore.setFeeRate(ethers.utils.parseEther('1'))
    expect(await slpCore.feeRate()).to.equal(ethers.utils.parseEther('1'))
  })

  it('setFeeRate exceeds range should revert', async function () {
    await expect(slpCore.setFeeRate(ethers.utils.parseEther('1').add(1))).to.revertedWith('Fee rate exceeds range')
  })

  it('setFeeRate by attacker should revert', async function () {
    await expect(slpCore.connect(attacker).setFeeRate(ethers.utils.parseEther('0.02'))).to.revertedWith(
      'Ownable: caller is not the owner'
    )
  })

  it('setFeeReceiver by owner should be ok', async function () {
    await slpCore.setFeeReceiver(newFeeReceiver.address)
    expect(await slpCore.feeReceiver()).to.equal(newFeeReceiver.address)
  })

  it('setFeeReceiver by attacker should revert', async function () {
    await expect(slpCore.connect(attacker).setFeeReceiver(newFeeReceiver.address)).to.revertedWith(
      'Ownable: caller is not the owner'
    )
  })

  describe('mint and renew', function () {
    beforeEach(async function () {
      await vETH1.mint(user1.address, ethers.utils.parseEther('100'))
      await vETH1.mint(user2.address, ethers.utils.parseEther('100'))
    })

    it('mint should be ok', async function () {
      const amount = ethers.utils.parseEther('1')
      await expect(slpCore.connect(user1).mint({ value: amount }))
        .to.emit(slpCore, 'Deposited')
        .withArgs(user1.address, amount, amount)
      expect(await vETH2.balanceOf(user1.address)).to.equal(amount)
      expect(await ethers.provider.getBalance(slpCore.address)).to.equal(0)
      expect(await ethers.provider.getBalance(slpDeposit.address)).to.equal(ethers.utils.parseEther('1'))
      expect(await vETH2.totalSupply()).to.equal(ethers.utils.parseEther('2'))
      expect(await slpCore.tokenPool()).to.equal(ethers.utils.parseEther('2'))

      const amount2 = ethers.utils.parseEther('5')
      await expect(slpCore.connect(user1).mint({ value: amount2 }))
        .to.emit(slpCore, 'Deposited')
        .withArgs(user1.address, amount2, amount2)
      expect(await vETH2.balanceOf(user1.address)).to.equal(amount.add(amount2))
      expect(await ethers.provider.getBalance(slpCore.address)).to.equal(0)
      expect(await ethers.provider.getBalance(slpDeposit.address)).to.equal(ethers.utils.parseEther('6'))
      expect(await vETH2.totalSupply()).to.equal(ethers.utils.parseEther('7'))
      expect(await slpCore.tokenPool()).to.equal(ethers.utils.parseEther('7'))
    })

    it('mint with zero amount should revert', async function () {
      const amount = ethers.utils.parseEther('0')
      await expect(slpCore.connect(user1).mint({ value: amount })).to.revertedWith('Zero amount')
    })

    it('mint when paused should revert', async function () {
      await slpCore.pause()
      const amount = ethers.utils.parseEther('1')
      await expect(slpCore.connect(user1).mint({ value: amount })).to.revertedWith('Pausable: paused')
    })

    it('renew should be ok', async function () {
      const amount = ethers.utils.parseEther('1')
      await vETH1.connect(user1).approve(slpCore.address, amount)
      await expect(slpCore.connect(user1).renew(amount))
        .to.emit(slpCore, 'Renewed')
        .withArgs(user1.address, amount, amount)
      expect(await vETH2.balanceOf(user1.address)).to.equal(amount)
      expect(await vETH1.balanceOf(DEAD_ADDRESS)).to.equal(amount)
      expect(await vETH2.totalSupply()).to.equal(ethers.utils.parseEther('2'))
      expect(await slpCore.tokenPool()).to.equal(ethers.utils.parseEther('2'))

      const amount2 = ethers.utils.parseEther('5')
      await vETH1.connect(user1).approve(slpCore.address, amount2)
      await expect(slpCore.connect(user1).renew(amount2))
        .to.emit(slpCore, 'Renewed')
        .withArgs(user1.address, amount2, amount2)
      expect(await vETH2.balanceOf(user1.address)).to.equal(amount.add(amount2))
      expect(await vETH1.balanceOf(DEAD_ADDRESS)).to.equal(amount.add(amount2))
      expect(await vETH2.totalSupply()).to.equal(ethers.utils.parseEther('7'))
      expect(await slpCore.tokenPool()).to.equal(ethers.utils.parseEther('7'))
    })

    it('renew with zero amount should revert', async function () {
      const amount = ethers.utils.parseEther('0')
      await expect(slpCore.connect(user1).renew(amount)).to.revertedWith('Zero amount')
    })

    it('renew when paused should revert', async function () {
      await slpCore.pause()
      const amount = ethers.utils.parseEther('1')
      await expect(slpCore.connect(user1).renew(amount)).to.revertedWith('Pausable: paused')
    })

    it('addReward should be ok', async function () {
      expect(await slpCore.calculateVTokenAmount(ethers.utils.parseEther('1'))).to.equal(ethers.utils.parseEther('1'))
      const reward = ethers.utils.parseEther('0.1')
      await expect(slpCore.connect(mockWithdrawalVault).addReward(reward))
        .to.emit(slpCore, 'RewardAdded')
        .withArgs(mockWithdrawalVault.address, reward, ethers.utils.parseEther('0.005'))
      expect(await slpCore.tokenPool()).to.equal(ethers.utils.parseEther('1.1'))
      expect(await vETH2.totalSupply()).to.equal(ethers.utils.parseEther('1.005'))
      expect(await slpCore.calculateVTokenAmount(ethers.utils.parseEther('1'))).to.equal(
        ethers.utils.parseEther('0.913636363636363636')
      )
      expect(await slpCore.calculateTokenAmount(ethers.utils.parseEther('0.913636363636363636'))).to.equal(
        ethers.utils.parseEther('0.999999999999999999')
      )

      const tokenAmount = ethers.utils.parseEther('1')
      const vTokenAmount = ethers.utils.parseEther('0.913636363636363636')
      await expect(slpCore.connect(user1).mint({ value: tokenAmount }))
        .to.emit(slpCore, 'Deposited')
        .withArgs(user1.address, tokenAmount, vTokenAmount)
      expect(await vETH2.balanceOf(user1.address)).to.equal(vTokenAmount)
      expect(await ethers.provider.getBalance(slpDeposit.address)).to.equal(tokenAmount)

      await vETH1.connect(user2).approve(slpCore.address, tokenAmount)
      await expect(slpCore.connect(user2).renew(tokenAmount))
        .to.emit(slpCore, 'Renewed')
        .withArgs(user2.address, tokenAmount, vTokenAmount)
      expect(await vETH2.balanceOf(user2.address)).to.equal(vTokenAmount)
      expect(await vETH1.balanceOf(DEAD_ADDRESS)).to.equal(tokenAmount)
    })

    it('addReward by attacker should revert', async function () {
      await expect(slpCore.connect(attacker).addReward(1)).to.revertedWith('Caller is not vault contract')
    })

    it('removeReward should be ok', async function () {
      const reward = ethers.utils.parseEther('0.1')
      await expect(slpCore.connect(mockWithdrawalVault).removeReward(reward))
        .to.emit(slpCore, 'RewardRemoved')
        .withArgs(mockWithdrawalVault.address, reward)
      expect(await slpCore.tokenPool()).to.equal(ethers.utils.parseEther('0.9'))
      expect(await vETH2.totalSupply()).to.equal(ethers.utils.parseEther('1'))
      expect(await slpCore.calculateVTokenAmount(ethers.utils.parseEther('1'))).to.equal(
        ethers.utils.parseEther('1.111111111111111111')
      )
      expect(await slpCore.calculateTokenAmount(ethers.utils.parseEther('1.111111111111111111'))).to.equal(
        ethers.utils.parseEther('0.999999999999999999')
      )

      const tokenAmount = ethers.utils.parseEther('1')
      const vTokenAmount = ethers.utils.parseEther('1.111111111111111111')
      await expect(slpCore.connect(user1).mint({ value: tokenAmount }))
        .to.emit(slpCore, 'Deposited')
        .withArgs(user1.address, tokenAmount, vTokenAmount)
      expect(await vETH2.balanceOf(user1.address)).to.equal(vTokenAmount)
      expect(await ethers.provider.getBalance(slpDeposit.address)).to.equal(tokenAmount)

      await vETH1.connect(user2).approve(slpCore.address, tokenAmount)
      await expect(slpCore.connect(user2).renew(tokenAmount))
        .to.emit(slpCore, 'Renewed')
        .withArgs(user2.address, tokenAmount, vTokenAmount)
      expect(await vETH2.balanceOf(user2.address)).to.equal(vTokenAmount)
      expect(await vETH1.balanceOf(DEAD_ADDRESS)).to.equal(tokenAmount)
    })

    it('removeReward by attacker should revert', async function () {
      await expect(slpCore.connect(attacker).removeReward(1)).to.revertedWith('Caller is not vault contract')
    })
  })

  describe('withdrawal', function () {
    beforeEach(async function () {
      const amount = ethers.utils.parseEther('1')
      await expect(slpCore.connect(user1).mint({ value: amount }))
        .to.emit(slpCore, 'Deposited')
        .withArgs(user1.address, amount, amount)
      expect(await vETH2.balanceOf(user1.address)).to.equal(amount)
      expect(await slpCore.tokenPool()).to.equal(ethers.utils.parseEther('2'))
      expect(await vETH2.totalSupply()).to.equal(ethers.utils.parseEther('2'))
      expect(await ethers.provider.getBalance(slpDeposit.address)).to.equal(ethers.utils.parseEther('1'))

      await expect(slpCore.connect(user2).mint({ value: amount }))
        .to.emit(slpCore, 'Deposited')
        .withArgs(user2.address, amount, amount)
      expect(await vETH2.balanceOf(user2.address)).to.equal(amount)
      expect(await slpCore.tokenPool()).to.equal(ethers.utils.parseEther('3'))
      expect(await vETH2.totalSupply()).to.equal(ethers.utils.parseEther('3'))
      expect(await ethers.provider.getBalance(slpDeposit.address)).to.equal(ethers.utils.parseEther('2'))
    })

    it('withdrawRequest and withdrawComplete should be ok', async function () {
      const vETHAmount = ethers.utils.parseEther('1')
      const ethAmount = ethers.utils.parseEther('1')
      await vETH2.connect(user1).approve(slpCore.address, vETHAmount)
      await expect(slpCore.connect(user1).withdrawRequest(vETHAmount))
        .to.emit(slpCore, 'WithdrawalRequested')
        .withArgs(user1.address, vETHAmount, ethAmount)

      const withdrawalUser1 = await slpCore.withdrawals(user1.address)
      expect(withdrawalUser1.pending).to.equal(ethers.utils.parseEther('1'))
      expect(withdrawalUser1.queued).to.equal(0)
      expect(await slpCore.queuedWithdrawal()).to.equal(ethers.utils.parseEther('1'))
      expect(await slpCore.tokenPool()).to.equal(ethers.utils.parseEther('2'))
      expect(await vETH2.totalSupply()).to.equal(ethers.utils.parseEther('2'))

      await vETH2.connect(user2).approve(slpCore.address, vETHAmount)
      await expect(slpCore.connect(user2).withdrawRequest(vETHAmount))
        .to.emit(slpCore, 'WithdrawalRequested')
        .withArgs(user2.address, vETHAmount, ethAmount)
      const withdrawalUser2 = await slpCore.withdrawals(user2.address)
      expect(withdrawalUser2.pending).to.equal(ethers.utils.parseEther('1'))
      expect(withdrawalUser2.queued).to.equal(ethers.utils.parseEther('1'))
      expect(await slpCore.queuedWithdrawal()).to.equal(ethers.utils.parseEther('2'))
      expect(await slpCore.tokenPool()).to.equal(ethers.utils.parseEther('1'))
      expect(await vETH2.totalSupply()).to.equal(ethers.utils.parseEther('1'))

      expect(await slpCore.canWithdrawalAmount(user1.address)).to.equal(ethers.utils.parseEther('0'))
      expect(await slpCore.canWithdrawalAmount(user2.address)).to.equal(ethers.utils.parseEther('0'))

      await deployer.sendTransaction({
        to: slpCore.address,
        value: ethers.utils.parseEther('0.5'),
      })
      expect(await ethers.provider.getBalance(slpCore.address)).to.equal(ethers.utils.parseEther('0.5'))
      expect(await slpCore.canWithdrawalAmount(user1.address)).to.equal(ethers.utils.parseEther('0.5'))
      expect(await slpCore.canWithdrawalAmount(user2.address)).to.equal(ethers.utils.parseEther('0'))
      expect(await slpCore.completedWithdrawal()).to.equal(ethers.utils.parseEther('0'))

      await expect(slpCore.connect(user1).withdrawComplete(ethers.utils.parseEther('0.1')))
        .to.emit(slpCore, 'WithdrawalCompleted')
        .withArgs(user1.address, ethers.utils.parseEther('0.1'))
      expect(await ethers.provider.getBalance(slpCore.address)).to.equal(ethers.utils.parseEther('0.4'))
      expect(await slpCore.canWithdrawalAmount(user1.address)).to.equal(ethers.utils.parseEther('0.4'))
      expect(await slpCore.canWithdrawalAmount(user2.address)).to.equal(ethers.utils.parseEther('0'))
      expect(await slpCore.completedWithdrawal()).to.equal(ethers.utils.parseEther('0.1'))

      await expect(slpCore.connect(user1).withdrawComplete(ethers.utils.parseEther('0.4')))
        .to.emit(slpCore, 'WithdrawalCompleted')
        .withArgs(user1.address, ethers.utils.parseEther('0.4'))
      expect(await ethers.provider.getBalance(slpCore.address)).to.equal(ethers.utils.parseEther('0'))
      expect(await slpCore.canWithdrawalAmount(user1.address)).to.equal(ethers.utils.parseEther('0'))
      expect(await slpCore.canWithdrawalAmount(user2.address)).to.equal(ethers.utils.parseEther('0'))
      expect(await slpCore.completedWithdrawal()).to.equal(ethers.utils.parseEther('0.5'))

      await deployer.sendTransaction({
        to: slpCore.address,
        value: ethers.utils.parseEther('1'),
      })
      expect(await ethers.provider.getBalance(slpCore.address)).to.equal(ethers.utils.parseEther('1'))
      expect(await slpCore.canWithdrawalAmount(user1.address)).to.equal(ethers.utils.parseEther('0.5'))
      expect(await slpCore.canWithdrawalAmount(user2.address)).to.equal(ethers.utils.parseEther('0.5'))
      expect(await slpCore.completedWithdrawal()).to.equal(ethers.utils.parseEther('0.5'))

      await expect(slpCore.connect(user1).withdrawComplete(0))
        .to.emit(slpCore, 'WithdrawalCompleted')
        .withArgs(user1.address, ethers.utils.parseEther('0.5'))
      expect(await ethers.provider.getBalance(slpCore.address)).to.equal(ethers.utils.parseEther('0.5'))
      expect(await slpCore.canWithdrawalAmount(user1.address)).to.equal(ethers.utils.parseEther('0'))
      expect(await slpCore.canWithdrawalAmount(user2.address)).to.equal(ethers.utils.parseEther('0.5'))
      expect(await slpCore.completedWithdrawal()).to.equal(ethers.utils.parseEther('1'))

      await expect(slpCore.connect(user2).withdrawComplete(ethers.utils.parseEther('0.5')))
        .to.emit(slpCore, 'WithdrawalCompleted')
        .withArgs(user2.address, ethers.utils.parseEther('0.5'))
      expect(await ethers.provider.getBalance(slpCore.address)).to.equal(ethers.utils.parseEther('0'))
      expect(await slpCore.canWithdrawalAmount(user1.address)).to.equal(ethers.utils.parseEther('0'))
      expect(await slpCore.canWithdrawalAmount(user2.address)).to.equal(ethers.utils.parseEther('0'))
      expect(await slpCore.completedWithdrawal()).to.equal(ethers.utils.parseEther('1.5'))

      await deployer.sendTransaction({
        to: slpCore.address,
        value: ethers.utils.parseEther('1'),
      })
      expect(await ethers.provider.getBalance(slpCore.address)).to.equal(ethers.utils.parseEther('1'))
      expect(await slpCore.canWithdrawalAmount(user1.address)).to.equal(ethers.utils.parseEther('0'))
      expect(await slpCore.canWithdrawalAmount(user2.address)).to.equal(ethers.utils.parseEther('0.5'))
      expect(await slpCore.completedWithdrawal()).to.equal(ethers.utils.parseEther('1.5'))

      await expect(slpCore.connect(user2).withdrawComplete(0))
        .to.emit(slpCore, 'WithdrawalCompleted')
        .withArgs(user2.address, ethers.utils.parseEther('0.5'))
      expect(await ethers.provider.getBalance(slpCore.address)).to.equal(ethers.utils.parseEther('0.5'))
      expect(await slpCore.canWithdrawalAmount(user1.address)).to.equal(ethers.utils.parseEther('0'))
      expect(await slpCore.canWithdrawalAmount(user2.address)).to.equal(ethers.utils.parseEther('0'))
      expect(await slpCore.completedWithdrawal()).to.equal(ethers.utils.parseEther('2'))
    })

    it('withdrawRequest zero amount should revert', async function () {
      await expect(slpCore.connect(user1).withdrawRequest(0)).revertedWith('Zero amount')
    })

    it('withdrawComplete when exceed permitted amount should revert', async function () {
      const vETHAmount = ethers.utils.parseEther('0.1')
      const ethAmount = ethers.utils.parseEther('0.1')
      await vETH2.connect(user1).approve(slpCore.address, vETHAmount)
      await expect(slpCore.connect(user1).withdrawRequest(vETHAmount))
        .to.emit(slpCore, 'WithdrawalRequested')
        .withArgs(user1.address, vETHAmount, ethAmount)

      const withdrawalUser1 = await slpCore.withdrawals(user1.address)
      expect(withdrawalUser1.pending).to.equal(ethers.utils.parseEther('0.1'))
      expect(withdrawalUser1.queued).to.equal(0)
      expect(await slpCore.queuedWithdrawal()).to.equal(ethers.utils.parseEther('0.1'))
      expect(await vETH2.totalSupply()).to.equal(ethers.utils.parseEther('2.9'))

      expect(await slpCore.canWithdrawalAmount(user1.address)).to.equal(ethers.utils.parseEther('0'))
      await expect(slpCore.connect(user1).withdrawComplete(ethAmount.add(1))).revertedWith('Exceed permitted amount')
    })

    it('withdrawComplete when insufficient amount should revert', async function () {
      const vETHAmount = ethers.utils.parseEther('0.1')
      const ethAmount = ethers.utils.parseEther('0.1')
      await vETH2.connect(user1).approve(slpCore.address, vETHAmount)
      await expect(slpCore.connect(user1).withdrawRequest(vETHAmount))
        .to.emit(slpCore, 'WithdrawalRequested')
        .withArgs(user1.address, vETHAmount, ethAmount)

      const withdrawalUser1 = await slpCore.withdrawals(user1.address)
      expect(withdrawalUser1.pending).to.equal(ethers.utils.parseEther('0.1'))
      expect(withdrawalUser1.queued).to.equal(0)
      expect(await slpCore.queuedWithdrawal()).to.equal(ethers.utils.parseEther('0.1'))
      expect(await vETH2.totalSupply()).to.equal(ethers.utils.parseEther('2.9'))

      expect(await slpCore.canWithdrawalAmount(user1.address)).to.equal(ethers.utils.parseEther('0'))
      await expect(slpCore.connect(user1).withdrawComplete(ethAmount)).revertedWith('Insufficient withdrawal amount')

      await deployer.sendTransaction({
        to: slpCore.address,
        value: ethers.utils.parseEther('0.05'),
      })
      expect(await ethers.provider.getBalance(slpCore.address)).to.equal(ethers.utils.parseEther('0.05'))

      expect(await slpCore.canWithdrawalAmount(user1.address)).to.equal(ethers.utils.parseEther('0.05'))
      await expect(slpCore.connect(user1).withdrawComplete(ethers.utils.parseEther('0.05')))
        .to.emit(slpCore, 'WithdrawalCompleted')
        .withArgs(user1.address, ethers.utils.parseEther('0.05'))
      expect(await ethers.provider.getBalance(slpCore.address)).to.equal(ethers.utils.parseEther('0'))
    })
  })
})
