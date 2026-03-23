import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChannelsList } from '@/components/config/ChannelsList';

const mocks = vi.hoisted(() => ({
  mutate: vi.fn(),
  mutateAsync: vi.fn(),
  configQuery: {
    data: {
      channels: {
        weixin: {
          enabled: false,
          defaultAccountId: '1344b2b24720@im.bot',
          baseUrl: 'https://ilinkai.weixin.qq.com',
          pollTimeoutMs: 35000,
          allowFrom: ['o9cq804svxfyCCTIqzddDqRBeMC0@im.wechat'],
          accounts: {
            '1344b2b24720@im.bot': {
              enabled: true
            }
          }
        }
      }
    },
    isLoading: false
  },
  metaQuery: {
    data: {
      channels: [
        {
          name: 'weixin',
          displayName: 'Weixin',
          enabled: false
        }
      ]
    }
  },
  schemaQuery: {
    data: {
      uiHints: {
        'channels.weixin': {
          label: 'Weixin',
          help: 'Weixin QR login + getupdates long-poll channel'
        },
        'channels.weixin.baseUrl': {
          label: 'API Base URL'
        }
      },
      actions: []
    }
  }
}));

vi.mock('@/hooks/useConfig', () => ({
  useConfig: () => mocks.configQuery,
  useConfigMeta: () => mocks.metaQuery,
  useConfigSchema: () => mocks.schemaQuery,
  useUpdateChannel: () => ({
    mutate: mocks.mutate,
    mutateAsync: mocks.mutateAsync,
    isPending: false
  }),
  useExecuteConfigAction: () => ({
    mutateAsync: vi.fn(),
    isPending: false
  })
}));

describe('ChannelsList', () => {
  beforeEach(() => {
    mocks.mutate.mockReset();
    mocks.mutateAsync.mockReset();
  });

  it('renders weixin and submits weixin-specific config fields', async () => {
    const user = userEvent.setup();

    render(<ChannelsList />);

    await user.click(await screen.findByRole('button', { name: /All Channels/i }));

    expect((await screen.findAllByText('Weixin')).length).toBeGreaterThan(0);
    expect(await screen.findByLabelText('Default Account ID')).toBeTruthy();

    const timeoutInput = await screen.findByLabelText('Long Poll Timeout (ms)');
    await user.clear(timeoutInput);
    await user.type(timeoutInput, '45000');

    const accountsJson = await screen.findByLabelText('Accounts JSON');
    await user.clear(accountsJson);
    fireEvent.change(accountsJson, {
      target: {
        value: JSON.stringify(
          {
            '1344b2b24720@im.bot': {
              enabled: true,
              baseUrl: 'https://ilinkai.weixin.qq.com'
            }
          },
          null,
          2
        )
      }
    });

    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(mocks.mutate).toHaveBeenCalledWith({
        channel: 'weixin',
        data: expect.objectContaining({
          enabled: false,
          defaultAccountId: '1344b2b24720@im.bot',
          baseUrl: 'https://ilinkai.weixin.qq.com',
          pollTimeoutMs: 45000,
          allowFrom: ['o9cq804svxfyCCTIqzddDqRBeMC0@im.wechat'],
          accounts: {
            '1344b2b24720@im.bot': {
              enabled: true,
              baseUrl: 'https://ilinkai.weixin.qq.com'
            }
          }
        })
      });
    });
  });
});
