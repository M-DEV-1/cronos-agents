export const MOCK_A2UI_PAYLOAD = [
    // Root Layout
    {
        surfaceUpdate: {
            components: [{
                id: "root",
                component: {
                    Column: {
                        children: { explicitList: ["header", "price_card", "sentiment_card", "signals_card", "action_row"] },
                        gap: 12
                    }
                }
            }]
        }
    },
    // Header
    {
        surfaceUpdate: {
            components: [{
                id: "header",
                component: {
                    Text: {
                        text: { literalString: "Market Analysis: BTC" },
                        usageHint: "h2"
                    }
                }
            }]
        }
    },
    // Price Card
    {
        surfaceUpdate: {
            components: [{
                id: "price_card",
                component: {
                    Card: {
                        title: { literalString: "Current Price" },
                        child: "price_row"
                    }
                }
            }]
        }
    },
    {
        surfaceUpdate: {
            components: [{
                id: "price_row",
                component: {
                    Row: {
                        children: { explicitList: ["price_val", "price_change"] },
                        alignment: "spaceBetween"
                    }
                }
            }]
        }
    },
    {
        surfaceUpdate: {
            components: [{
                id: "price_val",
                component: {
                    Text: {
                        text: { literalString: "$98,420.50" },
                        usageHint: "h1"
                    }
                }
            }]
        }
    },
    {
        surfaceUpdate: {
            components: [{
                id: "price_change",
                component: {
                    Badge: {
                        text: { literalString: "+4.2% (24h)" },
                        variant: "success"
                    }
                }
            }]
        }
    },
    // Sentiment Card
    {
        surfaceUpdate: {
            components: [{
                id: "sentiment_card",
                component: {
                    Card: {
                        title: { literalString: "AI Sentiment Analysis" },
                        child: "sentiment_content"
                    }
                }
            }]
        }
    },
    {
        surfaceUpdate: {
            components: [{
                id: "sentiment_content",
                component: {
                    Column: {
                        children: { explicitList: ["sentiment_desc", "sentiment_metrics"] },
                        gap: 8
                    }
                }
            }]
        }
    },
    {
        surfaceUpdate: {
            components: [{
                id: "sentiment_desc",
                component: {
                    Text: {
                        text: { literalString: "Strong bullish momentum detected across social channels and on-chain activity." },
                        usageHint: "body",
                        color: "var(--text-secondary)"
                    }
                }
            }]
        }
    },
    // Metrics Row inside Sentiment
    {
        surfaceUpdate: {
            components: [{
                id: "sentiment_metrics",
                component: {
                    Row: {
                        children: { explicitList: ["metric_1", "metric_2"] },
                        gap: 12
                    }
                }
            }]
        }
    },
    {
        surfaceUpdate: {
            components: [{
                id: "metric_1",
                component: {
                    Badge: {
                        text: { literalString: "Social Vol: High" },
                        variant: "info"
                    }
                }
            }]
        }
    },
    {
        surfaceUpdate: {
            components: [{
                id: "metric_2",
                component: {
                    Badge: {
                        text: { literalString: "RSI: 68 (Neutral)" },
                        variant: "warning"
                    }
                }
            }]
        }
    },
    // Signals Card
    {
        surfaceUpdate: {
            components: [{
                id: "signals_card",
                component: {
                    Card: {
                        title: { literalString: "Key Signals" },
                        child: "signals_list"
                    }
                }
            }]
        }
    },
    {
        surfaceUpdate: {
            components: [{
                id: "signals_list",
                component: {
                    Column: {
                        children: { explicitList: ["signal_1", "signal_2"] },
                        gap: 8
                    }
                }
            }]
        }
    },
    {
        surfaceUpdate: {
            components: [{
                id: "signal_1",
                component: {
                    Text: {
                        text: { literalString: "• Whale accumulation zone at $96k" },
                        usageHint: "body"
                    }
                }
            }]
        }
    },
    {
        surfaceUpdate: {
            components: [{
                id: "signal_2",
                component: {
                    Text: {
                        text: { literalString: "• ETF inflows remain positive for 5th day" },
                        usageHint: "body"
                    }
                }
            }]
        }
    },
    // Button Row
    {
        surfaceUpdate: {
            components: [{
                id: "action_row",
                component: {
                    Row: {
                        children: { explicitList: ["refresh_btn", "details_btn"] },
                        gap: 12
                    }
                }
            }]
        }
    },
    {
        surfaceUpdate: {
            components: [{
                id: "refresh_btn",
                component: {
                    Button: {
                        label: { literalString: "Refresh Data" },
                        variant: "primary",
                        action: { name: "refresh", payload: "btc" }
                    }
                }
            }]
        }
    },
    {
        surfaceUpdate: {
            components: [{
                id: "details_btn",
                component: {
                    Button: {
                        label: { literalString: "Full Report" },
                        variant: "outline",
                        action: { name: "report", payload: "full" }
                    }
                }
            }]
        }
    },
    // Trigger
    {
        beginRendering: {
            root: "root"
        }
    }
];
