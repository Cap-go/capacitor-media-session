import Capacitor
import Foundation

@objc(MediaSessionPlugin)
public class MediaSessionPlugin: CAPPlugin, CAPBridgedPlugin {
    private let PLUGIN_VERSION: String = "7.1.4"
    public let identifier = "MediaSessionPlugin"
    public let jsName = "MediaSession"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getPluginVersion", returnType: CAPPluginReturnPromise)
    ]

    @objc func getPluginVersion(_ call: CAPPluginCall) {
        call.resolve(["version": self.PLUGIN_VERSION])
    }

}
