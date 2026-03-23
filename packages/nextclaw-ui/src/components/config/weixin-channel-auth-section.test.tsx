import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WeixinChannelAuthSection } from './weixin-channel-auth-section';

const mocks = vi.hoisted(() => ({
  startChannelAuthMutateAsync: vi.fn(),
  pollChannelAuthMutateAsync: vi.fn(),
  invalidateQueries: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-query')>('@tanstack/react-query');
  return {
    ...actual,
    useQueryClient: () => ({
      invalidateQueries: mocks.invalidateQueries
    })
  };
});

vi.mock('qrcode', () => ({
  toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,weixin-qr')
}));

vi.mock('@/hooks/use-channel-auth', () => ({
  useStartChannelAuth: () => ({
    mutateAsync: mocks.startChannelAuthMutateAsync,
    isPending: false
  }),
  usePollChannelAuth: () => ({
    mutateAsync: mocks.pollChannelAuthMutateAsync,
    isPending: false
  })
}));

describe('WeixinChannelAuthSection', () => {
  beforeEach(() => {
    mocks.startChannelAuthMutateAsync.mockReset();
    mocks.pollChannelAuthMutateAsync.mockReset();
    mocks.invalidateQueries.mockClear();
  });

  it('switches to connected state when channel config becomes authorized during an active session', async () => {
    const user = userEvent.setup();
    mocks.startChannelAuthMutateAsync.mockResolvedValue({
      channel: 'weixin',
      kind: 'qr_code',
      sessionId: 'session-1',
      qrCode: 'qr-token',
      qrCodeUrl: 'https://example.com/weixin-qr.png',
      expiresAt: '2026-03-24T10:00:00.000Z',
      intervalMs: 60_000,
      note: '请扫码'
    });
    mocks.pollChannelAuthMutateAsync.mockImplementation(() => new Promise(() => {}));

    const { rerender } = render(
      <WeixinChannelAuthSection
        channelConfig={{ enabled: false }}
        formData={{}}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Scan QR to connect Weixin' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Waiting for scan confirmation' })).toBeTruthy();
    });

    rerender(
      <WeixinChannelAuthSection
        channelConfig={{
          enabled: true,
          defaultAccountId: 'bot-1@im.bot',
          accounts: {
            'bot-1@im.bot': {
              enabled: true
            }
          }
        }}
        formData={{}}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Connected')).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Reconnect with QR' })).toBeTruthy();
    });
  });
});
