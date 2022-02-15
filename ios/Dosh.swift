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
    Dosh.initialize(applicationId: "REPLACE_ME")
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
    print(token)
    Dosh.instance?.userAuthorization = {completion in completion(token)}
    print("dosh set token")
  }
  
};
