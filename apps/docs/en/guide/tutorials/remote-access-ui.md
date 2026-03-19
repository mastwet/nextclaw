# Remote Access UI Tutorial

This tutorial follows the UI-first path for remote access.

## Before You Start

Make sure:

- your local NextClaw UI already opens correctly
- this machine has your preferred external network entry
- you know the platform API base if you are not using the default

## Step 1: Open the Page

In the UI, go to:

- `Settings`
- `Remote Access`

You will see account, device, service, and diagnostics sections on one page.

## Step 2: Authorize in Browser

In `Platform Account`:

1. Keep the current platform API base, or change it in `Device Settings` first if needed
2. Click `Continue in Browser`
3. Finish sign-in on the platform page that opens
4. If the account does not exist yet, switch to account creation on that page
5. Return to the local UI and wait for automatic completion

If you already logged out before, use the same button again. Re-login is not hidden behind CLI commands anymore.

## Step 3: Save Device Settings

In `Device Settings`:

1. Turn on `Enable Remote Access`
2. Set a recognizable device name
3. Optionally override the platform API base
4. Click `Save Settings`

## Step 4: Start or Restart the Managed Service

In `Managed Service`:

- click `Start Service` if it is not running yet
- click `Restart Service` after changing remote settings

If this page is currently served by the managed service itself, a restart may briefly disconnect the page.

## Step 5: Run Diagnostics

Click `Run Diagnostics` and confirm these checks are passing:

- `remote-enabled`
- `platform-token`
- `local-ui`
- `service-runtime`

## Step 6: Verify From Another Device

From your other device:

1. Open your external entry URL
2. Confirm the NextClaw UI loads
3. Open `Remote Access` and confirm the connector shows as connected
