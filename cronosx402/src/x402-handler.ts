import 'dotenv/config';
import axios from 'axios';
import { ethers } from 'ethers';
import { PaymentRequirements, AgentResponse } from './types';

const NETWORK_CONFIG = {
  'cronos-testnet': {
    chainId: 338,
    rpcUrl: 'https://evm-t3.cronos.org',
    usdcContract: '0xc01efAaF7C5C61bEbFAeb358E1161b537b8bC0e0'
  }
};

export class X402Handler {
  private wallet: ethers.Wallet;
  private facilitatorUrl: string;

  constructor(privateKey: string, facilitatorUrl: string = 'https://facilitator.cronoslabs.org/v2/x402') {
    const provider = new ethers.JsonRpcProvider('https://evm-t3.cronos.org');
    this.wallet = new ethers.Wallet(privateKey, provider);
    this.facilitatorUrl = facilitatorUrl;
  }

  private generateNonce(): string {
    return ethers.hexlify(ethers.randomBytes(32));
  }

  async createPaymentHeader(paymentRequirements: PaymentRequirements): Promise<string> {
    const { payTo, asset, maxAmountRequired, maxTimeoutSeconds, network } = paymentRequirements;

    if (network !== 'cronos-testnet') {
      throw new Error(`Unsupported network: ${network}`);
    }

    const networkName = network as 'cronos-testnet';
    const nonce = this.generateNonce();
    const validAfter = 0;
    const validBefore = Math.floor(Date.now() / 1000) + maxTimeoutSeconds;

    const domain = {
      name: "Bridged USDC (Stargate)",
      version: "1",
      chainId: NETWORK_CONFIG[networkName].chainId,
      verifyingContract: asset,
    };

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

    const message = {
      from: this.wallet.address,
      to: payTo,
      value: maxAmountRequired,
      validAfter: validAfter,
      validBefore: validBefore,
      nonce: nonce,
    };

    const signature = await this.wallet.signTypedData(domain, types, message);

    const paymentHeader = {
      x402Version: 1,
      scheme: 'exact',
      network: networkName,
      payload: {
        from: this.wallet.address,
        to: payTo,
        value: maxAmountRequired,
        validAfter: validAfter,
        validBefore: validBefore,
        nonce: nonce,
        signature: signature,
        asset: asset,
      },
    };

    return Buffer.from(JSON.stringify(paymentHeader)).toString('base64');
  }

  async handlePaymentRequest(
    url: string,
    paymentRequirements: PaymentRequirements,
    requestBody?: any
  ): Promise<AgentResponse> {
    const amount = parseInt(paymentRequirements.maxAmountRequired);
    
    if (amount === 0) {
      try {
        const response = await axios.post(
          url,
          requestBody || {},
          {
            headers: {
              'X402-Version': '1',
              'Content-Type': 'application/json'
            }
          }
        );
        return response.data;
      } catch (err: any) {
        if (err.response) {
          return err.response.data;
        }
        throw err;
      }
    }

    const paymentHeaderBase64 = await this.createPaymentHeader(paymentRequirements);

    // Retry request with payment header
    try {
      const response = await axios.post(
        url,
        requestBody || {},
        {
          headers: {
            'X-Payment': paymentHeaderBase64,
            'X402-Version': '1',
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (err: any) {
      if (err.response) {
        throw new Error(`Payment failed: ${err.response.data.error || err.message}`);
      }
      throw err;
    }
  }

  async requestWithAutoPayment(
    url: string,
    requestBody?: any,
    maxRetries: number = 1
  ): Promise<any> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Initial request
        let response;
        try {
          response = await axios.post(url, requestBody || {}, {
            headers: {
              'X402-Version': '1',
              'Accept': 'application/json'
            }
          });

          if (response.status === 200) {
            return response.data;
          }
        } catch (err: any) {
          if (err.response && err.response.status === 402) {
            response = err.response;
          } else {
            throw err;
          }
        }

        // If we got 402, process payment
        if (response.status === 402) {
          const paymentRequirements = response.data.paymentRequirements;
          return await this.handlePaymentRequest(url, paymentRequirements, requestBody);
        }

        return response.data;
      } catch (err: any) {
        if (attempt === maxRetries) {
          throw err;
        }
      }
    }

    throw new Error('Max retries exceeded');
  }
}

