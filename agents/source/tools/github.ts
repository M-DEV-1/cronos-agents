import { FunctionTool } from '@google/adk';
import { z } from 'zod';

/**
 * GitHub Tool
 * Fetches GitHub repository and user information.
 * Returns mock data for hackathon prototype.
 */
export const github = new FunctionTool({
    name: 'get_github_info',
    description: 'Get information about GitHub repositories or users. Useful for finding open source projects and developer profiles.',
    parameters: z.object({
        type: z.enum(['repo', 'user']).describe('Type of lookup: "repo" for repository, "user" for user profile'),
        name: z.string().describe('Repository name (owner/repo) or username'),
    }),
    execute: ({ type, name }) => {
        if (type === 'repo') {
            return getRepoInfo(name);
        } else {
            return getUserInfo(name);
        }
    },
});

function getRepoInfo(repoName: string) {
    const repoData: Record<string, { description: string; stars: number; forks: number; language: string }> = {
        'google/adk': {
            description: 'Agent Development Kit - Build, evaluate, and deploy AI agents',
            stars: 12500,
            forks: 1820,
            language: 'TypeScript',
        },
        'aadeexyz/erc-8004': {
            description: 'Reference implementation for ERC-8004: Trustless Agents',
            stars: 340,
            forks: 89,
            language: 'Solidity',
        },
        'crypto-com/facilitator-client-ts': {
            description: 'x402 facilitator-client for TypeScript',
            stars: 156,
            forks: 42,
            language: 'TypeScript',
        },
    };

    const data = repoData[repoName.toLowerCase()];
    if (data) {
        return {
            status: 'success',
            type: 'repository',
            name: repoName,
            ...data,
            url: `https://github.com/${repoName}`,
            lastUpdated: new Date().toISOString().split('T')[0],
        };
    }

    // Generic fallback
    return {
        status: 'success',
        type: 'repository',
        name: repoName,
        description: 'A GitHub repository',
        stars: Math.floor(Math.random() * 1000),
        forks: Math.floor(Math.random() * 200),
        language: 'TypeScript',
        url: `https://github.com/${repoName}`,
        lastUpdated: new Date().toISOString().split('T')[0],
    };
}

function getUserInfo(username: string) {
    return {
        status: 'success',
        type: 'user',
        username,
        name: username.charAt(0).toUpperCase() + username.slice(1),
        bio: 'Software Developer',
        publicRepos: Math.floor(Math.random() * 50) + 5,
        followers: Math.floor(Math.random() * 500),
        following: Math.floor(Math.random() * 100),
        url: `https://github.com/${username}`,
    };
}
