export const vaultV2FactoryAbi = [
  {
    type: "function",
    name: "createVaultV2",
    inputs: [
      { name: "owner", type: "address", internalType: "address" },
      { name: "asset", type: "address", internalType: "address" },
      { name: "salt", type: "bytes32", internalType: "bytes32" },
    ],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "isVaultV2",
    inputs: [{ name: "account", type: "address", internalType: "address" }],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "vaultV2",
    inputs: [
      { name: "owner", type: "address", internalType: "address" },
      { name: "asset", type: "address", internalType: "address" },
      { name: "salt", type: "bytes32", internalType: "bytes32" },
    ],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "CreateVaultV2",
    inputs: [
      {
        name: "owner",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "asset",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "salt",
        type: "bytes32",
        indexed: false,
        internalType: "bytes32",
      },
      {
        name: "newVaultV2",
        type: "address",
        indexed: true,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
] as const;
