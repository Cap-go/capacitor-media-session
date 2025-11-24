import Capacitor
import Foundation
import MediaPlayer

@objc(MediaSessionPlugin)
public class MediaSessionPlugin: CAPPlugin, CAPBridgedPlugin {
    private let pluginVersion: String = "7.2.8"
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

    @objc func setMetadata(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            let nowPlayingInfo = MPNowPlayingInfoCenter.default()
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
                    nowPlayingInfo.nowPlayingInfo = info
                    call.resolve()
                }
                return
            }

            nowPlayingInfo.nowPlayingInfo = info
            call.resolve()
        }
    }

    @objc func setPlaybackState(_ call: CAPPluginCall) {
        guard let stateString = call.getString("playbackState") else {
            call.reject("playbackState is required")
            return
        }

        DispatchQueue.main.async {
            let nowPlayingInfo = MPNowPlayingInfoCenter.default()
            var info = nowPlayingInfo.nowPlayingInfo ?? [:]

            switch stateString {
            case "playing":
                info[MPNowPlayingInfoPropertyPlaybackRate] = 1.0
            case "paused":
                info[MPNowPlayingInfoPropertyPlaybackRate] = 0.0
            default:
                info[MPNowPlayingInfoPropertyPlaybackRate] = 0.0
            }

            nowPlayingInfo.nowPlayingInfo = info
            call.resolve()
        }
    }

    @objc func setActionHandler(_ call: CAPPluginCall) {
        guard let action = call.getString("action") else {
            call.reject("action is required")
            return
        }

        DispatchQueue.main.async {
            let commandCenter = MPRemoteCommandCenter.shared()

            switch action {
            case "play":
                commandCenter.playCommand.isEnabled = true
                commandCenter.playCommand.addTarget { [weak self] _ in
                    self?.notifyListeners("actionHandler", data: ["action": "play"])
                    return .success
                }
            case "pause":
                commandCenter.pauseCommand.isEnabled = true
                commandCenter.pauseCommand.addTarget { [weak self] _ in
                    self?.notifyListeners("actionHandler", data: ["action": "pause"])
                    return .success
                }
            case "nexttrack":
                commandCenter.nextTrackCommand.isEnabled = true
                commandCenter.nextTrackCommand.addTarget { [weak self] _ in
                    self?.notifyListeners("actionHandler", data: ["action": "nexttrack"])
                    return .success
                }
            case "previoustrack":
                commandCenter.previousTrackCommand.isEnabled = true
                commandCenter.previousTrackCommand.addTarget { [weak self] _ in
                    self?.notifyListeners("actionHandler", data: ["action": "previoustrack"])
                    return .success
                }
            case "seekforward":
                commandCenter.skipForwardCommand.isEnabled = true
                commandCenter.skipForwardCommand.addTarget { [weak self] _ in
                    self?.notifyListeners("actionHandler", data: ["action": "seekforward"])
                    return .success
                }
            case "seekbackward":
                commandCenter.skipBackwardCommand.isEnabled = true
                commandCenter.skipBackwardCommand.addTarget { [weak self] _ in
                    self?.notifyListeners("actionHandler", data: ["action": "seekbackward"])
                    return .success
                }
            case "stop":
                commandCenter.stopCommand.isEnabled = true
                commandCenter.stopCommand.addTarget { [weak self] _ in
                    self?.notifyListeners("actionHandler", data: ["action": "stop"])
                    return .success
                }
            default:
                call.reject("Unsupported action: \(action)")
                return
            }

            call.resolve()
        }
    }

    @objc func setPositionState(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            let nowPlayingInfo = MPNowPlayingInfoCenter.default()
            var info = nowPlayingInfo.nowPlayingInfo ?? [:]

            if let duration = call.getDouble("duration") {
                info[MPMediaItemPropertyPlaybackDuration] = duration
            }
            if let position = call.getDouble("position") {
                info[MPNowPlayingInfoPropertyElapsedPlaybackTime] = position
            }
            if let playbackRate = call.getDouble("playbackRate") {
                info[MPNowPlayingInfoPropertyPlaybackRate] = playbackRate
            }

            nowPlayingInfo.nowPlayingInfo = info
            call.resolve()
        }
    }

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
}
