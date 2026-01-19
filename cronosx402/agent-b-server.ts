import 'dotenv/config';
import express from 'express';
import axios from 'axios';

const app = express();
app.use(express.json());

const PORT = 4000;

// Cronos X402 config (Standard Protocol)
const FACILITATOR_URL = 'https://facilitator.cronoslabs.org/v2/x402';
const SELLER_WALLET = process.env.SELLER_WALLET!;
const USDX_CONTRACT = '0xc01efAaF7C5C61bEbFAeb358E1161b537b8bC0e0'; // testnet USDX
const NETWORK = 'cronos-testnet';

// ===== PAID AGENT ENDPOINT =====
app.post('/agent/data', async (req, res) => {
  console.log('📨 Agent B received POST request to /agent/data');
  console.log('📨 Headers:', req.headers);
  console.log('📨 Body:', req.body);
  const priceUsd = 0.001; // $1 per request
  const amount = (priceUsd * 1e6).toString(); // USDC.e = 6 decimals

  const paymentHeader = req.headers['x-payment'];

  // STEP 1: Ask for payment
  if (!paymentHeader) {
    return res.status(402).json({
      error: 'Payment Required',
      x402Version: 1,
      paymentRequirements: {
        scheme: 'exact',
        network: NETWORK,
        payTo: SELLER_WALLET,
        asset: USDX_CONTRACT,
        description: 'Agent-to-Agent premium data',
        mimeType: 'application/json',
        maxAmountRequired: amount,
        maxTimeoutSeconds: 300
      }
    });
  }

  // STEP 2: Verify payment with X402 Facilitator (EIP-3009 Standard)
  const payload = {
    x402Version: 1,
    paymentHeader: paymentHeader,
    paymentRequirements: {
      scheme: 'exact',
      network: NETWORK,
      payTo: SELLER_WALLET,
      asset: USDX_CONTRACT,
      description: 'Agent-to-Agent premium data',
      mimeType: 'application/json',
      maxAmountRequired: amount,
      maxTimeoutSeconds: 300
    }
  };

  try {
    console.log('🔍 Verifying EIP-3009 payment with X402 Facilitator...');
    console.log('Payment header length:', paymentHeader.length);

    const verify = await axios.post(
      `${FACILITATOR_URL}/verify`,
      payload,
      { headers: { 'X402-Version': '1' } }
    );

    console.log('✅ Facilitator verify response:', verify.data);

    if (!verify.data.isValid) {
      return res.status(402).json({
        error: 'Invalid payment',
        reason: verify.data.invalidReason
      });
    }

    // STEP 3: Settle payment with facilitator
    console.log('💰 Settling EIP-3009 payment via facilitator...');
    const settle = await axios.post(
      `${FACILITATOR_URL}/settle`,
      payload,
      { headers: { 'X402-Version': '1' } }
    );

    console.log('✅ Facilitator settle response:', settle.data);

    if (settle.data.event !== 'payment.settled') {
      return res.status(402).json({
        error: 'Payment settlement failed',
        reason: settle.data.error
      });
    }

    // STEP 4: Generate X402 Receipt (Cronos Facilitator Format)
    const x402Receipt = {
      x402Version: 1,
      receiptType: 'payment.settled',
      transactionHash: settle.data.txHash,
      settlementId: settle.data.settlementId || `settlement_${Date.now()}`,
      paymentDetails: {
        amount: settle.data.value,
        asset: USDX_CONTRACT,
        network: settle.data.network,
        from: settle.data.from,
        to: settle.data.to,
        facilitator: 'cronos-x402'
      },
      verificationProof: {
        verifiedBy: 'cronos-x402-facilitator',
        verificationTimestamp: settle.data.timestamp,
        settlementEvent: settle.data.event,
        blockNumber: settle.data.blockNumber,
        facilitatorVersion: 'v2'
      },
      serviceProvided: {
        endpoint: '/agent/data',
        description: 'Premium trading signal data',
        serviceTimestamp: new Date().toISOString(),
        contentType: 'application/json'
      },
      metadata: {
        protocol: 'X402',
        facilitator: 'cronoslabs',
        agentVersion: '1.0.0'
      }
    };

    // STEP 5: Return agent response with X402 receipt
    return res.json({
      ok: true,
      paid: true,
      txHash: settle.data.txHash,
      settlementId: settle.data.settlementId,
      x402Receipt: x402Receipt,
      data: {
        signal: 'BUY',
        confidence: 0.87,
        source: 'Agent-B'
      }
    });

  } catch (err: any) {
    console.error('❌ Error in payment verification:', err.message);
    return res.status(500).json({
      error: 'Server error',
      details: err.message
    });
  }
});

// ===== TEST ENDPOINT =====
app.get('/test', (req, res) => {
  console.log('📨 Test endpoint called');
  res.json({ status: 'Agent B is running', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Agent B (X402 Server) running on http://localhost:${PORT}`);
  console.log(`🔗 Using Cronos X402 Facilitator: ${FACILITATOR_URL}`);
  console.log(`🧪 Test endpoint: http://localhost:${PORT}/test`);
});
