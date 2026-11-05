// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package model

import (
	"bytes"
	"encoding/json"
	"fmt"
	"time"
)

const (
	UserPropsKeyCustomStatus = "customStatus"

	CustomStatusTextMaxRunes = 100
	MaxRecentCustomStatuses  = 5
	DefaultCustomStatusEmoji = "speech_balloon"
)

var validCustomStatusDuration = map[string]bool{
	"thirty_minutes": true,
	"one_hour":       true,
	"four_hours":     true,
	"today":          true,
	"this_week":      true,
	"date_and_time":  true,
}

type CustomStatus struct {
	Emoji     string    `json:"emoji"`
	Text      string    `json:"text"`
	Duration  string    `json:"duration"`
	ExpiresAt time.Time `json:"expires_at"`
}

func (cs *CustomStatus) PreSave() {
	if cs.Duration == "" && !cs.ExpiresAt.Before(time.Now()) {
		cs.Duration = "date_and_time"
	}

	runes := []rune(cs.Text)
	if len(runes) > CustomStatusTextMaxRunes {
		cs.Text = string(runes[:CustomStatusTextMaxRunes])
	}
}

func (cs *CustomStatus) AreDurationAndExpirationTimeValid() bool {
	if cs.Duration == "" && (cs.ExpiresAt.IsZero() || !cs.ExpiresAt.Before(time.Now())) {
		return true
	}

	// The expiration time can be omitted for durations it can be calculated
	// from. See SetExpiresAtFromDuration.
	if cs.ExpiresAt.IsZero() && cs.Duration != "date_and_time" && validCustomStatusDuration[cs.Duration] {
		return true
	}

	if validCustomStatusDuration[cs.Duration] && !cs.ExpiresAt.Before(time.Now()) {
		return true
	}

	return false
}

// SetExpiresAtFromDuration sets ExpiresAt from Duration when ExpiresAt is not
// set, so that API clients can send only a duration. now is the current time
// and loc is the user's timezone, which is used for "today" and "this_week".
// The calculation matches the one done by the web app when a status is set.
func (cs *CustomStatus) SetExpiresAtFromDuration(now time.Time, loc *time.Location) {
	if !cs.ExpiresAt.IsZero() {
		return
	}
	if loc == nil {
		loc = time.UTC
	}

	switch cs.Duration {
	case "thirty_minutes":
		cs.ExpiresAt = now.Add(30 * time.Minute).Truncate(time.Minute)
	case "one_hour":
		cs.ExpiresAt = now.Add(time.Hour).Truncate(time.Minute)
	case "four_hours":
		cs.ExpiresAt = now.Add(4 * time.Hour).Truncate(time.Minute)
	case "today":
		// Midnight at the start of the next day in the user's timezone.
		local := now.In(loc)
		cs.ExpiresAt = time.Date(local.Year(), local.Month(), local.Day()+1, 0, 0, 0, 0, loc)
	case "this_week":
		// The last millisecond of Saturday in the user's timezone, which is
		// the end of the week as calculated by the web app.
		local := now.In(loc)
		daysUntilSaturday := int(time.Saturday - local.Weekday())
		cs.ExpiresAt = time.Date(local.Year(), local.Month(), local.Day()+daysUntilSaturday+1, 0, 0, 0, 0, loc).Add(-time.Millisecond)
	}

	// Store the time in UTC, like the web app does.
	cs.ExpiresAt = cs.ExpiresAt.UTC()
}

func RuneToHexadecimalString(r rune) string {
	return fmt.Sprintf("%04x", r)
}

type RecentCustomStatuses []CustomStatus

func (rcs RecentCustomStatuses) Contains(cs *CustomStatus) (bool, error) {
	if cs == nil {
		return false, nil
	}

	csJSON, jsonErr := json.Marshal(cs)
	if jsonErr != nil {
		return false, jsonErr
	}

	// status is empty
	if len(csJSON) == 0 || (cs.Emoji == "" && cs.Text == "") {
		return false, nil
	}

	for _, status := range rcs {
		js, jsonErr := json.Marshal(status)
		if jsonErr != nil {
			return false, jsonErr
		}
		if bytes.Equal(js, csJSON) {
			return true, nil
		}
	}

	return false, nil
}

func (rcs RecentCustomStatuses) Add(cs *CustomStatus) RecentCustomStatuses {
	newRCS := rcs[:0]

	// if same `text` exists in existing recent custom statuses, modify existing status
	for _, status := range rcs {
		if status.Text != cs.Text {
			newRCS = append(newRCS, status)
		}
	}
	newRCS = append(RecentCustomStatuses{*cs}, newRCS...)
	if len(newRCS) > MaxRecentCustomStatuses {
		newRCS = newRCS[:MaxRecentCustomStatuses]
	}
	return newRCS
}

func (rcs RecentCustomStatuses) Remove(cs *CustomStatus) (RecentCustomStatuses, error) {
	if cs == nil {
		return rcs, nil
	}

	csJSON, jsonErr := json.Marshal(cs)
	if jsonErr != nil {
		return rcs, jsonErr
	}

	if len(csJSON) == 0 || (cs.Emoji == "" && cs.Text == "") {
		return rcs, nil
	}

	newRCS := rcs[:0]
	for _, status := range rcs {
		js, jsonErr := json.Marshal(status)
		if jsonErr != nil {
			return rcs, jsonErr
		}
		if !bytes.Equal(js, csJSON) {
			newRCS = append(newRCS, status)
		}
	}

	return newRCS, nil
}
