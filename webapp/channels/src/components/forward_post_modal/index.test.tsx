// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import type {Channel} from '@mattermost/types/channels';

import {renderWithContext, screen} from 'tests/react_testing_utils';
import {TestHelper} from 'utils/test_helper';

import ForwardPostModal from './index';

jest.mock('components/post_view/post_message_preview', () => () => <div data-testid='post-message-preview'/>);
jest.mock('./forward_post_channel_select', () => ({
    __esModule: true,
    default: () => <div data-testid='forward-post-channel-select'/>,
    makeSelectedChannelOption: jest.fn(),
}));
jest.mock('./forward_post_comment_input', () => () => <div data-testid='forward-post-comment-input'/>);

describe('components/forward_post_modal', () => {
    const currentUser = TestHelper.getUserMock({id: 'current_user_id'});
    const otherUser = TestHelper.getUserMock({id: 'other_user_id', username: 'other.user'});
    const team = TestHelper.getTeamMock({id: 'team_id', name: 'team-name'});

    function renderModal(channel: Channel) {
        const post = TestHelper.getPostMock({id: 'post_id', channel_id: channel.id});

        const state = {
            entities: {
                users: {
                    currentUserId: currentUser.id,
                    profiles: {[currentUser.id]: currentUser, [otherUser.id]: otherUser},
                },
                teams: {
                    currentTeamId: team.id,
                    teams: {[team.id]: team},
                },
                channels: {
                    channels: {[channel.id]: channel},
                },
            },
        };

        return renderWithContext(<ForwardPostModal post={post}/>, state);
    }

    test('should explain that a message from a private channel is posted in the same channel', () => {
        renderModal(TestHelper.getChannelMock({id: 'channel_id', type: 'P', display_name: 'Secret Channel'}));

        expect(screen.getByTestId('notification_forward_post')).toHaveTextContent(
            "Messages in Private Channels can't be forwarded to other channels. Selecting Forward will post the message in the current channel ~Secret Channel.",
        );
    });

    test('should explain that a direct message is posted in the same direct message', () => {
        renderModal(TestHelper.getChannelMock({id: 'channel_id', type: 'D', name: `${currentUser.id}__${otherUser.id}`, teammate_id: otherUser.id}));

        expect(screen.getByTestId('notification_forward_post')).toHaveTextContent(
            "Direct Messages can't be forwarded to other channels. Selecting Forward will post the message in the current Direct Message with other.user.",
        );
    });

    test('should explain that a group message is posted in the same group message', () => {
        renderModal(TestHelper.getChannelMock({id: 'channel_id', type: 'G', display_name: 'user.one, user.two'}));

        expect(screen.getByTestId('notification_forward_post')).toHaveTextContent(
            "Group Messages can't be forwarded to other channels. Selecting Forward will post the message in the current Group Message with user.one and user.two.",
        );
    });

    test('should not show the notice for a message from a public channel', () => {
        renderModal(TestHelper.getChannelMock({id: 'channel_id', type: 'O', display_name: 'Town Square'}));

        expect(screen.queryByTestId('notification_forward_post')).not.toBeInTheDocument();
    });
});
