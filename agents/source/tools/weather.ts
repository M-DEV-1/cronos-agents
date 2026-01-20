import { FunctionTool } from '@google/adk';
import { z } from 'zod';

/**
 * Weather Tool
 * Gets current weather and forecast for a city.
 * Returns mock weather data for hackathon prototype.
 */
export const weather = new FunctionTool({
    name: 'get_weather',
    description: 'Get current weather conditions and forecast for a city. Useful for planning travel to events.',
    parameters: z.object({
        city: z.string().describe('City name (e.g., "New York", "London", "Mumbai")'),
        units: z.enum(['celsius', 'fahrenheit']).optional().default('celsius'),
    }),
    execute: ({ city, units = 'celsius' }) => {
        const data = generateMockWeather(city, units);
        return {
            status: 'success',
            ...data,
        };
    },
});

function generateMockWeather(city: string, units: string) {
    const cityData: Record<string, { temp: number; condition: string; humidity: number }> = {
        'jaipur': { temp: 22, condition: 'Sunny', humidity: 35 },
        'mumbai': { temp: 28, condition: 'Partly Cloudy', humidity: 70 },
        'new york': { temp: 2, condition: 'Cold', humidity: 55 },
        'london': { temp: 8, condition: 'Rainy', humidity: 85 },
        'san francisco': { temp: 15, condition: 'Foggy', humidity: 75 },
        'kolkata': { temp: 24, condition: 'Pleasant', humidity: 60 },
        'delhi': { temp: 18, condition: 'Hazy', humidity: 50 },
    };

    const lowerCity = city.toLowerCase();
    const data = cityData[lowerCity] || { temp: 20, condition: 'Fair', humidity: 50 };

    const tempC = data.temp;
    const tempF = Math.round((tempC * 9 / 5) + 32);
    const displayTemp = units === 'fahrenheit' ? tempF : tempC;
    const unitSymbol = units === 'fahrenheit' ? '°F' : '°C';

    return {
        city,
        temperature: `${displayTemp}${unitSymbol}`,
        temperatureValue: displayTemp,
        condition: data.condition,
        humidity: `${data.humidity}%`,
        forecast: [
            { day: 'Today', high: displayTemp + 2, low: displayTemp - 5, condition: data.condition },
            { day: 'Tomorrow', high: displayTemp + 3, low: displayTemp - 4, condition: 'Partly Cloudy' },
            { day: 'Day After', high: displayTemp + 1, low: displayTemp - 6, condition: 'Clear' },
        ],
        lastUpdated: new Date().toISOString(),
    };
}
