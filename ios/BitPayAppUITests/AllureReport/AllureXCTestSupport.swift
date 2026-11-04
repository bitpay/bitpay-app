//
//  AllureXCTestSupport.swift
//  ItemAppUITests
//
//  Helpers to surface Allure-compatible metadata from XCTest activities.
//  Allure 3 reads the `.xcresult` and interprets activity names prefixed
//  with `allure.*` as labels/links/etc. Keep these activities flat and
//  empty so Allure can parse them as metadata rather than steps.
//

import XCTest

enum AllureXCTestSupport {
    
    /// Adds a custom Allure label using the `allure.label.<name>:<value>` convention.
    static func addLabel(_ name: String, value: String) {
        XCTContext.runActivity(named: "allure.label.\(name):\(value)") { _ in }
    }
    
    /// Sets a custom test name visible in the report.
    static func setDisplayName(_ name: String) {
        XCTContext.runActivity(named: "allure.name:\(name)") { _ in }
    }
    
    /// Adds a link to an issue tracker entry.
    static func addIssue(_ title: String, url: String) {
        XCTContext.runActivity(named: "allure.issue.\(title):\(url)") { _ in }
    }
    
    /// Adds a generic hyperlink label.
    static func addLink(_ title: String, url: String) {
        XCTContext.runActivity(named: "allure.link.\(title):\(url)") { _ in }
    }
    
    /// Adds a plain description to the test.
    static func addDescription(_ description: String) {
        XCTContext.runActivity(named: "allure.description:\(description)") { _ in }
    }
    
    /// Wraps a code block in an activity that appears as a step in Allure.
    @discardableResult
    static func step<T>(_ name: String, block: () throws -> T) rethrows -> T {
        try XCTContext.runActivity(named: name) { _ in try block() }
    }
}

extension XCTestCase {
    /// Attaches a full-screen capture to the current test. Lifetime is `.keepAlways`
    /// so it remains available in the `.xcresult` bundle for Allure to render.
    func allureAttachScreenshot(name: String = "Screenshot") {
        let screenshot = XCUIScreen.main.screenshot()
        let attachment = XCTAttachment(screenshot: screenshot)
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }
    
    /// Attaches a screenshot of the supplied application.
    func allureAttachAppScreenshot(app: XCUIApplication, name: String = "App Screenshot") {
        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }
    
    /// Captures failure-time artifacts if the current test did not succeed.
    func allureCaptureFailureArtifacts(app: XCUIApplication?, name: String = "Failure Screenshot") {
        guard let app else { return }
        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }
}

