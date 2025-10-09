# @capgo/media-session

Expose media session controls for Capacitor apps

## Install

```bash
npm install @capgo/media-session
npx cap sync
```

## API

<docgen-index>

* [`setMetadata(...)`](#setmetadata)
* [`setPlaybackState(...)`](#setplaybackstate)
* [`setActionHandler(...)`](#setactionhandler)
* [`setPositionState(...)`](#setpositionstate)
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
