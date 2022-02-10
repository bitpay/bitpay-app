//
//  Dosh.swift
//  BitPayApp
//
//  Created by Johnathan White on 1/5/22.
//

import Foundation
import PoweredByDosh
import UIKit

public class DoshAdapter: NSObject {
  
  @objc static func initDosh() {
    Dosh.initialize(applicationId: "btpay:c8593e9a-dbe0-4d69-8536-edaa54180876")
    Dosh.instance?.debugLoggingEnabled = true
    print("dosh initialized")
  }

  @objc static func present() {
    DispatchQueue.main.async {
      Dosh.instance?.presentRewards(from: (UIApplication.shared.keyWindow?.rootViewController)!)
      print("dosh present")
    }
  }
  
  @objc static func setDoshToken(token: String) {
    Dosh.instance?.userAuthorization = {completion in completion(token)}
    print("dosh set token")
  }
  
};
