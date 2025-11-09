import { z } from "zod";
import {
  AgentKitConfig,
  createAgentApp,
  createAxLLMClient,
} from "@lucid-agents/agent-kit";
import { fetchEthBalance } from "./starknet";
import { readStarknetConfig } from "./config";

const axClient = createAxLLMClient({
  logger: {
    warn(message, error) {
      if (error) {
        console.warn(`[examples] ${message}`, error);
      } else {
        console.warn(`[examples] ${message}`);
      }
    },
  },
});

const configOverrides: AgentKitConfig = {
  payments: {
    facilitatorUrl: process.env.PAYMENTS_FACILITATOR_URL as any,
    payTo: process.env.PAYMENTS_RECEIVABLE_ADDRESS as `0x${string}`,
    network: process.env.PAYMENTS_NETWORK as any,
    defaultPrice: process.env.PAYMENTS_DEFAULT_PRICE,
  },
};

const paymentsEnabled = Boolean(process.env.PAYMENTS_DEFAULT_PRICE);

const { app, addEntrypoint } = createAgentApp(
  {
    name: process.env.AGENT_NAME ?? "starknet-js-agent",
    version: process.env.AGENT_VERSION ?? "0.0.1",
    description:
      process.env.AGENT_DESCRIPTION ??
      "AxLLM flow agent that can inspect Starknet balances via starknet.js",
  },
  {
    config: paymentsEnabled ? configOverrides : undefined,
    useConfigPayments: paymentsEnabled,
  }
);

addEntrypoint({
  key: "echo",
  description: "Echo input text",
  input: z.object({
    text: z.string().min(1, "Please provide some text."),
  }),
  handler: async ({ input }) => {
    return {
      output: {
        text: input.text,
      },
    };
  },
});

const starknetAddress = z
  .string()
  .regex(/^0x[0-9a-fA-F]+$/, "Address must be 0x-prefixed hex");

addEntrypoint({
  key: "starknet-balance",
  description: "Read an ETH balance from Starknet via starknet.js",
  input: z.object({
    address: starknetAddress.optional(),
  }),
  handler: async ({ input }) => {
    const config = readStarknetConfig();
    const resolvedAddress = input.address?.trim() || config.accountAddress;

    if (!resolvedAddress) {
      throw new Error(
        "Provide an address in the request or set STARKNET_ACCOUNT_ADDRESS"
      );
    }

    const source = input.address ? "input" : "env";
    const balance = await fetchEthBalance(resolvedAddress);
    const summary = `Adresse ${balance.address} détient ${balance.formatted} ETH (18 décimales).`;

    return {
      output: {
        resolved_address: resolvedAddress,
        address_source: source,
        balance,
        summary,
      },
    };
  },
});

export { app };
