import * as Types from './types.js';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];

export const GetMarketV1AdapterPositionsDocument = gql`
    query getMarketV1AdapterPositions($address: String!, $chainId: Int!) {
  marketPositions(where: {userAddress_in: [$address], chainId_in: [$chainId]}) {
    items {
      state {
        supplyAssets
      }
      market {
        uniqueKey
        collateralAsset {
          address
        }
        loanAsset {
          address
        }
        oracle {
          address
        }
        irmAddress
        lltv
        state {
          supplyAssets
          supplyShares
          borrowAssets
          borrowShares
          rateAtTarget
          fee
          timestamp
        }
      }
    }
  }
}
    `;
export const GetMissingMarketsDataDocument = gql`
    query getMissingMarketsData($uniqueKeys: [String!]!, $chainId: Int!) {
  markets(where: {uniqueKey_in: $uniqueKeys, chainId_in: [$chainId]}) {
    items {
      uniqueKey
      collateralAsset {
        address
      }
      loanAsset {
        address
      }
      oracle {
        address
      }
      irmAddress
      lltv
      state {
        supplyAssets
        supplyShares
        borrowAssets
        borrowShares
        rateAtTarget
        fee
        timestamp
      }
    }
  }
}
    `;
export const GetVaultsV2BasicDataDocument = gql`
    query getVaultsV2BasicData($address: String!, $chainId: Int!) {
  vaultV2ByAddress(address: $address, chainId: $chainId) {
    adapters {
      items {
        address
        type
      }
    }
    totalAssets
    idleAssets
    caps {
      items {
        type
        id
        idData
        absoluteCap
        relativeCap
      }
    }
  }
}
    `;

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string, variables?: any) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType, _variables) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    getMarketV1AdapterPositions(variables: Types.GetMarketV1AdapterPositionsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<Types.GetMarketV1AdapterPositionsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<Types.GetMarketV1AdapterPositionsQuery>({ document: GetMarketV1AdapterPositionsDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'getMarketV1AdapterPositions', 'query', variables);
    },
    getMissingMarketsData(variables: Types.GetMissingMarketsDataQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<Types.GetMissingMarketsDataQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<Types.GetMissingMarketsDataQuery>({ document: GetMissingMarketsDataDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'getMissingMarketsData', 'query', variables);
    },
    getVaultsV2BasicData(variables: Types.GetVaultsV2BasicDataQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<Types.GetVaultsV2BasicDataQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<Types.GetVaultsV2BasicDataQuery>({ document: GetVaultsV2BasicDataDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'getVaultsV2BasicData', 'query', variables);
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;