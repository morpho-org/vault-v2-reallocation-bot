import * as Types from '@morpho-org/blue-api-sdk';

export type GetMarketV1AdapterPositionsQueryVariables = Types.Exact<{
  address: Types.Scalars['String']['input'];
  chainId: Types.Scalars['Int']['input'];
}>;


export type GetMarketV1AdapterPositionsQuery = { __typename?: 'Query', marketPositions: { __typename?: 'PaginatedMarketPositions', items: Array<{ __typename?: 'MarketPosition', state: { __typename?: 'MarketPositionState', supplyAssets: Types.Scalars["BigInt"]["output"] | null } | null, market: { __typename?: 'Market', uniqueKey: Types.Scalars["MarketId"]["output"], irmAddress: Types.Scalars["Address"]["output"], lltv: Types.Scalars["BigInt"]["output"], collateralAsset: { __typename?: 'Asset', address: Types.Scalars["Address"]["output"] } | null, loanAsset: { __typename?: 'Asset', address: Types.Scalars["Address"]["output"] }, oracle: { __typename?: 'Oracle', address: Types.Scalars["Address"]["output"] } | null, state: { __typename?: 'MarketState', supplyAssets: Types.Scalars["BigInt"]["output"], supplyShares: Types.Scalars["BigInt"]["output"], borrowAssets: Types.Scalars["BigInt"]["output"], borrowShares: Types.Scalars["BigInt"]["output"], rateAtTarget: Types.Scalars["BigInt"]["output"] | null, fee: number, timestamp: Types.Scalars["BigInt"]["output"] } | null } }> | null } };

export type GetMissingMarketsDataQueryVariables = Types.Exact<{
  uniqueKeys: Array<Types.Scalars['String']['input']> | Types.Scalars['String']['input'];
  chainId: Types.Scalars['Int']['input'];
}>;


export type GetMissingMarketsDataQuery = { __typename?: 'Query', markets: { __typename?: 'PaginatedMarkets', items: Array<{ __typename?: 'Market', uniqueKey: Types.Scalars["MarketId"]["output"], irmAddress: Types.Scalars["Address"]["output"], lltv: Types.Scalars["BigInt"]["output"], collateralAsset: { __typename?: 'Asset', address: Types.Scalars["Address"]["output"] } | null, loanAsset: { __typename?: 'Asset', address: Types.Scalars["Address"]["output"] }, oracle: { __typename?: 'Oracle', address: Types.Scalars["Address"]["output"] } | null, state: { __typename?: 'MarketState', supplyAssets: Types.Scalars["BigInt"]["output"], supplyShares: Types.Scalars["BigInt"]["output"], borrowAssets: Types.Scalars["BigInt"]["output"], borrowShares: Types.Scalars["BigInt"]["output"], rateAtTarget: Types.Scalars["BigInt"]["output"] | null, fee: number, timestamp: Types.Scalars["BigInt"]["output"] } | null }> | null } };

export type GetVaultsV2BasicDataQueryVariables = Types.Exact<{
  address: Types.Scalars['String']['input'];
  chainId: Types.Scalars['Int']['input'];
}>;


export type GetVaultsV2BasicDataQuery = { __typename?: 'Query', vaultV2ByAddress: { __typename?: 'VaultV2', totalAssets: Types.Scalars["BigInt"]["output"] | null, idleAssets: Types.Scalars["BigInt"]["output"], adapters: { __typename?: 'PaginatedVaultV2Adapters', items: Array<
        | { __typename?: 'MetaMorphoAdapter', address: Types.Scalars["Address"]["output"], type: Types.VaultV2AdapterType }
        | { __typename?: 'MorphoMarketV1Adapter', address: Types.Scalars["Address"]["output"], type: Types.VaultV2AdapterType }
      > | null }, caps: { __typename?: 'PaginatedVaultV2Caps', items: Array<{ __typename?: 'VaultV2Caps', type: Types.VaultV2CapType, id: Types.Scalars["HexString"]["output"], idData: Types.Scalars["HexString"]["output"], absoluteCap: Types.Scalars["BigInt"]["output"], relativeCap: Types.Scalars["BigInt"]["output"] }> | null } } };
