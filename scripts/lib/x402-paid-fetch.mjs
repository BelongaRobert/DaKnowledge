import { privateKeyToAccount } from 'viem/accounts';
import { createPublicClient, formatUnits, http } from 'viem';
import { base } from 'viem/chains';
import { x402Client } from '@x402/core/client';
import { x402HTTPClient } from '@x402/core/http';
import { ExactEvmScheme } from '@x402/evm/exact/client';
import { toClientEvmSigner } from '@x402/evm';

const USDC_BASE = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const ERC20_BALANCE_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
];

export function getBuyerPrivateKey() {
  const pk = process.env.BUYER_PRIVATE_KEY || process.env.X402_BUYER_PRIVATE_KEY;
  if (!pk) {
    throw new Error(
      'Set BUYER_PRIVATE_KEY (or X402_BUYER_PRIVATE_KEY) to a Base wallet with ~$1.10 USDC. Never commit this key.',
    );
  }
  return pk;
}

export async function createPaidFetch() {
  const account = privateKeyToAccount(getBuyerPrivateKey());
  const publicClient = createPublicClient({ chain: base, transport: http() });
  const signer = toClientEvmSigner(account, publicClient);
  const httpClient = new x402HTTPClient(
    new x402Client().register('eip155:*', new ExactEvmScheme(signer)),
  );

  const balance = await publicClient.readContract({
    address: USDC_BASE,
    abi: ERC20_BALANCE_ABI,
    functionName: 'balanceOf',
    args: [account.address],
  });

  return {
    address: account.address,
    usdc: formatUnits(balance, 6),
    async fetch(url, init = {}) {
      let res = await fetch(url, init);
      if (res.status !== 402) return res;

      const bodyText = await res.text();
      const paymentRequired = httpClient.getPaymentRequiredResponse(
        (name) => res.headers.get(name),
        bodyText ? tryJson(bodyText) : undefined,
      );
      const paymentPayload = await httpClient.createPaymentPayload(paymentRequired);
      const headers = new Headers(init.headers || {});
      headers.set('PAYMENT-SIGNATURE', httpClient.encodePaymentSignatureHeader(paymentPayload));

      res = await fetch(url, { ...init, headers });
      return res;
    },
    getSettlement(res) {
      try {
        return httpClient.getPaymentSettleResponse((name) => res.headers.get(name));
      } catch {
        return null;
      }
    },
  };
}

function tryJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
