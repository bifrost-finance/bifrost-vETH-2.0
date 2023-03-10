import { ethers } from 'hardhat'
import { expect } from 'chai'
import { Contract } from 'ethers'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'

describe('vETH2 Token', function () {
  let vETH2: Contract
  let deployer: SignerWithAddress
  let newOwner: SignerWithAddress
  let mockSLPCore: SignerWithAddress
  let newMockSLPCore: SignerWithAddress
  let receiver: SignerWithAddress
  let attacker: SignerWithAddress

  beforeEach(async function () {
    ;[deployer, newOwner, mockSLPCore, newMockSLPCore, receiver, attacker] = await ethers.getSigners()
    const VETH2 = await ethers.getContractFactory('vETH2')
    vETH2 = await VETH2.deploy()
    await vETH2.setSLPCore(mockSLPCore.address)
  })

  it('basic check', async function () {
    expect(await vETH2.name()).to.equal('Voucher Ethereum 2.0')
    expect(await vETH2.symbol()).to.equal('vETH')
    expect(await vETH2.decimals()).to.equal(18)
    expect(await vETH2.owner()).to.equal(deployer.address)
    expect(await vETH2.slpCore()).to.equal(mockSLPCore.address)
  })

  it('transfer owner should be ok', async function () {
    await vETH2.transferOwnership(newOwner.address)
    expect(await vETH2.owner()).to.equal(newOwner.address)
  })

  it('transfer owner by attacker should revert', async function () {
    await expect(vETH2.connect(attacker).transferOwnership(newOwner.address)).to.revertedWith(
      'Ownable: caller is not the owner'
    )
  })

  it('set SLPCore should be ok', async function () {
    await vETH2.setSLPCore(newMockSLPCore.address)
    expect(await vETH2.slpCore()).to.equal(newMockSLPCore.address)
  })

  it('set SLPCore by attacker should revert', async function () {
    await expect(vETH2.connect(attacker).setSLPCore(newMockSLPCore.address)).to.revertedWith(
      'Ownable: caller is not the owner'
    )
  })

  it('mint by SLPCore should be ok', async function () {
    const amount = ethers.utils.parseEther('10')
    await vETH2.connect(mockSLPCore).mint(receiver.address, amount)
    expect(await vETH2.balanceOf(receiver.address)).to.equal(amount)
    expect(await vETH2.totalSupply()).to.equal(amount)
  })

  it('mint by attacker should revert', async function () {
    const amount = ethers.utils.parseEther('10')
    await expect(vETH2.connect(attacker).mint(receiver.address, amount)).revertedWith('Invalid SLP core address')
  })

  it('pause/unpause by owner should be ok', async function () {
    expect(await vETH2.paused()).to.equal(false)
    await vETH2.pause()
    expect(await vETH2.paused()).to.equal(true)
    await vETH2.unpause()
    expect(await vETH2.paused()).to.equal(false)
  })

  it('pause/unpause by attacker should revert', async function () {
    await expect(vETH2.connect(attacker).pause()).revertedWith('Ownable: caller is not the owner')
    await expect(vETH2.connect(attacker).unpause()).revertedWith('Ownable: caller is not the owner')
  })

  it('transfer should be ok', async function () {
    const amount = ethers.utils.parseEther('10')
    await vETH2.connect(mockSLPCore).mint(newOwner.address, amount)
    expect(await vETH2.balanceOf(newOwner.address)).to.equal(amount)
    expect(await vETH2.balanceOf(receiver.address)).to.equal(0)

    await vETH2.connect(newOwner).transfer(receiver.address, amount)
    expect(await vETH2.balanceOf(newOwner.address)).to.equal(0)
    expect(await vETH2.balanceOf(receiver.address)).to.equal(amount)
  })

  it('transferFrom should be ok', async function () {
    const amount = ethers.utils.parseEther('10')
    await vETH2.connect(mockSLPCore).mint(newOwner.address, amount)
    expect(await vETH2.balanceOf(newOwner.address)).to.equal(amount)
    expect(await vETH2.balanceOf(receiver.address)).to.equal(0)

    await vETH2.connect(newOwner).approve(receiver.address, amount)
    await vETH2.connect(receiver).transferFrom(newOwner.address, receiver.address, amount)
    expect(await vETH2.balanceOf(newOwner.address)).to.equal(0)
    expect(await vETH2.balanceOf(receiver.address)).to.equal(amount)
  })

  it('transfer when paused should revert', async function () {
    const amount = ethers.utils.parseEther('10')
    await vETH2.connect(mockSLPCore).mint(newOwner.address, amount)

    await vETH2.pause()
    await expect(vETH2.connect(newOwner).transfer(receiver.address, amount)).revertedWith(
      'ERC20Pausable: token transfer while paused'
    )
    await vETH2.unpause()
    await vETH2.connect(newOwner).transfer(receiver.address, amount)
  })

  it('transferFrom when paused should revert', async function () {
    const amount = ethers.utils.parseEther('10')
    await vETH2.connect(mockSLPCore).mint(newOwner.address, amount)

    await vETH2.pause()
    await vETH2.connect(newOwner).approve(receiver.address, amount)
    await expect(vETH2.connect(receiver).transferFrom(newOwner.address, receiver.address, amount)).revertedWith(
      'ERC20Pausable: token transfer while paused'
    )
    await vETH2.unpause()
    await vETH2.connect(receiver).transferFrom(newOwner.address, receiver.address, amount)
  })
})
