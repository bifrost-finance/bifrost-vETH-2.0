export enum CHAIN_ID {
  MAINNET = 1,
  GOERLI = 5,
  HARDHAT = 1000,
  ZHEJIANG = 1337803,
}

export const VETH1_ADDRESS = {
  [CHAIN_ID.MAINNET]: '0xc3d088842dcf02c13699f936bb83dfbbc6f721ab',
  [CHAIN_ID.GOERLI]: '0x480eB384681777Bf21e72B8C8538987c2801B4B7',
  [CHAIN_ID.HARDHAT]: '0x610178dA211FEF7D417bC0e6FeD39F05609AD788',
  [CHAIN_ID.ZHEJIANG]: '0xc3D088842DcF02C13699F936BB83DFBBc6f721Ab',
}

export const DEPOSIT_CONTRACT = {
  [CHAIN_ID.MAINNET]: '0x00000000219ab540356cbb839cbe05303d7705fa',
  [CHAIN_ID.GOERLI]: '0xE85E24C9E85a8e1DAF575DEEbFE2eccdB2a09122',
  [CHAIN_ID.HARDHAT]: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  [CHAIN_ID.ZHEJIANG]: '0x4242424242424242424242424242424242424242',
}

export const VETH2_CLAIM_MERKLE_ROOT = {
  [CHAIN_ID.MAINNET]: '0x927056aac3b704574c606a91d1bd8de4fdebb6d36628be10f0158300899599a7',
  [CHAIN_ID.GOERLI]: '0x927056aac3b704574c606a91d1bd8de4fdebb6d36628be10f0158300899599a7',
  [CHAIN_ID.HARDHAT]: '0x927056aac3b704574c606a91d1bd8de4fdebb6d36628be10f0158300899599a7',
  [CHAIN_ID.ZHEJIANG]: '0x927056aac3b704574c606a91d1bd8de4fdebb6d36628be10f0158300899599a7',
}

export const SLP_FEE_RECEIVER_ADDRESS = {
  [CHAIN_ID.MAINNET]: '0x144112A0D552c83ac0aBa3C70C7ab46E62c304d2',
  [CHAIN_ID.GOERLI]: '0x976Cf43c894BA43cf096DA8C1427f6a51b724BB9',
  [CHAIN_ID.HARDHAT]: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
  [CHAIN_ID.ZHEJIANG]: '0x976Cf43c894BA43cf096DA8C1427f6a51b724BB9',
}

export const SLP_DEPOSIT_MERKLE_ROOT = {
  [CHAIN_ID.MAINNET]: '0xd68ce67b1e69f61353fd887b267493c2f1401f9711c0c2b1744bbe8cbf27938f',
  [CHAIN_ID.GOERLI]: '0xd68ce67b1e69f61353fd887b267493c2f1401f9711c0c2b1744bbe8cbf27938f',
  [CHAIN_ID.HARDHAT]: '0xd68ce67b1e69f61353fd887b267493c2f1401f9711c0c2b1744bbe8cbf27938f',
  [CHAIN_ID.ZHEJIANG]: '0xd68ce67b1e69f61353fd887b267493c2f1401f9711c0c2b1744bbe8cbf27938f',
}

export const OPERATOR_ADDRESS = {
  [CHAIN_ID.MAINNET]: '0x976Cf43c894BA43cf096DA8C1427f6a51b724BB9',
  [CHAIN_ID.GOERLI]: '0x976Cf43c894BA43cf096DA8C1427f6a51b724BB9',
  [CHAIN_ID.HARDHAT]: '0x976Cf43c894BA43cf096DA8C1427f6a51b724BB9',
  [CHAIN_ID.ZHEJIANG]: '0x976Cf43c894BA43cf096DA8C1427f6a51b724BB9',
}

export const NATIVE_TOKEN_ADDRESS = {
  [CHAIN_ID.MAINNET]: '0x976Cf43c894BA43cf096DA8C1427f6a51b724BB9',
  [CHAIN_ID.GOERLI]: '0x976Cf43c894BA43cf096DA8C1427f6a51b724BB9',
  [CHAIN_ID.HARDHAT]: '0x976Cf43c894BA43cf096DA8C1427f6a51b724BB9',
  [CHAIN_ID.ZHEJIANG]: '0x976Cf43c894BA43cf096DA8C1427f6a51b724BB9',
}

export const SSV_NETWORK_ADDRESS = {
  [CHAIN_ID.MAINNET]: '0xDD9BC35aE942eF0cFa76930954a156B3fF30a4E1',
  [CHAIN_ID.GOERLI]: '0xc3cd9a0ae89fff83b71b58b6512d43f8a41f363d',
  [CHAIN_ID.HARDHAT]: '',
  [CHAIN_ID.ZHEJIANG]: '',
}
