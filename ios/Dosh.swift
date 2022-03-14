//
//  Dosh.swift
//  BitPayApp
//
//  Created by Johnathan White on 1/5/22.
//

import Foundation
import PoweredByDosh
import UIKit

struct CustomTheme: PoweredByDoshTheme {
  var headerColor: UIColor
  var primaryColor: UIColor
  var interactiveColor: UIColor
  
  var logoStyle: DoshImageStyle = .circular
  var brandDetailsHeaderStyle: DoshBrandDetailsHeaderStyle = .rectangular
}

public class DoshAdapter: NSObject {
  
  @objc static func initDosh(uiOptions: Dictionary<String, String>) {
    let instance = Dosh.initialize(applicationId: "REPLACE_ME")
    
    // TODO: customize theme
    let header = instance.theme.headerColor;
    let primaryColor = instance.theme.primaryColor;
    let interactiveColor = instance.theme.interactiveColor;

    let programName = uiOptions["feedTitle"];
    let logoStyle = uiOptions["logoStyle"] == "RECTANGLE" ? DoshImageStyle.roundedRect : DoshImageStyle.circular;
    let brandDetailsHeaderStyle = uiOptions["brandDetailsHeaderStyle"] == "DIAGONAL" ? DoshBrandDetailsHeaderStyle.diagonal : DoshBrandDetailsHeaderStyle.rectangular;
    var theme:CustomTheme = CustomTheme(headerColor: header, primaryColor: primaryColor, interactiveColor: interactiveColor);
    
    theme.logoStyle = logoStyle;
    theme.brandDetailsHeaderStyle = brandDetailsHeaderStyle;
    
    instance.theme = theme;
    instance.rewardsProgramName = programName;
    instance.debugLoggingEnabled = true;
    
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
