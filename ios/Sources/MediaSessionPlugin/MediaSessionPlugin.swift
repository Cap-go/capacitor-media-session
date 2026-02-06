import Capacitor
import Foundation
import MediaPlayer

@objc(MediaSessionPlugin)
public class MediaSessionPlugin: CAPPlugin, CAPBridgedPlugin {
    private let pluginVersion: String = "8.0.11"
    public let identifier = "MediaSessionPlugin"
    public let jsName = "MediaSession"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "setMetadata", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setPlaybackState", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setActionHandler", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setPositionState", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getPluginVersion", returnType: CAPPluginReturnPromise)
    ]

    private var nowPlayingInfo: [String: Any] = [:]
    // MPRemoteCommandCenter is shared across the whole app. Store the opaque targets returned
    // by `addTarget(handler:)` so we can re-register idempotently without removing other targets.
    private var commandTargetTokens: [String: Any] = [:]

    private func registerCommand(
        action: String,
        command: MPRemoteCommand,
        handler: @escaping (MPRemoteCommandEvent) -> MPRemoteCommandHandlerStatus
    ) {
        if let token = commandTargetTokens[action] {
            command.removeTarget(token)
        }
        command.isEnabled = true
        commandTargetTokens[action] = command.addTarget(handler: handler)
    }

    /// Sets the Now Playing metadata (title, artist, album, artwork).
    @objc func setMetadata(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            var info: [String: Any] = [:]

            if let title = call.getString("title") {
                info[MPMediaItemPropertyTitle] = title
            }
            if let artist = call.getString("artist") {
                info[MPMediaItemPropertyArtist] = artist
            }
            if let album = call.getString("album") {
                info[MPMediaItemPropertyAlbumTitle] = album
            }

            // Handle artwork
            if let artworkArray = call.getArray("artwork"),
               artworkArray.count > 0,
               let firstArtwork = artworkArray[0] as? [String: Any],
               let src = firstArtwork["src"] as? String {
                self.loadArtwork(from: src) { image in
                    if let image = image {
                        info[MPMediaItemPropertyArtwork] = MPMediaItemArtwork(boundsSize: image.size) { _ in image }
                    }
                    self.updateNowPlayingInfo(info)
                    call.resolve()
                }
                return
            }

            self.updateNowPlayingInfo(info)
            call.resolve()
        }
    }

    /// Updates the playback state (playing/paused/none).
    @objc func setPlaybackState(_ call: CAPPluginCall) {
        guard let stateString = call.getString("playbackState") else {
            call.reject("playbackState is required")
            return
        }

        DispatchQueue.main.async {
            var info = self.nowPlayingInfo

            switch stateString {
            case "playing":
                info[MPNowPlayingInfoPropertyPlaybackRate] = 1.0
            case "paused":
                info[MPNowPlayingInfoPropertyPlaybackRate] = 0.0
            default:
                info[MPNowPlayingInfoPropertyPlaybackRate] = 0.0
            }

            // Keep a default rate so lockscreen scrub remains interactive even while paused.
            info[MPNowPlayingInfoPropertyDefaultPlaybackRate] = 1.0

            self.updateNowPlayingInfo(info)
            call.resolve()
        }
    }

    /// Registers a native handler for a media session action.
    @objc func setActionHandler(_ call: CAPPluginCall) {
        guard let action = call.getString("action") else {
            call.reject("action is required")
            return
        }

        DispatchQueue.main.async {
            let commandCenter = MPRemoteCommandCenter.shared()

            switch action {
            case "play":
                self.registerCommand(action: action, command: commandCenter.playCommand) { [weak self] _ in
                    self?.notifyListeners("actionHandler", data: ["action": "play"])
                    return .success
                }
            case "pause":
                self.registerCommand(action: action, command: commandCenter.pauseCommand) { [weak self] _ in
                    self?.notifyListeners("actionHandler", data: ["action": "pause"])
                    return .success
                }
            case "nexttrack":
                self.registerCommand(action: action, command: commandCenter.nextTrackCommand) { [weak self] _ in
                    self?.notifyListeners("actionHandler", data: ["action": "nexttrack"])
                    return .success
                }
            case "previoustrack":
                self.registerCommand(action: action, command: commandCenter.previousTrackCommand) { [weak self] _ in
                    self?.notifyListeners("actionHandler", data: ["action": "previoustrack"])
                    return .success
                }
            case "seekforward":
                self.registerCommand(action: action, command: commandCenter.skipForwardCommand) { [weak self] _ in
                    self?.notifyListeners("actionHandler", data: ["action": "seekforward"])
                    return .success
                }
            case "seekbackward":
                self.registerCommand(action: action, command: commandCenter.skipBackwardCommand) { [weak self] _ in
                    self?.notifyListeners("actionHandler", data: ["action": "seekbackward"])
                    return .success
                }
            case "stop":
                self.registerCommand(action: action, command: commandCenter.stopCommand) { [weak self] _ in
                    self?.notifyListeners("actionHandler", data: ["action": "stop"])
                    return .success
                }
            case "seekto":
                self.registerCommand(action: action, command: commandCenter.changePlaybackPositionCommand) { [weak self] event in
                    guard let positionEvent = event as? MPChangePlaybackPositionCommandEvent else {
                        return .commandFailed
                    }
                    self?.notifyListeners("actionHandler", data: [
                        "action": "seekto",
                        "seekTime": positionEvent.positionTime
                    ])
                    return .success
                }
            default:
                call.reject("Unsupported action: \(action)")
                return
            }

            call.resolve()
        }
    }

    /// Updates playback position state (duration, position, playbackRate).
    @objc func setPositionState(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            var info = self.nowPlayingInfo

            if let duration = call.getDouble("duration") {
                info[MPMediaItemPropertyPlaybackDuration] = max(0, duration)
            }
            if let position = call.getDouble("position") {
                let sanitizedPosition = max(0, position)
                if let duration = info[MPMediaItemPropertyPlaybackDuration] as? Double, duration > 0 {
                    info[MPNowPlayingInfoPropertyElapsedPlaybackTime] = min(sanitizedPosition, duration)
                } else {
                    // If duration is unknown, don't clamp the position to 0.
                    info[MPNowPlayingInfoPropertyElapsedPlaybackTime] = sanitizedPosition
                }
            }
            if let playbackRate = call.getDouble("playbackRate") {
                info[MPNowPlayingInfoPropertyPlaybackRate] = playbackRate
            }
            info[MPNowPlayingInfoPropertyDefaultPlaybackRate] = 1.0

            self.updateNowPlayingInfo(info)
            call.resolve()
        }
    }

    /// Returns the native plugin version.
    @objc func getPluginVersion(_ call: CAPPluginCall) {
        call.resolve(["version": self.pluginVersion])
    }

    private func loadArtwork(from urlString: String, completion: @escaping (UIImage?) -> Void) {
        guard let url = URL(string: urlString) else {
            completion(nil)
            return
        }

        if url.isFileURL {
            if let image = UIImage(contentsOfFile: url.path) {
                completion(image)
            } else {
                completion(nil)
            }
            return
        }

        URLSession.shared.dataTask(with: url) { data, _, _ in
            guard let data = data, let image = UIImage(data: data) else {
                DispatchQueue.main.async {
                    completion(nil)
                }
                return
            }
            DispatchQueue.main.async {
                completion(image)
            }
        }.resume()
    }

    private func updateNowPlayingInfo(_ info: [String: Any]) {
        nowPlayingInfo.merge(info) { _, new in new }
        MPNowPlayingInfoCenter.default().nowPlayingInfo = nowPlayingInfo
    }
}
