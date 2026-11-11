// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {screen} from '@testing-library/react';
import React from 'react';

import type {IncomingWebhook} from '@mattermost/types/integrations';

import InstalledIncomingWebhook, {matchesFilter} from 'components/integrations/installed_incoming_webhook';

import {renderWithContext} from 'tests/react_testing_utils';

describe('components/integrations/InstalledIncomingWebhook', () => {
    const incomingWebhook: IncomingWebhook = {
        id: '9w96t4nhbfdiij64wfqors4i1r',
        channel_id: '1jiw9kphbjrntfyrm7xpdcya4o',
        create_at: 1502455422406,
        last_used: 0,
        delete_at: 0,
        description: 'build status',
        display_name: 'build',
        team_id: 'eatxocwc3bg9ffo9xyybnj4omr',
        update_at: 1502455422406,
        user_id: 'zaktnt8bpbgu8mb6ez9k64r7sa',
        username: 'username',
        icon_url: 'http://test/icon.png',
        channel_locked: false,
    };

    const teamId = 'testteamid';

    const initialState = {
        entities: {
            general: {
                config: {},
            },
            users: {
                currentUserId: 'currentUserId',
            },
        },
    };

    const baseProps = {
        incomingWebhook,
        onDelete: jest.fn(),
        creator: {username: 'creator'},
        team: {
            id: teamId,
            name: 'test',
            create_at: 1502455422406,
            delete_at: 0,
            update_at: 1502455422406,
            type: 'O' as const,
            display_name: 'name',
            scheme_id: 'id',
            allow_open_invite: false,
            group_constrained: false,
            description: '',
            email: '',
            company_name: '',
            allowed_domains: '',
            invite_id: '',
        },
        channel: {
            id: '1jiw9kphbjrntfyrm7xpdcya4o',
            name: 'town-square',
            create_at: 1502455422406,
            delete_at: 0,
            update_at: 1502455422406,
            team_id: teamId,
            type: 'O' as const,
            display_name: 'name',
            header: 'header',
            purpose: 'purpose',
            last_post_at: 0,
            last_root_post_at: 0,
            creator_id: 'id',
            scheme_id: 'id',
            group_constrained: false,
        },
    };

    test('should match snapshot', () => {
        const {container} = renderWithContext(
            <InstalledIncomingWebhook
                {...baseProps}
                canChange={true}
            />,
            initialState,
        );
        expect(container).toMatchSnapshot();
    });

    test('should not have edit and delete actions if user does not have permissions to change', () => {
        const {container} = renderWithContext(
            <InstalledIncomingWebhook
                {...baseProps}
                canChange={false}
            />,
            initialState,
        );
        expect(container.querySelector('.item-actions')).toBeNull();
    });

    test('should have edit and delete actions if user can change webhook', () => {
        const {container} = renderWithContext(
            <InstalledIncomingWebhook
                {...baseProps}
                canChange={true}
            />,
            initialState,
        );
        expect(container.querySelector('.item-actions')).not.toBeNull();
        expect(screen.getByText('Edit')).toBeInTheDocument();
        expect(screen.getByText('Delete')).toBeInTheDocument();
    });

    test('Should have the same name and description on view as it has in incomingWebhook', () => {
        const {container} = renderWithContext(
            <InstalledIncomingWebhook
                {...baseProps}
                canChange={false}
            />,
            initialState,
        );

        expect(container.querySelector('.item-details__description')!.textContent).toBe('build status');
        expect(container.querySelector('.item-details__name')!.textContent).toBe('build');
    });

    test('Should not display description as it is null', () => {
        const newIncomingWebhook: IncomingWebhook = {...incomingWebhook, description: ''};
        const {container} = renderWithContext(
            <InstalledIncomingWebhook
                {...baseProps}
                incomingWebhook={newIncomingWebhook}
                canChange={false}
            />,
            initialState,
        );
        expect(container.querySelector('.item-details__description')).toBeNull();
    });

    test('Should not render any nodes as there are no filtered results', () => {
        const {container} = renderWithContext(
            <InstalledIncomingWebhook
                {...baseProps}
                filter={'someLongText'}
                canChange={false}
            />,
            initialState,
        );
        expect(container.firstChild).toBeNull();
    });

    test('Should render a webhook item as filtered result is true', () => {
        const {container} = renderWithContext(
            <InstalledIncomingWebhook
                {...baseProps}
                filter={'buil'}
                canChange={true}
            />,
            initialState,
        );
        expect(container.querySelector('.item-details')).not.toBeNull();
    });

    test('should show Last used on when last_used is non-zero', () => {
        const lastUsedMs = 1704067200000;
        const hookWithLastUsed: IncomingWebhook = {
            ...incomingWebhook,
            last_used: lastUsedMs,
        };

        renderWithContext(
            <InstalledIncomingWebhook
                {...baseProps}
                incomingWebhook={hookWithLastUsed}
                canChange={false}
            />,
            initialState,
        );

        expect(screen.getByText(/Last used on/i)).toBeInTheDocument();
        expect(screen.queryByText('Never used')).not.toBeInTheDocument();
    });
    test('should show the display name of the channel the webhook posts to', () => {
        renderWithContext(
            <InstalledIncomingWebhook
                {...baseProps}
                channel={{...baseProps.channel, display_name: 'Town Square'}}
                canChange={false}
            />,
            initialState,
        );

        expect(screen.getByText('Channel: Town Square')).toBeInTheDocument();
    });

    test('should show N/A as the channel when the channel is not available', () => {
        renderWithContext(
            <InstalledIncomingWebhook
                {...baseProps}
                channel={undefined}
                canChange={false}
            />,
            initialState,
        );

        expect(screen.getByText('Channel: N/A')).toBeInTheDocument();
    });

    describe('matchesFilter', () => {
        const channel = {...baseProps.channel, name: 'town-square', display_name: 'Town Square'};

        test('should match the channel name', () => {
            expect(matchesFilter(incomingWebhook, channel, 'town-sq')).toBe(true);
        });

        test('should match the channel display name', () => {
            expect(matchesFilter(incomingWebhook, channel, 'town squ')).toBe(true);
        });

        test('should not match a channel that is not available', () => {
            expect(matchesFilter(incomingWebhook, undefined, 'town squ')).toBe(false);
        });
    });
});
