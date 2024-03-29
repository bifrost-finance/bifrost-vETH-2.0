import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { CHAIN_ID, SLP_FEE_RECEIVER_ADDRESS, VETH1_ADDRESS } from '../constants/constants'
import { ethers } from 'hardhat'

const deployFunction: DeployFunction = async function ({
  deployments,
  getNamedAccounts,
  network,
}: HardhatRuntimeEnvironment) {
  console.log('Running SLPCore deploy script')

  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()

  const chainId = network.config.chainId as CHAIN_ID
  const vETH1 = VETH1_ADDRESS[chainId]
  const vETH2 = (await deployments.get('vETH2')).address
  const SLPDeposit = (await deployments.get('SLPDeposit')).address
  const MevVault = (await deployments.get('MevVault')).address
  const WithdrawalVault = (await deployments.get('WithdrawalVault')).address
  const feeReceiver = SLP_FEE_RECEIVER_ADDRESS[chainId]
  // fee rate: 10%
  const feeRate = ethers.utils.parseEther('0.1')

  const { address } = await deploy('SLPCore', {
    from: deployer,
    log: true,
    deterministicDeployment: false,
    proxy: {
      proxyContract: 'OpenZeppelinTransparentProxy',
      execute: {
        init: {
          methodName: 'initialize',
          args: [vETH1, vETH2, SLPDeposit, MevVault, WithdrawalVault, feeReceiver, feeRate],
        },
      },
    },
  })

  console.log('SLPCore deployed at', address)

  const slpDeposit = await ethers.getContractAt('SLPDeposit', SLPDeposit)
  if ((await slpDeposit.slpCore()) !== address) {
    const tx = await slpDeposit.setSLPCore(address)
    console.log('\x1b[32m%s\x1b[0m', `Call slpDeposit.setSLPCore: ${tx.hash}`)
    await tx.wait()
  }
  if (
    (await slpDeposit.withdrawalCredentials()) !== `0x010000000000000000000000${WithdrawalVault.slice(2)}`.toLowerCase()
  ) {
    const tx = await slpDeposit.setCredential(WithdrawalVault)
    console.log('\x1b[32m%s\x1b[0m', `Call slpDeposit.setCredential: ${tx.hash}`)
    await tx.wait()
  }
  const mevVault = await ethers.getContractAt('MevVault', MevVault)
  if ((await mevVault.slpCore()) !== address) {
    const tx = await mevVault.setSLPCore(address)
    console.log('\x1b[32m%s\x1b[0m', `Call mevVault.setSLPCore: ${tx.hash}`)
    await tx.wait()
  }
  const withdrawalVault = await ethers.getContractAt('WithdrawalVault', WithdrawalVault)
  if ((await withdrawalVault.slpCore()) !== address) {
    const tx = await withdrawalVault.setSLPCore(address)
    console.log('\x1b[32m%s\x1b[0m', `Call withdrawalVault.setSLPCore: ${tx.hash}`)
    await tx.wait()
  }
  const vETH2Contract = await ethers.getContractAt('vETH2', (await deployments.get('vETH2')).address)
  if ((await vETH2Contract.slpCore()) !== address) {
    const tx = await vETH2Contract.setSLPCore(address)
    console.log('\x1b[32m%s\x1b[0m', `Call vETH2.setSLPCore: ${tx.hash}`)
  }
}

export default deployFunction

deployFunction.dependencies = ['vETH2', 'SLPDeposit', 'vETH2Claim', 'MevVault', 'WithdrawalVault']

deployFunction.tags = ['SLPCore']
