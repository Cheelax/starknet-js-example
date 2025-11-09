import { Account, Contract, RpcProvider, uint256 } from "starknet";
import { readStarknetConfig } from "./config";

type BalanceResult = {
  address: string;
  contractAddress: string;
  wei: string;
  formatted: string;
  decimals: number;
};

let provider: RpcProvider | null = null;
let account: Account | null = null;
let ethContract: Contract | null = null;

function getProvider(): RpcProvider {
  if (provider) {
    return provider;
  }

  const config = readStarknetConfig();
  provider = new RpcProvider({ nodeUrl: config.rpcUrl });
  return provider;
}

export function getAccount(): Account {
  if (account) {
    return account;
  }

  const config = readStarknetConfig();
  if (!config.accountAddress || !config.privateKey) {
    throw new Error(
      "STARKNET_ACCOUNT_ADDRESS and STARKNET_PRIVATE_KEY must be set to use Account features"
    );
  }

  account = new Account({
    provider: getProvider(),
    address: config.accountAddress,
    signer: config.privateKey,
  });
  return account;
}

async function getEthContract(): Promise<Contract> {
  if (ethContract) {
    return ethContract;
  }

  const config = readStarknetConfig();
  const providerInstance = getProvider();
  const classInfo = await providerInstance.getClassAt(
    config.ethContractAddress
  );

  if (!classInfo.abi) {
    throw new Error("ETH contract ABI not found");
  }

  ethContract = new Contract({
    abi: classInfo.abi,
    address: config.ethContractAddress,
    providerOrAccount: providerInstance,
  });

  return ethContract;
}

function formatUnits(value: bigint, decimals: number): string {
  if (decimals === 0) {
    return value.toString();
  }

  const sign = value < 0n ? "-" : "";
  const absolute = value < 0n ? -value : value;
  const str = absolute.toString().padStart(decimals + 1, "0");
  const whole = str.slice(0, -decimals) || "0";
  const fraction = str.slice(-decimals).replace(/0+$/, "");
  return fraction ? `${sign}${whole}.${fraction}` : `${sign}${whole}`;
}

type Uint256Like = {
  low: string;
  high: string;
};

function extractUint256(value: unknown): Uint256Like {
  if (!value) {
    throw new Error("balanceOf response is empty");
  }

  if (Array.isArray(value)) {
    if (value.length >= 2) {
      return { low: value[0] as string, high: value[1] as string };
    }
    throw new Error(
      `balanceOf response array must contain at least two elements, received ${value.length}`
    );
  }

  if (typeof value === "object") {
    const candidate = value as Record<string, unknown>;
    if ("balance" in candidate) {
      return extractUint256(candidate.balance);
    }
    if ("low" in candidate && "high" in candidate) {
      return candidate as Uint256Like;
    }
  }

  throw new Error(
    `Unsupported balanceOf response type: ${JSON.stringify(value).slice(0, 200)}`
  );
}

export async function fetchEthBalance(address: string): Promise<BalanceResult> {
  const contract = await getEthContract();
  let response: unknown;

  try {
    response = await contract.balanceOf(address);
    if (!response) {
      console.warn(
        `[starknet] balanceOf returned empty response via contract helper for ${address}`
      );
    }
  } catch (error) {
    console.warn(
      `[starknet] balanceOf call failed via contract helper for ${address}`,
      error
    );
  }

  if (!response) {
    const config = readStarknetConfig();
    const provider = getProvider();
    const fallback = await provider.callContract({
      contractAddress: config.ethContractAddress,
      entrypoint: "balanceOf",
      calldata: [address],
    });
    response = (fallback as { result?: unknown }).result ?? fallback;
  }

  const rawBalance = extractUint256(response);
  const wei = uint256.uint256ToBN(rawBalance);
  const weiBigInt = BigInt(wei.toString());

  return {
    address,
    contractAddress: contract.address,
    wei: weiBigInt.toString(),
    formatted: formatUnits(weiBigInt, 18),
    decimals: 18,
  };
}
