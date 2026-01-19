import 'dotenv/config';
import axios from 'axios';
import { ethers } from 'ethers';

// ===== AGENT WALLET =====
const privateKey = process.env.AGENT_PRIVATE_KEY;
if (!privateKey) {
  throw new Error('AGENT_PRIVATE_KEY environment variable is required');
}

const provider = new ethers.JsonRpcProvider('https://evm-t3.cronos.org');
const wallet = new ethers.Wallet(privateKey, provider);

// ===== TARGET AGENT =====
const AGENT_B_URL = 'http://127.0.0.1:4000/agent/data';

// ===== NETWORK CONFIG =====
const NETWORK_CONFIG = {
  'cronos-testnet': {
    chainId: 338,
    rpcUrl: 'https://evm-t3.cronos.org',
    usdcContract: '0xc01efAaF7C5C61bEbFAeb358E1161b537b8bC0e0'
  }
};

// ===== EIP-3009 PAYMENT HEADER GENERATOR =====
function generateNonce(): string {
  return ethers.hexlify(ethers.randomBytes(32));
}

async function createPaymentHeader(wallet: ethers.Wallet, paymentRequirements: any): Promise<string> {
  const { payTo, asset, maxAmountRequired, maxTimeoutSeconds, network } = paymentRequirements;

  // Type guard for network
  if (network !== 'cronos-testnet') {
    throw new Error(`Unsupported network: ${network}`);
  }

  // TypeScript now knows network is 'cronos-testnet'
  const networkName = network as 'cronos-testnet';

  // Generate unique nonce
  const nonce = generateNonce();

  // Calculate validity window
  const validAfter = 0; // Valid immediately
  const validBefore = Math.floor(Date.now() / 1000) + maxTimeoutSeconds;

  // EIP-712 domain for USDC.e token
  const domain = {
    name: "Bridged USDC (Stargate)",
    version: "1",
    chainId: NETWORK_CONFIG[networkName].chainId,
    verifyingContract: asset,
  };

  // EIP-712 typed data structure for TransferWithAuthorization
  const types = {
    TransferWithAuthorization: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'validAfter', type: 'uint256' },
      { name: 'validBefore', type: 'uint256' },
      { name: 'nonce', type: 'bytes32' },
    ],
  };

  // Create the message to sign
  const message = {
    from: wallet.address,
    to: payTo,
    value: maxAmountRequired,
    validAfter: validAfter,
    validBefore: validBefore,
    nonce: nonce,
  };

  // Sign using EIP-712
  const signature = await wallet.signTypedData(domain, types, message);

  // Construct X402 payment header
  const paymentHeader = {
    x402Version: 1,
    scheme: 'exact',
    network: networkName,
    payload: {
      from: wallet.address,
      to: payTo,
      value: maxAmountRequired,
      validAfter: validAfter,
      validBefore: validBefore,
      nonce: nonce,
      signature: signature,
      asset: asset,
    },
  };

  // Base64-encode the payment header
  return Buffer.from(JSON.stringify(paymentHeader)).toString('base64');
}

// ===== USDX ABI =====
const erc20Abi = [{
  name: 'transfer',
  type: 'function',
  stateMutability: 'nonpayable',
  inputs: [
    { name: 'to', type: 'address' },
    { name: 'amount', type: 'uint256' }
  ],
  outputs: [{ type: 'bool' }]
}];

// ===== MAIN FLOW =====
async function runAgent() {
  console.log('🤖 Starting X402 Agent A (EIP-3009 Payment Agent)');
  console.log('🎯 Target: Agent B at', AGENT_B_URL);
  console.log('🔐 Wallet:', wallet.address);

  try {
    // STEP 1: Initial X402 request
    console.log('📡 STEP 1: Requesting data from Agent B...');
    console.log('🌐 Making request to:', AGENT_B_URL);

    let initialResponse;
    try {
      console.log('📨 Sending POST request to Agent B...');
      initialResponse = await axios.post(AGENT_B_URL, {}, {
        headers: {
          'X402-Version': '1',
          'Accept': 'application/json'
        },
        timeout: 10000 // 10 second timeout
      });
      console.log('📨 Request successful, status:', initialResponse.status);
      console.log('📨 Response data:', initialResponse.data);
    } catch (err: any) {
      console.log('📨 Request failed, checking for error response...');
      console.log('📨 Error object:', err);
      if (err.response) {
        initialResponse = err.response;
        console.log('📨 Got error response with status:', initialResponse.status);
        console.log('📨 Error response data:', initialResponse.data);
      } else {
        console.error('❌ No response received:', err.message);
        throw err;
      }
    }

    // Check if we got the data directly (no payment required)
    if (initialResponse.status === 200) {
      console.log('✅ No payment required, received data directly');
      return initialResponse.data;
    }

    // If we got here, we have a 402 response - proceed to payment processing
    const req = initialResponse.data.paymentRequirements;
    console.log('💰 STEP 2: Received X402 payment requirements:');
    console.log('   Amount:', req.maxAmountRequired, 'micro-units (', parseInt(req.maxAmountRequired) / 1e6, 'USDC.e )');
    console.log('   Asset:', req.asset);
    console.log('   Recipient:', req.payTo);
    console.log('   Network:', req.network);
    console.log('   Timeout:', req.maxTimeoutSeconds, 'seconds');

    // STEP 3: Generate EIP-3009 payment authorization
    console.log('🔏 STEP 3: Generating EIP-3009 signature...');
    const paymentHeaderBase64 = await createPaymentHeader(wallet, req);
    console.log('✅ EIP-3009 signature generated and encoded');

    // STEP 4: Submit payment proof to facilitator via Agent B
    console.log('🔄 STEP 4: Submitting X402 payment proof to facilitator...');
    const response = await axios.post(
      AGENT_B_URL,
      {},
      {
        headers: {
          'X-Payment': paymentHeaderBase64,
          'X402-Version': '1',
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ X402 Payment successful via facilitator!');
    console.log('📄 X402 Receipt from facilitator:', JSON.stringify(response.data.x402Receipt, null, 2));

    console.log('🎯 Final Agent Response:', {
      paid: response.data.paid,
      txHash: response.data.txHash,
      settlementId: response.data.settlementId,
      signal: response.data.data?.signal,
      confidence: response.data.data?.confidence
    });

    return response.data;
  } catch (err: any) {
    // Handle unexpected errors
    console.error('❌ Unexpected error:', err.message);
    throw err;
  }
}

runAgent();
