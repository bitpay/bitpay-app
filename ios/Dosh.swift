//
//  Dosh.swift
//  BitPayApp
//
//  Created by Johnathan White on 1/5/22.
//

import Foundation
import UIKit

struct CustomTheme {
  var showPoweredByDoshMessage: Bool
  // colors
  var headerColor: UIColor = UIColor.init(red: 0x00/255, green: 0x00/255, blue: 0x00/255, alpha: 0xff/255);
  var primaryColor: UIColor = UIColor.init(red: 0x00/255, green: 0x00/255, blue: 0x00/255, alpha: 0xff/255);
  var interactiveColor: UIColor = UIColor.init(red: 0x22/255, green: 0x40/255, blue: 0xc4/255, alpha: 0xff/255);
  
  // font
  let boldFontName: String = "Heebo-Bold";
  let mediumFontName: String = "Heebo-Medium";
  let regularFontName: String = "Heebo-Regular";
  let lightFontName: String = "Heebo-Light";
}

public class DoshAdapter: NSObject {
  
  @objc static func initDosh(applicationId: String, uiOptions: Dictionary<String, String>) {
    print("dosh initialized")
  }

  @objc static func present() {
    DispatchQueue.main.async {
      print("dosh present")
    }
  }
  
  @objc static func setDoshToken(token: String) {
    print(token)
    print("dosh set token")
  }
  
  @objc static func clearUser() {
    print("dosh clear user")
  }
};
