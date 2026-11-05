// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package model

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestCustomStatusAreDurationAndExpirationTimeValid(t *testing.T) {
	future := time.Now().Add(time.Hour)
	past := time.Now().Add(-time.Hour)

	for _, tc := range []struct {
		name     string
		status   CustomStatus
		expected bool
	}{
		{"no duration and no expiration time", CustomStatus{}, true},
		{"no duration and future expiration time", CustomStatus{ExpiresAt: future}, true},
		{"no duration and past expiration time", CustomStatus{ExpiresAt: past}, false},
		{"duration with future expiration time", CustomStatus{Duration: "today", ExpiresAt: future}, true},
		{"duration with past expiration time", CustomStatus{Duration: "today", ExpiresAt: past}, false},
		{"thirty_minutes without expiration time", CustomStatus{Duration: "thirty_minutes"}, true},
		{"one_hour without expiration time", CustomStatus{Duration: "one_hour"}, true},
		{"four_hours without expiration time", CustomStatus{Duration: "four_hours"}, true},
		{"today without expiration time", CustomStatus{Duration: "today"}, true},
		{"this_week without expiration time", CustomStatus{Duration: "this_week"}, true},
		{"date_and_time without expiration time", CustomStatus{Duration: "date_and_time"}, false},
		{"invalid duration without expiration time", CustomStatus{Duration: "forever"}, false},
		{"invalid duration with future expiration time", CustomStatus{Duration: "forever", ExpiresAt: future}, false},
	} {
		t.Run(tc.name, func(t *testing.T) {
			assert.Equal(t, tc.expected, tc.status.AreDurationAndExpirationTimeValid())
		})
	}
}

func TestCustomStatusSetExpiresAtFromDuration(t *testing.T) {
	tokyo, err := time.LoadLocation("Asia/Tokyo")
	require.NoError(t, err)

	// Wednesday 2026-11-04 23:30:45 in Tokyo, which is still Wednesday 14:30:45 in UTC.
	now := time.Date(2026, time.November, 4, 23, 30, 45, 0, tokyo)

	for _, tc := range []struct {
		name     string
		duration string
		loc      *time.Location
		expected time.Time
	}{
		{"thirty_minutes", "thirty_minutes", tokyo, time.Date(2026, time.November, 5, 0, 0, 0, 0, tokyo)},
		{"one_hour", "one_hour", tokyo, time.Date(2026, time.November, 5, 0, 30, 0, 0, tokyo)},
		{"four_hours", "four_hours", tokyo, time.Date(2026, time.November, 5, 3, 30, 0, 0, tokyo)},
		{"today uses the user's timezone", "today", tokyo, time.Date(2026, time.November, 5, 0, 0, 0, 0, tokyo)},
		{"today in UTC", "today", time.UTC, time.Date(2026, time.November, 5, 0, 0, 0, 0, time.UTC)},
		{"today with nil location falls back to UTC", "today", nil, time.Date(2026, time.November, 5, 0, 0, 0, 0, time.UTC)},
		{"this_week ends at the end of Saturday", "this_week", tokyo, time.Date(2026, time.November, 7, 23, 59, 59, int(999*time.Millisecond), tokyo)},
	} {
		t.Run(tc.name, func(t *testing.T) {
			cs := CustomStatus{Duration: tc.duration}
			cs.SetExpiresAtFromDuration(now, tc.loc)
			assert.True(t, tc.expected.Equal(cs.ExpiresAt), "expected %s, got %s", tc.expected, cs.ExpiresAt)
		})
	}

	t.Run("this_week on a Saturday ends the same day", func(t *testing.T) {
		saturday := time.Date(2026, time.November, 7, 10, 0, 0, 0, time.UTC)
		cs := CustomStatus{Duration: "this_week"}
		cs.SetExpiresAtFromDuration(saturday, time.UTC)
		assert.True(t, time.Date(2026, time.November, 7, 23, 59, 59, int(999*time.Millisecond), time.UTC).Equal(cs.ExpiresAt))
	})

	t.Run("does not override an expiration time that is already set", func(t *testing.T) {
		expiresAt := now.Add(10 * time.Hour)
		cs := CustomStatus{Duration: "today", ExpiresAt: expiresAt}
		cs.SetExpiresAtFromDuration(now, tokyo)
		assert.True(t, expiresAt.Equal(cs.ExpiresAt))
	})

	for _, duration := range []string{"", "date_and_time", "forever"} {
		t.Run("leaves the expiration time unset for duration "+duration, func(t *testing.T) {
			cs := CustomStatus{Duration: duration}
			cs.SetExpiresAtFromDuration(now, tokyo)
			assert.True(t, cs.ExpiresAt.IsZero())
		})
	}
}
