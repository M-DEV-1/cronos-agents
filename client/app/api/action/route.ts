import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const serverUrl = process.env.AGENT_SERVER_URL || 'http://localhost:4000';

        const response = await fetch(`${serverUrl}/action`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            throw new Error(`Agent server responded with ${response.status}`);
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Failed to forward action:', error);
        return NextResponse.json({ error: 'Failed to process action' }, { status: 500 });
    }
}
