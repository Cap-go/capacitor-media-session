# @capgo/capacitor-media-session

Show now-playing info and media controls on the lock screen, notification shade and control center for audio or video in your Capacitor app.

<a href="https://capgo.app/?ref=plugin_media_session"><img src="https://capgo.app/readme-banner.svg?repo=Cap-go/capacitor-media-session" alt="Capgo - Instant updates for Capacitor" /></a>

<div align="center">
  <p><b>Capgo</b>: push fixes to your Capacitor users in minutes, build signed iOS and Android apps without a Mac, and roll back in one click.</p>
  <h2><a href="https://capgo.app/register/?ref=plugin_media_session">➡️ Get started for free</a></h2>
  <p>14-day unlimited free trial. No credit card required</p>
  <p><a href="https://capgo.app/consulting/?ref=plugin_media_session">Missing a feature? We'll build the plugin for you 💪</a></p>
</div>

<p align="center">
  <img src="https://raw.githubusercontent.com/Cap-go/capacitor-media-session/main/assets/github-social-preview.png" alt="@capgo/capacitor-media-session for Capacitor apps" width="300" />
</p>

## Key features

- **Metadata**: `setMetadata()` sets title, artist, album and artwork.
- **Playback state**: `setPlaybackState()` shows playing, paused or none.
- **Remote controls**: `setActionHandler()` handles play, pause, seek, next and previous.
- **Progress**: `setPositionState()` updates duration, position and playback rate.
- **Platforms**: iOS, Android and Web. iOS uses MediaPlayer now playing info, Android uses a media session service. Web uses the Media Session API.

## Documentation

The most complete doc is available here: https://capgo.app/docs/plugins/media-session/

## Compatibility

| Plugin version | Capacitor compatibility | Maintained |
| -------------- | ----------------------- | ---------- |
| v8.\*.\*       | v8.\*.\*                | ✅          |
| v7.\*.\*       | v7.\*.\*                | On demand   |
| v6.\*.\*       | v6.\*.\*                | ❌          |
| v5.\*.\*       | v5.\*.\*                | ❌          |

> **Note:** The major version of this plugin follows the major version of Capacitor. Use the version that matches your Capacitor installation (e.g., plugin v8 for Capacitor 8). Only the latest major version is actively maintained.

## Install

You can use our AI-Assisted Setup to install the plugin. Add the Capgo skills to your AI tool using the following command:

```bash
npx skills add https://github.com/cap-go/capacitor-skills --skill capacitor-plugins
```

Then use the following prompt:

```text
Use the `capacitor-plugins` skill from `cap-go/capacitor-skills` to install the `@capgo/capacitor-media-session` plugin in my project.
```

If you prefer Manual Setup, install the plugin by running the following commands and follow the platform-specific instructions below:

```bash
npm install @capgo/capacitor-media-session
npx cap sync
```

## API

<docgen-index>

* [`setMetadata(...)`](#setmetadata)
* [`setPlaybackState(...)`](#setplaybackstate)
* [`setActionHandler(...)`](#setactionhandler)
* [`setPositionState(...)`](#setpositionstate)
* [`getPluginVersion()`](#getpluginversion)
* [Interfaces](#interfaces)
* [Type Aliases](#type-aliases)

</docgen-index>

<docgen-api>
<!--Update the source file JSDoc comments and rerun docgen to update the docs below-->

### setMetadata(...)

```typescript
setMetadata(options: MetadataOptions) => Promise<void>
```

Sets metadata of the currently playing media.

| Param         | Type                                                        |
| ------------- | ----------------------------------------------------------- |
| **`options`** | <code><a href="#metadataoptions">MetadataOptions</a></code> |

--------------------


### setPlaybackState(...)

```typescript
setPlaybackState(options: PlaybackStateOptions) => Promise<void>
```

Updates the playback state of the media session.

| Param         | Type                                                                  |
| ------------- | --------------------------------------------------------------------- |
| **`options`** | <code><a href="#playbackstateoptions">PlaybackStateOptions</a></code> |

--------------------


### setActionHandler(...)

```typescript
setActionHandler(options: ActionHandlerOptions, handler: ActionHandler | null) => Promise<void>
```

Registers a handler for a media session action.

| Param         | Type                                                                  |
| ------------- | --------------------------------------------------------------------- |
| **`options`** | <code><a href="#actionhandleroptions">ActionHandlerOptions</a></code> |
| **`handler`** | <code><a href="#actionhandler">ActionHandler</a> \| null</code>       |

--------------------


### setPositionState(...)

```typescript
setPositionState(options: PositionStateOptions) => Promise<void>
```

Updates position state for the active media session.

| Param         | Type                                                                  |
| ------------- | --------------------------------------------------------------------- |
| **`options`** | <code><a href="#positionstateoptions">PositionStateOptions</a></code> |

--------------------


### getPluginVersion()

```typescript
getPluginVersion() => Promise<{ version: string; }>
```

Get the native Capacitor plugin version

**Returns:** <code>Promise&lt;{ version: string; }&gt;</code>

--------------------


### Interfaces


#### MetadataOptions

| Prop          | Type                      |
| ------------- | ------------------------- |
| **`album`**   | <code>string</code>       |
| **`artist`**  | <code>string</code>       |
| **`artwork`** | <code>MediaImage[]</code> |
| **`title`**   | <code>string</code>       |


#### MediaImage

| Prop        | Type                |
| ----------- | ------------------- |
| **`src`**   | <code>string</code> |
| **`sizes`** | <code>string</code> |
| **`type`**  | <code>string</code> |


#### PlaybackStateOptions

| Prop                | Type                                                                            |
| ------------------- | ------------------------------------------------------------------------------- |
| **`playbackState`** | <code><a href="#mediasessionplaybackstate">MediaSessionPlaybackState</a></code> |


#### ActionHandlerOptions

| Prop         | Type                                                              |
| ------------ | ----------------------------------------------------------------- |
| **`action`** | <code><a href="#mediasessionaction">MediaSessionAction</a></code> |


#### ActionDetails

| Prop           | Type                                                              |
| -------------- | ----------------------------------------------------------------- |
| **`action`**   | <code><a href="#mediasessionaction">MediaSessionAction</a></code> |
| **`seekTime`** | <code>number \| null</code>                                       |


#### PositionStateOptions

| Prop               | Type                |
| ------------------ | ------------------- |
| **`duration`**     | <code>number</code> |
| **`playbackRate`** | <code>number</code> |
| **`position`**     | <code>number</code> |


### Type Aliases


#### MediaSessionPlaybackState

<code>'none' | 'paused' | 'playing'</code>


#### MediaSessionAction

<code>'play' | 'pause' | 'seekbackward' | 'seekforward' | 'previoustrack' | 'nexttrack' | 'seekto' | 'stop'</code>


#### ActionHandler

<code>(details: <a href="#actiondetails">ActionDetails</a>): void</code>

</docgen-api>
