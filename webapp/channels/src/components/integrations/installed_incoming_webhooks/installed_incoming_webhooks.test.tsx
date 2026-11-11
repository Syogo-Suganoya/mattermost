// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import type {IncomingWebhook} from '@mattermost/types/integrations';

import InstalledIncomingWebhooks from 'components/integrations/installed_incoming_webhooks/installed_incoming_webhooks';

import {renderWithContext} from 'tests/react_testing_utils';
import {TestHelper} from 'utils/test_helper';

describe('components/integrations/InstalledIncomingWebhooks', () => {
    const team = TestHelper.getTeamMock({id: 'teamId', name: 'test'});
    const user = TestHelper.getUserMock({id: 'userId'});
    const channel = TestHelper.getChannelMock({
        id: 'channelId',
        display_name: 'Town Square',
    });

    const hookAlpha: IncomingWebhook = TestHelper.getIncomingWebhookMock({
        id: 'hook-alpha',
        display_name: 'Alpha Webhook',
        channel_id: 'channelId',
        team_id: 'teamId',
        user_id: 'userId',
    });
    const hookCharlie: IncomingWebhook = TestHelper.getIncomingWebhookMock({
        id: 'hook-charlie',
        display_name: 'Charlie Webhook',
        channel_id: 'channelId',
        team_id: 'teamId',
        user_id: 'userId',
    });
    const hookBravo: IncomingWebhook = TestHelper.getIncomingWebhookMock({
        id: 'hook-bravo',
        display_name: 'Bravo Webhook',
        channel_id: 'channelId',
        team_id: 'teamId',
        user_id: 'userId',
    });

    const initialState = {
        entities: {
            general: {config: {}},
            users: {currentUserId: 'userId'},
        },
    };

    const defaultProps = {
        team,
        user,
        incomingHooks: [hookAlpha, hookCharlie, hookBravo],
        incomingHooksTotalCount: 3,
        channels: {channelId: channel},
        users: {userId: user},
        canManageOthersWebhooks: true,
        enableIncomingWebhooks: true,
        actions: {
            removeIncomingHook: jest.fn(),
            loadIncomingHooksAndProfilesForTeam: jest.fn().mockReturnValue(Promise.resolve()),
        },
    };

    test('renders webhooks sorted alphabetically by display name', async () => {
        renderWithContext(
            <InstalledIncomingWebhooks
                {...defaultProps}
            />,
            initialState,
        );

        await waitFor(() => {
            expect(screen.getByText('Alpha Webhook')).toBeInTheDocument();
        });

        const items = screen.getAllByText(/Webhook/);
        const names = items.map((el) => el.textContent);

        const alphaIdx = names.findIndex((n) => n?.includes('Alpha'));
        const bravoIdx = names.findIndex((n) => n?.includes('Bravo'));
        const charlieIdx = names.findIndex((n) => n?.includes('Charlie'));

        expect(alphaIdx).toBeLessThan(bravoIdx);
        expect(bravoIdx).toBeLessThan(charlieIdx);
    });

    test('does not mutate the incomingHooks prop array when sorting', async () => {
        const hooks: IncomingWebhook[] = [hookAlpha, hookCharlie, hookBravo];
        const originalOrder = hooks.map((h) => h.id);

        const props = {...defaultProps, incomingHooks: hooks};

        renderWithContext(
            <InstalledIncomingWebhooks
                {...props}
            />,
            initialState,
        );

        await waitFor(() => {
            expect(screen.getByText('Alpha Webhook')).toBeInTheDocument();
        });

        // The original array passed as prop must not be mutated by the sort
        expect(hooks.map((h) => h.id)).toEqual(originalOrder);
    });

    test('compares hooks with missing display_name symmetrically using channel name fallback', async () => {
        const noNameHook: IncomingWebhook = TestHelper.getIncomingWebhookMock({
            id: 'hook-no-name',
            display_name: '',
            channel_id: 'channelId',
            team_id: 'teamId',
            user_id: 'userId',
        });
        const namedHook: IncomingWebhook = TestHelper.getIncomingWebhookMock({
            id: 'hook-named',
            display_name: 'Zeta Webhook',
            channel_id: 'channelId',
            team_id: 'teamId',
            user_id: 'userId',
        });

        // channel display_name is "Town Square" which sorts before "Zeta Webhook"
        const props = {
            ...defaultProps,
            incomingHooks: [namedHook, noNameHook],
            incomingHooksTotalCount: 2,
        };

        renderWithContext(
            <InstalledIncomingWebhooks
                {...props}
            />,
            initialState,
        );

        await waitFor(() => {
            expect(screen.getByText('Zeta Webhook')).toBeInTheDocument();
        });

        const townSquareEl = screen.getByText('Town Square');
        const zetaEl = screen.getByText('Zeta Webhook');

        expect(townSquareEl).toBeInTheDocument();
        expect(zetaEl).toBeInTheDocument();

        // Verify DOM order: Town Square (channel fallback) should appear before Zeta Webhook
        const position = townSquareEl.compareDocumentPosition(zetaEl);
        expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
    test('shows a hint about what the search matches', async () => {
        renderWithContext(
            <InstalledIncomingWebhooks
                {...defaultProps}
            />,
            initialState,
        );

        expect(await screen.findByText('Search by webhook title or associated channel. Examples: "My Webhook Title", "town-square", or "Town Square".')).toBeInTheDocument();
    });

    test('finds webhooks by the display name of their channel', async () => {
        const otherChannel = TestHelper.getChannelMock({
            id: 'otherChannelId',
            name: 'off-topic',
            display_name: 'Off-Topic',
        });
        const hookOffTopic = TestHelper.getIncomingWebhookMock({
            id: 'hook-off-topic',
            display_name: 'Delta Webhook',
            channel_id: 'otherChannelId',
            team_id: 'teamId',
            user_id: 'userId',
        });

        renderWithContext(
            <InstalledIncomingWebhooks
                {...defaultProps}
                incomingHooks={[hookAlpha, hookOffTopic]}
                incomingHooksTotalCount={2}
                channels={{channelId: channel, otherChannelId: otherChannel}}
            />,
            initialState,
        );

        await screen.findByText('Alpha Webhook');

        await userEvent.type(screen.getByPlaceholderText('Search Incoming Webhooks'), 'Town Square');

        expect(screen.getByText('Alpha Webhook')).toBeInTheDocument();
        expect(screen.queryByText('Delta Webhook')).not.toBeInTheDocument();
    });
});
