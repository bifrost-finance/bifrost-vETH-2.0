import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

const deployFunction: DeployFunction = async function ({ deployments, getNamedAccounts }: HardhatRuntimeEnvironment) {
  console.log('Running vETH1 deploy script')

  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()
  const { address } = await deploy('vETH1', { from: deployer })

  console.log('vETH1 deployed at', address)
}

export default deployFunction

deployFunction.dependencies = ['']

deployFunction.tags = ['vETH1']