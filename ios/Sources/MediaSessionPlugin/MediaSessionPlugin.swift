import Capacitor
import Foundation
import MediaPlayer

@objc(MediaSessionPlugin)
public class MediaSessionPlugin: CAPPlugin, CAPBridgedPlugin {
    private let pluginVersion: String = "8.0.14"
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
    private var registeredCommands: Set<String> = []
    private var commandTargets: [String: Any] = [:]

    deinit {
        DispatchQueue.main.async { [weak self] in
            self?.clearRemoteCommandTargets()
        }
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
                self.updateRemoteCommandPlaybackControls(canPlay: false, canPause: true)
                if #available(iOS 13.0, *) {
                    MPNowPlayingInfoCenter.default().playbackState = .playing
                }
            case "paused":
                info[MPNowPlayingInfoPropertyPlaybackRate] = 0.0
                self.updateRemoteCommandPlaybackControls(canPlay: true, canPause: false)
                if #available(iOS 13.0, *) {
                    MPNowPlayingInfoCenter.default().playbackState = .paused
                }
            case "none":
                info[MPNowPlayingInfoPropertyPlaybackRate] = 0.0
                self.updateRemoteCommandPlaybackControls(canPlay: false, canPause: false)
                if #available(iOS 13.0, *) {
                    MPNowPlayingInfoCenter.default().playbackState = .stopped
                }
            default:
                info[MPNowPlayingInfoPropertyPlaybackRate] = 0.0
                self.updateRemoteCommandPlaybackControls(canPlay: true, canPause: false)
                if #available(iOS 13.0, *) {
                    MPNowPlayingInfoCenter.default().playbackState = .stopped
                }
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
            if self.registeredCommands.contains(action) {
                call.resolve()
                return
            }

            let commandCenter = MPRemoteCommandCenter.shared()

            switch action {
            case "play":
                commandCenter.playCommand.isEnabled = true
                let target = commandCenter.playCommand.addTarget { [weak self] _ in
                    self?.notifyListeners("actionHandler", data: ["action": "play"])
                    return .success
                }
                self.commandTargets[action] = target
            case "pause":
                commandCenter.pauseCommand.isEnabled = true
                let target = commandCenter.pauseCommand.addTarget { [weak self] _ in
                    self?.notifyListeners("actionHandler", data: ["action": "pause"])
                    return .success
                }
                self.commandTargets[action] = target
            case "nexttrack":
                commandCenter.nextTrackCommand.isEnabled = true
                let target = commandCenter.nextTrackCommand.addTarget { [weak self] _ in
                    self?.notifyListeners("actionHandler", data: ["action": "nexttrack"])
                    return .success
                }
                self.commandTargets[action] = target
            case "previoustrack":
                commandCenter.previousTrackCommand.isEnabled = true
                let target = commandCenter.previousTrackCommand.addTarget { [weak self] _ in
                    self?.notifyListeners("actionHandler", data: ["action": "previoustrack"])
                    return .success
                }
                self.commandTargets[action] = target
            case "seekforward":
                commandCenter.skipForwardCommand.isEnabled = true
                let target = commandCenter.skipForwardCommand.addTarget { [weak self] _ in
                    self?.notifyListeners("actionHandler", data: ["action": "seekforward"])
                    return .success
                }
                self.commandTargets[action] = target
            case "seekbackward":
                commandCenter.skipBackwardCommand.isEnabled = true
                let target = commandCenter.skipBackwardCommand.addTarget { [weak self] _ in
                    self?.notifyListeners("actionHandler", data: ["action": "seekbackward"])
                    return .success
                }
                self.commandTargets[action] = target
            case "stop":
                commandCenter.stopCommand.isEnabled = true
                let target = commandCenter.stopCommand.addTarget { [weak self] _ in
                    self?.notifyListeners("actionHandler", data: ["action": "stop"])
                    return .success
                }
                self.commandTargets[action] = target
            case "seekto":
                commandCenter.changePlaybackPositionCommand.isEnabled = true
                let target = commandCenter.changePlaybackPositionCommand.addTarget {
                    [weak self] event in
                    guard let positionEvent = event as? MPChangePlaybackPositionCommandEvent else {
                        return .commandFailed
                    }
                    self?.notifyListeners(
                        "actionHandler",
                        data: [
                            "action": "seekto",
                            "seekTime": positionEvent.positionTime,
                        ])
                    return .success
                }
                self.commandTargets[action] = target
            default:
                call.reject("Unsupported action: \(action)")
                return
            }

            self.registeredCommands.insert(action)
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
                let duration =
                    (info[MPMediaItemPropertyPlaybackDuration] as? Double) ?? call.getDouble(
                        "duration") ?? 0
                let clampedPosition = max(0, min(position, max(0, duration)))
                info[MPNowPlayingInfoPropertyElapsedPlaybackTime] = clampedPosition
            }
            if let playbackRate = call.getDouble("playbackRate") {
                info[MPNowPlayingInfoPropertyPlaybackRate] = playbackRate
                self.updateRemoteCommandPlaybackControls(
                    canPlay: playbackRate <= 0,
                    canPause: playbackRate > 0
                )
                if #available(iOS 13.0, *) {
                    MPNowPlayingInfoCenter.default().playbackState =
                        playbackRate <= 0 ? .paused : .playing
                }
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

    private func updateRemoteCommandPlaybackControls(canPlay: Bool, canPause: Bool) {
        let commandCenter = MPRemoteCommandCenter.shared()
        let playRegistered = registeredCommands.contains("play")
        let pauseRegistered = registeredCommands.contains("pause")

        commandCenter.playCommand.isEnabled = playRegistered ? canPlay : false
        commandCenter.pauseCommand.isEnabled = pauseRegistered ? canPause : false
    }

    private func clearRemoteCommandTargets() {
        let commandCenter = MPRemoteCommandCenter.shared()

        for (action, target) in commandTargets {
            command(for: action, in: commandCenter)?.removeTarget(target)
        }

        commandTargets.removeAll()
        registeredCommands.removeAll()
    }

    private func command(for action: String, in commandCenter: MPRemoteCommandCenter)
        -> MPRemoteCommand?
    {
        switch action {
        case "play":
            return commandCenter.playCommand
        case "pause":
            return commandCenter.pauseCommand
        case "nexttrack":
            return commandCenter.nextTrackCommand
        case "previoustrack":
            return commandCenter.previousTrackCommand
        case "seekforward":
            return commandCenter.skipForwardCommand
        case "seekbackward":
            return commandCenter.skipBackwardCommand
        case "stop":
            return commandCenter.stopCommand
        case "seekto":
            return commandCenter.changePlaybackPositionCommand
        default:
            return nil
        }
    }

}
