import { describe, expect, it } from 'vitest';
import { defaultConfig, getConfig } from './config.js';

describe('config', () => {
  it('get env avail', async () => {
    const mockPath = 'foo/bar';
    process.env['CONFIG_PATH'] = mockPath;

    const configPath = getConfig('CONFIG_PATH');

    expect(configPath).toBe(mockPath);
  });

  it('get env unavail', async () => {
    process.env['CONFIG_PATH'] = '';

    const configPath = getConfig('CONFIG_PATH');

    expect(configPath).toBe(defaultConfig.CONFIG_PATH);
  });
});
