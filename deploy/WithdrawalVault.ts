import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { CHAIN_ID, OPERATOR_ADDRESS } from '../constants/constants'

const deployFunction: DeployFunction = async function ({
  deployments,
  getNamedAccounts,
  network,
}: HardhatRuntimeEnvironment) {
  console.log('Running WithdrawalVault deploy script')

  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()

  const SLPDeposit = (await deployments.get('SLPDeposit')).address
  const chainId = network.config.chainId as CHAIN_ID
  const operator = OPERATOR_ADDRESS[chainId]

  const { address } = await deploy('WithdrawalVault', {
    from: deployer,
    log: true,
    deterministicDeployment: false,
    proxy: {
      proxyContract: 'OpenZeppelinTransparentProxy',
      execute: {
        init: {
          methodName: 'initialize',
          args: [SLPDeposit, operator],
        },
      },
    },
  })

  console.log('WithdrawalVault deployed at', address)
}

export default deployFunction

deployFunction.dependencies = ['SLPDeposit']

deployFunction.tags = ['WithdrawalVault']
