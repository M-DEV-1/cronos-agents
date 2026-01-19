// A2UI Server
// Agent-to-User Interface with prompt box, source MCP selector, budget/policy UI

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { UserAgent } from './user-agent';
import { UserPrompt, SourcePolicy } from './types';

const app = express();
app.use(express.json());
app.use(cors());

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

const PORT = 3000;
const AGENT_PRIVATE_KEY = process.env.AGENT_PRIVATE_KEY!;

const userAgent = new UserAgent(AGENT_PRIVATE_KEY);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Submit prompt and get source options
app.post('/api/prompt', async (req, res) => {
  try {
    const { prompt, source_policy } = req.body as {
      prompt: string;
      source_policy?: SourcePolicy;
    };

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Set source policy if provided
    if (source_policy) {
      userAgent.setSourcePolicy(source_policy);
    }

    const userPrompt: UserPrompt = { prompt, source_policy };
    const interpretation = await userAgent.interpretIntent(userPrompt);

    res.json({
      ok: true,
      prompt: prompt,
      intent: interpretation.intent,
      required_tools: interpretation.requiredTools,
      source_options: interpretation.suggestedSources,
      message: 'Please select a source to proceed'
    });
  } catch (err: any) {
    console.error('Error processing prompt:', err);
    res.status(500).json({
      error: 'Failed to process prompt',
      details: err.message
    });
  }
});

// Select source and execute
app.post('/api/execute', async (req, res) => {
  try {
    const { prompt, selected_source_id, source_policy } = req.body as {
      prompt: string;
      selected_source_id: string;
      source_policy?: SourcePolicy;
    };

    if (!prompt || !selected_source_id) {
      return res.status(400).json({
        error: 'Prompt and selected_source_id are required'
      });
    }

    // Set source policy if provided
    if (source_policy) {
      userAgent.setSourcePolicy(source_policy);
    }

    // Execute with selected source
    const userPrompt: UserPrompt = { prompt, source_policy };
    const result = await userAgent.executeWithSourceSelection(
      userPrompt,
      selected_source_id
    );

    // Calculate proof hash (simplified)
    const proofHash = calculateProofHash(result);

    res.json({
      ok: true,
      answer: formatAnswer(result),
      source: result.source,
      cost: result.totalCost,
      cost_currency: 'USDT',
      proof_hash: proofHash,
      x402_receipts: result.results
        .map((r: any) => r.x402Receipt)
        .filter((r: any) => r !== undefined),
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    console.error('Error executing request:', err);
    res.status(500).json({
      error: 'Execution failed',
      details: err.message
    });
  }
});

// Get source policy template
app.get('/api/source-policy/template', (req, res) => {
  res.json({
    allowed_sources: [],
    max_budget: 0,
    preferred_currency: 'USDT',
    require_metadata: true
  });
});

// Helper functions
function calculateProofHash(result: any): string {
  // Simplified proof hash calculation
  const data = JSON.stringify({
    source: result.source,
    results: result.results.map((r: any) => ({
      tool: r.tool,
      timestamp: r.timestamp
    }))
  });
  // In production, use proper cryptographic hash
  return Buffer.from(data).toString('base64').substring(0, 32);
}

function formatAnswer(result: any): string {
  // Format the result into a human-readable answer
  const results = result.results;
  if (results.length === 0) {
    return 'No results returned.';
  }

  const answers = results.map((r: any) => {
    if (r.result) {
      if (r.result.price) {
        return `Current price: $${r.result.price}`;
      }
      if (r.result.candles) {
        return `Retrieved ${r.result.candles.length} OHLC candles`;
      }
      if (r.result.prices) {
        return `Retrieved ${r.result.prices.length} price updates`;
      }
      return JSON.stringify(r.result);
    }
    return 'No data available';
  });

  return answers.join('\n');
}

app.listen(PORT, () => {
  console.log(`A2UI Server running on http://localhost:${PORT}`);
});

export { app };

