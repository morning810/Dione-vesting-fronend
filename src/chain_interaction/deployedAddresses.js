export const contractAddreses = [
  {
    network: 13, //odessay test chain
    VestingFactory: "0x9D11Bcdd74Fc470423f98dE8EbEdFCe84b581aBb",
    MultisigWallet: "0x89CB7a2084fdbF881fA4a0919eB68ea44265cF8e",
    ZeroAddress: "0x0000000000000000000000000000000000000000",
    blackScanUrl: "https://testnet.odysseyscan.com/"
  },
  {
    network: 80001,
    VestingFactory: "0x49E067d1D414E4B88fd4803Cdc76BCf6cCC8f433",
    MultisigWallet: "0xcD55108EeB4Efa138B44C811e7f835AD04c9cb53",
    ZeroAddress: "0x0000000000000000000000000000000000000000",
    blackScanUrl: "https://mumbai.polygonscan.com/"
  }
];

//test token 0x66caEaB6bc094655BF35b8d03Ca0991d40a7d133

export const ACTIVE_CHAIN_RPC = "https://polygon-mumbai-bor.publicnode.com"; //"https://testnet.odysseyscan.com/"
export const activeChainId = 80001; //13
export const addressesOnActiveNetwork = contractAddreses?.find(
  (item) => item.network === activeChainId
);
