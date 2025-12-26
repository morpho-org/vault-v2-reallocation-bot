export const morphoMarketV1AdapterV2FactoryAbi = [
  {
    type: "constructor",
    inputs: [
      { name: "_morpho", type: "address", internalType: "address" },
      {
        name: "_adaptiveCurveIrm",
        type: "address",
        internalType: "address",
      },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "adaptiveCurveIrm",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "createMorphoMarketV1AdapterV2",
    inputs: [{ name: "parentVault", type: "address", internalType: "address" }],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "isMorphoMarketV1AdapterV2",
    inputs: [{ name: "account", type: "address", internalType: "address" }],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "morpho",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "morphoMarketV1AdapterV2",
    inputs: [{ name: "parentVault", type: "address", internalType: "address" }],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "CreateMorphoMarketV1AdapterV2",
    inputs: [
      {
        name: "parentVault",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "morphoMarketV1AdapterV2",
        type: "address",
        indexed: true,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "CreateMorphoMarketV1AdapterV2Factory",
    inputs: [
      {
        name: "morpho",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "adaptiveCurveIrm",
        type: "address",
        indexed: true,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
] as const;
