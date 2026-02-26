export const morphoBlueAbi = [
  {
    inputs: [{ internalType: "Id", name: "", type: "bytes32" }],
    name: "idToMarketParams",
    outputs: [
      { internalType: "address", name: "loanToken", type: "address" },
      { internalType: "address", name: "collateralToken", type: "address" },
      { internalType: "address", name: "oracle", type: "address" },
      { internalType: "address", name: "irm", type: "address" },
      { internalType: "uint256", name: "lltv", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "Id", name: "", type: "bytes32" }],
    name: "market",
    outputs: [
      { internalType: "uint128", name: "totalSupplyAssets", type: "uint128" },
      { internalType: "uint128", name: "totalSupplyShares", type: "uint128" },
      { internalType: "uint128", name: "totalBorrowAssets", type: "uint128" },
      { internalType: "uint128", name: "totalBorrowShares", type: "uint128" },
      { internalType: "uint128", name: "lastUpdate", type: "uint128" },
      { internalType: "uint128", name: "fee", type: "uint128" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "Id", name: "", type: "bytes32" },
      { internalType: "address", name: "", type: "address" },
    ],
    name: "position",
    outputs: [
      { internalType: "uint256", name: "supplyShares", type: "uint256" },
      { internalType: "uint128", name: "borrowShares", type: "uint128" },
      { internalType: "uint128", name: "collateral", type: "uint128" },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;
